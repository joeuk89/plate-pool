import type { Hardware, Inventory, Loading } from "@plate-pool/core";
import { endLabel } from "./describe";
import { lower } from "./kit";
import {
  clampLabel,
  drawnLength,
  FONT_SIZE,
  fullReach,
  glyphOf,
  HARDWARE_FONT_SIZE,
  HARDWARE_LABEL_BOTTOM,
  HARDWARE_LABEL_Y,
  HARDWARE_LEADER_END,
  hardwareIn,
  hardwareWidth,
  LABELS_TOP,
  MARGIN,
  MIN_PICTURE_WIDTH,
  OUTSIDE_LABEL_Y,
  PLATE_HEIGHT,
  placeOutsideLabels,
  plateSequence,
  scaleFor,
  stackPlates,
  textWidth,
  type Callout,
  type DrawOptions,
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
  hardware?: Part;
}

export interface HeavierMark {
  text: string;
  x: number;
  y: number;
  lineY: number;
  from: number;
  to: number;
}

export interface HandleDrawing {
  description: string;
  width: number;
  top: number;
  height: number;
  handle: { left: number; right: number; grip: Part; stops: [Part, Part] };
  /** Drawn only when the handle states a `positionLength`. */
  sleeves: Part[];
  ends: EndDrawing[];
  hardwareKind?: Hardware["kind"];
  hardwareLabel?: Callout;
  heavier?: HeavierMark;
}

// Drawing units. The grip is drawn shorter than a real one so plates stay large.
const GRIP = { length: 4, diameter: 1.25 };
const STOP = { width: 0.375, height: 3 };
const SLEEVE_DIAMETER = 1;
const HEAVIER_GAP = 0.55;
const TICK = 0.2;
const HEAVIER_Y = OUTSIDE_LABEL_Y - FONT_SIZE * 0.75 - HEAVIER_GAP;

export function drawHandle(implement: string, loading: Loading, inventory: Inventory, options: DrawOptions = {}): HandleDrawing {
  const scale = scaleFor(inventory, implement);
  const item = hardwareIn(loading, inventory);
  const labelText = hardwareLabel(loading, inventory);
  const heavierText = heavierLabel(loading);

  const shown = options.sideBySide ?? [loading];
  const labels = shown.flatMap((each) => [hardwareLabel(each, inventory), heavierLabel(each)]).filter((text) => text !== undefined);
  const top = shown.some(heavierLabel) ? heavierLabelY() - HARDWARE_FONT_SIZE * 0.75 - MARGIN : LABELS_TOP;
  const bottom = shown.some((each) => hardwareIn(each, inventory)) ? HARDWARE_LABEL_BOTTOM : PLATE_HEIGHT / 2 + MARGIN;

  const longestEnd = (each: Loading) =>
    Math.max(...each.positions.map((position) => drawnLength(scale, position))) + hardwareWidth(scale, each);
  const sleeveLength = scale.implement?.positionLength ? fullReach(scale) : undefined;
  const reach = Math.max(...shown.map(longestEnd), options.sideBySide ? 0 : (fullReach(scale) ?? 0));
  const inner = GRIP.length / 2 + STOP.width;
  const needed = Math.max(...labels.map((text) => textWidth(text, HARDWARE_FONT_SIZE)), options.sideBySide ? bottom - top : 0);
  const width = Math.max(2 * (inner + reach + MARGIN), needed + 2 * MARGIN, options.sideBySide ? 0 : MIN_PICTURE_WIDTH);
  const centre = width / 2;
  const left = centre - inner;
  const right = centre + inner;

  const ends = loading.positions.map((position, index): EndDrawing => {
    const direction = index === 0 ? -1 : 1;
    const start = direction === -1 ? left : right;
    const plates = stackPlates(scale, position, start, direction);
    const edge = start + direction * drawnLength(scale, position);
    const glyph = item && hasHardware(loading, position.name) ? glyphOf(scale, item) : undefined;
    const part = glyph && { x: direction === -1 ? edge - glyph.width : edge, ...glyph };
    return { name: position.name, plates, ...(part ? { hardware: part } : {}) };
  });
  placeOutsideLabels(
    ends.flatMap((end) => end.plates),
    0,
    width,
  );

  const heavierEnd = ends.find((end) => end.name === loading.heavier);
  const heavier = heavierText && heavierEnd ? markHeavier(heavierText, heavierEnd, left, right, width) : undefined;
  const sleeveReach = sleeveLength === undefined ? 0 : Math.max(sleeveLength, longestEnd(loading));
  const sleeves =
    sleeveLength === undefined
      ? []
      : [
          { x: left - sleeveReach, width: sleeveReach, height: SLEEVE_DIAMETER },
          { x: right, width: sleeveReach, height: SLEEVE_DIAMETER },
        ];

  return {
    description: describe(loading, item),
    width,
    top,
    height: bottom - top,
    handle: {
      left,
      right,
      grip: { x: centre - GRIP.length / 2, width: GRIP.length, height: GRIP.diameter },
      stops: [
        { x: left, ...STOP },
        { x: right - STOP.width, ...STOP },
      ],
    },
    sleeves,
    ends,
    ...(item ? { hardwareKind: item.kind } : {}),
    ...(labelText ? { hardwareLabel: hardwareCallout(labelText, ends, centre) } : {}),
    ...(heavier ? { heavier } : {}),
  };
}

