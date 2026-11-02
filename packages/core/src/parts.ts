import type { Hardware, Implement, ImplementKind, Inventory, Plate, Unit } from "./inventory.js";
import { RequestError } from "./request-error.js";
import { convert, display, thousandths, used } from "./weight.js";

export const NONE = "none";

const POSITIONS: Record<ImplementKind, string[]> = {
  bar: ["left", "right"],
  handle: ["a", "b"],
  stack: ["stack"],
  vest: ["front", "back"],
};

const POSITION_LABELS: Record<string, string> = {
  left: "the left side",
  right: "the right side",
  a: "end A",
  b: "end B",
  stack: "the stack",
  front: "the front",
  back: "the back",
};

export function positionNames(implement: Implement): string[] {
  return POSITIONS[implement.kind];
}

export function positionLabel(name: string): string {
  return POSITION_LABELS[name] ?? name;
}

export interface PlateOption {
  plate: Plate;
  /** Thousandths of the implement's unit. */
  weight: number;
  /** Thousandths of the file's length unit. */
  stackLength: number;
  /** The most of this plate one position holds. */
  cap: number;
}

export function plateUnit(inventory: Inventory, plate: Plate): Unit {
  return inventory.plateTypes.find((type) => type.id === plate.type)?.unit ?? "lb";
}

export function plateWeight(inventory: Inventory, plate: Plate, unit: Unit): number {
  return convert(thousandths(used(plate.weight)), plateUnit(inventory, plate), unit);
}

/** The plates an implement takes, heaviest first, which is innermost first on a position. */
export function plateOptions(inventory: Inventory, implement: Implement): PlateOption[] {
  const widest = implement.maxPlateDiameter ?? Infinity;
  return inventory.plates
    .filter((plate) => implement.accepts.includes(plate.type) && (plate.diameter ?? 0) <= widest)
    .map((plate) => ({
      plate,
      weight: plateWeight(inventory, plate, implement.unit),
      stackLength: plate.stackLength ? thousandths(used(plate.stackLength)) : 0,
      cap: implement.maxPerPosition?.[plate.id] ?? Infinity,
    }))
    .sort((a, b) => b.weight - a.weight);
}

export interface HardwareOption {
  /** A hardware id, or "none". */
  id: string;
  item?: Hardware;
  /** One piece's weight in thousandths of the implement's unit; 0 when the base includes hardware. */
  weight: number;
}

export interface Fitting {
  options: HardwareOption[];
  /** False when the implement's hardware holds its plates on (a screw or pin), so "none" means the bare implement. */
  plateFreeHardware: boolean;
  hasBare: boolean;
  fixed: boolean;
}

/** The hardware options in the order the library tries them: a fixed choice alone, or the default first, then the rest. */
export function fittingFor(inventory: Inventory, implement: Implement, choice: string | undefined): Fitting {
  const ids = implement.hardware?.options ?? [NONE];
  const option = (id: string): HardwareOption => {
    if (id === NONE) return { id, weight: 0 };
    const item = inventory.hardware.find((each) => each.id === id)!;
    const weight = implement.baseIncludesHardware ? 0 : convert(thousandths(used(item.weight)), item.unit, implement.unit);
    return { id, item, weight };
  };
  const plateFreeHardware = !ids.some((id) => {
    const kind = inventory.hardware.find((item) => item.id === id)?.kind;
    return kind === "screw" || kind === "pin";
  });
  if (choice !== undefined) {
    if (!ids.includes(choice)) {
      throw new RequestError(`The ${lower(implement.name)} takes no "${choice}" hardware. It takes ${ids.join(", ")}.`);
    }
    return { options: [option(choice)], plateFreeHardware, hasBare: choice === NONE && !plateFreeHardware, fixed: true };
  }
  const preferred = implement.hardware?.default ?? ids[0]!;
  const ordered = [preferred, ...ids.filter((id) => id !== preferred)];
  return { options: ordered.map(option), plateFreeHardware, hasBare: ids.includes(NONE) && !plateFreeHardware, fixed: false };
}

export interface Stack {
  length: number;
  hardware: boolean;
}

/** The item's capacity holds every stack it is on, and its minStack is met: what chooses the hardware (spec 17.4). */
export function holds(option: HardwareOption, stacks: Stack[]): boolean {
  const item = option.item;
  if (!item) return true;
  return stacks.every(({ length, hardware }) => {
    if (!hardware) return true;
    if (item.capacity !== undefined && length > thousandths(item.capacity)) return false;
    return item.minStack === undefined || length >= thousandths(used(item.minStack));
  });
}

/** Every stack, with the item's width where it sits, fits the implement's position length. */
export function hasRoom(implement: Implement, option: HardwareOption, stacks: Stack[]): boolean {
  if (!implement.positionLength) return true;
  const room = thousandths(used(implement.positionLength));
  const width = thousandths(option.item?.width ?? 0);
  return stacks.every(({ length, hardware }) => length + (hardware && option.item ? width : 0) <= room);
}

export interface Selected {
  option: HardwareOption;
  /** Options that fit but were passed over because the pool had too few free. */
  skipped: HardwareOption[];
}

/** The first option that holds these stacks and is free (spec 17.4), if the stacks then fit the position. */
export function select(
  implement: Implement,
  fitting: Fitting,
  stacks: Stack[],
  pieces: number,
  free: (id: string) => number,
): Selected | undefined {
  const skipped: HardwareOption[] = [];
  for (const option of fitting.options) {
    if (option.id === NONE) {
      if (!fitting.plateFreeHardware) continue;
      const bare = stacks.map(({ length }) => ({ length, hardware: false }));
      return hasRoom(implement, option, bare) ? { option, skipped } : undefined;
    }
    if (!holds(option, stacks)) continue;
    if (free(option.id) < pieces) {
      skipped.push(option);
      continue;
    }
    return hasRoom(implement, option, stacks) ? { option, skipped } : undefined;
  }
  return undefined;
}

export function freeIn(inventory: Inventory): (id: string) => number {
  return (id) => inventory.hardware.find((item) => item.id === id)?.count ?? 0;
}

export function lower(name: string): string {
  return name.toLowerCase();
}

export function amount(milli: number, unit: Unit): number {
  return display(milli, unit)[unit];
}

export function plateName(inventory: Inventory, plate: Plate): string {
  if (plate.name) return lower(plate.name);
  return `${used(plate.weight)} ${plateUnit(inventory, plate)}`;
}

export function platesNamed(inventory: Inventory, plate: Plate): string {
  return `${plateName(inventory, plate)} plates`;
}

export function pairOf(implement: Implement, target: { pair?: boolean }): boolean | undefined {
  if (implement.kind !== "handle") return undefined;
  if (target.pair === true && implement.count < 2) {
    throw new RequestError(`The inventory holds 1 ${lower(implement.name)}, so it cannot be loaded as a pair.`);
  }
  return target.pair ?? implement.count >= 2;
}
