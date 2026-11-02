import { arrange, type Changes, type Resolved } from "./changes.js";
import type { Implement, Inventory } from "./inventory.js";
import type { Loading, LoadResult } from "./load.js";
import { lower, NONE, positionNames, type HardwareOption, type PlateOption } from "./parts.js";
import { convert, describeWeight, display, parseWeight, thousandths, used } from "./weight.js";

const MAX_ALTERNATIVES = 5;

export interface Candidate {
  total: number;
  /** Plates per position, innermost first. */
  positions: PlateOption[][];
  hardware?: HardwareOption;
  hardwareOn: boolean[];
  plateCount: number;
  uneven: boolean;
  difference: number;
  /** On a handle, the position of the end built as the heavier one. */
  heavier?: number;
  /** Hardware that fit but was not free, so a later option was used. */
  skipped: HardwareOption[];
  ids?: string[][];
  changes?: Changes;
}

export interface Usage {
  plates: Map<string, number>;
  hardware: Map<string, number>;
  plateCount: number;
  uneven: number;
  changes: number;
}

export interface Outcome {
  target: number;
  total?: number;
  picks: Usage[];
  result(pick: number): LoadResult;
}

export interface Limit {
  /** The highest target the limit allows, in thousandths of the implement's unit. */
  total: number;
  /** The limit as stated in the file. */
  stated: number;
  plate: boolean;
}

export interface Setting {
  inventory: Inventory;
  implement: Implement;
  target: string;
  pair?: boolean;
  copies: number;
  current: Resolved | undefined;
  /** Stated before the results, such as a hardware shortage. */
  warnings: string[];
  limit?: Limit;
  /** The heaviest uneven difference the rules allow without relaxing, for the relaxed-allowance warning. */
  allowance?: number;
}

interface Choice {
  exact: boolean;
  picks: Candidate[];
  below?: Candidate;
  above?: Candidate;
  recommended?: "below" | "above";
}

export function changesOf(candidate: { changes?: Changes }): number {
  return candidate.changes?.count ?? 0;
}

function choose(candidates: Candidate[], target: number): Choice {
  const at = (total: number) => ranked(candidates.filter((candidate) => candidate.total === total));
  const exact = at(target);
  if (exact.length > 0) return { exact: true, picks: exact };
  const under = Math.max(...candidates.map((candidate) => candidate.total).filter((total) => total < target));
  const over = Math.min(...candidates.map((candidate) => candidate.total).filter((total) => total > target));
  const below = Number.isFinite(under) ? at(under) : [];
  const above = Number.isFinite(over) ? at(over) : [];
  const belowWins = () => {
    const nearer = over - target - (target - under);
    return nearer !== 0 ? nearer > 0 : changesOf(below[0]!) <= changesOf(above[0]!);
  };
  const recommended = below.length > 0 && (above.length === 0 || belowWins()) ? "below" : above.length > 0 ? "above" : undefined;
  return {
    exact: false,
    picks: recommended === "below" ? below : recommended === "above" ? above : [],
    ...(below[0] ? { below: below[0] } : {}),
    ...(above[0] ? { above: above[0] } : {}),
    ...(recommended ? { recommended } : {}),
  };
}

function ranked(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort(
    (a, b) =>
      changesOf(a) - changesOf(b) || a.plateCount - b.plateCount || Number(a.uneven) - Number(b.uneven) || heavierFirst(a, b),
  );
}

function rankOrder(candidate: Candidate): number[] {
  const order = candidate.heavier === 1 ? [...candidate.positions].reverse() : candidate.positions;
  return order.flat().map((option) => option.weight);
}

