import type { Hardware, Inventory, Loading } from "@plate-pool/core";
import type { DrawOptions } from "./barbell-drawing";
import { endLabel } from "./describe";
import {
  clampLabel,
  FONT_SIZE,
  HARDWARE_FONT_SIZE,
  HARDWARE_LABEL_BOTTOM,
  HARDWARE_LABEL_Y,
  LABELS_TOP,
  LEADER_LENGTH,
  MARGIN,
  OUTSIDE_LABEL_Y,
  placeOutsideLabels,
  plateSequence,
  QUICK_LOCK_PLATE,
  SCREW,
  screwCapacity,
  screwFor,
  stackLength,
  stackPlates,
  textWidth,
  type Callout,
  type PlateDrawing,
} from "./plate-stack";

export interface Part {
  x: number;
  width: number;
  height: number;
}

export interface EndDrawing {
  name: string;
  plates: PlateDrawing[];
  screw?: Part;
}

export interface HeavierMark {
  text: string;
  x: number;
  y: number;
  lineY: number;
  from: number;
  to: number;
}

export interface DumbbellDrawing {
  description: string;
  width: number;
  top: number;
  height: number;
  fontSize: number;
  handle: { left: number; right: number; grip: Part; stops: [Part, Part] };
  ends: EndDrawing[];
  screwLabel?: Callout;
  heavier?: HeavierMark;
}

// Sizes in inches. The grip diameter comes from Ironmaster; the grip is drawn shorter than its real 6.5 in so plates stay large.
const GRIP = { length: 4, diameter: 1.25 };
const STOP = { width: 0.375, height: 3 };
const HEAVIER_GAP = 0.55;
const TICK = 0.2;
const HEAVIER_Y = OUTSIDE_LABEL_Y - FONT_SIZE * 0.75 - HEAVIER_GAP;

export function drawDumbbell(loading: Loading, inventory: Inventory, options: DrawOptions = {}): DumbbellDrawing {
  const screwHardware = screwFor(loading, inventory);
  const screwLabelText = screwHardware ? `${screwHardware.name}s` : undefined;
  const heavierText = loading.uneven && loading.heavier ? `${endLabel(loading.heavier)} heavier` : undefined;
  const top = heavierText ? heavierLabelY() - HARDWARE_FONT_SIZE * 0.75 - MARGIN : LABELS_TOP;
  const bottom = screwHardware ? HARDWARE_LABEL_BOTTOM : QUICK_LOCK_PLATE / 2 + MARGIN;

  const fullReach = screwCapacity("dumbbell", inventory) + SCREW.width;
  const reach = Math.max(...(options.sideBySide ?? [loading]).map((shown) => longestEnd(shown, inventory)), options.sideBySide ? 0 : fullReach);
  const inner = GRIP.length / 2 + STOP.width;
  const needed = Math.max(
    screwLabelText ? textWidth(screwLabelText, HARDWARE_FONT_SIZE) : 0,
    heavierText ? textWidth(heavierText, HARDWARE_FONT_SIZE) : 0,
    options.sideBySide ? bottom - top : 0,
  );
  const width = Math.max(2 * (inner + reach + MARGIN), needed + 2 * MARGIN);
  const centre = width / 2;
  const left = centre - inner;
  const right = centre + inner;

  const ends = loading.positions.map((position, index): EndDrawing => {
    const direction = index === 0 ? -1 : 1;
    const start = direction === -1 ? left : right;
    const plates = stackPlates(position.plates, inventory, start, direction);
    const edge = start + direction * stackLength(position.plates, inventory);
    const screw = screwHardware && { x: direction === -1 ? edge - SCREW.width : edge, ...SCREW };
    return { name: position.name, plates, ...(screw ? { screw } : {}) };
  });
  placeOutsideLabels(
    ends.flatMap((end) => end.plates),
    0,
    width,
  );

  const heavierEnd = ends.find((end) => end.name === loading.heavier);
  const heavier = heavierText && heavierEnd ? markHeavier(heavierText, heavierEnd, left, right, width) : undefined;

  return {
    description: describe(loading, screwHardware),
    width,
    top,
    height: bottom - top,
    fontSize: FONT_SIZE,
    handle: {
      left,
      right,
      grip: { x: centre - GRIP.length / 2, width: GRIP.length, height: GRIP.diameter },
      stops: [
        { x: left, ...STOP },
        { x: right - STOP.width, ...STOP },
      ],
    },
    ends,
    ...(screwLabelText ? { screwLabel: screwCallout(screwLabelText, ends, centre) } : {}),
    ...(heavier ? { heavier } : {}),
  };
}

function screwCallout(text: string, ends: EndDrawing[], centre: number): Callout {
  const screws = ends.flatMap((end) => (end.screw ? [end.screw.x + end.screw.width / 2] : []));
  const bracketY = QUICK_LOCK_PLATE / 2 + 0.15;
  const labelTop = QUICK_LOCK_PLATE / 2 + LEADER_LENGTH - 0.1;
  return {
    label: { text, x: centre, y: HARDWARE_LABEL_Y },
    leaders: [
      ...screws.map((x) => ({ x1: x, y1: SCREW.height / 2, x2: x, y2: bracketY })),
      { x1: Math.min(...screws), y1: bracketY, x2: Math.max(...screws), y2: bracketY },
      { x1: centre, y1: bracketY, x2: centre, y2: labelTop },
    ],
  };
}

function markHeavier(text: string, end: EndDrawing, left: number, right: number, width: number): HeavierMark {
  const edges = [
    ...end.plates.flatMap((plate) => [plate.x, plate.x + plate.width]),
    ...(end.screw ? [end.screw.x, end.screw.x + end.screw.width] : []),
  ];
  const onLeft = end.plates[0] ? end.plates[0].x < left : (end.screw?.x ?? right) < left;
  const from = onLeft ? Math.min(...edges) : right;
  const to = onLeft ? left : Math.max(...edges);
  return { text, x: clampLabel(text, (from + to) / 2, HARDWARE_FONT_SIZE, 0, width), y: heavierLabelY(), lineY: HEAVIER_Y, from, to };
}

function heavierLabelY(): number {
  return HEAVIER_Y - TICK / 2 - 0.1;
}

export function heavierTicks(mark: HeavierMark) {
  return [mark.from, mark.to].map((x) => ({ x1: x, y1: mark.lineY, x2: x, y2: mark.lineY + TICK }));
}

function longestEnd(loading: Loading, inventory: Inventory): number {
  const screw = screwFor(loading, inventory) ? SCREW.width : 0;
  return Math.max(...loading.positions.map((position) => stackLength(position.plates, inventory))) + screw;
}

function describe(loading: Loading, screw: Hardware | undefined): string {
  const then = screw ? `, then a ${screw.name.toLowerCase()}` : "";
  const [first] = loading.positions;
  if (!loading.uneven) return `Each end, inside to outside: ${plateSequence(first?.plates ?? [])}${then}`;
  const ends = loading.positions.map((position) => `${endLabel(position.name)}, inside to outside: ${plateSequence(position.plates)}${then}`);
  return `${ends.join(". ")}. ${endLabel(loading.heavier ?? "")} is heavier`;
}
