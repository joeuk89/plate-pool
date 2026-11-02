import { baseOf, emptyCandidate, outcomeOf, type Candidate, type Outcome, type Setting } from "./outcome.js";
import { fittingFor, freeIn, lower, plateOptions, positionNames, select, type PlateOption } from "./parts.js";
import { thousandths, used } from "./weight.js";

/** Load for a bar (two sides, always the same) or a stack (one position). */
export function loadMirrored(setting: Setting, choice: string | undefined): Outcome {
  const { inventory, implement } = setting;
  const positions = positionNames(implement).length;
  const options = plateOptions(inventory, implement);
  const fitting = fittingFor(inventory, implement, choice);
  const perPosition = implement.hardware?.perPosition ?? 1;
  const piecesNeeded = perPosition * positions;
  const free = freeIn(inventory);
  const base = baseOf(implement);
  const maxTotal = implement.maxTotal === undefined ? Infinity : thousandths(implement.maxTotal);
  const maxPlates = implement.maxPlateWeight === undefined ? Infinity : thousandths(implement.maxPlateWeight);

  const warnings = [...setting.warnings, ...shortages(setting, fitting, piecesNeeded, free)];
  const candidates: Candidate[] = [];
  if (fitting.hasBare) candidates.push(emptyCandidate(positions, base));

  const room = Math.min(
    implement.positionLength ? thousandths(used(implement.positionLength)) : Infinity,
    longestHeld(fitting),
  );
  for (const plates of plateSets(options, positions, room, Math.min(maxPlates, maxTotal - base) / positions)) {
    const length = plates.reduce((sum, option) => sum + option.stackLength, 0);
    const stacks = Array.from({ length: positions }, () => ({ length, hardware: true }));
    const selected = select(implement, fitting, stacks, piecesNeeded, free);
    if (!selected) continue;
    const item = selected.option.item;
    const weight = plates.reduce((sum, option) => sum + option.weight, 0);
    const total = base + weight * positions + (item ? piecesNeeded * selected.option.weight : 0);
    if (total > maxTotal) continue;
    candidates.push({
      total,
      positions: Array.from({ length: positions }, () => plates),
      ...(item ? { hardware: selected.option } : {}),
      hardwareOn: Array.from({ length: positions }, () => item !== undefined),
      plateCount: plates.length * positions,
      uneven: false,
      difference: 0,
      skipped: selected.skipped,
    });
  }

  const preferred = fitting.options.find((option) => option.item)?.weight ?? 0;
  const limit =
    implement.maxPlateWeight !== undefined
      ? { total: base + piecesNeeded * preferred + maxPlates, stated: implement.maxPlateWeight, plate: true }
      : implement.maxTotal !== undefined
        ? { total: maxTotal, stated: implement.maxTotal, plate: false }
        : undefined;
  return outcomeOf({ ...setting, warnings, ...(limit ? { limit } : {}) }, candidates);
}

export function shortages(setting: Setting, fitting: ReturnType<typeof fittingFor>, needed: number, free: (id: string) => number): string[] {
  const { implement } = setting;
  const items = fitting.options.map((option) => option.item).filter((item) => item !== undefined);
  if (items.length === 0) return [];
  if (fitting.fixed) {
    const item = items[0]!;
    return free(item.id) >= needed ? [] : [`The plate pool holds ${free(item.id)} ${item.name}. The ${lower(implement.name)} needs ${needed}.`];
  }
  if (fitting.plateFreeHardware || items.some((item) => free(item.id) > 0)) return [];
  return [`No locking hardware is free, so the ${lower(implement.name)} can carry no plates.`];
}

/** The longest stack any option can hold, so the search never builds a stack nothing holds. */
export function longestHeld(fitting: ReturnType<typeof fittingFor>): number {
  let longest = 0;
  for (const option of fitting.options) {
    if (!option.item) {
      if (fitting.plateFreeHardware) return Infinity;
      continue;
    }
    if (option.item.capacity === undefined) return Infinity;
    longest = Math.max(longest, thousandths(option.item.capacity));
  }
  return longest;
}

/** Every set of plates for one position, heaviest first, within the pool shared by every position and the caps. */
export function plateSets(options: PlateOption[], positions: number, room: number, maxWeight: number): PlateOption[][] {
  const sets: PlateOption[][] = [];
  const walk = (index: number, chosen: PlateOption[], weight: number, length: number) => {
    const option = options[index];
    if (!option) {
      sets.push(chosen);
      return;
    }
    const most = Math.min(Math.floor(option.plate.count / positions), option.cap);
    for (let count = 0; count <= most; count++) {
      const nextLength = length + option.stackLength * count;
      const nextWeight = weight + option.weight * count;
      if (nextLength > room || nextWeight > maxWeight) break;
      walk(index + 1, count === 0 ? chosen : [...chosen, ...Array<PlateOption>(count).fill(option)], nextWeight, nextLength);
    }
  };
  walk(0, [], 0, 0);
  return sets;
}
