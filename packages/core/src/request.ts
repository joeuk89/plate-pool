import type { Implement, Inventory, Plate } from "./inventory.js";
import { loadDumbbells } from "./dumbbells.js";
import { loadBarbell, type Leftover, type LoadRequest, type LoadResponse, type LoadResult, type Outcome, type TargetRequest, type Usage } from "./load.js";
import { RequestError } from "./request-error.js";
import { loadKettlebell, loadLeg } from "./stack.js";
import { loadVest } from "./vest.js";
import { display } from "./weight.js";

interface Branch {
  picks: number[];
  outcomes: Outcome[];
  closeness: number[];
  plateCount: number;
  uneven: number;
}

const NO_LOADING = -1;
const STANDARD_SCREW = "screw-standard";

export function load(inventory: Inventory, request: LoadRequest): LoadResponse {
  if (request.targets.length === 0) throw new RequestError("A request holds at least one target.");
  const implementsUsed = request.targets.map((target) => implementFor(inventory, target.implement));
  checkImplementCounts(implementsUsed, request.targets);

  const memo = new Map<string, Branch | undefined>();
  const search = (pool: Inventory, index: number, standardScrewsMustRunOut: boolean): Branch | undefined => {
    const target = request.targets[index];
    if (!target) {
      if (standardScrewsMustRunOut && hasFree(pool, STANDARD_SCREW)) return undefined;
      return { picks: [], outcomes: [], closeness: [], plateCount: 0, uneven: 0 };
    }
    const key = `${index}|${standardScrewsMustRunOut}|${poolKey(pool)}`;
    if (memo.has(key)) return memo.get(key);

    const implement = implementsUsed[index]!;
    const options = [{ outcome: loadOne(pool, implement, target, request), standardScrewsMustRunOut }];
    // A light kettlebell may take a long screw only if no standard screw is left free, for example because later dumbbells hold them all.
    if (implement.id === "kettlebell" && hasFree(pool, STANDARD_SCREW)) {
      options.push({ outcome: loadOne(withNoFree(pool, STANDARD_SCREW), implement, target, request), standardScrewsMustRunOut: true });
    }

    let best: Branch | undefined;
    const consider = (outcome: Outcome, pick: number, usage: Usage | undefined, tail: Branch | undefined) => {
      if (!tail) return;
      const branch: Branch = {
        picks: [pick, ...tail.picks],
        outcomes: [outcome, ...tail.outcomes],
        closeness: [...closenessOf(outcome), ...tail.closeness],
        plateCount: (usage?.plateCount ?? 0) + tail.plateCount,
        uneven: (usage?.uneven ?? 0) + tail.uneven,
      };
      if (!best || beats(branch, best)) best = branch;
    };
    const seen = new Set<string>();
    for (const option of options) {
      option.outcome.picks.forEach((usage, pick) => {
        const usageId = usageKey(usage);
        if (seen.has(usageId)) return;
        seen.add(usageId);
        consider(option.outcome, pick, usage, search(without(pool, usage), index + 1, option.standardScrewsMustRunOut));
      });
    }
    if (!best) consider(options[0]!.outcome, NO_LOADING, undefined, search(pool, index + 1, standardScrewsMustRunOut));
    memo.set(key, best);
    return best;
  };

  const chosen = search(inventory, 0, false)!;
  const results: LoadResult[] = [];
  const earlier: { label: string; usage: Usage | undefined }[] = [];
  let pool = inventory;
  request.targets.forEach((target, index) => {
    const implement = implementsUsed[index]!;
    const outcome = chosen.outcomes[index]!;
    const pick = chosen.picks[index]!;
    const usage = outcome.picks[pick];
    const result = outcome.result(pick);
    const label = labelOf(implement, target);
    if (index > 0) {
      const alone = loadOne(inventory, implement, target, request);
      const miss = missWarning(implement, label, outcome, alone, pool, earlier);
      if (miss) result.warnings.unshift(miss);
    }
    results.push(result);
    earlier.push({ label, usage });
    if (usage) pool = without(pool, usage);
  });
  return { results, leftover: leftover(pool, implementsUsed) };
}

function beats(a: Branch, b: Branch): boolean {
  for (let i = 0; i < a.closeness.length; i++) {
    if (a.closeness[i] !== b.closeness[i]) return a.closeness[i]! < b.closeness[i]!;
  }
  if (a.plateCount !== b.plateCount) return a.plateCount < b.plateCount;
  return a.uneven < b.uneven;
}

function closenessOf(outcome: Outcome): [distance: number, total: number] {
  if (outcome.total === undefined) return [Infinity, Infinity];
  return [Math.abs(outcome.total - outcome.target), outcome.total];
}

function implementFor(inventory: Inventory, id: string): Implement {
  const implement = inventory.implements.find((candidate) => candidate.id === id);
  if (!implement) throw new RequestError(`Unknown implement "${id}".`);
  return implement;
}

function checkImplementCounts(implementsUsed: Implement[], targets: TargetRequest[]): void {
  const needed = new Map<Implement, number>();
  implementsUsed.forEach((implement, index) => {
    const count = implement.id === "dumbbell" && targets[index]!.pair !== false ? 2 : 1;
    needed.set(implement, (needed.get(implement) ?? 0) + count);
  });
  for (const [implement, count] of needed) {
    if (count > implement.count) {
      throw new RequestError(`The request needs ${count} × ${nounFor(implement)}. The inventory holds ${implement.count}.`);
    }
  }
}

