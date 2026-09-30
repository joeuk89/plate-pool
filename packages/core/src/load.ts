import type { Hardware, Implement, Inventory, Plate } from "./inventory.js";
import { RequestError } from "./request-error.js";
import { convert, describeWeight, display, parseWeight, thousandths, used, type Display } from "./weight.js";

export type CollarChoice = "clamp" | "spinlock" | "none";

export interface TargetRequest {
  implement: string;
  target: string;
  pair?: boolean;
}

export interface LoadRequest {
  targets: TargetRequest[];
  collars?: CollarChoice;
  uneven?: boolean;
}

export interface Loading {
  total: Display;
  hardware: { id: string; count: number }[];
  positions: { name: string; plates: number[] }[];
  uneven: boolean;
  heavier?: string;
}

export interface LoadResult {
  implement: string;
  pair?: boolean;
  target: Display;
  exact: boolean;
  loading?: Loading;
  recommended?: "below" | "above";
  below?: Loading;
  above?: Loading;
  refused?: { limit: Display };
  alternatives: Loading[];
  warnings: string[];
  unverified: string[];
}

export interface Leftover {
  plates: Record<string, number>;
  hardware: Record<string, number>;
}

export interface LoadResponse {
  results: LoadResult[];
  leftover: Leftover;
}

export const MICRO_PLATE = "ql-micro";
const MAX_ALTERNATIVES = 5;

interface PlateOption {
  plate: Plate;
  weight: number;
  stackLength: number;
  max: number;
}

export interface Candidate {
  total: number;
  plates: { option: PlateOption; perPosition: number }[];
  plateCount: number;
}

export interface Usage {
  plates: Map<string, number>;
  hardware: Map<string, number>;
  plateCount: number;
  uneven: number;
}

export interface Outcome {
  target: number;
  total?: number;
  picks: Usage[];
  result(pick: number): LoadResult;
}

export interface Choice<C> {
  exact: boolean;
  picks: C[];
  below?: C;
  above?: C;
  recommended?: "below" | "above";
}

export function choose<C extends { total: number }>(candidates: C[], target: number, rank: (list: C[]) => C[]): Choice<C> {
  const at = (total: number) => rank(candidates.filter((candidate) => candidate.total === total));
  const exact = at(target);
  if (exact.length > 0) return { exact: true, picks: exact };
  const lower = Math.max(...candidates.map((candidate) => candidate.total).filter((total) => total < target));
  const higher = Math.min(...candidates.map((candidate) => candidate.total).filter((total) => total > target));
  const below = Number.isFinite(lower) ? at(lower) : [];
  const above = Number.isFinite(higher) ? at(higher) : [];
  const recommended =
    below.length > 0 && (above.length === 0 || target - lower <= higher - target) ? "below" : above.length > 0 ? "above" : undefined;
  return {
    exact: false,
    picks: recommended === "below" ? below : recommended === "above" ? above : [],
    ...(below[0] ? { below: below[0] } : {}),
    ...(above[0] ? { above: above[0] } : {}),
    ...(recommended ? { recommended } : {}),
  };
}

export function sidesFor<C>(choice: Choice<C>, pick: C | undefined): { exact?: C; below?: C; above?: C } {
  const exact = choice.exact ? pick : undefined;
  const below = choice.recommended === "below" ? pick : choice.below;
  const above = choice.recommended === "above" ? pick : choice.above;
  return { ...(exact ? { exact } : {}), ...(below ? { below } : {}), ...(above ? { above } : {}) };
}

