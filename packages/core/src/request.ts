import type { Resolved } from "./changes.js";
import { loadHandle } from "./handle.js";
import type { Implement, Inventory } from "./inventory.js";
import type { Leftover, LoadRequest, LoadResponse, LoadResult, TargetRequest } from "./load.js";
import { loadMirrored } from "./mirrored.js";
import type { Outcome, Setting, Usage } from "./outcome.js";
import { fittingFor, lower, NONE, pairOf, platesNamed, positionNames } from "./parts.js";
import { RequestError } from "./request-error.js";
import { reverse } from "./reverse.js";
import { loadVest } from "./vest.js";
import { display } from "./weight.js";

interface Closeness {
  distance: number;
  total: number;
  changes: number;
}

interface Branch {
  picks: number[];
  outcomes: Outcome[];
  closeness: Closeness[];
  changes: number;
  plateCount: number;
  uneven: number;
}

/** Hardware an implement passed over while it was free, which must end the request short for the choice to stand. */
interface Shortfall {
  id: string;
  pieces: number;
}

interface Variant {
  outcome: Outcome;
  shortfalls: Shortfall[];
}

const NO_LOADING = -1;

export function load(inventory: Inventory, request: LoadRequest): LoadResponse {
  if (request.targets.length === 0) throw new RequestError("A request holds at least one target.");
  const implementsUsed = request.targets.map((target) => implementFor(inventory, target.implement));
  const pairs = request.targets.map((target, index) => pairOf(implementsUsed[index]!, target));
  checkImplementCounts(implementsUsed, pairs);
  const currents = request.targets.map((target, index) => resolved(inventory, implementsUsed[index]!, target));
  const loadAt = (pool: Inventory, index: number, unavailable: string[] = []) =>
    loadOne(withNoFree(pool, unavailable), implementsUsed[index]!, request.targets[index]!, pairs[index], request, currents[index]);

  const memo = new Map<string, Branch | undefined>();
  const search = (pool: Inventory, index: number, shortfalls: Shortfall[]): Branch | undefined => {
    if (index === request.targets.length) {
      if (shortfalls.some(({ id, pieces }) => free(pool, id) >= pieces)) return undefined;
      return { picks: [], outcomes: [], closeness: [], changes: 0, plateCount: 0, uneven: 0 };
    }
    const key = `${index}|${shortfalls.map(({ id, pieces }) => `${id}:${pieces}`).join()}|${poolKey(pool)}`;
    if (memo.has(key)) return memo.get(key);

    const variants: Variant[] = [{ outcome: loadAt(pool, index), shortfalls }];
    for (const shortfall of passOvers(inventory, implementsUsed, pairs, index, pool, request)) {
      variants.push({ outcome: loadAt(pool, index, [shortfall.id]), shortfalls: [...shortfalls, shortfall] });
    }

    let best: Branch | undefined;
    const consider = (outcome: Outcome, pick: number, usage: Usage | undefined, tail: Branch | undefined) => {
      if (!tail) return;
      const branch: Branch = {
        picks: [pick, ...tail.picks],
        outcomes: [outcome, ...tail.outcomes],
        closeness: [closenessOf(outcome, usage), ...tail.closeness],
        changes: (usage?.changes ?? 0) + tail.changes,
        plateCount: (usage?.plateCount ?? 0) + tail.plateCount,
        uneven: (usage?.uneven ?? 0) + tail.uneven,
      };
      if (!best || beats(branch, best)) best = branch;
    };
    const seen = new Set<string>();
    for (const variant of variants) {
      variant.outcome.picks.forEach((usage, pick) => {
        const usageId = usageKey(usage);
        if (seen.has(usageId)) return;
        seen.add(usageId);
        consider(variant.outcome, pick, usage, search(without(pool, usage), index + 1, variant.shortfalls));
      });
    }
    if (!best) consider(variants[0]!.outcome, NO_LOADING, undefined, search(pool, index + 1, shortfalls));
    memo.set(key, best);
    return best;
  };

  const chosen = search(inventory, 0, [])!;
  const results: LoadResult[] = [];
  const earlier: { label: Label; usage: Usage | undefined }[] = [];
  let pool = inventory;
  request.targets.forEach((_, index) => {
    const implement = implementsUsed[index]!;
    const outcome = chosen.outcomes[index]!;
    const pick = chosen.picks[index]!;
    const usage = outcome.picks[pick];
    const result = outcome.result(pick);
    const label = labelOf(implement, pairs[index]);
    if (index > 0) {
      const alone = loadAt(inventory, index);
      const miss = missWarning(inventory, implement, label, outcome, alone, pool, earlier);
      if (miss) result.warnings.unshift(miss);
    }
    results.push(result);
    earlier.push({ label, usage });
    if (usage) pool = without(pool, usage);
  });
  return { results, leftover: leftover(pool, implementsUsed) };
}

