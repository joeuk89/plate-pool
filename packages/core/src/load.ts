import type { Hardware, Implement, Inventory, Plate } from "./inventory.js";
import { loadDumbbells } from "./dumbbells.js";
import { RequestError } from "./request-error.js";
import { loadKettlebell, loadLeg } from "./stack.js";
import { loadVest } from "./vest.js";
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

export interface Chosen {
  result: LoadResult;
  plates: Map<string, number>;
  hardware: Map<string, number>;
}

export function load(inventory: Inventory, request: LoadRequest): LoadResponse {
  if (request.targets.length !== 1) {
    throw new RequestError("A request holds exactly one target for now.");
  }
  const [targetRequest] = request.targets as [TargetRequest];
  const { implement: implementId, target } = targetRequest;
  const implement = inventory.implements.find((candidate) => candidate.id === implementId);
  if (!implement) throw new RequestError(`Unknown implement "${implementId}".`);
  let chosen: Chosen;
  switch (implement.id) {
    case "barbell":
      chosen = loadBarbell(inventory, implement, target, request.collars);
      break;
    case "dumbbell":
      chosen = loadDumbbells(inventory, implement, targetRequest, request.uneven ?? true);
      break;
    case "kettlebell":
      chosen = loadKettlebell(inventory, implement, target);
      break;
    case "leg":
      chosen = loadLeg(inventory, implement, target);
      break;
    case "vest":
      chosen = loadVest(inventory, implement, target);
      break;
    default:
      throw new RequestError(`Load for the ${implement.name.toLowerCase()} is not built yet.`);
  }
  return { results: [chosen.result], leftover: leftover(inventory, [implement], chosen) };
}

function loadBarbell(inventory: Inventory, implement: Implement, targetText: string, collars: CollarChoice | undefined): Chosen {
  const target = parseWeight(targetText, implement.unit);
  const targetMilli = convert(thousandths(target.amount), target.unit, implement.unit);
  const collar = collarFor(inventory, implement, collars);
  const collarsNeeded = collar ? (implement.hardware?.perPosition ?? 1) * implement.positions.length : 0;
  const baseMilli =
    thousandths(used(implement.base)) +
    (collar ? collarsNeeded * convert(thousandths(used(collar.weight)), collar.unit, implement.unit) : 0);

  const warnings: string[] = [];
  const enoughCollars = !collar || collar.count >= collarsNeeded;
  if (collar && !enoughCollars) {
    warnings.push(`The plate pool holds ${collar.count} ${collar.name}. The ${implement.name.toLowerCase()} needs ${collarsNeeded}.`);
  }
  const candidates = enoughCollars ? candidatesFor(inventory, implement, collar, baseMilli) : [];

  const toLoading = (candidate: Candidate): Loading => ({
    total: display(candidate.total, implement.unit),
    hardware: collar ? [{ id: collar.id, count: collarsNeeded }] : [],
    positions: implement.positions.map((name) => ({ name, plates: platesInOrder(candidate) })),
    uneven: false,
  });

  const exactCandidates = candidates.filter((candidate) => candidate.total === targetMilli);
  const exact = best(exactCandidates);
  const below = exact ? undefined : closest(candidates.filter((candidate) => candidate.total < targetMilli), targetMilli);
  const above = exact ? undefined : closest(candidates.filter((candidate) => candidate.total > targetMilli), targetMilli);
  const recommended =
    exact ?? (below && (!above || targetMilli - below.total <= above.total - targetMilli) ? below : above);

  const refused =
    implement.maxPlateWeight !== undefined && targetMilli - baseMilli > thousandths(implement.maxPlateWeight)
      ? { limit: display(thousandths(implement.maxPlateWeight), implement.unit) }
      : undefined;
  if (refused) {
    const heaviest = below ? ` Heaviest allowed: ${describeWeight(toLoading(below).total, implement.unit)}.` : "";
    warnings.push(`Refused: over the ${refused.limit[implement.unit]} ${implement.unit} plate limit.${heaviest}`);
  }

  const others = exact ? otherWays(exactCandidates, exact) : [];
  const shown = [exact, below, above, ...others].filter((candidate) => candidate !== undefined);
  const unverified = [
    ...(implement.base.status === "unverified" ? [`${implement.id}.base`] : []),
    ...(collar?.weight.status === "unverified" ? [`${collar.id}.weight`] : []),
    ...inventory.plates
      .filter((plate) => plate.weight.status === "unverified")
      .filter((plate) => shown.some((candidate) => candidate.plates.some(({ option }) => option.plate === plate)))
      .map((plate) => `${plate.id}.weight`),
  ];

  const result: LoadResult = {
    implement: implement.id,
    target: display(targetMilli, implement.unit),
    exact: exact !== undefined,
    ...(refused ? { refused } : {}),
    ...(!exact && recommended ? { recommended: recommended === below ? ("below" as const) : ("above" as const) } : {}),
    ...(exact ? { loading: toLoading(exact) } : {}),
    ...(below ? { below: toLoading(below) } : {}),
    ...(above ? { above: toLoading(above) } : {}),
    alternatives: others.map(toLoading),
    warnings,
    unverified,
  };

  const positions = implement.positions.length;
  return {
    result,
    plates: new Map(recommended?.plates.map(({ option, perPosition }) => [option.plate.id, perPosition * positions])),
    hardware: new Map(collar && recommended ? [[collar.id, collarsNeeded]] : []),
  };
}

function leftover(inventory: Inventory, implementsUsed: Implement[], chosen: Chosen): Leftover {
  const plateTypes = new Set(implementsUsed.flatMap((implement) => implement.accepts));
  return {
    plates: Object.fromEntries(
      inventory.plates
        .filter((plate) => plateTypes.has(plate.type))
        .map((plate) => [plate.id, plate.count - (chosen.plates.get(plate.id) ?? 0)]),
    ),
    hardware: Object.fromEntries(
      inventory.hardware.map((item) => [item.id, item.count - (chosen.hardware.get(item.id) ?? 0)]),
    ),
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

export function closest(candidates: Candidate[], target: number): Candidate | undefined {
  const distance = Math.min(...candidates.map((candidate) => Math.abs(candidate.total - target)));
  return best(candidates.filter((candidate) => Math.abs(candidate.total - target) === distance));
}

export function best(candidates: Candidate[]): Candidate | undefined {
  return ranked(candidates)[0];
}

export function otherWays(candidates: Candidate[], chosen: Candidate): Candidate[] {
  return ranked(candidates)
    .filter((candidate) => candidate !== chosen)
    .slice(0, MAX_ALTERNATIVES);
}

function ranked(candidates: Candidate[]): Candidate[] {
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
