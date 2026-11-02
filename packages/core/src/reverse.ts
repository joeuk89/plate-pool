import type { Hardware, Implement, Inventory, Plate } from "./inventory.js";
import type { LoadedPosition } from "./load.js";
import {
  amount,
  holds,
  fittingFor,
  lower,
  NONE,
  pairOf,
  plateName,
  plateOptions,
  platesNamed,
  plateWeight,
  positionLabel,
  positionNames,
  type HardwareOption,
  type PlateOption,
} from "./parts.js";
import { RequestError } from "./request-error.js";
import { evenSplit } from "./vest.js";
import { display, thousandths, used, type Display } from "./weight.js";

export interface ReverseRequest {
  implement: string;
  pair?: boolean;
  /** Plates per position, innermost first, by weight; `ids` names the plates where two accepted plates share a weight, and a missing id means the plate is found by weight. */
  positions: { name: string; plates: number[]; ids?: (string | undefined)[] }[];
  /** A hardware id from the implement's options, or "none". Without it the library picks by the hardware rule. */
  hardware?: string;
  /** A handle with hardware on one end only: the end that carries it. */
  hardwareOn?: string;
  uneven?: boolean;
}

export interface ReverseResult {
  implement: string;
  pair?: boolean;
  total: Display;
  hardware: { id: string; count: number }[];
  positions: LoadedPosition[];
  uneven: boolean;
  heavier?: string;
  warnings: string[];
  notes: string[];
  unverified: string[];
}

interface Position {
  name: string;
  placed: PlateOption[];
  weight: number;
  length: number;
  hardware: boolean;
}

interface Checked {
  inventory: Inventory;
  implement: Implement;
  request: ReverseRequest;
  positions: Position[];
  plateWeight: number;
  total: number;
  option: HardwareOption;
  copies: number;
}

export function reverse(inventory: Inventory, request: ReverseRequest): ReverseResult {
  const implement = inventory.implements.find((candidate) => candidate.id === request.implement);
  if (!implement) throw new RequestError(`Unknown implement "${request.implement}".`);
  const names = positionNames(implement);
  for (const position of request.positions) {
    if (!names.includes(position.name)) throw new RequestError(`The ${lower(implement.name)} has no position "${position.name}".`);
  }
  if (request.hardwareOn !== undefined && (implement.kind !== "handle" || !names.includes(request.hardwareOn))) {
    throw new RequestError(`The ${lower(implement.name)} has no end "${request.hardwareOn}" to take hardware on one end.`);
  }

  const accepted = inventory.plates.filter((plate) => implement.accepts.includes(plate.type));
  const optionOf = (plate: Plate): PlateOption => ({
    plate,
    weight: plateWeight(inventory, plate, implement.unit),
    stackLength: plate.stackLength ? thousandths(used(plate.stackLength)) : 0,
    cap: implement.maxPerPosition?.[plate.id] ?? Infinity,
  });
  const positions: Position[] = names.map((name) => {
    const given = request.positions.find((position) => position.name === name);
    const placed = (given?.plates ?? []).map((weight, i) => optionOf(placedPlate(implement, accepted, weight, given?.ids?.[i])));
    return {
      name,
      placed,
      weight: placed.reduce((sum, { weight }) => sum + weight, 0),
      length: placed.reduce((sum, { stackLength }) => sum + stackLength, 0),
      hardware: request.hardwareOn === undefined || request.hardwareOn === name,
    };
  });

  const option = hardwareOf(inventory, implement, request, positions);
  if (!option.item) for (const position of positions) position.hardware = false;
  const plateTotal = positions.reduce((sum, { weight }) => sum + weight, 0);
  const pieces = option.item ? (implement.hardware?.perPosition ?? 1) * positions.filter(({ hardware }) => hardware).length : 0;
  const total = thousandths(used(implement.base)) + plateTotal + pieces * option.weight;

  const heavier = implement.kind === "handle" ? heavierOf(implement, positions, option) : undefined;
  const pair = pairOf(implement, request);
  const checked: Checked = { inventory, implement, request, positions, plateWeight: plateTotal, total, option, copies: pair ? 2 : 1 };

  const platesUsed = [...new Set(positions.flatMap(({ placed }) => placed.map(({ plate }) => plate)))];
  const item = pieces > 0 ? option.item : undefined;
  const unverified = [
    ...(implement.base.status === "unverified" ? [`${implement.id}.base`] : []),
    ...(implement.positionLength?.status === "unverified" ? [`${implement.id}.positionLength`] : []),
    ...(item && !implement.baseIncludesHardware && item.weight.status === "unverified" ? [`${item.id}.weight`] : []),
    ...(item?.minStack?.status === "unverified" ? [`${item.id}.minStack`] : []),
    ...platesUsed.filter((plate) => plate.weight.status === "unverified").map((plate) => `${plate.id}.weight`),
    ...accepted.filter((plate) => plate.countStatus === "unverified").map((plate) => `${plate.id}.count`),
  ];

  return {
    implement: implement.id,
    ...(pair !== undefined ? { pair } : {}),
    total: display(total, implement.unit),
    hardware: item ? [{ id: item.id, count: pieces }] : [],
    positions: positions.map(({ name, placed }) => ({ name, plates: placed.map(({ plate }) => used(plate.weight)), ids: placed.map(({ plate }) => plate.id) })),
    uneven: heavier !== undefined,
    ...(heavier !== undefined ? { heavier } : {}),
    warnings: warningsFor(checked),
    notes: implement.note ? [implement.note] : [],
    unverified,
  };
}

