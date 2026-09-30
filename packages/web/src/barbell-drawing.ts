import type { Hardware, Inventory, Loading } from "@plate-pool/core";
import {
  clampLabel,
  FONT_SIZE,
  HARDWARE_FONT_SIZE,
  HARDWARE_LABEL_BOTTOM,
  HARDWARE_LABEL_Y,
  hardwareFor,
  LABELS_TOP,
  LEADER_LENGTH,
  placeOutsideLabels,
  plateSequence,
  QUICK_LOCK_PLATE,
  stackLength,
  stackPlates,
  used,
  type HardwareDrawing,
  type PlateDrawing,
} from "./plate-stack";

export interface BarbellDrawing {
  description: string;
  width: number;
  top: number;
  height: number;
  fontSize: number;
  hardwareFontSize: number;
  handle: { x: number; length: number };
  stop: { x: number; width: number; height: number };
  sleeve: { x: number; length: number };
  barDiameter: number;
  plates: PlateDrawing[];
  collar?: HardwareDrawing;
}

// Sizes in inches, for drawing only.
const BAR_DIAMETER = 1;
const HANDLE_SHOWN = 1;
const HANDLE_SHOWN_SIDE_BY_SIDE = 0.4;
const STOP = { width: 0.375, height: 2.5 };
const END_MARGIN = 0.15;
const SLEEVE_BEYOND_COLLAR = 0.5;

const collarShapes: Record<string, { name: string; height: number; width: number }> = {
  "collar-clamp": { name: "Clamp collar", height: 2, width: 1.26 },
  "collar-spinlock": { name: "Spin-lock collar", height: 3, width: 1 },
};

export interface DrawOptions {
  /** The loadings shown in one row: their pictures crop the empty space to fit the longest, at one shared scale. */
  sideBySide?: Loading[];
}

export function drawBarbell(loading: Loading, inventory: Inventory, options: DrawOptions = {}): BarbellDrawing {
  const barbell = inventory.implements.find((implement) => implement.id === "barbell");
  const top = LABELS_TOP;
  const height = HARDWARE_LABEL_BOTTOM - top;

  const handleShown = options.sideBySide ? HANDLE_SHOWN_SIDE_BY_SIDE : HANDLE_SHOWN;
  const handle = { x: 0, length: handleShown };
  const stop = { x: handleShown, ...STOP };
  const sleeve = { x: stop.x + stop.width, length: barbell?.positionLengthIn ? used(barbell.positionLengthIn) : 11.5 };
  const width = options.sideBySide
    ? Math.max(height, sleeve.x + Math.max(...options.sideBySide.map((shown) => loadedLength(shown, inventory))) + SLEEVE_BEYOND_COLLAR)
    : sleeve.x + sleeve.length + END_MARGIN;

  const weights = loading.positions[0]?.plates ?? [];
  const plates = stackPlates(weights, inventory, sleeve.x);
  placeOutsideLabels(plates, 0, width);

  const collarHardware = collarFor(loading, inventory);
  const collar = collarHardware && drawCollar(collarHardware, sleeve.x + stackLength(weights, inventory), width);

  return {
    description: `Each side, inside to outside: ${plateSequence(weights)}${collarHardware ? `, then the ${collarHardware.name}` : ""}`,
    width,
    top,
    height,
    fontSize: FONT_SIZE,
    hardwareFontSize: HARDWARE_FONT_SIZE,
    handle,
    stop,
    sleeve,
    barDiameter: BAR_DIAMETER,
    plates,
    ...(collar ? { collar } : {}),
  };
}

function drawCollar(hardware: Hardware, x: number, pictureWidth: number): HardwareDrawing {
  const shape = collarShape(hardware);
  const width = collarWidth(hardware);
  const centre = x + width / 2;
  return {
    name: shape.name,
    x,
    width,
    height: shape.height,
    label: { text: shape.name, x: clampLabel(shape.name, centre, HARDWARE_FONT_SIZE, 0, pictureWidth), y: HARDWARE_LABEL_Y },
    leaders: [{ x1: centre, y1: shape.height / 2, x2: centre, y2: QUICK_LOCK_PLATE / 2 + LEADER_LENGTH - 0.1 }],
  };
}

function collarShape(hardware: Hardware) {
  return collarShapes[hardware.id] ?? { name: hardware.name, height: 2, width: 1 };
}

function collarWidth(hardware: Hardware): number {
  return hardware.widthIn ?? collarShape(hardware).width;
}

function loadedLength(loading: Loading, inventory: Inventory): number {
  const collar = collarFor(loading, inventory);
  return stackLength(loading.positions[0]?.plates ?? [], inventory) + (collar ? collarWidth(collar) : 0);
}

function collarFor(loading: Loading, inventory: Inventory): Hardware | undefined {
  const hardware = hardwareFor(loading.hardware[0]?.id, inventory);
  return hardware?.kind === "collar" ? hardware : undefined;
}
