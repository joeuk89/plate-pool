import type { Inventory, Unit } from "./inventory.js";
import type { CollarChoice, Loading, LoadResult } from "./load.js";
import { load } from "./request.js";
import { RequestError } from "./request-error.js";
import { convert, parseWeight, thousandths, used, type Display } from "./weight.js";

const MICRO_PLATE = "ql-micro";

export interface ListOptions {
  implement: string;
  pair?: boolean;
  collars?: CollarChoice;
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
  micro: boolean;
  screw?: string;
}

export interface ListResponse {
  implement: string;
  pair?: boolean;
  rows: ListRow[];
  warnings: string[];
  unverified: string[];
}

export function list(inventory: Inventory, request: ListRequest): ListResponse {
  const { unit, loadAt, nextAbove } = walker(inventory, request);
  const from = request.from === undefined ? 0 : milliOf(request.from, unit);
  const to = request.to === undefined ? Infinity : milliOf(request.to, unit);
  if (from > to) throw new RequestError(`The range starts at ${request.from} and ends at ${request.to}. Its start must not be above its end.`);

  const rows: ListRow[] = [];
  const warnings = new Set<string>();
  const unverified = new Set<string>();
  for (let next = nextAbove(from - 1); next !== undefined && next <= to; next = nextAbove(next)) {
    const result = loadAt(next);
    if (!result?.exact || !result.loading) continue;
    rows.push(rowOf(inventory, result.loading));
    for (const warning of result.warnings) warnings.add(warning);
    for (const key of result.unverified) unverified.add(key);
  }
  return {
    implement: request.implement,
    ...(request.implement === "dumbbell" ? { pair: request.pair ?? true } : {}),
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

  const loadAt = (milli: number): LoadResult | undefined => {
    if (milli <= 0) return undefined;
    const response = load(inventory, {
      targets: [{ implement: implement.id, target: `${milli / 1000}${unit}`, ...(options.pair === undefined ? {} : { pair: options.pair }) }],
      ...(options.collars === undefined ? {} : { collars: options.collars }),
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

  return { unit, loadAt, nextAbove };
}

function rowOf(inventory: Inventory, loading: Loading): ListRow {
  const micro = inventory.plates.find((plate) => plate.id === MICRO_PLATE);
  const screw = loading.hardware.find(({ id }) => inventory.hardware.find((item) => item.id === id)?.kind === "screw");
  return {
    total: loading.total,
    loading,
    uneven: loading.uneven,
    micro: micro !== undefined && loading.positions.some(({ plates }) => plates.includes(used(micro.weight))),
    ...(screw ? { screw: screw.id } : {}),
  };
}

function milliOf(text: string, unit: Unit): number {
  const weight = parseWeight(text, unit, { allowZero: true });
  return convert(thousandths(weight.amount), weight.unit, unit);
}
