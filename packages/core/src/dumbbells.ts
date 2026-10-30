import { arrange, type Changes, type Resolved } from "./changes.js";
import type { Hardware, Implement, Inventory, Plate } from "./inventory.js";
import { changesOf, choose, sidesFor, type Loading, type LoadResult, type Outcome, type TargetRequest } from "./load.js";
import { convert, describeWeight, display, parseWeight, thousandths, used } from "./weight.js";

const MICRO_PLATE = "ql-micro";
const STANDARD_SCREW = "screw-standard";
const LONG_SCREW = "screw-long";
export const STANDARD_SCREW_MAX_TOTAL_LB = 75;
export const SMALL_PLATE_LB = 2.5;
export const UNEVEN_LB = 2.5;
export const UNEVEN_WITHOUT_SMALL_PLATES_LB = 5;
const MAX_ALTERNATIVES = 5;

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
  screws: number;
  heavier: End;
  lighter: End;
  plateCount: number;
  difference: number;
  uneven: boolean;
  /** The heavier end sits on the second position. */
  flipped?: boolean;
  order?: number[][];
  changes?: Changes;
}

export function loadDumbbells(
  inventory: Inventory,
  implement: Implement,
  request: TargetRequest,
  unevenAllowed: boolean,
  current: Resolved | undefined,
): Outcome {
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
  const fresh: Candidate[] = [];
  const empty = emptyEnd(options);
  if (implement.hardware?.options.includes("none") ?? true) {
    fresh.push({ total: handle, screws: 0, heavier: empty, lighter: empty, plateCount: 0, difference: 0, uneven: false });
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
        fresh.push({
          total,
          screw,
          screws: screwsPerDumbbell,
          heavier,
          lighter,
          plateCount: heavier.plateCount + lighter.plateCount,
          difference,
          uneven: difference > 0,
        });
      }
    }
  }

  // One screw on one end and nothing on the other: the screw's own weight makes the ends uneven.
  for (const heavier of ends) {
    if (options.some((option, i) => dumbbells * heavier.counts[i]! > option.plate.count)) continue;
    for (const screw of screws) {
      const screwWeight = convert(thousandths(used(screw.weight)), screw.unit, unit);
      const difference = heavier.weight + screwWeight;
      const total = handle + difference;
      if (difference > maxDifference || screwFor(total) !== screw || screw.count < dumbbells || total > maxTotal) continue;
      if (!fitsScrew(screw, heavier)) continue;
      fresh.push({ total, screw, screws: 1, heavier, lighter: empty, plateCount: heavier.plateCount, difference, uneven: true });
    }
  }

  const placed = (candidate: Candidate) => (candidate.flipped ? [candidate.lighter, candidate.heavier] : [candidate.heavier, candidate.lighter]);
  const screwsOn = (candidate: Candidate) =>
    placed(candidate).map((end) =>
      candidate.screws === 2 || (candidate.screws === 1 && end === candidate.heavier) ? candidate.screw?.id : undefined,
    );
  const withChanges = (candidate: Candidate, flipped: boolean): Candidate => {
    const turned = { ...candidate, flipped };
    const { plates, changes } = arrange(current!, {
      positions: implement.positions,
      fresh: placed(turned).map((end) => platesInOrder(options, end)),
      screws: screwsOn(turned),
      symmetric: false,
      copies: dumbbells,
    });
    return { ...turned, order: plates, changes };
  };
  const turnable = (candidate: Candidate) => candidate.screws === 1 || candidate.heavier.counts.join() !== candidate.lighter.counts.join();
  const ranking = current
    ? fresh.flatMap((candidate) => [withChanges(candidate, false), ...(turnable(candidate) ? [withChanges(candidate, true)] : [])])
    : fresh;

  const toLoading = (candidate: Candidate): Loading => ({
    total: display(candidate.total, unit),
    hardware: candidate.screw ? [{ id: candidate.screw.id, count: candidate.screws }] : [],
    positions: implement.positions.map((name, index) => ({
      name,
      plates: candidate.order?.[index] ?? platesInOrder(options, placed(candidate)[index]!),
    })),
    uneven: candidate.uneven,
    ...(candidate.uneven ? { heavier: implement.positions[candidate.flipped ? 1 : 0] } : {}),
    ...(candidate.changes ? { changes: candidate.changes } : {}),
  });

  const choice = choose(ranking, targetMilli, (list) => ranked(list, options), changesOf);
  const refused = targetMilli > maxTotal ? { limit: display(maxTotal, unit) } : undefined;

  const result = (pick: number): LoadResult => {
    const { exact, below, above } = sidesFor(choice, choice.picks[pick]);
    const warnings: string[] = [];
    if (refused) {
      const heaviest = below ? ` Heaviest allowed: ${describeWeight(display(below.total, unit), unit)}.` : "";
      warnings.push(`Refused: over the ${refused.limit[unit]} ${unit} limit per dumbbell.${heaviest}`);
    }

    const shown = [exact, below, above].filter((candidate) => candidate !== undefined);
    if (shown.some((candidate) => candidate.difference > fromLb(UNEVEN_LB))) {
      warnings.push(`The ends differ by ${UNEVEN_WITHOUT_SMALL_PLATES_LB} lb because no ${SMALL_PLATE_LB} lb or micro plate is free.`);
    }

    const others = exact ? otherWays(choice.picks, exact, options) : [];
    const listed = [...shown, ...others];
    const listedScrews = new Set(listed.map((candidate) => candidate.screw).filter((screw) => screw !== undefined));
    const unverified = [
      ...(implement.base.status === "unverified" ? [`${implement.id}.base`] : []),
      ...[...listedScrews].filter((screw) => screw.weight.status === "unverified").map((screw) => `${screw.id}.weight`),
      ...[...listedScrews].filter((screw) => screw.minStackIn?.status === "unverified").map((screw) => `${screw.id}.minStackIn`),
      ...options
        .filter(
          (option, i) =>
            option.plate.weight.status === "unverified" &&
            listed.some((candidate) => candidate.heavier.counts[i]! + candidate.lighter.counts[i]! > 0),
        )
        .map((option) => `${option.plate.id}.weight`),
    ];

    return {
      implement: implement.id,
      pair,
      target: display(targetMilli, unit),
      exact: choice.exact,
      ...(refused ? { refused } : {}),
      ...(choice.recommended ? { recommended: choice.recommended } : {}),
      ...(exact ? { loading: toLoading(exact) } : {}),
      ...(below ? { below: toLoading(below) } : {}),
      ...(above ? { above: toLoading(above) } : {}),
      alternatives: others.map(toLoading),
      warnings,
      unverified,
    };
  };

  return {
    target: targetMilli,
    ...(choice.picks[0] ? { total: choice.picks[0].total } : {}),
    picks: choice.picks.map((candidate) => ({
      plates: new Map(options.map((option, i) => [option.plate.id, dumbbells * (candidate.heavier.counts[i]! + candidate.lighter.counts[i]!)])),
      hardware: new Map(candidate.screw ? [[candidate.screw.id, candidate.screws * dumbbells]] : []),
      plateCount: dumbbells * candidate.plateCount,
      uneven: candidate.uneven ? dumbbells : 0,
      changes: changesOf(candidate),
    })),
    result,
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

function otherWays(candidates: Candidate[], chosen: Candidate, options: PlateOption[]): Candidate[] {
  const seen = new Set([layoutKey(chosen)]);
  const others: Candidate[] = [];
  for (const candidate of ranked(candidates, options)) {
    const key = layoutKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    others.push(candidate);
    if (others.length === MAX_ALTERNATIVES) break;
  }
  return others;
}

function ranked(candidates: Candidate[], options: PlateOption[]): Candidate[] {
  return [...candidates].sort(
    (a, b) =>
      changesOf(a) - changesOf(b) ||
      a.plateCount - b.plateCount ||
      Number(a.uneven) - Number(b.uneven) ||
      heavierFirst(a, b, options),
  );
}

// Two ends of equal weight swapped between end A and end B are the same loading turned round.
function layoutKey(candidate: Candidate): string {
  const ends = [candidate.heavier.counts.join(), candidate.lighter.counts.join()].sort();
  return [candidate.screw?.id ?? "", candidate.screws, ...ends].join("|");
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
