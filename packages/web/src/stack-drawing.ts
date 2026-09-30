import type { Inventory, Loading } from "@plate-pool/core";
import {
  drawHardware,
  HARDWARE_LABEL_BOTTOM,
  LABELS_TOP,
  MARGIN,
  placeOutsideLabels,
  plateSequence,
  QUICK_LOCK_PLATE,
  SCREW,
  screwCapacity,
  screwFor,
  stackLength,
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
  /** What the plates sit against: the kettlebell handle's base, or the leg attachment's stop. */
  base: { x: number; width: number; height: number };
  /** The kettlebell handle's loop, lying on its side to the left of the base. */
  loop?: { left: number; right: number; radius: number; thickness: number };
  /** The leg attachment's lever and the plate holder that carries the stack. */
  lever?: { x: number; width: number; height: number };
  holder: { x: number; length: number; diameter: number };
  plates: PlateDrawing[];
  screw?: HardwareDrawing;
}

// Sizes in inches, for drawing only.
const LOOP = { radius: 2.2, thickness: 0.8, straight: 1.1 };
const KETTLEBELL_BASE = { width: 0.75, height: QUICK_LOCK_PLATE };
const LEVER = { width: 0.9, height: QUICK_LOCK_PLATE + 0.6 };
const LEG_STOP = { width: 0.375, height: 2.5 };
const HOLDER = { diameter: 1, beyond: 0.5, shortest: 10.5 };

export function drawStack(implement: string, loading: Loading, inventory: Inventory, options: DrawOptions = {}): StackDrawing {
  const kettlebell = implement === "kettlebell";
  const screwHardware = screwFor(loading, inventory);
  const top = LABELS_TOP;
  const shown = options.sideBySide ?? [loading];
  const bottom = shown.some((each) => screwFor(each, inventory)) ? HARDWARE_LABEL_BOTTOM : QUICK_LOCK_PLATE / 2 + MARGIN;
  const height = bottom - top;

  const loop = kettlebell
    ? { left: MARGIN, right: MARGIN + LOOP.thickness / 2 + LOOP.radius + LOOP.straight, radius: LOOP.radius, thickness: LOOP.thickness }
    : undefined;
  const lever = kettlebell ? undefined : { x: MARGIN, ...LEVER };
  const base = loop ? { x: loop.right, ...KETTLEBELL_BASE } : { x: MARGIN + LEVER.width, ...LEG_STOP };
  const start = base.x + base.width;

  const extent = (each: Loading) => stackLength(each.positions[0]?.plates ?? [], inventory) + (screwFor(each, inventory) ? SCREW.width : 0);
  const fullReach = kettlebell ? screwCapacity(implement, inventory) + SCREW.width : HOLDER.shortest;
  const reach = Math.max(...shown.map(extent), options.sideBySide ? 0 : fullReach);
  const holderLength = kettlebell ? 0 : Math.max(reach + HOLDER.beyond, options.sideBySide ? 0 : HOLDER.shortest);
  const drawn = start + (kettlebell ? reach : holderLength) + MARGIN;
  const width = options.sideBySide ? Math.max(drawn, height) : drawn;

  const weights = loading.positions[0]?.plates ?? [];
  const plates = stackPlates(weights, inventory, start);
  placeOutsideLabels(plates, 0, width);
  const screw = screwHardware && drawHardware(screwHardware.name, start + stackLength(weights, inventory), SCREW, width);

  const then = screwHardware ? `, then the ${screwHardware.name.toLowerCase()}` : "";
  return {
    description: `Stack, inside to outside: ${plateSequence(weights)}${then}`,
    width,
    top,
    height,
    base,
    ...(loop ? { loop } : {}),
    ...(lever ? { lever } : {}),
    holder: { x: start, length: holderLength, diameter: HOLDER.diameter },
    plates,
    ...(screw ? { screw } : {}),
  };
}