function placedPlate(implement: Implement, accepted: Plate[], weight: number, id: string | undefined): Plate {
  if (id !== undefined) {
    const plate = accepted.find((candidate) => candidate.id === id);
    if (!plate) throw new RequestError(`The ${lower(implement.name)} takes no plate "${id}".`);
    return plate;
  }
  const matches = accepted.filter((candidate) => thousandths(used(candidate.weight)) === thousandths(weight));
  if (matches.length === 0) throw new RequestError(`The ${lower(implement.name)} takes no ${weight} ${implement.unit} plate.`);
  if (matches.length > 1) {
    throw new RequestError(`Two plates weigh ${weight}: ${matches.map((plate) => plate.id).join(", ")}. Name one by its id.`);
  }
  return matches[0]!;
}

function hardwareOf(inventory: Inventory, implement: Implement, request: ReverseRequest, positions: Position[]): HardwareOption {
  if (implement.kind === "vest") return { id: NONE, weight: 0 };
  const fitting = fittingFor(inventory, implement, request.hardware);
  if (request.hardware !== undefined) return fitting.options[0]!;
  const stacks = positions.map(({ length, hardware }) => ({ length, hardware }));
  const empty = positions.every(({ placed }) => placed.length === 0);
  const usable = fitting.options.filter((option) => option.item || fitting.plateFreeHardware || empty);
  const longest = [...usable].sort((a, b) => (b.item?.capacity ?? Infinity) - (a.item?.capacity ?? Infinity))[0];
  return usable.find((option) => holds(option, stacks)) ?? longest ?? { id: NONE, weight: 0 };
}

function endWeights(positions: Position[], option: HardwareOption, perPosition: number): number[] {
  return positions.map(({ weight, hardware }) => weight + (option.item && hardware ? perPosition * option.weight : 0));
}

function heavierOf(implement: Implement, positions: Position[], option: HardwareOption): string | undefined {
  const weights = endWeights(positions, option, implement.hardware?.perPosition ?? 1);
  const heaviest = Math.max(...weights);
  if (weights.every((weight) => weight === heaviest)) return undefined;
  return positions[weights.indexOf(heaviest)]!.name;
}

function warningsFor(checked: Checked): string[] {
  const { implement } = checked;
  return [
    ...(implement.kind === "bar" ? mirrorWarnings(checked) : []),
    ...limitWarnings(checked),
    ...hardwareWarnings(checked),
    ...(implement.kind === "handle" ? unevenWarnings(checked) : []),
    ...capWarnings(checked),
    ...lengthWarnings(checked),
    ...(implement.kind === "vest" ? splitWarnings(checked) : []),
    ...poolWarnings(checked),
  ];
}

function mirrorWarnings({ positions }: Checked): string[] {
  const [first, ...rest] = positions.map(({ placed }) => placed.map(({ plate }) => plate.id).join());
  return rest.every((other) => other === first) ? [] : ["The sides differ. Both sides carry the same plates in the same order."];
}

function limitWarnings({ implement, plateWeight, total }: Checked): string[] {
  const { unit, maxPlateWeight, maxTotal } = implement;
  const warnings: string[] = [];
  if (maxPlateWeight !== undefined && plateWeight > thousandths(maxPlateWeight)) {
    warnings.push(`The plates total ${amount(plateWeight, unit)} ${unit}, over the ${maxPlateWeight} ${unit} plate limit.`);
  }
  if (maxTotal !== undefined && total > thousandths(maxTotal)) {
    const per = implement.kind === "handle" ? ` per ${lower(implement.name)}` : "";
    warnings.push(`The ${lower(implement.name)} is ${amount(total, unit)} ${unit}, over the ${maxTotal} ${unit} limit${per}.`);
  }
  return warnings;
}

function hardwareWarnings({ inventory, implement, positions, option }: Checked): string[] {
  if (implement.kind === "vest") return [];
  const fitting = fittingFor(inventory, implement, undefined);
  if (fitting.plateFreeHardware) return [];
  const loose = positions.find(({ placed, hardware }) => !hardware && placed.length > 0);
  if (!loose) return [];
  if (!option.item) return [`Plates on the ${lower(implement.name)} need locking hardware.`];
  return [`The plates on ${positionLabel(loose.name)} need locking hardware.`];
}

