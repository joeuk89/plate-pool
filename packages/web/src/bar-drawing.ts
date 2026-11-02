import type { Inventory, Loading } from "@plate-pool/core";
import {
  drawHardware,
  drawnLength,
  fullReach,
  HARDWARE_LABEL_BOTTOM,
  hardwareIn,
  hardwareWidth,
  LABELS_TOP,
  MARGIN,
  MIN_PICTURE_WIDTH,
  PLATE_HEIGHT,
  placeOutsideLabels,
  plateSequence,
  scaleFor,
  stackPlates,
  type DrawOptions,
  type HardwareDrawing,
  type PlateDrawing,
} from "./plate-stack";

export interface BarDrawing {
  description: string;
  width: number;
  top: number;
  height: number;
  handle: { x: number; length: number };
  stop: { x: number; width: number; height: number };
  sleeve: { x: number; length: number };
  barDiameter: number;
  plates: PlateDrawing[];
  hardware?: HardwareDrawing;
}

// Drawing units, for drawing only.
const BAR_DIAMETER = 1;
const HANDLE_SHOWN = 1;
const HANDLE_SHOWN_SIDE_BY_SIDE = 0.4;
const STOP = { width: 0.375, height: 2.5 };
const END_MARGIN = 0.15;
const SLEEVE_BEYOND_HARDWARE = 0.5;
/** A bar with no `positionLength` draws a sleeve this long, or as long as its loading. */
const SLEEVE_WITHOUT_LENGTH = 1.7 * PLATE_HEIGHT;

export function drawBar(implement: string, loading: Loading, inventory: Inventory, options: DrawOptions = {}): BarDrawing {
  const scale = scaleFor(inventory, implement);
  const shown = options.sideBySide ?? [loading];
  const top = LABELS_TOP;
  const bottom = scale.implement?.hardware ? HARDWARE_LABEL_BOTTOM : PLATE_HEIGHT / 2 + MARGIN;
  const height = bottom - top;
  const loaded = (each: Loading) => drawnLength(scale, each.positions[0]) + hardwareWidth(scale, each);

  const handleShown = options.sideBySide ? HANDLE_SHOWN_SIDE_BY_SIDE : HANDLE_SHOWN;
  const handle = { x: 0, length: handleShown };
  const stop = { x: handleShown, ...STOP };
  const sleeveX = stop.x + stop.width;
  const longest = Math.max(...shown.map(loaded));
  const sleeveLength = Math.max(fullReach(scale) ?? SLEEVE_WITHOUT_LENGTH, longest);
  const width = options.sideBySide
    ? Math.max(height, sleeveX + longest + SLEEVE_BEYOND_HARDWARE)
    : Math.max(sleeveX + sleeveLength + END_MARGIN, MIN_PICTURE_WIDTH);
  const sleeve = { x: sleeveX, length: sleeveLength };

  const position = loading.positions[0];
  const plates = stackPlates(scale, position, sleeveX);
  placeOutsideLabels(plates, 0, width);

  const item = hardwareIn(loading, inventory);
  const hardware = item && drawHardware(scale, item, sleeveX + drawnLength(scale, position), width);

  return {
    description: `Each side, inside to outside: ${plateSequence(position?.plates ?? [])}${item ? `, then the ${item.name}` : ""}`,
    width,
    top,
    height,
    handle,
    stop,
    sleeve,
    barDiameter: BAR_DIAMETER,
    plates,
    ...(hardware ? { hardware } : {}),
  };
}
