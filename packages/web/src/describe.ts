import type { Inventory, Loading, Plate, Unit } from "@plate-pool/core";
import { acceptedPlates, hardwareOf, implementOf, kindOf, lower, plateUnit, unitOf, used } from "./kit";

export function plateList(plates: number[]): string {
  if (plates.length === 0) return "No plates";
  const groups: { weight: number; count: number }[] = [];
  for (const weight of plates) {
    const last = groups.at(-1);
    if (last?.weight === weight) last.count++;
    else groups.push({ weight, count: 1 });
  }
  return groups.map(({ weight, count }) => `${count} × ${weight}`).join(", ");
}

export function blockList(plates: number[]): string {
  if (plates.length === 0) return "No blocks";
  return plates.length === 1 ? "1 block" : `${plates.length} blocks`;
}

/** A vest whose blocks all weigh the same counts them; one with mixed blocks lists them by weight. */
export function vestList(inventory: Inventory, implement: string, plates: number[]): string {
  const weights = new Set(acceptedPlates(inventory, implement).map((plate) => used(plate.weight)));
  return weights.size <= 1 ? blockList(plates) : plateList(plates);
}

const endLetters: Record<string, string> = {
  a: "A",
  b: "B",
};

export function endLabel(position: string): string {
  const letter = endLetters[position];
  return letter ? `End ${letter}` : position;
}

const positionLabels: Record<string, string> = { stack: "Stack", front: "Front", back: "Back" };

export function positionLabel(name: string): string {
  const end = endLabel(name);
  return end !== name ? end : (positionLabels[name] ?? name);
}

export function mirroredLabel(inventory: Inventory, implement: string): string | undefined {
  const kind = kindOf(inventory, implement);
  if (kind === "bar") return "Each side";
  if (kind === "handle") return "Each end";
  return undefined;
}

export interface PositionRow {
  label: string;
  text: string;
  heavier?: boolean;
}

/** One row per position, or one row for both when a bar's sides or a handle's ends carry the same plates. */
export function positionRows(
  inventory: Inventory,
  implement: string,
  { positions, uneven = false, heavier }: { positions: { name: string; plates: number[] }[]; uneven?: boolean; heavier?: string | undefined },
): PositionRow[] {
  const kind = kindOf(inventory, implement);
  const [first, ...rest] = positions;
  const mirrored = mirroredLabel(inventory, implement);
  const same = first !== undefined && !uneven && rest.every((position) => position.plates.join() === first.plates.join());
  if (mirrored && first && (kind === "bar" || same)) return [{ label: mirrored, text: plateList(first.plates) }];
  return positions.map(({ name, plates }) => ({
    label: positionLabel(name),
    text: kind === "vest" ? vestList(inventory, implement, plates) : plateList(plates),
    ...(name === heavier ? { heavier: true } : {}),
  }));
}

const KG_PER_LB = 0.45359237;

function inUnit(amount: number, from: Unit, to: Unit): number {
  if (from === to) return amount;
  return from === "lb" ? amount * KG_PER_LB : amount / KG_PER_LB;
}

export function unevenNote(label: string, implement: string, loading: Loading, inventory: Inventory): string {
  const unit = unitOf(inventory, implement);
  const heavier = loading.positions.find((position) => position.name === loading.heavier);
  const lighter = loading.positions.find((position) => position.name !== loading.heavier);
  const [pieces] = loading.hardware;
  const oneEnd = pieces !== undefined && pieces.count < loading.positions.length;
  const item = oneEnd ? hardwareOf(inventory, pieces.id) : undefined;
  const hardware = item && !implementOf(inventory, implement)?.baseIncludesHardware ? inUnit(used(item.weight), item.unit, unit) : 0;
  const weight = (plates: number[] = []) => plates.reduce((sum, plate) => sum + plate, 0);
  const difference = Math.round((weight(heavier?.plates) + hardware - weight(lighter?.plates)) * 1000) / 1000;
  const inSentence = (name = "") => endLabel(name).replace(/^End /, "end ");
  const why = item ? ` It carries the only ${item.kind}.` : "";
  return `${label}: ${inSentence(heavier?.name)} is ${difference} ${unit} heavier than ${inSentence(lighter?.name)}.${why}`;
}

export function hardwareList(loading: Loading, inventory: Inventory): string {
  if (loading.hardware.length === 0) return "None";
  return loading.hardware.map(({ id, count }) => `${count} × ${hardwareOf(inventory, id)?.name ?? id}`).join(", ");
}

export function unverifiedList(keys: string[], inventory: Inventory): string {
  const label = (key: string) => {
    const id = key.slice(0, key.lastIndexOf("."));
    const field = key.slice(key.lastIndexOf(".") + 1);
    const implement = implementOf(inventory, id);
    if (implement && field === "base") return implement.kind === "vest" ? `empty ${lower(implement.name)} weight` : `${lower(implement.name)} weight`;
    if (implement && field === "positionLength") return `${lower(implement.name)} length`;
    const hardware = hardwareOf(inventory, id);
    if (hardware && field === "minStack") return `shortest stack on a ${lower(hardware.name)}`;
    if (hardware) return `${lower(hardware.name)} weight`;
    const plate = inventory.plates.find((item) => item.id === id);
    if (plate && field === "count") return `${plateName(inventory, plate)} count`;
    return plate ? `${plateName(inventory, plate)} plate weight` : key;
  };
  return [...new Set(keys.map(label))].join(", ");
}

function plateName(inventory: Inventory, plate: Plate): string {
  if (plate.name) return lower(plate.name);
  if (plate.shape === "block") return "block";
  return `${used(plate.weight)} ${plateUnit(inventory, plate)}`;
}
