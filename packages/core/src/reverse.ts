import {
  SMALL_PLATE_LB,
  STANDARD_SCREW_MAX_TOTAL_LB as DUMBBELL_STANDARD_SCREW_MAX_LB,
  UNEVEN_LB,
  UNEVEN_WITHOUT_SMALL_PLATES_LB,
} from "./dumbbells.js";
import type { Hardware, Implement, Inventory, Plate, Unit } from "./inventory.js";
import { collarFor, MICRO_PLATE, type CollarChoice } from "./load.js";
import { RequestError } from "./request-error.js";
import {
  KETTLEBELL_LARGE_PLATE,
  LEG_NOTE,
  STANDARD_SCREW_MAX_TOTAL_LB as KETTLEBELL_STANDARD_SCREW_MAX_LB,
} from "./stack.js";
import { convert, display, thousandths, used, type Display } from "./weight.js";

export type ScrewChoice = "standard" | "long" | "none";

export interface ReverseRequest {
  implement: string;
  pair?: boolean;
  positions: { name: string; plates: number[] }[];
  collars?: CollarChoice;
  screws?: ScrewChoice;
  uneven?: boolean;
}

export interface ReverseResult {
  implement: string;
  pair?: boolean;
  total: Display;
  hardware: { id: string; count: number }[];
  positions: { name: string; plates: number[] }[];
  uneven: boolean;
  heavier?: string;
  warnings: string[];
  notes: string[];
  unverified: string[];
}

interface PlacedPlate {
  plate: Plate;
  weight: number;
}

interface Position {
  name: string;
  placed: PlacedPlate[];
  weight: number;
}

interface HardwareUsed {
  item: Hardware;
  count: number;
}

interface Checked {
  inventory: Inventory;
  implement: Implement;
  request: ReverseRequest;
  positions: Position[];
  plateWeight: number;
  total: number;
  hardware: HardwareUsed[];
  screwByRule: Hardware | undefined;
  dumbbells: number;
}

const MICRO_LIMITED = ["barbell", "dumbbell", "kettlebell"];

const positionLabels: Record<string, string> = {
  left: "the left side",
  right: "the right side",
  "end-a": "end A",
  "end-b": "end B",
  stack: "the stack",
};

const standardScrewMaxLb: Record<string, number> = {
  dumbbell: DUMBBELL_STANDARD_SCREW_MAX_LB,
  kettlebell: KETTLEBELL_STANDARD_SCREW_MAX_LB,
};

export function reverse(inventory: Inventory, request: ReverseRequest): ReverseResult {
  const implement = inventory.implements.find((candidate) => candidate.id === request.implement);
  if (!implement) throw new RequestError(`Unknown implement "${request.implement}".`);
  for (const position of request.positions) {
    if (!implement.positions.includes(position.name)) {
      throw new RequestError(`The ${implement.name.toLowerCase()} has no position "${position.name}".`);
    }
  }
  const positions: Position[] = implement.positions.map((name) => {
    const plates = request.positions.find((position) => position.name === name)?.plates ?? [];
    const placed = plates.map((weight) => placedPlate(inventory, implement, weight));
    return { name, placed, weight: placed.reduce((sum, { weight }) => sum + weight, 0) };
  });
  const plateWeight = positions.reduce((sum, { weight }) => sum + weight, 0);
  const withoutHardware = thousandths(used(implement.base)) + plateWeight;

  const screwByRule = screwFor(inventory, implement, withoutHardware);
  const hardware = hardwareFor(inventory, implement, request, screwByRule);
  const total = withoutHardware + hardware.reduce((sum, { item, count }) => sum + count * hardwareWeight(implement, item), 0);

  const heavier = implement.id === "dumbbell" ? heavierOf(positions) : undefined;
  const pair = implement.id === "dumbbell" ? (request.pair ?? true) : undefined;
  const warnings = warningsFor({
    inventory,
    implement,
    request,
    positions,
    plateWeight,
    total,
    hardware,
    screwByRule,
    dumbbells: pair ? 2 : 1,
  });

  const platesUsed = [...new Set(positions.flatMap(({ placed }) => placed.map(({ plate }) => plate)))];
  const counted = implement.id === "vest" ? inventory.plates.filter((plate) => implement.accepts.includes(plate.type)) : platesUsed;
  const unverified = [
    ...(implement.base.status === "unverified" ? [`${implement.id}.base`] : []),
    ...hardware.filter(({ item }) => item.weight.status === "unverified").map(({ item }) => `${item.id}.weight`),
    ...(implement.id === "dumbbell"
      ? hardware.filter(({ item }) => item.minStackIn?.status === "unverified").map(({ item }) => `${item.id}.minStackIn`)
      : []),
    ...platesUsed.filter((plate) => plate.weight.status === "unverified").map((plate) => `${plate.id}.weight`),
    ...counted.filter((plate) => plate.countStatus === "unverified").map((plate) => `${plate.id}.count`),
  ];

  return {
    implement: implement.id,
    ...(pair !== undefined ? { pair } : {}),
    total: display(total, implement.unit),
    hardware: hardware.map(({ item, count }) => ({ id: item.id, count })),
    positions: positions.map(({ name, placed }) => ({ name, plates: placed.map(({ plate }) => used(plate.weight)) })),
    uneven: heavier !== undefined,
    ...(heavier !== undefined ? { heavier } : {}),
    warnings,
    notes: implement.id === "leg" ? [LEG_NOTE] : [],
    unverified,
  };
}

