import { longestHeld, plateSets, shortages } from "./mirrored.js";
import { baseOf, emptyCandidate, outcomeOf, type Candidate, type Outcome, type Setting } from "./outcome.js";
import { fittingFor, freeIn, plateOptions, select, type PlateOption } from "./parts.js";
import { thousandths, used } from "./weight.js";

interface End {
  plates: PlateOption[];
  weight: number;
  length: number;
}

/** Load for a handle: two ends that may differ by the implement's uneven allowance. */
export function loadHandle(setting: Setting, choice: string | undefined, unevenAllowed: boolean): Outcome {
  const { inventory, implement, copies } = setting;
  const options = plateOptions(inventory, implement);
  const fitting = fittingFor(inventory, implement, choice);
  const perPosition = implement.hardware?.perPosition ?? 1;
  const free = freeIn(inventory);
  const base = baseOf(implement);
  const maxTotal = implement.maxTotal === undefined ? Infinity : thousandths(implement.maxTotal);
  const maxPlates = implement.maxPlateWeight === undefined ? Infinity : thousandths(implement.maxPlateWeight);

  const allowance = thousandths(implement.unevenAllowance ?? 0);
  const relaxed = implement.unevenAllowanceRelaxed === undefined ? undefined : thousandths(implement.unevenAllowanceRelaxed);
  const smallPlateFree = options.some((option) => option.weight <= allowance && option.plate.count >= copies);
  const maxDifference = !unevenAllowed ? 0 : allowance > 0 && !smallPlateFree && relaxed !== undefined ? relaxed : allowance;

  const warnings = [...setting.warnings, ...shortages(setting, fitting, perPosition * 2 * copies, free)];
  const candidates: Candidate[] = [];
  if (fitting.hasBare) candidates.push({ ...emptyCandidate(2, base), heavier: 0 });

  const room = Math.min(implement.positionLength ? thousandths(used(implement.positionLength)) : Infinity, longestHeld(fitting));
  const ends: End[] = plateSets(options, 1, room, Math.min(maxPlates, maxTotal - base)).map((plates) => ({
    plates,
    weight: plates.reduce((sum, option) => sum + option.weight, 0),
    length: plates.reduce((sum, option) => sum + option.stackLength, 0),
  }));
  const poolHolds = (...chosen: End[]) =>
    options.every((option) => copies * chosen.reduce((sum, end) => sum + end.plates.filter((each) => each === option).length, 0) <= option.plate.count);

  const add = (heavier: End, lighter: End, oneEnd: boolean) => {
    const stacks = [
      { length: heavier.length, hardware: true },
      { length: lighter.length, hardware: !oneEnd },
    ];
    const ends = oneEnd ? 1 : 2;
    const selected = select(implement, fitting, stacks, perPosition * ends * copies, free);
    if (!selected) return;
    const item = selected.option.item;
    if (oneEnd && !item) return;
    const hardwareWeight = item ? perPosition * selected.option.weight : 0;
    const difference = heavier.weight - lighter.weight + (oneEnd ? hardwareWeight : 0);
    if (difference < 0 || difference > maxDifference) return;
    const total = base + heavier.weight + lighter.weight + hardwareWeight * (item ? ends : 0);
    if (total > maxTotal || heavier.weight + lighter.weight > maxPlates) return;
    candidates.push({
      total,
      positions: [heavier.plates, lighter.plates],
      ...(item ? { hardware: selected.option } : {}),
      hardwareOn: [item !== undefined, item !== undefined && !oneEnd],
      plateCount: heavier.plates.length + lighter.plates.length,
      uneven: difference > 0,
      difference,
      heavier: 0,
      skipped: selected.skipped,
    });
  };

  for (const heavier of ends) {
    for (const lighter of ends) {
      if (heavier.weight < lighter.weight || heavier.weight - lighter.weight > maxDifference) continue;
      if (!poolHolds(heavier, lighter)) continue;
      add(heavier, lighter, false);
    }
  }
  const empty = ends.find((end) => end.plates.length === 0)!;
  if (maxDifference > 0) {
    for (const heavier of ends) {
      if (heavier.weight <= maxDifference && poolHolds(heavier)) add(heavier, empty, true);
    }
  }

  const preferred = fitting.options.find((option) => option.item)?.weight ?? 0;
  const limit =
    implement.maxTotal !== undefined
      ? { total: maxTotal, stated: implement.maxTotal, plate: false }
      : implement.maxPlateWeight !== undefined
        ? { total: base + 2 * perPosition * preferred + maxPlates, stated: implement.maxPlateWeight, plate: true }
        : undefined;
  return outcomeOf({ ...setting, warnings, allowance, ...(limit ? { limit } : {}) }, candidates);
}
