import type { Hardware, Implement, Inventory, Plate } from "./inventory.js";
import type { Chosen, Loading, LoadResult, TargetRequest } from "./load.js";
import { convert, describeWeight, display, parseWeight, thousandths, used } from "./weight.js";

const MICRO_PLATE = "ql-micro";
const STANDARD_SCREW = "screw-standard";
const LONG_SCREW = "screw-long";
const STANDARD_SCREW_MAX_TOTAL_LB = 75;
const SMALL_PLATE_LB = 2.5;
const UNEVEN_LB = 2.5;
const UNEVEN_WITHOUT_SMALL_PLATES_LB = 5;

interface PlateOption {
  plate: Plate;
  weight: number;
  stackLength: number;
}

interface End {
  counts: number[];
  weight: number;
  length: number;
  plateCount: number;
}

interface Candidate {
  total: number;
  screw?: Hardware;
  heavier: End;
  lighter: End;
  plateCount: number;
  uneven: boolean;
}

export function loadDumbbells(inventory: Inventory, implement: Implement, request: TargetRequest, unevenAllowed: boolean): Chosen {
  const pair = request.pair ?? true;
  const dumbbells = pair ? 2 : 1;
  const unit = implement.unit;
  const fromLb = (amount: number) => convert(thousandths(amount), "lb", unit);
  const target = parseWeight(request.target, unit);
  const targetMilli = convert(thousandths(target.amount), target.unit, unit);

  const options = plateOptions(inventory, implement);
  const smallPlateFree = options.some((option) => option.weight <= fromLb(SMALL_PLATE_LB) && option.plate.count >= dumbbells);
  const maxDifference = !unevenAllowed ? 0 : fromLb(smallPlateFree ? UNEVEN_LB : UNEVEN_WITHOUT_SMALL_PLATES_LB);
  const maxTotal = implement.maxTotal === undefined ? Infinity : thousandths(implement.maxTotal);

  const screws = (implement.hardware?.options ?? [])
    .map((id) => inventory.hardware.find((item) => item.id === id))
    .filter((item): item is Hardware => item?.kind === "screw");
  const screwsPerDumbbell = (implement.hardware?.perPosition ?? 1) * implement.positions.length;
  const screwFor = (total: number) => {
    const id = total <= fromLb(STANDARD_SCREW_MAX_TOTAL_LB) ? STANDARD_SCREW : LONG_SCREW;
    return screws.find((screw) => screw.id === id);
  };

  const handle = thousandths(used(implement.base));
  const candidates: Candidate[] = [];
  if (implement.hardware?.options.includes("none") ?? true) {
    const empty = emptyEnd(options);
    candidates.push({ total: handle, heavier: empty, lighter: empty, plateCount: 0, uneven: false });
  }

  const longestEnd = Math.max(0, ...screws.map((screw) => thousandths(screw.capacityIn ?? 0)));
  const ends = endsFor(options, longestEnd);
  for (const heavier of ends) {
    for (const lighter of ends) {
      const difference = heavier.weight - lighter.weight;
      if (difference < 0 || difference > maxDifference) continue;
      if (options.some((option, i) => dumbbells * (heavier.counts[i]! + lighter.counts[i]!) > option.plate.count)) continue;
      const withoutScrews = handle + heavier.weight + lighter.weight;
      for (const screw of screws) {
        const total = withoutScrews + screwsPerDumbbell * convert(thousandths(used(screw.weight)), screw.unit, unit);
        if (screwFor(total) !== screw || screw.count < screwsPerDumbbell * dumbbells || total > maxTotal) continue;
        if (!fitsScrew(screw, heavier) || !fitsScrew(screw, lighter)) continue;
        candidates.push({ total, screw, heavier, lighter, plateCount: heavier.plateCount + lighter.plateCount, uneven: difference > 0 });
      }
    }
  }

  const toLoading = (candidate: Candidate): Loading => ({
    total: display(candidate.total, unit),
    hardware: candidate.screw ? [{ id: candidate.screw.id, count: screwsPerDumbbell }] : [],
    positions: implement.positions.map((name, index) => ({
      name,
      plates: platesInOrder(options, index === 0 ? candidate.heavier : candidate.lighter),
    })),
    uneven: candidate.uneven,
    ...(candidate.uneven ? { heavier: implement.positions[0] } : {}),
  });

  const exact = best(candidates.filter((candidate) => candidate.total === targetMilli), options);
  const below = exact ? undefined : closest(candidates.filter((candidate) => candidate.total < targetMilli), targetMilli, options);
  const above = exact ? undefined : closest(candidates.filter((candidate) => candidate.total > targetMilli), targetMilli, options);
  const recommended =
    exact ?? (below && (!above || targetMilli - below.total <= above.total - targetMilli) ? below : above);

  const warnings: string[] = [];
  const refused = targetMilli > maxTotal ? { limit: display(maxTotal, unit) } : undefined;
  if (refused) {
    const heaviest = below ? ` Heaviest allowed: ${describeWeight(display(below.total, unit), unit)}.` : "";
    warnings.push(`Refused: over the ${refused.limit[unit]} ${unit} limit per dumbbell.${heaviest}`);
  }

  const shown = [exact, below, above].filter((candidate) => candidate !== undefined);
  if (shown.some((candidate) => candidate.heavier.weight - candidate.lighter.weight > fromLb(UNEVEN_LB))) {
    warnings.push(`The ends differ by ${UNEVEN_WITHOUT_SMALL_PLATES_LB} lb because no ${SMALL_PLATE_LB} lb or micro plate is free.`);
  }

  const shownScrews = new Set(shown.map((candidate) => candidate.screw).filter((screw) => screw !== undefined));
  const unverified = [
    ...(implement.base.status === "unverified" ? [`${implement.id}.base`] : []),
    ...[...shownScrews].filter((screw) => screw.weight.status === "unverified").map((screw) => `${screw.id}.weight`),
    ...[...shownScrews].filter((screw) => screw.minStackIn?.status === "unverified").map((screw) => `${screw.id}.minStackIn`),
    ...options
      .filter(
        (option, i) =>
          option.plate.weight.status === "unverified" &&
          shown.some((candidate) => candidate.heavier.counts[i]! + candidate.lighter.counts[i]! > 0),
      )
      .map((option) => `${option.plate.id}.weight`),
  ];

  const result: LoadResult = {
    implement: implement.id,
    pair,
    target: display(targetMilli, unit),
    exact: exact !== undefined,
    ...(refused ? { refused } : {}),
    ...(!exact && recommended ? { recommended: recommended === below ? ("below" as const) : ("above" as const) } : {}),
    ...(exact ? { loading: toLoading(exact) } : {}),
    ...(below ? { below: toLoading(below) } : {}),
    ...(above ? { above: toLoading(above) } : {}),
    alternatives: [],
    warnings,
    unverified,
  };

  return {
    result,
    plates: new Map(
      recommended
        ? options.map((option, i) => [option.plate.id, dumbbells * (recommended.heavier.counts[i]! + recommended.lighter.counts[i]!)])
        : [],
    ),
    hardware: new Map(recommended?.screw ? [[recommended.screw.id, screwsPerDumbbell * dumbbells]] : []),
  };
}

