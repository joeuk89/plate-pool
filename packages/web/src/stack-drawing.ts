import type { Inventory, Loading } from "@plate-pool/core";
import { lower } from "./kit";
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

export interface StackDrawing {
  description: string;
  width: number;
  top: number;
  height: number;
  mount: { x: number; width: number; height: number };
  stop: { x: number; width: number; height: number };
  post: { x: number; length: number; diameter: number };
  plates: PlateDrawing[];
  hardware?: HardwareDrawing;
}

// Drawing units, for drawing only.
const MOUNT = { width: 0.9, height: PLATE_HEIGHT * 0.6 };
const STOP = { width: 0.375, height: 2.5 };
const POST = { diameter: 1, beyond: 0.5 };
/** A stack with no `positionLength` and no hardware capacity draws a post this long, or as long as its loading. */
const POST_WITHOUT_LENGTH = 1.5 * PLATE_HEIGHT;

export function drawStack(implement: string, loading: Loading, inventory: Inventory, options: DrawOptions = {}): StackDrawing {
  const scale = scaleFor(inventory, implement);
  const item = hardwareIn(loading, inventory);
  const top = LABELS_TOP;
  const shown = options.sideBySide ?? [loading];
  const bottom = shown.some((each) => hardwareIn(each, inventory)) ? HARDWARE_LABEL_BOTTOM : PLATE_HEIGHT / 2 + MARGIN;
  const height = bottom - top;

  const mount = { x: MARGIN, ...MOUNT };
  const stop = { x: mount.x + mount.width, ...STOP };
  const start = stop.x + stop.width;

  const extent = (each: Loading) => drawnLength(scale, each.positions[0]) + hardwareWidth(scale, each);
  const longest = Math.max(...shown.map(extent));
  const reach = options.sideBySide ? longest : Math.max(longest, fullReach(scale) ?? POST_WITHOUT_LENGTH);
  const postLength = reach + POST.beyond;
  const drawn = start + postLength + MARGIN;
  const width = options.sideBySide ? Math.max(drawn, height) : Math.max(drawn, MIN_PICTURE_WIDTH);

  const position = loading.positions[0];
  const plates = stackPlates(scale, position, start);
  placeOutsideLabels(plates, 0, width);
  const hardware = item && drawHardware(scale, item, start + drawnLength(scale, position), width);

  const then = item ? `, then the ${lower(item.name)}` : "";
  return {
    description: `Stack, inside to outside: ${plateSequence(position?.plates ?? [])}${then}`,
    width,
    top,
    height,
    mount,
    stop,
    post: { x: start, length: postLength, diameter: POST.diameter },
    plates,
    ...(hardware ? { hardware } : {}),
  };
}
