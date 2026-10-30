export interface PositionChanges {
  name: string;
  keep: number[];
  remove: number[];
  add: number[];
}

export interface HardwareChanges {
  from?: string;
  to?: string;
  count: number;
}

export interface Changes {
  count: number;
  positions: PositionChanges[];
  hardware: HardwareChanges[];
}

/** A current loading resolved against one implement: plates innermost first and the screw (if any) on each position. */
export interface Resolved {
  plates: number[][];
  screws: (string | undefined)[];
}

export interface Arranged {
  plates: number[][];
  changes: Changes;
}

interface Proposal {
  positions: string[];
  /** Plates per position in fresh order: heaviest innermost, micro outermost. */
  fresh: number[][];
  screws: (string | undefined)[];
  /** Positions that must carry the same plates in the same order, such as the two sides of the bar. */
  symmetric: boolean;
  /** How many implements carry this loading: two for a dumbbell pair. */
  copies: number;
}

export function arrange(current: Resolved, proposal: Proposal): Arranged {
  const { positions, fresh, screws, symmetric, copies } = proposal;
  const plates = symmetric
    ? bestSymmetric(current, fresh[0] ?? [], positions.length)
    : fresh.map((plates, i) => keptThenAdded(current.plates[i] ?? [], plates));

  const positionChanges = positions.map((name, i) => {
    const now = current.plates[i] ?? [];
    const next = plates[i]!;
    const kept = sharedRun(now, next);
    return { name, keep: next.slice(0, kept), remove: now.slice(kept), add: next.slice(kept) };
  });

  const hardware: HardwareChanges[] = [];
  let screwChanges = 0;
  positions.forEach((_, i) => {
    const from = current.screws[i];
    const to = screws[i];
    if (from === to) return;
    screwChanges += from && to ? 2 : 1;
    const entry = hardware.find((item) => item.from === from && item.to === to);
    if (entry) entry.count++;
    else hardware.push({ ...(from ? { from } : {}), ...(to ? { to } : {}), count: 1 });
  });

  const plateChanges = positionChanges.reduce((sum, { remove, add }) => sum + remove.length + add.length, 0);
  return { plates, changes: { count: copies * (plateChanges + screwChanges), positions: positionChanges, hardware } };
}

function keptThenAdded(current: number[], fresh: number[]): number[] {
  const rest = [...fresh];
  const kept: number[] = [];
  for (const plate of current) {
    const at = rest.indexOf(plate);
    if (at === -1) break;
    rest.splice(at, 1);
    kept.push(plate);
  }
  return [...kept, ...rest];
}

// Some side's kept-then-added order is always optimal: any other order shares no more of its innermost run with either side.
function bestSymmetric(current: Resolved, fresh: number[], positions: number): number[][] {
  const options = [fresh, ...current.plates.map((plates) => keptThenAdded(plates, fresh))];
  const cost = (order: number[]) =>
    Array.from({ length: positions }, (_, i) => current.plates[i] ?? []).reduce(
      (sum, now) => sum + now.length + order.length - 2 * sharedRun(now, order),
      0,
    );
  const best = options.reduce((a, b) => (cost(b) < cost(a) ? b : a));
  return Array.from({ length: positions }, () => best);
}

function sharedRun(a: number[], b: number[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