export function loadBarbell(inventory: Inventory, implement: Implement, targetText: string, collars: CollarChoice | undefined): Outcome {
  const target = parseWeight(targetText, implement.unit);
  const targetMilli = convert(thousandths(target.amount), target.unit, implement.unit);
  const collar = collarFor(inventory, implement, collars);
  const collarsNeeded = collar ? (implement.hardware?.perPosition ?? 1) * implement.positions.length : 0;
  const baseMilli =
    thousandths(used(implement.base)) +
    (collar ? collarsNeeded * convert(thousandths(used(collar.weight)), collar.unit, implement.unit) : 0);

  const collarWarnings: string[] = [];
  const enoughCollars = !collar || collar.count >= collarsNeeded;
  if (collar && !enoughCollars) {
    collarWarnings.push(`The plate pool holds ${collar.count} ${collar.name}. The ${implement.name.toLowerCase()} needs ${collarsNeeded}.`);
  }
  const candidates = enoughCollars ? candidatesFor(inventory, implement, collar, baseMilli) : [];

  const toLoading = (candidate: Candidate): Loading => ({
    total: display(candidate.total, implement.unit),
    hardware: collar ? [{ id: collar.id, count: collarsNeeded }] : [],
    positions: implement.positions.map((name) => ({ name, plates: platesInOrder(candidate) })),
    uneven: false,
  });

  const choice = choose(candidates, targetMilli, ranked);
  const refused =
    implement.maxPlateWeight !== undefined && targetMilli - baseMilli > thousandths(implement.maxPlateWeight)
      ? { limit: display(thousandths(implement.maxPlateWeight), implement.unit) }
      : undefined;

  const result = (pick: number): LoadResult => {
    const { exact, below, above } = sidesFor(choice, choice.picks[pick]);
    const warnings = [...collarWarnings];
    if (refused) {
      const heaviest = below ? ` Heaviest allowed: ${describeWeight(toLoading(below).total, implement.unit)}.` : "";
      warnings.push(`Refused: over the ${refused.limit[implement.unit]} ${implement.unit} plate limit.${heaviest}`);
    }

    const others = exact ? otherWays(choice.picks, exact) : [];
    const shown = [exact, below, above, ...others].filter((candidate) => candidate !== undefined);
    const unverified = [
      ...(implement.base.status === "unverified" ? [`${implement.id}.base`] : []),
      ...(collar?.weight.status === "unverified" ? [`${collar.id}.weight`] : []),
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

  const positions = implement.positions.length;
  return {
    target: targetMilli,
    ...(choice.picks[0] ? { total: choice.picks[0].total } : {}),
    picks: choice.picks.map((candidate) => ({
      plates: new Map(candidate.plates.map(({ option, perPosition }) => [option.plate.id, perPosition * positions])),
      hardware: new Map(collar ? [[collar.id, collarsNeeded]] : []),
      plateCount: candidate.plateCount,
      uneven: 0,
    })),
    result,
  };
}

export function collarFor(inventory: Inventory, implement: Implement, choice: CollarChoice | undefined): Hardware | undefined {
  const id = choice === undefined ? implement.hardware?.default : choice === "none" ? "none" : `collar-${choice}`;
  if (id === undefined || id === "none") return undefined;
  const collar = inventory.hardware.find((item) => item.id === id);
  if (!collar || !implement.hardware?.options.includes(id)) {
    throw new RequestError(`The ${implement.name.toLowerCase()} takes no "${id}" collar.`);
  }
  return collar;
}

export function candidatesFor(inventory: Inventory, implement: Implement, collar: Hardware | undefined, baseMilli: number): Candidate[] {
  const positions = implement.positions.length;
  const plateUnit = (plate: Plate) => inventory.plateTypes.find((type) => type.id === plate.type)?.unit ?? implement.unit;
  const options: PlateOption[] = inventory.plates
    .filter((plate) => implement.accepts.includes(plate.type))
    .map((plate) => ({
      plate,
      weight: convert(thousandths(used(plate.weight)), plateUnit(plate), implement.unit),
      stackLength: plate.stackLengthIn ? thousandths(used(plate.stackLengthIn)) : 0,
      max: Math.min(Math.floor(plate.count / positions), plate.id === MICRO_PLATE ? 1 : Infinity),
    }))
    .sort((a, b) => b.weight - a.weight);

  const capacity = implement.positionLengthIn
    ? thousandths(used(implement.positionLengthIn)) - thousandths(collar?.widthIn ?? 0)
    : Infinity;
  const maxPlateWeight = implement.maxPlateWeight === undefined ? Infinity : thousandths(implement.maxPlateWeight);

  const candidates: Candidate[] = [];
  const walk = (index: number, chosen: Candidate["plates"], weight: number, length: number) => {
    if (length > capacity || weight * positions > maxPlateWeight) return;
    const option = options[index];
    if (!option) {
      candidates.push({
        total: baseMilli + weight * positions,
        plates: chosen,
        plateCount: chosen.reduce((sum, item) => sum + item.perPosition, 0) * positions,
      });
      return;
    }
    for (let count = 0; count <= option.max; count++) {
      const next = count === 0 ? chosen : [...chosen, { option, perPosition: count }];
      walk(index + 1, next, weight + option.weight * count, length + option.stackLength * count);
    }
  };
  walk(0, [], 0, 0);
  return candidates;
}

export function otherWays(candidates: Candidate[], chosen: Candidate): Candidate[] {
  return ranked(candidates)
    .filter((candidate) => candidate !== chosen)
    .slice(0, MAX_ALTERNATIVES);
}

export function ranked(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => a.plateCount - b.plateCount || heavierFirst(a, b));
}

function heavierFirst(a: Candidate, b: Candidate): number {
  const left = platesInOrder(a);
  const right = platesInOrder(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (right[i] ?? 0) - (left[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function platesInOrder(candidate: Candidate): number[] {
  const isMicro = (item: Candidate["plates"][number]) => Number(item.option.plate.id === MICRO_PLATE);
  return [...candidate.plates]
    .sort((a, b) => isMicro(a) - isMicro(b) || b.option.weight - a.option.weight)
    .flatMap(({ option, perPosition }) => Array<number>(perPosition).fill(used(option.plate.weight)));
}
