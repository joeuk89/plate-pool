import type { Hardware, Implement, Inventory } from "./inventory.js";
import { candidatesFor, choose, otherWays, platesInOrder, ranked, sidesFor, type Candidate, type Loading, type LoadResult, type Outcome } from "./load.js";
import { convert, describeWeight, display, parseWeight, thousandths, used } from "./weight.js";

export const STANDARD_SCREW_MAX_TOTAL_LB = 57.5;
// Ironmaster's manual allows 5 lb and 2.5 lb plates "or the 22.5 lb plate", so a kettlebell takes one at most.
export const KETTLEBELL_LARGE_PLATE = "ql-22.5";

export const LEG_NOTE = "Plate weight only. The lever changes the resistance you feel.";

const STICKS_OUT_WARNING =
  "No standard locking screw is free, so the kettlebell uses a long locking screw. It may stick out at the top, which Ironmaster's manual calls normal.";

interface StackOption {
  candidate: Candidate;
  screw?: Hardware;
  sticksOut?: boolean;
}

export function loadKettlebell(inventory: Inventory, implement: Implement, targetText: string): Outcome {
  const screw = (id: string) => inventory.hardware.find((item) => item.id === id && implement.hardware?.options.includes(id));
  const standard = screw("screw-standard");
  const long = screw("screw-long");
  const isFree = (item: Hardware | undefined): item is Hardware => item !== undefined && item.count > 0;
  const weightOf = (item: Hardware) => convert(thousandths(used(item.weight)), item.unit, implement.unit);
  const fits = (plates: Candidate, item: Hardware) => stackLength(plates) <= thousandths(item.capacityIn ?? Infinity);
  const standardMax = convert(thousandths(STANDARD_SCREW_MAX_TOTAL_LB), "lb", implement.unit);
  const maxTotal = implement.maxTotal === undefined ? Infinity : thousandths(implement.maxTotal);

  const options: StackOption[] = [];
  for (const plates of candidatesFor(inventory, implement, undefined, thousandths(used(implement.base)))) {
    if (count(plates, KETTLEBELL_LARGE_PLATE) > 1) continue;
    if (plates.plateCount === 0) options.push({ candidate: plates });
    const light = plates.total + (standard ? weightOf(standard) : 0) <= standardMax;
    const chosen = light && isFree(standard) ? standard : isFree(long) ? long : undefined;
    if (!chosen || !fits(plates, chosen)) continue;
    const candidate = { ...plates, total: plates.total + weightOf(chosen) };
    if (candidate.total > maxTotal) continue;
    options.push({ candidate, screw: chosen, sticksOut: light && chosen === long });
  }

  const warnings = isFree(standard) || isFree(long) ? [] : ["No locking screw is free, so the kettlebell can only be the bare handle."];
  return stackResult(inventory, implement, targetText, options, warnings);
}

export function loadLeg(inventory: Inventory, implement: Implement, targetText: string): Outcome {
  const options = candidatesFor(inventory, implement, undefined, thousandths(used(implement.base))).map((candidate) => ({ candidate }));
  return stackResult(inventory, implement, targetText, options, [LEG_NOTE]);
}

function stackResult(
  inventory: Inventory,
  implement: Implement,
  targetText: string,
  options: StackOption[],
  notes: string[],
): Outcome {
  const target = parseWeight(targetText, implement.unit);
  const targetMilli = convert(thousandths(target.amount), target.unit, implement.unit);
  const candidates = options.map((option) => option.candidate);
  const optionOf = (candidate: Candidate) => options.find((option) => option.candidate === candidate)!;

  const toLoading = (candidate: Candidate): Loading => {
    const { screw } = optionOf(candidate);
    return {
      total: display(candidate.total, implement.unit),
      hardware: screw ? [{ id: screw.id, count: 1 }] : [],
      positions: implement.positions.map((name) => ({ name, plates: platesInOrder(candidate) })),
      uneven: false,
    };
  };

  const choice = choose(candidates, targetMilli, ranked);
  const limit = limitOf(implement);
  const refused = limit && targetMilli > limit.total ? { limit: display(limit.amount, implement.unit) } : undefined;

  const result = (pick: number): LoadResult => {
    const { exact, below, above } = sidesFor(choice, choice.picks[pick]);
    const others = exact ? otherWays(choice.picks, exact) : [];
    const shown = [exact, below, above, ...others].filter((candidate) => candidate !== undefined);

    const warnings: string[] = [];
    if (limit && refused) {
      const heaviest = below ? ` Heaviest allowed: ${describeWeight(toLoading(below).total, implement.unit)}.` : "";
      warnings.push(`Refused: over the ${refused.limit[implement.unit]} ${implement.unit} ${limit.label}.${heaviest}`);
    }
    if (shown.some((candidate) => optionOf(candidate).sticksOut)) warnings.push(STICKS_OUT_WARNING);
    warnings.push(...notes);

    const shownScrews = new Set(shown.map((candidate) => optionOf(candidate).screw).filter((screw) => screw !== undefined));
    const unverified = [
      ...(implement.base.status === "unverified" ? [`${implement.id}.base`] : []),
      ...[...shownScrews].filter((screw) => screw.weight.status === "unverified").map((screw) => `${screw.id}.weight`),
      ...inventory.plates
        .filter((plate) => plate.weight.status === "unverified")
        .filter((plate) => shown.some((candidate) => candidate.plates.some(({ option }) => option.plate === plate)))
        .map((plate) => `${plate.id}.weight`),
    ];

    return {
      implement: implement.id,
      target: display(targetMilli, implement.unit),
      exact: choice.exact,
      ...(refused ? { refused } : {}),
      ...(choice.recommended ? { recommended: choice.recommended } : {}),
      ...(exact ? { loading: toLoading(exact) } : {}),
      ...(below ? { below: toLoading(below) } : {}),
      ...(above ? { above: toLoading(above) } : {}),
      alternatives: others.map(toLoading),
      warnings,
      unverified,
    };
  };

  return {
    target: targetMilli,
    ...(choice.picks[0] ? { total: choice.picks[0].total } : {}),
    picks: choice.picks.map((candidate) => {
      const { screw } = optionOf(candidate);
      return {
        plates: new Map(candidate.plates.map(({ option, perPosition }) => [option.plate.id, perPosition])),
        hardware: new Map(screw ? [[screw.id, 1]] : []),
        plateCount: candidate.plateCount,
        uneven: 0,
      };
    }),
    result,
  };
}

function limitOf(implement: Implement): { total: number; amount: number; label: string } | undefined {
  if (implement.maxTotal !== undefined) {
    return { total: thousandths(implement.maxTotal), amount: thousandths(implement.maxTotal), label: "limit" };
  }
  if (implement.maxPlateWeight !== undefined) {
    const amount = thousandths(implement.maxPlateWeight);
    return { total: thousandths(used(implement.base)) + amount, amount, label: "plate limit" };
  }
  return undefined;
}

function count(candidate: Candidate, plateId: string): number {
  return candidate.plates.find(({ option }) => option.plate.id === plateId)?.perPosition ?? 0;
}

function stackLength(candidate: Candidate): number {
  return candidate.plates.reduce((sum, { option, perPosition }) => sum + option.stackLength * perPosition, 0);
}
