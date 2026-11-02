import type { Hardware, HardwareKind, Implement, Inventory, Loading, Plate } from "@plate-pool/core";
import { acceptedPlates, hardwareOf, hardwareOptions, implementOf, plateById, used } from "./kit";
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
  fill: string;
  ink: string;
  outline: boolean;
  label: Label;
  leader?: Line;
}

export interface Callout {
  label: Omit<Label, "inside">;
  leaders: Line[];
}

export interface HardwareDrawing extends Callout {
  kind: HardwareKind;
  name: string;
  x: number;
  width: number;
  height: number;
}

export interface DrawOptions {
  /** The loadings shown in one row: their pictures crop the empty space to fit the longest, at one shared scale. */
  sideBySide?: Loading[];
}

/** Drawing units: the largest plate an implement takes is always PLATE_HEIGHT high, whatever the file's length unit. */
export const PLATE_HEIGHT = 6.7;
export const PLATE_TOP = -PLATE_HEIGHT / 2;
export const FONT_SIZE = 0.72;
export const HARDWARE_FONT_SIZE = 0.6;
const LABEL_PADDING = 0.06;
const LABEL_GAP = 0.2;
/** Wide enough for a two-digit label inside the plate. */
export const MIN_PLATE_WIDTH = 2 * 0.5 * FONT_SIZE + 2 * LABEL_PADDING;
export const LEADER_LENGTH = 0.45;
/** Keeps labels at one size from kit to kit: a short sleeve or post gets empty space after it instead of larger type. */
export const MIN_PICTURE_WIDTH = 10;
export const MARGIN = 0.2;
export const OUTSIDE_LABEL_Y = PLATE_TOP - LEADER_LENGTH - 0.12;
/** The top of the outside plate labels: the top of a picture with nothing above them. */
export const LABELS_TOP = OUTSIDE_LABEL_Y - FONT_SIZE * 0.75 - MARGIN;
/** The baseline of a hardware label under the plates, and the bottom of a picture that has one. */
export const HARDWARE_LABEL_Y = PLATE_HEIGHT / 2 + LEADER_LENGTH + HARDWARE_FONT_SIZE * 0.75;
export const HARDWARE_LABEL_BOTTOM = HARDWARE_LABEL_Y + MARGIN;
export const HARDWARE_LEADER_END = PLATE_HEIGHT / 2 + LEADER_LENGTH - 0.1;

/** Used when no plate the implement takes states a diameter: a standard 450 mm plate. */
const FALLBACK_REFERENCE = { mm: 450, in: 450 / 25.4 };

const bands: [ratio: number, height: number][] = [
  [0.85, 1],
  [0.6, 0.78],
  [0.4, 0.58],
];
const SMALLEST_BAND = 0.42;

const glyphs: Record<HardwareKind, { width: number; height: number }> = {
  collar: { width: 1, height: 2 },
  screw: { width: 0.5, height: 4 },
  pin: { width: 0.3, height: 5.2 },
};

/** How one implement's picture maps the file's lengths to drawing units. */
export interface Scale {
  inventory: Inventory;
  implement: Implement | undefined;
  /** The diameter, in the file's length unit, that draws at full height. */
  reference: number;
  /** Drawing units per unit of length in the file. */
  factor: number;
}

export function scaleFor(inventory: Inventory, implementId: string): Scale {
  const implement = implementOf(inventory, implementId);
  const diameters = acceptedPlates(inventory, implementId).flatMap((plate) => plate.diameter ?? []);
  const largest = diameters.length > 0 ? Math.max(...diameters) : FALLBACK_REFERENCE[inventory.lengthUnit];
  const reference = Math.min(largest, implement?.maxPlateDiameter ?? Infinity);
  return { inventory, implement, reference, factor: PLATE_HEIGHT / reference };
}

export function plateHeight(scale: Scale, plate: Plate | undefined): number {
  if (plate?.diameter === undefined) return PLATE_HEIGHT;
  const ratio = plate.diameter / scale.reference;
  const band = bands.find(([least]) => ratio >= least)?.[1] ?? SMALLEST_BAND;
  return PLATE_HEIGHT * band;
}