function loadOne(pool: Inventory, implement: Implement, target: TargetRequest, request: LoadRequest): Outcome {
  switch (implement.id) {
    case "barbell":
      return loadBarbell(pool, implement, target.target, request.collars);
    case "dumbbell":
      return loadDumbbells(pool, implement, target, request.uneven ?? true);
    case "kettlebell":
      return loadKettlebell(pool, implement, target.target);
    case "leg":
      return loadLeg(pool, implement, target.target);
    case "vest":
      return loadVest(pool, implement, target.target);
    default:
      throw new RequestError(`Load for the ${implement.name.toLowerCase()} is not built yet.`);
  }
}

function without(pool: Inventory, usage: Usage): Inventory {
  return {
    ...pool,
    plates: pool.plates.map((plate) => ({ ...plate, count: plate.count - (usage.plates.get(plate.id) ?? 0) })),
    hardware: pool.hardware.map((item) => ({ ...item, count: item.count - (usage.hardware.get(item.id) ?? 0) })),
  };
}

function hasFree(pool: Inventory, hardwareId: string): boolean {
  return (pool.hardware.find((item) => item.id === hardwareId)?.count ?? 0) > 0;
}

function withNoFree(pool: Inventory, hardwareId: string): Inventory {
  return { ...pool, hardware: pool.hardware.map((item) => (item.id === hardwareId ? { ...item, count: 0 } : item)) };
}

function poolKey(pool: Inventory): string {
  return [...pool.plates, ...pool.hardware].map((item) => item.count).join();
}

function usageKey(usage: Usage): string {
  const entries = (counts: Map<string, number>) => [...counts].filter(([, count]) => count > 0).sort().join();
  return `${entries(usage.plates)}|${entries(usage.hardware)}`;
}

function leftover(pool: Inventory, implementsUsed: Implement[]): Leftover {
  const plateTypes = new Set(implementsUsed.flatMap((implement) => implement.accepts));
  return {
    plates: Object.fromEntries(pool.plates.filter((plate) => plateTypes.has(plate.type)).map((plate) => [plate.id, plate.count])),
    hardware: Object.fromEntries(pool.hardware.map((item) => [item.id, item.count])),
  };
}

function labelOf(implement: Implement, target: TargetRequest): string {
  if (implement.id === "dumbbell") return target.pair === false ? "dumbbell" : "dumbbells";
  return nounFor(implement);
}

function nounFor(implement: Implement): string {
  return implement.id === "leg" ? "leg attachment" : implement.id;
}

function missWarning(
  implement: Implement,
  label: string,
  outcome: Outcome,
  alone: Outcome,
  pool: Inventory,
  earlier: { label: string; usage: Usage | undefined }[],
): string | undefined {
  if (closenessOf(outcome)[0] <= closenessOf(alone)[0]) return undefined;
  const needed = alone.picks[0];
  const short = (items: { id: string; count: number }[], counts: Map<string, number> | undefined) =>
    items.filter((item) => (counts?.get(item.id) ?? 0) > item.count).map((item) => item.id);
  const shortPlates = short(pool.plates, needed?.plates);
  const shortHardware = short(pool.hardware, needed?.hardware);
  const shortIds = [...shortPlates, ...shortHardware];
  const uses = (usage: Usage | undefined, id: string) => (usage?.plates.get(id) ?? 0) + (usage?.hardware.get(id) ?? 0) > 0;
  const blamed = mergedLabels(earlier.filter(({ usage }) => shortIds.some((id) => uses(usage, id))).map((item) => item.label));
  const names = [
    ...shortPlates.map((id) => pluralPlate(pool.plates.find((plate) => plate.id === id)!)),
    ...shortHardware.map((id) => `${pool.hardware.find((item) => item.id === id)!.name.toLowerCase()}s`),
  ];

  const users = blamed.length === 0 ? "earlier implements" : joined(blamed.map((item) => `the ${item}`));
  const plural = (subjects: string[]) => subjects.length !== 1 || subjects[0] === "dumbbells";
  const cause = `${users} ${plural(blamed) ? "use" : "uses"} the ${names.length > 0 ? joined(names) : "plates"} the ${label} ${plural([label]) ? "need" : "needs"}`;
  const target = `${display(outcome.target, implement.unit)[implement.unit]} ${implement.unit}`;
  return alone.total === alone.target
    ? `Not exact because ${cause} to reach ${target}.`
    : `Further from ${target} than it could be, because ${cause} to get closer.`;
}

function mergedLabels(labels: string[]): string[] {
  const repeated = (label: string) => labels.indexOf(label) !== labels.lastIndexOf(label);
  return [...new Set(labels)].map((label) => (label === "dumbbell" && repeated(label) ? "dumbbells" : label));
}

function pluralPlate(plate: Plate): string {
  if (plate.shape === "block") return `${plate.name.toLowerCase()}s`;
  return `${/^\d/.test(plate.name) ? plate.name : plate.name.toLowerCase()} plates`;
}

function joined(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
