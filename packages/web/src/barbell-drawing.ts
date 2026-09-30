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

export interface CollarDrawing {
  name: string;
  x: number;
  width: number;
  height: number;
  label: Omit<Label, "inside">;
  leader: Line;
}

export interface BarbellDrawing {
  description: string;
  width: number;
  top: number;
  height: number;
  fontSize: number;
  collarFontSize: number;
  handle: { x: number; length: number };
  stop: { x: number; width: number; height: number };
  sleeve: { x: number; length: number };
  barDiameter: number;
  plates: PlateDrawing[];
  collar?: CollarDrawing;
}

// Sizes in inches. Plate size and sleeve length come from the spec; the rest only has to look right.
const QUICK_LOCK_PLATE = 6.7;
const MICRO_PLATE = 5;
const BAR_DIAMETER = 1;
const HANDLE_SHOWN = 1;
const HANDLE_SHOWN_SIDE_BY_SIDE = 0.4;
const STOP = { width: 0.375, height: 2.5 };
const END_MARGIN = 0.15;
const SLEEVE_BEYOND_COLLAR = 0.5;
const FONT_SIZE = 0.72;
const COLLAR_FONT_SIZE = 0.6;
const LABEL_PADDING = 0.06;
const LABEL_GAP = 0.2;
const LEADER_LENGTH = 0.45;
const MARGIN = 0.2;

const collarShapes: Record<string, { name: string; height: number; width: number }> = {
  "collar-clamp": { name: "Clamp collar", height: 2, width: 1.26 },
  "collar-spinlock": { name: "Spin-lock collar", height: 3, width: 1 },
};

export interface DrawOptions {
  /** The loadings shown in one row: their pictures crop the empty sleeve to fit the longest, at one shared scale. */
  sideBySide?: Loading[];
}

export function drawBarbell(loading: Loading, inventory: Inventory, options: DrawOptions = {}): BarbellDrawing {
  const barbell = inventory.implements.find((implement) => implement.id === "barbell");
  const plateTop = -QUICK_LOCK_PLATE / 2;
  const top = plateTop - LEADER_LENGTH - 0.12 - FONT_SIZE * 0.75 - MARGIN;
  const bottom = QUICK_LOCK_PLATE / 2 + LEADER_LENGTH + COLLAR_FONT_SIZE * 0.75 + MARGIN;
  const height = bottom - top;

  const handleShown = options.sideBySide ? HANDLE_SHOWN_SIDE_BY_SIDE : HANDLE_SHOWN;
  const handle = { x: 0, length: handleShown };
  const stop = { x: handleShown, ...STOP };
  const sleeve = { x: stop.x + stop.width, length: barbell?.positionLengthIn ? used(barbell.positionLengthIn) : 11.5 };
  const width = options.sideBySide
    ? Math.max(height, sleeve.x + Math.max(...options.sideBySide.map((shown) => loadedLength(shown, inventory))) + SLEEVE_BEYOND_COLLAR)
    : sleeve.x + sleeve.length + END_MARGIN;

  const weights = loading.positions[0]?.plates ?? [];
  let x = sleeve.x;
  const plates = weights.map((weight): PlateDrawing => {
    const plate = plateFor(inventory, weight);
    const plateWidth = stackLength(plate);
    const round = plate?.shape === "round";
    const height = round ? MICRO_PLATE : QUICK_LOCK_PLATE;
    const text = String(weight);
    const inside = textWidth(text, FONT_SIZE) + 2 * LABEL_PADDING <= plateWidth;
    const drawing: PlateDrawing = {
      weight,
      x,
      width: plateWidth,
      height,
      round,
      ...plateColour(weight, "lb"),
      label: { text, x: x + plateWidth / 2, y: inside ? FONT_SIZE * 0.35 : plateTop - LEADER_LENGTH - 0.12, inside },
    };
    x += plateWidth;
    return drawing;
  });

  spreadOutsideLabels(plates, width);
  for (const plate of plates) {
    if (plate.label.inside) continue;
    const centre = plate.x + plate.width / 2;
    plate.leader = { x1: centre, y1: -plate.height / 2, x2: plate.label.x, y2: plateTop - LEADER_LENGTH };
  }

  const collarHardware = inventory.hardware.find((item) => item.id === loading.hardware[0]?.id && item.kind === "collar");
  const collar = collarHardware && drawCollar(collarHardware, x, width);

  return {
    description: describe(weights, collarHardware),
    width,
    top,
    height,
    fontSize: FONT_SIZE,
    collarFontSize: COLLAR_FONT_SIZE,
    handle,
    stop,
    sleeve,
    barDiameter: BAR_DIAMETER,
    plates,
    ...(collar ? { collar } : {}),
  };
}