function heavierFirst(a: Candidate, b: Candidate): number {
  const left = rankOrder(a);
  const right = rankOrder(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (right[i] ?? 0) - (left[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

// Two positions swapped between end A and end B are the same loading turned round.
function layoutKey(candidate: Candidate): string {
  const positions = candidate.positions.map((plates, i) => `${candidate.hardwareOn[i] ? "+" : ""}${plates.map(({ plate }) => plate.id).join()}`);
  return [candidate.hardware?.id ?? NONE, ...positions.sort()].join("|");
}

function otherWays(candidates: Candidate[], chosen: Candidate): Candidate[] {
  const seen = new Set([layoutKey(chosen)]);
  const others: Candidate[] = [];
  for (const candidate of ranked(candidates)) {
    const key = layoutKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    others.push(candidate);
    if (others.length === MAX_ALTERNATIVES) break;
  }
  return others;
}

export function pieces(implement: Implement, candidate: Candidate): number {
  if (!candidate.hardware?.item) return 0;
  return (implement.hardware?.perPosition ?? 1) * candidate.hardwareOn.filter(Boolean).length;
}

function counted(candidate: Candidate, i: number): string | undefined {
  const item = candidate.hardware?.item;
  return item && candidate.hardwareOn[i] && (item.kind === "screw" || item.kind === "pin") ? item.id : undefined;
}

function freshIds(candidate: Candidate): string[][] {
  return candidate.positions.map((plates) => plates.map(({ plate }) => plate.id));
}

function withCurrent(setting: Setting, candidates: Candidate[]): Candidate[] {
  const { implement, current, copies, inventory } = setting;
  if (!current) return candidates;
  const names = positionNames(implement);
  const weightOf = (id: string) => used(inventory.plates.find((plate) => plate.id === id)!.weight);
  const arranged = (candidate: Candidate): Candidate => {
    const { ids, changes } = arrange(current, {
      positions: names,
      fresh: freshIds(candidate),
      hardware: names.map((_, i) => counted(candidate, i)),
      mirrored: implement.kind === "bar",
      loose: implement.kind === "vest",
      copies,
      weightOf,
    });
    return { ...candidate, ids, changes };
  };
  const turned = (candidate: Candidate): Candidate => ({
    ...candidate,
    positions: [...candidate.positions].reverse(),
    hardwareOn: [...candidate.hardwareOn].reverse(),
    ...(candidate.heavier !== undefined ? { heavier: 1 - candidate.heavier } : {}),
  });
  const turnable = (candidate: Candidate) =>
    implement.kind === "handle" &&
    (candidate.hardwareOn[0] !== candidate.hardwareOn[1] || freshIds(candidate)[0]!.join() !== freshIds(candidate)[1]!.join());
  return candidates.flatMap((candidate) => [arranged(candidate), ...(turnable(candidate) ? [arranged(turned(candidate))] : [])]);
}

export function outcomeOf(setting: Setting, fresh: Candidate[]): Outcome {
  const { inventory, implement, copies, limit } = setting;
  const unit = implement.unit;
  const target = parseWeight(setting.target, unit);
  const targetMilli = convert(thousandths(target.amount), target.unit, unit);
  const names = positionNames(implement);
  const candidates = withCurrent(setting, fresh);
  const choice = choose(candidates, targetMilli);
  const refused = limit && targetMilli > limit.total ? { limit: display(thousandths(limit.stated), unit) } : undefined;

  const toLoading = (candidate: Candidate): Loading => {
    const ids = candidate.ids ?? freshIds(candidate);
    const weightOf = (id: string) => used(inventory.plates.find((plate) => plate.id === id)!.weight);
    const count = pieces(implement, candidate);
    return {
      total: display(candidate.total, unit),
      hardware: candidate.hardware?.item && count > 0 ? [{ id: candidate.hardware.id, count }] : [],
      positions: names.map((name, i) => ({ name, plates: ids[i]!.map(weightOf), ids: ids[i]! })),
      uneven: candidate.uneven,
      ...(candidate.uneven && candidate.heavier !== undefined ? { heavier: names[candidate.heavier]! } : {}),
      ...(candidate.changes ? { changes: candidate.changes } : {}),
    };
  };

  const result = (pick: number): LoadResult => {
    const chosen = choice.picks[pick];
    const exact = choice.exact ? chosen : undefined;
    const below = choice.recommended === "below" ? chosen : choice.below;
    const above = choice.recommended === "above" ? chosen : choice.above;
    const others = exact ? otherWays(choice.picks, exact) : [];
    const shown = [exact, below, above].filter((candidate) => candidate !== undefined);
    const listed = [...shown, ...others];

    const warnings = [...setting.warnings];
    if (refused && limit) {
      const heaviest = below ? ` Heaviest allowed: ${describeWeight(display(below.total, unit), unit)}.` : "";
      const per = implement.kind === "handle" && !limit.plate ? ` per ${lower(implement.name)}` : "";
      warnings.push(`Refused: over the ${limit.stated} ${unit} ${limit.plate ? "plate limit" : "limit"}${per}.${heaviest}`);
    }
    const allowance = setting.allowance;
    const widest = Math.max(0, ...shown.map((candidate) => candidate.difference));
    if (allowance !== undefined && widest > allowance) {
      warnings.push(
        `The ends differ by ${display(widest, unit)[unit]} ${unit} because no plate of ${display(allowance, unit)[unit]} ${unit} or less is free.`,
      );
    }
    const fallback = shown.find((candidate) => candidate.skipped.length > 0);
    if (fallback) {
      const chosenItem = fallback.hardware?.item;
      const uses = chosenItem ? `a ${lower(chosenItem.name)}` : "no locking hardware";
      const note = chosenItem?.note ? ` ${chosenItem.note}` : "";
      warnings.push(`No ${lower(fallback.skipped[0]!.item!.name)} is free, so the ${lower(implement.name)} uses ${uses}.${note}`);
    }
    if (implement.note) warnings.push(implement.note);

    return {
      implement: implement.id,
      ...(setting.pair !== undefined ? { pair: setting.pair } : {}),
      target: display(targetMilli, unit),
      exact: choice.exact,
      ...(refused ? { refused } : {}),
      ...(choice.recommended ? { recommended: choice.recommended } : {}),
      ...(exact ? { loading: toLoading(exact) } : {}),
      ...(below ? { below: toLoading(below) } : {}),
      ...(above ? { above: toLoading(above) } : {}),
      alternatives: others.map(toLoading),
      warnings,
      unverified: unverifiedIn(inventory, implement, listed),
    };
  };

  return {
    target: targetMilli,
    ...(choice.picks[0] ? { total: choice.picks[0].total } : {}),
    picks: choice.picks.map((candidate) => {
      const plates = new Map<string, number>();
      for (const option of candidate.positions.flat()) plates.set(option.plate.id, (plates.get(option.plate.id) ?? 0) + copies);
      const count = pieces(implement, candidate);
      return {
        plates,
        hardware: new Map(candidate.hardware?.item && count > 0 ? [[candidate.hardware.id, count * copies]] : []),
        plateCount: copies * candidate.plateCount,
        uneven: candidate.uneven ? copies : 0,
        changes: changesOf(candidate),
      };
    }),
    result,
  };
}

function unverifiedIn(inventory: Inventory, implement: Implement, listed: Candidate[]): string[] {
  const items = [...new Set(listed.map((candidate) => (pieces(implement, candidate) > 0 ? candidate.hardware?.item : undefined)))].filter(
    (item) => item !== undefined,
  );
  const plates = new Set(listed.flatMap((candidate) => candidate.positions.flat().map((option) => option.plate)));
  return [
    ...(implement.base.status === "unverified" ? [`${implement.id}.base`] : []),
    ...(implement.positionLength?.status === "unverified" ? [`${implement.id}.positionLength`] : []),
    ...(implement.baseIncludesHardware ? [] : items.filter((item) => item.weight.status === "unverified").map((item) => `${item.id}.weight`)),
    ...items.filter((item) => item.minStack?.status === "unverified").map((item) => `${item.id}.minStack`),
    ...inventory.plates.filter((plate) => plates.has(plate) && plate.weight.status === "unverified").map((plate) => `${plate.id}.weight`),
    ...inventory.plates
      .filter((plate) => implement.accepts.includes(plate.type) && plate.countStatus === "unverified")
      .map((plate) => `${plate.id}.count`),
  ];
}

export function emptyCandidate(positions: number, total: number): Candidate {
  return {
    total,
    positions: Array.from({ length: positions }, () => []),
    hardwareOn: Array.from({ length: positions }, () => false),
    plateCount: 0,
    uneven: false,
    difference: 0,
    skipped: [],
  };
}

export function baseOf(implement: Implement): number {
  return thousandths(used(implement.base));
}