function placedPlate(inventory: Inventory, implement: Implement, weight: number): PlacedPlate {
  const plate = inventory.plates.find(
    (candidate) => implement.accepts.includes(candidate.type) && thousandths(used(candidate.weight)) === thousandths(weight),
  );
  if (!plate) throw new RequestError(`The ${implement.name.toLowerCase()} takes no ${weight} ${implement.unit} plate.`);
  const unit = inventory.plateTypes.find((type) => type.id === plate.type)?.unit ?? implement.unit;
  return { plate, weight: convert(thousandths(used(plate.weight)), unit, implement.unit) };
}

function hardwareWeight(implement: Implement, item: Hardware): number {
  return convert(thousandths(used(item.weight)), item.unit, implement.unit);
}

function perImplement(implement: Implement): number {
  return (implement.hardware?.perPosition ?? 1) * implement.positions.length;
}

function screwOf(inventory: Inventory, implement: Implement, id: string): Hardware | undefined {
  return inventory.hardware.find((item) => item.id === id && item.kind === "screw" && implement.hardware?.options.includes(id));
}

function screwFor(inventory: Inventory, implement: Implement, withoutHardware: number): Hardware | undefined {
  const maxLb = standardScrewMaxLb[implement.id];
  if (maxLb === undefined) return undefined;
  const standard = screwOf(inventory, implement, "screw-standard");
  const withStandard = withoutHardware + (standard ? perImplement(implement) * hardwareWeight(implement, standard) : 0);
  return withStandard <= convert(thousandths(maxLb), "lb", implement.unit) ? standard : screwOf(inventory, implement, "screw-long");
}

function hardwareFor(inventory: Inventory, implement: Implement, request: ReverseRequest, screwByRule: Hardware | undefined): HardwareUsed[] {
  if (implement.id === "barbell") {
    const collar = collarFor(inventory, implement, request.collars);
    return collar ? [{ item: collar, count: perImplement(implement) }] : [];
  }
  if (standardScrewMaxLb[implement.id] === undefined || request.screws === "none") return [];
  const screw = request.screws === undefined ? screwByRule : screwOf(inventory, implement, `screw-${request.screws}`);
  if (request.screws !== undefined && !screw) {
    throw new RequestError(`The ${implement.name.toLowerCase()} takes no ${request.screws} screw.`);
  }
  return screw ? [{ item: screw, count: perImplement(implement) }] : [];
}

function heavierOf(positions: Position[]): string | undefined {
  const heaviest = Math.max(...positions.map(({ weight }) => weight));
  if (positions.every(({ weight }) => weight === heaviest)) return undefined;
  return positions.find(({ weight }) => weight === heaviest)!.name;
}

function warningsFor(checked: Checked): string[] {
  const { implement } = checked;
  return [
    ...(implement.symmetric ? symmetryWarnings(checked) : []),
    ...limitWarnings(checked),
    ...screwWarnings(checked),
    ...(implement.id === "dumbbell" ? unevenWarnings(checked) : []),
    ...(MICRO_LIMITED.includes(implement.id) ? microWarnings(checked) : []),
    ...(implement.id === "kettlebell" ? largePlateWarnings(checked) : []),
    ...(implement.accepts.includes("quick-lock") ? orderWarnings(checked) : []),
    ...capacityWarnings(checked),
    ...(implement.id === "vest" ? splitWarnings(checked) : []),
    ...poolWarnings(checked),
  ];
}