/** Hardware this implement might leave for a later one: free now, and among a later implement's options. */
function passOvers(
  inventory: Inventory,
  implementsUsed: Implement[],
  pairs: (boolean | undefined)[],
  index: number,
  pool: Inventory,
  request: LoadRequest,
): Shortfall[] {
  const implement = implementsUsed[index]!;
  const choice = request.hardware?.[implement.id];
  if (choice !== undefined || implement.kind === "vest") return [];
  const later = new Set(implementsUsed.slice(index + 1).flatMap((each) => each.hardware?.options ?? []));
  const copies = pairs[index] ? 2 : 1;
  const pieces = (implement.hardware?.perPosition ?? 1) * positionNames(implement).length * copies;
  return fittingFor(inventory, implement, undefined)
    .options.filter((option) => option.id !== NONE && later.has(option.id) && free(pool, option.id) >= pieces)
    .map((option) => ({ id: option.id, pieces }));
}

function beats(a: Branch, b: Branch): boolean {
  for (let i = 0; i < a.closeness.length; i++) {
    const left = a.closeness[i]!;
    const right = b.closeness[i]!;
    if (left.distance !== right.distance) return left.distance < right.distance;
    if (left.total !== right.total) {
      return left.changes !== right.changes ? left.changes < right.changes : left.total < right.total;
    }
  }
  if (a.changes !== b.changes) return a.changes < b.changes;
  if (a.plateCount !== b.plateCount) return a.plateCount < b.plateCount;
  return a.uneven < b.uneven;
}

function closenessOf(outcome: Outcome, usage?: Usage): Closeness {
  if (outcome.total === undefined) return { distance: Infinity, total: Infinity, changes: 0 };
  return { distance: Math.abs(outcome.total - outcome.target), total: outcome.total, changes: usage?.changes ?? 0 };
}

function resolved(inventory: Inventory, implement: Implement, target: TargetRequest): Resolved | undefined {
  if (!target.current) return undefined;
  const { positions, hardware } = reverse(inventory, { implement: implement.id, ...target.current });
  const item = inventory.hardware.find((each) => each.id === hardware[0]?.id);
  const counted = item && (item.kind === "screw" || item.kind === "pin") ? item.id : undefined;
  const on = target.current.hardwareOn;
  return {
    ids: positions.map(({ ids }) => ids),
    hardware: positions.map(({ name }) => (on === undefined || on === name ? counted : undefined)),
  };
}

function implementFor(inventory: Inventory, id: string): Implement {
  const implement = inventory.implements.find((candidate) => candidate.id === id);
  if (!implement) throw new RequestError(`Unknown implement "${id}".`);
  return implement;
}

function checkImplementCounts(implementsUsed: Implement[], pairs: (boolean | undefined)[]): void {
  const needed = new Map<Implement, number>();
  implementsUsed.forEach((implement, index) => {
    needed.set(implement, (needed.get(implement) ?? 0) + (pairs[index] ? 2 : 1));
  });
  for (const [implement, count] of needed) {
    if (count > implement.count) {
      throw new RequestError(`The request needs ${count} × ${lower(implement.name)}. The inventory holds ${implement.count}.`);
    }
  }
}

