import type { Hardware, Inventory, Loading, Plate, Value } from "@plate-pool/core";
import { plateColour } from "./plate-colours";

export interface Label {
  text: string;
  x: number;
  y: number;
  inside: boolean;
}

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PlateDrawing {
  weight: number;
  x: number;
  width: number;
  height: number;
  round: boolean;
  fill: string;
  ink: string;
  label: Label;
  leader?: Line;
}

export interface Callout {
  label: Omit<Label, "inside">;
  leaders: Line[];
}

export interface HardwareDrawing extends Callout {
  name: string;
  x: number;
  width: number;
  height: number;
}

// Sizes in inches. Only the Quick-Lock plate size comes from the spec; the rest are drawing-only values.
export const QUICK_LOCK_PLATE = 6.7;
export const PLATE_TOP = -QUICK_LOCK_PLATE / 2;
const MICRO_PLATE = 5;
export const FONT_SIZE = 0.72;
export const HARDWARE_FONT_SIZE = 0.6;
const LABEL_PADDING = 0.06;
const LABEL_GAP = 0.2;
export const LEADER_LENGTH = 0.45;
export const MARGIN = 0.2;
export const OUTSIDE_LABEL_Y = PLATE_TOP - LEADER_LENGTH - 0.12;
/** The top of the outside plate labels: the top of a Quick-Lock picture with nothing above them. */
export const LABELS_TOP = OUTSIDE_LABEL_Y - FONT_SIZE * 0.75 - MARGIN;
/** The baseline of a hardware label under the plates, and the bottom of a picture that has one. */
export const HARDWARE_LABEL_Y = QUICK_LOCK_PLATE / 2 + LEADER_LENGTH + HARDWARE_FONT_SIZE * 0.75;
export const HARDWARE_LABEL_BOTTOM = HARDWARE_LABEL_Y + MARGIN;

/** Lays plates out from `start`, innermost first, going right (1) or left (-1). */
export function stackPlates(weights: number[], inventory: Inventory, start: number, direction: 1 | -1 = 1): PlateDrawing[] {
  let edge = start;
  return weights.map((weight): PlateDrawing => {
    const plate = plateFor(inventory, weight);
    const width = plateLength(plate);
    const x = direction === 1 ? edge : edge - width;
    edge += direction * width;
    const text = String(weight);
    const inside = textWidth(text, FONT_SIZE) + 2 * LABEL_PADDING <= width;
    return {
      weight,
      x,
      width,
      height: plate?.shape === "round" ? MICRO_PLATE : QUICK_LOCK_PLATE,
      round: plate?.shape === "round",
      ...plateColour(weight, "lb"),
      label: { text, x: x + width / 2, y: inside ? FONT_SIZE * 0.35 : OUTSIDE_LABEL_Y, inside },
    };
  });
}

/** Spreads the labels that sit above the plates so none overlap, keeps them between `left` and `right`, and adds their leader lines. */
export function placeOutsideLabels(plates: PlateDrawing[], left: number, right: number) {
  const outside = plates.filter((plate) => !plate.label.inside).sort((a, b) => a.label.x - b.label.x);
  spread(
    outside.map((plate) => plate.label),
    FONT_SIZE,
    left,
    right,
  );
  for (const plate of outside) {
    const centre = plate.x + plate.width / 2;
    plate.leader = { x1: centre, y1: -plate.height / 2, x2: plate.label.x, y2: PLATE_TOP - LEADER_LENGTH };
  }
}

function spread(labels: Omit<Label, "inside">[], fontSize: number, left: number, right: number) {
  const clusters = labels.map((label) => ({ labels: [label], desired: [label.x] }));
  const place = (cluster: (typeof clusters)[number]) => {
    const widths = cluster.labels.map((label) => textWidth(label.text, fontSize));
    const span = widths.reduce((sum, w) => sum + w, 0) + LABEL_GAP * (widths.length - 1);
    const centre = cluster.desired.reduce((sum, d) => sum + d, 0) / cluster.desired.length;
    let edge = Math.min(Math.max(centre - span / 2, left), right - span);
    cluster.labels.forEach((label, i) => {
      label.x = edge + widths[i]! / 2;
      edge += widths[i]! + LABEL_GAP;
    });
  };
  for (let i = 1; i < clusters.length; ) {
    const previous = clusters[i - 1]!;
    const current = clusters[i]!;
    const previousRight = previous.labels.at(-1)!.x + textWidth(previous.labels.at(-1)!.text, fontSize) / 2;
    const currentLeft = current.labels[0]!.x - textWidth(current.labels[0]!.text, fontSize) / 2;
    if (currentLeft - previousRight >= LABEL_GAP) {
      i++;
      continue;
    }
    previous.labels.push(...current.labels);
    previous.desired.push(...current.desired);
    clusters.splice(i, 1);
    place(previous);
    i = Math.max(1, i - 1);
  }
  clusters.forEach(place);
}

/** Centres a label on `centre`, kept between `left` and `right`. */
export function clampLabel(text: string, centre: number, fontSize: number, left: number, right: number): number {
  const half = textWidth(text, fontSize) / 2;
  return Math.min(Math.max(centre, left + half), right - half);
}

export function stackLength(weights: number[], inventory: Inventory): number {
  return weights.reduce((sum, weight) => sum + plateLength(plateFor(inventory, weight)), 0);
}

function plateLength(plate: Plate | undefined): number {
  return plate?.stackLengthIn ? used(plate.stackLengthIn) : 0.5;
}

function plateFor(inventory: Inventory, weight: number): Plate | undefined {
  return inventory.plates.find((plate) => plate.type === "quick-lock" && used(plate.weight) === weight);
}

export function hardwareFor(id: string | undefined, inventory: Inventory): Hardware | undefined {
  return inventory.hardware.find((item) => item.id === id);
}

/** A locking screw's head, seen side on: the 4 in disc diameter comes from Ironmaster, the thickness is drawing-only. */
export const SCREW = { width: 0.5, height: 4 };

export function screwFor(loading: Loading, inventory: Inventory): Hardware | undefined {
  const hardware = hardwareFor(loading.hardware[0]?.id, inventory);
  return hardware?.kind === "screw" ? hardware : undefined;
}

/** The longest stack any locking screw the implement takes can hold. */
export function screwCapacity(implement: string, inventory: Inventory): number {
  const options = inventory.implements.find((item) => item.id === implement)?.hardware?.options ?? [];
  return Math.max(0, ...options.map((id) => hardwareFor(id, inventory)?.capacityIn ?? 0));
}

export function used(value: Value): number {
  return value.measured ?? value.listed;
}

export function plateSequence(weights: number[]): string {
  return weights.length > 0 ? weights.join(", ") : "no plates";
}

// Barlow Condensed SemiBold advance widths, in ems, rounded.
export function textWidth(text: string, fontSize: number): number {
  let ems = 0;
  for (const character of text) {
    if (/[0-9]/.test(character)) ems += 0.5;
    else if (character === "." || character === " ") ems += 0.2;
    else if (/[il-]/.test(character)) ems += 0.25;
    else if (/[A-Z]/.test(character)) ems += 0.52;
    else ems += 0.44;
  }
  return ems * fontSize;
}
