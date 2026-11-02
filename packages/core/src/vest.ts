import { baseOf, outcomeOf, type Candidate, type Outcome, type Setting } from "./outcome.js";
import { plateOptions, type PlateOption } from "./parts.js";
import { thousandths } from "./weight.js";

/** Load for a vest: plates split between front and back as evenly as possible by weight, the heavier side at the back. */
export function loadVest(setting: Setting): Outcome {
  const { inventory, implement } = setting;
  const options = plateOptions(inventory, implement);
  const base = baseOf(implement);
  const maxTotal = implement.maxTotal === undefined ? Infinity : thousandths(implement.maxTotal);
  const maxPlates = implement.maxPlateWeight === undefined ? Infinity : thousandths(implement.maxPlateWeight);

  const candidates: Candidate[] = [];
  const walk = (index: number, counts: number[], weight: number) => {
    const option = options[index];
    if (!option) {
      const split = evenSplit(options, counts);
      if (!split) return;
      const total = base + weight;
      if (total > maxTotal) return;
      candidates.push({
        total,
        positions: split,
        hardwareOn: [false, false],
        plateCount: counts.reduce((sum, count) => sum + count, 0),
        uneven: false,
        difference: 0,
        skipped: [],
      });
      return;
    }
    const most = Math.min(option.plate.count, 2 * option.cap);
    for (let count = 0; count <= most; count++) {
      const next = weight + option.weight * count;
      if (next > maxPlates) break;
      walk(index + 1, [...counts, count], next);
    }
  };
  walk(0, [], 0);

  const limit =
    implement.maxPlateWeight !== undefined
      ? { total: base + maxPlates, stated: implement.maxPlateWeight, plate: true }
      : implement.maxTotal !== undefined
        ? { total: maxTotal, stated: implement.maxTotal, plate: false }
        : undefined;
  return outcomeOf({ ...setting, ...(limit ? { limit } : {}) }, candidates);
}

/** The front and back for these plate counts with the smallest difference, the back no lighter than the front, within each position's caps. */
export function evenSplit(options: PlateOption[], counts: number[]): [PlateOption[], PlateOption[]] | undefined {
  const total = options.reduce((sum, option, i) => sum + option.weight * counts[i]!, 0);
  let best: number[] | undefined;
  let bestGap = Infinity;
  const walk = (index: number, front: number[], weight: number) => {
    const option = options[index];
    if (!option) {
      const gap = total - 2 * weight;
      if (gap >= 0 && gap < bestGap) {
        best = front;
        bestGap = gap;
      }
      return;
    }
    const count = counts[index]!;
    for (let onFront = Math.max(0, count - option.cap); onFront <= Math.min(count, option.cap); onFront++) {
      walk(index + 1, [...front, onFront], weight + option.weight * onFront);
    }
  };
  walk(0, [], 0);
  if (!best) return undefined;
  const front = best;
  const placed = (amount: (i: number) => number) => options.flatMap((option, i) => Array<PlateOption>(amount(i)).fill(option));
  return [placed((i) => front[i]!), placed((i) => counts[i]! - front[i]!)];
}