export function plateWidth(scale: Scale, plate: Plate | undefined): number {
  const length = plate?.stackLength ? used(plate.stackLength) * scale.factor : 0;
  return Math.max(length, MIN_PLATE_WIDTH);
}

/** The plates at a position, found by id, or by weight among the plates the implement takes. */
export function platesAt(scale: Scale, position: { plates: number[]; ids?: string[] } | undefined): (Plate | undefined)[] {
  if (!position) return [];
  const accepted = scale.implement ? acceptedPlates(scale.inventory, scale.implement.id) : [];
  return position.plates.map(
    (weight, index) => plateById(scale.inventory, position.ids?.[index]) ?? accepted.find((plate) => used(plate.weight) === weight),
  );
}

/** Lays plates out from `start`, innermost first, going right (1) or left (-1). */
export function stackPlates(
  scale: Scale,
  position: { plates: number[]; ids?: string[] } | undefined,
  start: number,
  direction: 1 | -1 = 1,
): PlateDrawing[] {
  const plates = platesAt(scale, position);
  let edge = start;
  return (position?.plates ?? []).map((weight, index): PlateDrawing => {
    const plate = plates[index];
    const width = plateWidth(scale, plate);
    const x = direction === 1 ? edge : edge - width;
    edge += direction * width;
    const text = String(weight);
    const inside = textWidth(text, FONT_SIZE) + 2 * LABEL_PADDING <= width;
    const colour = plate ? plateColour(scale.inventory, plate) : { fill: "#6f7780", ink: "#ffffff", outline: false };
    return {
      weight,
      x,
      width,
      height: plateHeight(scale, plate),
      ...colour,
      label: { text, x: x + width / 2, y: inside ? FONT_SIZE * 0.35 : OUTSIDE_LABEL_Y, inside },
    };
  });
}

export function drawnLength(scale: Scale, position: { plates: number[]; ids?: string[] } | undefined): number {
  return platesAt(scale, position).reduce((sum, plate) => sum + plateWidth(scale, plate), 0);
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

/** The glyph's size in drawing units: a collar block, a screw disc or a pin rod. `width` sets a collar's width when stated. */
export function glyphOf(scale: Scale, hardware: Hardware): { width: number; height: number } {
  const glyph = glyphs[hardware.kind];
  if (hardware.kind !== "collar" || hardware.width === undefined) return glyph;
  return { ...glyph, width: hardware.width * scale.factor };
}

export function drawHardware(
  scale: Scale,
  hardware: Hardware,
  x: number,
  pictureWidth: number,
  text: string = hardware.name,
): HardwareDrawing {
  const shape = glyphOf(scale, hardware);
  const centre = x + shape.width / 2;
  return {
    kind: hardware.kind,
    name: hardware.name,
    x,
    width: shape.width,
    height: shape.height,
    label: { text, x: clampLabel(text, centre, HARDWARE_FONT_SIZE, 0, pictureWidth), y: HARDWARE_LABEL_Y },
    leaders: [{ x1: centre, y1: shape.height / 2, x2: centre, y2: HARDWARE_LEADER_END }],
  };
}

export function hardwareIn(loading: Loading, inventory: Inventory): Hardware | undefined {
  return hardwareOf(inventory, loading.hardware[0]?.id);
}

/** The drawn length the implement's position can hold: its `positionLength`, else the longest `capacity` among its hardware plus that hardware. */
export function fullReach(scale: Scale): number | undefined {
  const { implement, inventory, factor } = scale;
  if (!implement) return undefined;
  if (implement.positionLength) return used(implement.positionLength) * factor;
  const reaches = hardwareOptions(inventory, implement.id).flatMap((id) => {
    const item = hardwareOf(inventory, id);
    return item?.capacity !== undefined ? [item.capacity * factor + glyphOf(scale, item).width] : [];
  });
  return reaches.length > 0 ? Math.max(...reaches) : undefined;
}

export function hardwareWidth(scale: Scale, loading: Loading): number {
  const item = hardwareIn(loading, scale.inventory);
  return item ? glyphOf(scale, item).width : 0;
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