function unevenWarnings({ inventory, implement, request, positions, option, copies }: Checked): string[] {
  const weights = endWeights(positions, option, implement.hardware?.perPosition ?? 1);
  const difference = Math.max(...weights) - Math.min(...weights);
  if (difference === 0) return [];
  const unit = implement.unit;
  const differs = `${amount(difference, unit)} ${unit}`;
  if (request.uneven === false) return [`Uneven loading is off, and the ends differ by ${differs}.`];
  const allowance = thousandths(implement.unevenAllowance ?? 0);
  const small = plateOptions(inventory, implement).some((each) => each.weight <= allowance && each.plate.count >= copies);
  const relaxed = implement.unevenAllowanceRelaxed;
  const allowed = allowance > 0 && !small && relaxed !== undefined ? thousandths(relaxed) : allowance;
  if (difference <= allowed) return [];
  return allowed === 0
    ? [`The ends differ by ${differs}. The ${lower(implement.name)} takes even ends only.`]
    : [`The ends differ by ${differs}. They may differ by at most ${amount(allowed, unit)} ${unit}.`];
}

function capWarnings({ inventory, implement, positions }: Checked): string[] {
  const widest = implement.maxPlateDiameter;
  const tooWide = new Set(
    positions.flatMap(({ placed }) => placed.map(({ plate }) => plate)).filter((plate) => widest !== undefined && (plate.diameter ?? 0) > widest),
  );
  return [
    ...[...tooWide].map(
      (plate) => `The ${plateName(inventory, plate)} plate is ${plate.diameter} ${inventory.lengthUnit} across. The ${lower(implement.name)} takes plates up to ${widest} ${inventory.lengthUnit}.`,
    ),
    ...positions.flatMap(({ name, placed }) => {
      const counts = new Map<Plate, number>();
      for (const { plate } of placed) counts.set(plate, (counts.get(plate) ?? 0) + 1);
      return [...counts].flatMap(([plate, count]) => {
        const most = implement.maxPerPosition?.[plate.id];
        return most !== undefined && count > most
          ? [`${capitalised(positionLabel(name))} holds ${count} × ${platesNamed(inventory, plate)}. It takes at most ${most}.`]
          : [];
      });
    }),
  ];
}

function lengthWarnings({ inventory, implement, positions, option }: Checked): string[] {
  const unit = inventory.lengthUnit;
  const item: Hardware | undefined = option.item;
  const room = implement.positionLength ? thousandths(used(implement.positionLength)) : undefined;
  return positions.flatMap(({ name, length, hardware }) => {
    const on = hardware && item !== undefined;
    const label = positionLabel(name);
    const long = `The plates on ${label} are ${length / 1000} ${unit} long.`;
    if (room !== undefined) {
      const width = on ? thousandths(item.width ?? 0) : 0;
      if (length + width > room) {
        const withItem = on && item.width !== undefined ? ` with the ${lower(item.name)}` : "";
        return [`${long} ${capitalised(label)} holds ${(room - width) / 1000} ${unit}${withItem}.`];
      }
    }
    if (!on || length === 0) return [];
    if (item.capacity !== undefined && length > thousandths(item.capacity)) {
      return [`${long} A ${lower(item.name)} holds up to ${item.capacity} ${unit}.`];
    }
    if (item.minStack !== undefined && length < thousandths(used(item.minStack))) {
      return [`${long} A ${lower(item.name)} needs at least ${used(item.minStack)} ${unit} to lock.`];
    }
    return [];
  });
}

function splitWarnings({ inventory, implement, positions }: Checked): string[] {
  const options = plateOptions(inventory, implement);
  const [front, back] = positions as [Position, Position];
  const counts = options.map((option) => [...front.placed, ...back.placed].filter((each) => each.plate === option.plate).length);
  const best = evenSplit(options, counts);
  const weigh = (plates: PlateOption[]) => plates.reduce((sum, { weight }) => sum + weight, 0);
  if (best && back.weight - front.weight === weigh(best[1]) - weigh(best[0])) return [];
  const unit = implement.unit;
  return [
    `The plates split ${amount(front.weight, unit)} ${unit} front and ${amount(back.weight, unit)} ${unit} back. Split them as evenly as possible, with any extra on the back.`,
  ];
}

function poolWarnings({ inventory, positions, option, implement, copies }: Checked): string[] {
  const subject = copies > 1 ? "The pair" : "The loading";
  const plates = inventory.plates.flatMap((plate) => {
    const count = copies * positions.reduce((sum, { placed }) => sum + placed.filter((each) => each.plate === plate).length, 0);
    return count > plate.count ? [`${subject} uses ${count} × ${platesNamed(inventory, plate)}. The plate pool holds ${plate.count}.`] : [];
  });
  const item = option.item;
  const pieces = item ? copies * (implement.hardware?.perPosition ?? 1) * positions.filter(({ hardware }) => hardware).length : 0;
  const hardware = item && pieces > item.count ? [`${subject} uses ${pieces} × ${lower(item.name)}s. The plate pool holds ${item.count}.`] : [];
  return [...plates, ...hardware];
}

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