function symmetryWarnings({ positions }: Checked): string[] {
  const [first, ...rest] = positions.map(({ placed }) => placed.map(({ plate }) => plate.id).join());
  return rest.every((other) => other === first) ? [] : ["The sides differ. Both sides carry the same plates in the same order."];
}

function limitWarnings({ implement, positions, plateWeight, total }: Checked): string[] {
  const { unit, maxPlateWeight } = implement;
  if (maxPlateWeight !== undefined && plateWeight > thousandths(maxPlateWeight)) {
    if (implement.id === "vest") {
      const blocks = positions.flatMap(({ placed }) => placed);
      const blockLimit = Math.floor(thousandths(maxPlateWeight) / blocks[0]!.weight);
      return [`The vest holds ${blocks.length} blocks, over the ${blockLimit} block limit.`];
    }
    return [`The plates total ${amount(plateWeight, unit)} ${unit}, over the ${maxPlateWeight} ${unit} plate limit.`];
  }
  if (implement.maxTotal !== undefined && total > thousandths(implement.maxTotal)) {
    const perDumbbell = implement.id === "dumbbell" ? " per dumbbell" : "";
    const name = implement.name.toLowerCase();
    return [`The ${name} is ${amount(total, unit)} ${unit}, over the ${implement.maxTotal} ${unit} limit${perDumbbell}.`];
  }
  return [];
}

function screwWarnings({ implement, positions, hardware, screwByRule, total }: Checked): string[] {
  if (standardScrewMaxLb[implement.id] === undefined) return [];
  const screw = hardware[0]?.item;
  const hasPlates = positions.some(({ placed }) => placed.length > 0);
  if (!screw) {
    if (!hasPlates) return [];
    return [implement.id === "dumbbell" ? "Plates on a dumbbell need two locking screws." : "Plates on the kettlebell need a locking screw."];
  }
  if (!screwByRule || screw === screwByRule) return [];
  const weight = `${amount(total, implement.unit)} ${implement.unit}`;
  const long = screwByRule.id === "screw-long";
  if (implement.id === "dumbbell") {
    return [
      long
        ? `The dumbbell is ${weight}, so it takes long locking screws. Standard locking screws are for dumbbells up to ${DUMBBELL_STANDARD_SCREW_MAX_LB} lb.`
        : `The dumbbell is ${weight}, so it takes standard locking screws. Long locking screws are for dumbbells over ${DUMBBELL_STANDARD_SCREW_MAX_LB} lb.`,
    ];
  }
  return [
    long
      ? `The kettlebell is ${weight}, so it takes a long locking screw. A standard locking screw is for a kettlebell up to ${KETTLEBELL_STANDARD_SCREW_MAX_LB} lb.`
      : `The kettlebell is ${weight}, so it takes a standard locking screw. A long locking screw may stick out at the top, which Ironmaster's manual calls normal.`,
  ];
}

function unevenWarnings({ inventory, implement, request, positions, dumbbells }: Checked): string[] {
  const weights = positions.map(({ weight }) => weight);
  const difference = Math.max(...weights) - Math.min(...weights);
  if (difference === 0) return [];
  const fromLb = (lb: number) => convert(thousandths(lb), "lb", implement.unit);
  const differs = `${amount(difference, implement.unit)} ${implement.unit}`;
  if (request.uneven === false) return [`Uneven loading is off, and the ends differ by ${differs}.`];
  const smallPlateFree = inventory.plates.some(
    (plate) => implement.accepts.includes(plate.type) && thousandths(used(plate.weight)) <= fromLb(SMALL_PLATE_LB) && plate.count >= dumbbells,
  );
  const allowedLb = smallPlateFree ? UNEVEN_LB : UNEVEN_WITHOUT_SMALL_PLATES_LB;
  return difference > fromLb(allowedLb) ? [`The ends differ by ${differs}. They may differ by at most ${allowedLb} lb.`] : [];
}