function hardwareCallout(text: string, ends: EndDrawing[], centre: number): Callout {
  const parts = ends.flatMap((end) => (end.hardware ? [end.hardware] : []));
  const xs = parts.map((part) => part.x + part.width / 2);
  const bracketY = PLATE_HEIGHT / 2 + 0.15;
  return {
    label: { text, x: centre, y: HARDWARE_LABEL_Y },
    leaders: [
      ...parts.map((part, index) => ({ x1: xs[index]!, y1: part.height / 2, x2: xs[index]!, y2: bracketY })),
      { x1: Math.min(...xs, centre), y1: bracketY, x2: Math.max(...xs, centre), y2: bracketY },
      { x1: centre, y1: bracketY, x2: centre, y2: HARDWARE_LEADER_END },
    ],
  };
}

function markHeavier(text: string, end: EndDrawing, left: number, right: number, width: number): HeavierMark {
  const edges = [
    ...end.plates.flatMap((plate) => [plate.x, plate.x + plate.width]),
    ...(end.hardware ? [end.hardware.x, end.hardware.x + end.hardware.width] : []),
  ];
  const onLeft = end.plates[0] ? end.plates[0].x < left : (end.hardware?.x ?? right) < left;
  const from = onLeft ? Math.min(...edges) : right;
  const to = onLeft ? left : Math.max(...edges);
  return { text, x: clampLabel(text, (from + to) / 2, HARDWARE_FONT_SIZE, 0, width), y: heavierLabelY(), lineY: HEAVIER_Y, from, to };
}

function hardwareLabel(loading: Loading, inventory: Inventory): string | undefined {
  const item = hardwareIn(loading, inventory);
  if (!item) return undefined;
  return onOneEnd(loading) ? item.name : `${item.name}s`;
}

function onOneEnd(loading: Loading): boolean {
  return (loading.hardware[0]?.count ?? 0) < loading.positions.length;
}

function hasHardware(loading: Loading, position: string): boolean {
  return !onOneEnd(loading) || position === loading.heavier;
}

function heavierLabel(loading: Loading): string | undefined {
  return loading.uneven && loading.heavier ? `${endLabel(loading.heavier)} heavier` : undefined;
}

function heavierLabelY(): number {
  return HEAVIER_Y - TICK / 2 - 0.1;
}

export function heavierTicks(mark: HeavierMark) {
  return [mark.from, mark.to].map((x) => ({ x1: x, y1: mark.lineY, x2: x, y2: mark.lineY + TICK }));
}

function describe(loading: Loading, item: Hardware | undefined): string {
  const then = (position: string) => (item && hasHardware(loading, position) ? `, then a ${lower(item.name)}` : "");
  const [first] = loading.positions;
  if (!loading.uneven) return `Each end, inside to outside: ${plateSequence(first?.plates ?? [])}${then(first?.name ?? "")}`;
  const ends = loading.positions.map(
    (position) => `${endLabel(position.name)}, inside to outside: ${plateSequence(position.plates)}${then(position.name)}`,
  );
  return `${ends.join(". ")}. ${endLabel(loading.heavier ?? "")} is heavier`;
}