function loadOne(
  pool: Inventory,
  implement: Implement,
  target: TargetRequest,
  pair: boolean | undefined,
  request: LoadRequest,
  current: Resolved | undefined,
): Outcome {
  const setting: Setting = {
    inventory: pool,
    implement,
    target: target.target,
    ...(pair !== undefined ? { pair } : {}),
    copies: pair ? 2 : 1,
    current,
    warnings: [],
  };
  const choice = request.hardware?.[implement.id];
  switch (implement.kind) {
    case "bar":
    case "stack":
      return loadMirrored(setting, choice);
    case "handle":
      return loadHandle(setting, choice, request.uneven ?? true);
    case "vest":
      return loadVest(setting);
  }
}

function free(pool: Inventory, id: string): number {
  return pool.hardware.find((item) => item.id === id)?.count ?? 0;
}

function without(pool: Inventory, usage: Usage): Inventory {
  return {
    ...pool,
    plates: pool.plates.map((plate) => ({ ...plate, count: plate.count - (usage.plates.get(plate.id) ?? 0) })),
    hardware: pool.hardware.map((item) => ({ ...item, count: item.count - (usage.hardware.get(item.id) ?? 0) })),
  };
}

function withNoFree(pool: Inventory, ids: string[]): Inventory {
  if (ids.length === 0) return pool;
  return { ...pool, hardware: pool.hardware.map((item) => (ids.includes(item.id) ? { ...item, count: 0 } : item)) };
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

interface Label {
  name: string;
  plural: boolean;
}

function labelOf(implement: Implement, pair: boolean | undefined): Label {
  return pair ? { name: `${lower(implement.name)}s`, plural: true } : { name: lower(implement.name), plural: false };
}

function missWarning(
  inventory: Inventory,
  implement: Implement,
  label: Label,
  outcome: Outcome,
  alone: Outcome,
  pool: Inventory,
  earlier: { label: Label; usage: Usage | undefined }[],
): string | undefined {
  if (closenessOf(outcome).distance <= closenessOf(alone).distance) return undefined;
  const needed = alone.picks[0];
  const short = (items: { id: string; count: number }[], counts: Map<string, number> | undefined) =>
    items.filter((item) => (counts?.get(item.id) ?? 0) > item.count).map((item) => item.id);
  const shortPlates = short(pool.plates, needed?.plates);
  const shortHardware = short(pool.hardware, needed?.hardware);
  const shortIds = [...shortPlates, ...shortHardware];
  const uses = (usage: Usage | undefined, id: string) => (usage?.plates.get(id) ?? 0) + (usage?.hardware.get(id) ?? 0) > 0;
  const blamed = mergedLabels(earlier.filter(({ usage }) => shortIds.some((id) => uses(usage, id))).map((item) => item.label));
  const names = [
    ...shortPlates.map((id) => platesNamed(inventory, inventory.plates.find((plate) => plate.id === id)!)),
    ...shortHardware.map((id) => `${lower(inventory.hardware.find((item) => item.id === id)!.name)}s`),
  ];

  const users = blamed.length === 0 ? "earlier implements" : joined(blamed.map((item) => `the ${item.name}`));
  const pluralUsers = blamed.length !== 1 || blamed[0]!.plural;
  const cause = `${users} ${pluralUsers ? "use" : "uses"} the ${names.length > 0 ? joined(names) : "plates"} the ${label.name} ${label.plural ? "need" : "needs"}`;
  const target = `${display(outcome.target, implement.unit)[implement.unit]} ${implement.unit}`;
  return alone.total === alone.target
    ? `Not exact because ${cause} to reach ${target}.`
    : `Further from ${target} than it could be, because ${cause} to get closer.`;
}

function mergedLabels(labels: Label[]): Label[] {
  const merged: Label[] = [];
  for (const label of labels) {
    const same = merged.find((each) => each.name === label.name || each.name === `${label.name}s` || `${each.name}s` === label.name);
    if (!same) merged.push({ ...label });
    else if (same.name === label.name && !label.plural) Object.assign(same, { name: `${label.name}s`, plural: true });
    else if (label.plural) Object.assign(same, label);
  }
  return merged;
}

function joined(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