function microWarnings({ positions }: Checked): string[] {
  return positions.flatMap(({ name, placed }) => {
    const micros = placed.filter(({ plate }) => plate.id === MICRO_PLATE).length;
    return micros > 1 ? [`${capitalised(label(name))} holds ${micros} micro plates. It takes at most one.`] : [];
  });
}

function largePlateWarnings({ positions }: Checked): string[] {
  const large = positions.flatMap(({ placed }) => placed).filter(({ plate }) => plate.id === KETTLEBELL_LARGE_PLATE);
  const [first] = large;
  return first && large.length > 1
    ? [`The kettlebell holds ${large.length} × ${plateLabel(first.plate)}. It takes at most one.`]
    : [];
}

function orderWarnings({ positions }: Checked): string[] {
  const isMicro = ({ plate }: PlacedPlate) => Number(plate.id === MICRO_PLATE);
  return positions.flatMap(({ name, placed }) => {
    const ordered = [...placed].sort((a, b) => isMicro(a) - isMicro(b) || b.weight - a.weight);
    return ordered.every((item, i) => item.plate === placed[i]!.plate)
      ? []
      : [`The plates on ${label(name)} are out of order. Put the heaviest plate innermost and the micro plate outermost.`];
  });
}

function capacityWarnings({ implement, positions, hardware }: Checked): string[] {
  const item = hardware[0]?.item;
  if (implement.positionLengthIn !== undefined) {
    const collar = item?.kind === "collar" ? item : undefined;
    const capacity = thousandths(used(implement.positionLengthIn)) - thousandths(collar?.widthIn ?? 0);
    const withCollar = collar ? ` with the ${collar.name}` : "";
    return positions.flatMap(({ name, placed }) => {
      const length = stackLength(placed);
      return length > capacity
        ? [`The plates on ${label(name)} are ${length / 1000} in long. The side holds ${capacity / 1000} in${withCollar}.`]
        : [];
    });
  }
  if (item?.kind !== "screw") return [];
  const screw = item.name.toLowerCase();
  const capacity = item.capacityIn === undefined ? Infinity : thousandths(item.capacityIn);
  const minimum = implement.id === "dumbbell" && item.minStackIn ? thousandths(used(item.minStackIn)) : 0;
  return positions.flatMap(({ name, placed }) => {
    const length = stackLength(placed);
    if (length > capacity) {
      return [`The plates on ${label(name)} are ${length / 1000} in long. A ${screw} holds up to ${capacity / 1000} in.`];
    }
    if (length < minimum) {
      return [`The plates on ${label(name)} are ${length / 1000} in long. A ${screw} needs at least ${minimum / 1000} in to lock.`];
    }
    return [];
  });
}

function splitWarnings({ positions }: Checked): string[] {
  const [front, back] = positions.map(({ placed }) => placed.length) as [number, number];
  return front === Math.floor((front + back) / 2)
    ? []
    : [`The blocks split ${front} front and ${back} back. Split them evenly, with any extra block on the back.`];
}

function poolWarnings({ inventory, positions, hardware, dumbbells }: Checked): string[] {
  const subject = dumbbells > 1 ? "The pair" : "The loading";
  const plates = inventory.plates.flatMap((plate) => {
    const count = dumbbells * positions.reduce((sum, { placed }) => sum + placed.filter((item) => item.plate === plate).length, 0);
    return count > plate.count ? [`${subject} uses ${count} × ${plateLabel(plate)}. The plate pool holds ${plate.count}.`] : [];
  });
  const items = hardware.flatMap(({ item, count }) =>
    dumbbells * count > item.count
      ? [`${subject} uses ${dumbbells * count} × ${item.name}s. The plate pool holds ${item.count}.`]
      : [],
  );
  return [...plates, ...items];
}

function stackLength(placed: PlacedPlate[]): number {
  return placed.reduce((sum, { plate }) => sum + (plate.stackLengthIn ? thousandths(used(plate.stackLengthIn)) : 0), 0);
}

function amount(milli: number, unit: Unit): number {
  return display(milli, unit)[unit];
}

function label(position: string): string {
  return positionLabels[position] ?? position;
}

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plateLabel(plate: Plate): string {
  return plate.shape === "block" ? `${plate.name.toLowerCase()}s` : `${plate.name.toLowerCase()} plates`;
}
