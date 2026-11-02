import type { Inventory, Unit } from "./inventory.js";
import type { Loading, LoadResult } from "./load.js";
import { pairOf, plateOptions } from "./parts.js";
import { load } from "./request.js";
import { RequestError } from "./request-error.js";
import { convert, parseWeight, thousandths, type Display } from "./weight.js";

export interface ListOptions {
  implement: string;
  pair?: boolean;
  /** A fixed hardware choice: a hardware id from the implement's options, or "none". */
  hardware?: string;
  uneven?: boolean;
}

export interface ListRequest extends ListOptions {
  from?: string;
  to?: string;
}

export interface StepRequest extends ListOptions {
  target?: string;
}

export interface ListRow {
  total: Display;
  loading: Loading;
  uneven: boolean;
  /** The loading uses the lightest plate the implement takes. */
  smallest: boolean;
}

export interface ListResponse {
  implement: string;
  pair?: boolean;
  rows: ListRow[];
  warnings: string[];
  unverified: string[];
}

export function list(inventory: Inventory, request: ListRequest): ListResponse {
  const { unit, loadAt, nextAbove, pair, smallestIds } = walker(inventory, request);
  const from = request.from === undefined ? 0 : milliOf(request.from, unit);
  const to = request.to === undefined ? Infinity : milliOf(request.to, unit);
  if (from > to) throw new RequestError(`The range starts at ${request.from} and ends at ${request.to}. Its start must not be above its end.`);

  const rows: ListRow[] = [];
  const warnings = new Set<string>();
  const unverified = new Set<string>();
  for (let next = nextAbove(from - 1); next !== undefined && next <= to; next = nextAbove(next)) {
    const result = loadAt(next);
    if (!result?.exact || !result.loading) continue;
    const loading = result.loading;
    rows.push({
      total: loading.total,
      loading,
      uneven: loading.uneven,
      smallest: loading.positions.some(({ ids }) => ids.some((id) => smallestIds.has(id))),
    });
    for (const warning of result.warnings) warnings.add(warning);
    for (const key of result.unverified) unverified.add(key);
  }
  return {
    implement: request.implement,
    ...(pair !== undefined ? { pair } : {}),
    rows,
    warnings: [...warnings],
    unverified: [...unverified],
  };
}

export function step(inventory: Inventory, request: StepRequest, direction: "up" | "down"): Display | undefined {
  const { unit, loadAt, nextAbove } = walker(inventory, request);
  const current = request.target === undefined || request.target.trim() === "" ? 0 : milliOf(request.target, unit);
  if (direction === "up") {
    const next = nextAbove(current);
    return next === undefined ? undefined : loadAt(next)?.loading?.total;
  }
  const result = loadAt(current - 1);
  return result?.exact ? result.loading?.total : result?.below?.total;
}

function walker(inventory: Inventory, options: ListOptions) {
  const implement = inventory.implements.find((candidate) => candidate.id === options.implement);
  if (!implement) throw new RequestError(`Unknown implement "${options.implement}".`);
  const unit = implement.unit;
  const pair = pairOf(implement, options);
  const accepted = plateOptions(inventory, implement);
  const lightest = Math.min(...accepted.map((option) => option.weight));
  const smallestIds = new Set(accepted.filter((option) => option.weight === lightest).map((option) => option.plate.id));

  const loadAt = (milli: number): LoadResult | undefined => {
    if (milli <= 0) return undefined;
    const response = load(inventory, {
      targets: [{ implement: implement.id, target: `${milli / 1000}${unit}`, ...(pair === undefined ? {} : { pair }) }],
      ...(options.hardware === undefined ? {} : { hardware: { [implement.id]: options.hardware } }),
      ...(options.uneven === undefined ? {} : { uneven: options.uneven }),
    });
    return response.results[0];
  };

  const nextAbove = (milli: number): number | undefined => {
    const target = Math.max(milli + 1, 1);
    const result = loadAt(target);
    if (result?.exact) return target;
    return result?.above && thousandths(result.above.total[unit]);
  };

  return { unit, loadAt, nextAbove, pair, smallestIds };
}

function milliOf(text: string, unit: Unit): number {
  const weight = parseWeight(text, unit, { allowZero: true });
  return convert(thousandths(weight.amount), weight.unit, unit);
}