function drawCollar(hardware: Hardware, x: number, pictureWidth: number): CollarDrawing {
  const shape = collarShape(hardware);
  const width = collarWidth(hardware);
  const centre = x + width / 2;
  const half = textWidth(shape.name, COLLAR_FONT_SIZE) / 2;
  const labelX = Math.min(Math.max(centre, half), pictureWidth - half);
  const labelTop = QUICK_LOCK_PLATE / 2 + LEADER_LENGTH;
  return {
    name: shape.name,
    x,
    width,
    height: shape.height,
    label: { text: shape.name, x: labelX, y: labelTop + COLLAR_FONT_SIZE * 0.75 },
    leader: { x1: centre, y1: shape.height / 2, x2: centre, y2: labelTop - 0.1 },
  };
}

function collarShape(hardware: Hardware) {
  return collarShapes[hardware.id] ?? { name: hardware.name, height: 2, width: 1 };
}

function collarWidth(hardware: Hardware): number {
  return hardware.widthIn ?? collarShape(hardware).width;
}

function loadedLength(loading: Loading, inventory: Inventory): number {
  const plates = (loading.positions[0]?.plates ?? []).reduce((sum, weight) => sum + stackLength(plateFor(inventory, weight)), 0);
  const collar = inventory.hardware.find((item) => item.id === loading.hardware[0]?.id && item.kind === "collar");
  return plates + (collar ? collarWidth(collar) : 0);
}

function stackLength(plate: Plate | undefined): number {
  return plate?.stackLengthIn ? used(plate.stackLengthIn) : 0.5;
}

function spreadOutsideLabels(plates: PlateDrawing[], pictureWidth: number) {
  const labels = plates.filter((plate) => !plate.label.inside).map((plate) => plate.label);
  const clusters = labels.map((label) => ({ labels: [label], desired: [label.x] }));
  const place = (cluster: (typeof clusters)[number]) => {
    const widths = cluster.labels.map((label) => textWidth(label.text, FONT_SIZE));
    const span = widths.reduce((sum, w) => sum + w, 0) + LABEL_GAP * (widths.length - 1);
    const centre = cluster.desired.reduce((sum, d) => sum + d, 0) / cluster.desired.length;
    let left = Math.min(Math.max(centre - span / 2, 0), pictureWidth - span);
    cluster.labels.forEach((label, i) => {
      label.x = left + widths[i]! / 2;
      left += widths[i]! + LABEL_GAP;
    });
  };
  for (let i = 1; i < clusters.length; ) {
    const previous = clusters[i - 1]!;
    const current = clusters[i]!;
    const previousRight = previous.labels.at(-1)!.x + textWidth(previous.labels.at(-1)!.text, FONT_SIZE) / 2;
    const currentLeft = current.labels[0]!.x - textWidth(current.labels[0]!.text, FONT_SIZE) / 2;
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

function describe(weights: number[], collar: Hardware | undefined): string {
  const plates = weights.length > 0 ? weights.join(", ") : "no plates";
  return `Each side, inside to outside: ${plates}${collar ? `, then the ${collar.name}` : ""}`;
}

function plateFor(inventory: Inventory, weight: number): Plate | undefined {
  return inventory.plates.find((plate) => plate.type === "quick-lock" && used(plate.weight) === weight);
}

function used(value: Value): number {
  return value.measured ?? value.listed;
}

// Barlow Condensed SemiBold advance widths, in ems, rounded.
function textWidth(text: string, fontSize: number): number {
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
