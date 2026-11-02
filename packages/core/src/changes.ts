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

/** A current loading resolved against one implement: plate ids innermost first, and the counted hardware (screw or pin) on each position. */
export interface Resolved {
  ids: string[][];
  hardware: (string | undefined)[];
}

export interface Arranged {
  ids: string[][];
  changes: Changes;
}

interface Proposal {
  positions: string[];
  /** Plate ids per position in fresh order: heaviest innermost. */
  fresh: string[][];
  /** The counted hardware (screw or pin) on each position. Collars never count. */
  hardware: (string | undefined)[];
  /** Every position carries the same plates in the same order, as on a bar. */
  mirrored: boolean;
  /** Plates sit side by side, as in a vest, so any plate comes off without moving the others. */
  loose: boolean;
  /** How many implements carry this loading: two for a pair. */
  copies: number;
  weightOf: (id: string) => number;
}

export function arrange(current: Resolved, proposal: Proposal): Arranged {
  const { positions, fresh, hardware, mirrored, loose, copies, weightOf } = proposal;
  const now = (i: number) => current.ids[i] ?? [];
  const ids = mirrored
    ? bestMirrored(current, fresh[0] ?? [], positions.length)
    : fresh.map((plates, i) => (loose ? keptAnywhereThenAdded(now(i), plates) : keptThenAdded(now(i), plates)));

  const weights = (list: string[]) => list.map(weightOf);
  const positionChanges = positions.map((name, i) => {
    const next = ids[i]!;
    if (loose) {
      const kept = keptAnywhereThenAdded(now(i), next).slice(0, shared(now(i), next));
      const remove = without(now(i), kept);
      return { name, keep: weights(kept), remove: weights(remove), add: weights(without(next, kept)) };
    }
    const kept = sharedRun(now(i), next);
    return { name, keep: weights(next.slice(0, kept)), remove: weights(now(i).slice(kept)), add: weights(next.slice(kept)) };
  });

  const hardwareChanges: HardwareChanges[] = [];
  let pieceChanges = 0;
  positions.forEach((_, i) => {
    const from = current.hardware[i];
    const to = hardware[i];
    if (from === to) return;
    pieceChanges += from && to ? 2 : 1;
    const entry = hardwareChanges.find((item) => item.from === from && item.to === to);
    if (entry) entry.count++;
    else hardwareChanges.push({ ...(from ? { from } : {}), ...(to ? { to } : {}), count: 1 });
  });

  const plateChanges = positionChanges.reduce((sum, { remove, add }) => sum + remove.length + add.length, 0);
  return { ids, changes: { count: copies * (plateChanges + pieceChanges), positions: positionChanges, hardware: hardwareChanges } };
}

function keptThenAdded(current: string[], fresh: string[]): string[] {
  const rest = [...fresh];
  const kept: string[] = [];
  for (const plate of current) {
    const at = rest.indexOf(plate);
    if (at === -1) break;
    rest.splice(at, 1);
    kept.push(plate);
  }
  return [...kept, ...rest];
}

function keptAnywhereThenAdded(current: string[], fresh: string[]): string[] {
  const rest = [...fresh];
  const kept: string[] = [];
  for (const plate of current) {
    const at = rest.indexOf(plate);
    if (at === -1) continue;
    rest.splice(at, 1);
    kept.push(plate);
  }
  return [...kept, ...rest];
}

function shared(a: string[], b: string[]): number {
  const rest = [...b];
  let count = 0;
  for (const plate of a) {
    const at = rest.indexOf(plate);
    if (at === -1) continue;
    rest.splice(at, 1);
    count++;
  }
  return count;
}

function without(list: string[], taken: string[]): string[] {
  const rest = [...taken];
  return list.filter((plate) => {
    const at = rest.indexOf(plate);
    if (at === -1) return true;
    rest.splice(at, 1);
    return false;
  });
}

// Some side's kept-then-added order is always optimal: any other order shares no more of its innermost run with either side.
function bestMirrored(current: Resolved, fresh: string[], positions: number): string[][] {
  const options = [fresh, ...current.ids.map((plates) => keptThenAdded(plates, fresh))];
  const cost = (order: string[]) =>
    Array.from({ length: positions }, (_, i) => current.ids[i] ?? []).reduce(
      (sum, now) => sum + now.length + order.length - 2 * sharedRun(now, order),
      0,
    );
  const best = options.reduce((a, b) => (cost(b) < cost(a) ? b : a));
  return Array.from({ length: positions }, () => best);
}

function sharedRun(a: string[], b: string[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