function plateOptions(inventory: Inventory, implement: Implement): PlateOption[] {
  const plateUnit = (plate: Plate) => inventory.plateTypes.find((type) => type.id === plate.type)?.unit ?? implement.unit;
  return inventory.plates
    .filter((plate) => implement.accepts.includes(plate.type))
    .map((plate) => ({
      plate,
      weight: convert(thousandths(used(plate.weight)), plateUnit(plate), implement.unit),
      stackLength: plate.stackLengthIn ? thousandths(used(plate.stackLengthIn)) : 0,
    }))
    .sort((a, b) => Number(a.plate.id === MICRO_PLATE) - Number(b.plate.id === MICRO_PLATE) || b.weight - a.weight);
}

function emptyEnd(options: PlateOption[]): End {
  return { counts: options.map(() => 0), weight: 0, length: 0, plateCount: 0 };
}

function endsFor(options: PlateOption[], capacity: number): End[] {
  const ends: End[] = [];
  const walk = (index: number, end: End) => {
    if (end.length > capacity) return;
    const option = options[index];
    if (!option) {
      ends.push(end);
      return;
    }
    const max = Math.min(option.plate.count, option.plate.id === MICRO_PLATE ? 1 : Infinity);
    for (let count = 0; count <= max; count++) {
      const length = end.length + option.stackLength * count;
      if (length > capacity) break;
      walk(index + 1, {
        counts: [...end.counts, count],
        weight: end.weight + option.weight * count,
        length,
        plateCount: end.plateCount + count,
      });
    }
  };
  walk(0, { counts: [], weight: 0, length: 0, plateCount: 0 });
  return ends;
}

function fitsScrew(screw: Hardware, end: End): boolean {
  if (end.length > thousandths(screw.capacityIn ?? Infinity)) return false;
  return screw.minStackIn === undefined || end.length >= thousandths(used(screw.minStackIn));
}

function closest(candidates: Candidate[], target: number, options: PlateOption[]): Candidate | undefined {
  const distance = Math.min(...candidates.map((candidate) => Math.abs(candidate.total - target)));
  return best(
    candidates.filter((candidate) => Math.abs(candidate.total - target) === distance),
    options,
  );
}

function best(candidates: Candidate[], options: PlateOption[]): Candidate | undefined {
  return [...candidates].sort(
    (a, b) => a.plateCount - b.plateCount || Number(a.uneven) - Number(b.uneven) || heavierFirst(a, b, options),
  )[0];
}

function heavierFirst(a: Candidate, b: Candidate, options: PlateOption[]): number {
  const left = [...platesInOrder(options, a.heavier), ...platesInOrder(options, a.lighter)];
  const right = [...platesInOrder(options, b.heavier), ...platesInOrder(options, b.lighter)];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (right[i] ?? 0) - (left[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function platesInOrder(options: PlateOption[], end: End): number[] {
  return options.flatMap((option, i) => Array<number>(end.counts[i]!).fill(used(option.plate.weight)));
}
