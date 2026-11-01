// PROTOTYPE, throwaway. Three ways to draw any plate-loaded implement from format 1 data:
//   A  one silhouette per `picture`, plates at true relative size, hardware drawn by style
//   B  the kind's default drawing only, plate sizes banded so labels fit, hardware by kind
//   C  the kind's default drawing plus a small icon for the `picture`, true diameters with a
//      legible minimum thickness, hardware by kind
// Answers plate-pool issue #60. Never ships.
import type { ReactNode } from "react";
import { CalloutLabel, Plates } from "../picture-parts";
import {
  drawHardware,
  FONT_SIZE,
  HARDWARE_LABEL_BOTTOM,
  LABELS_TOP,
  MARGIN,
  OUTSIDE_LABEL_Y,
  placeOutsideLabels,
  QUICK_LOCK_PLATE as REF,
  textWidth,
  type HardwareDrawing,
  type PlateDrawing,
} from "../plate-stack";
import { colourFor, plateSpec, type ColourRule, type HardwareSpec, type PictureId, type PlateSpec, type Scenario } from "./kits";

export type Variant = "A" | "B" | "C";

export const variants: { id: Variant; name: string; detail: string }[] = [
  { id: "A", name: "Silhouettes", detail: "One drawing per picture · plates at true relative size · hardware drawn by style" },
  { id: "B", name: "Kind defaults", detail: "Four drawings, picture ignored · plate sizes banded · hardware drawn by kind" },
  { id: "C", name: "Default plus icon", detail: "Four drawings, picture as an icon · true diameters, legible thickness · hardware by kind" },
];

const STOP = { width: 0.375, height: 2.5 };
const BAR_DIAMETER = 1;
const LABEL_PADDING = 0.06;

interface Fixture {
  /** where the first plate sits */
  start: number;
  node: ReactNode;
}

interface Drawn {
  width: number;
  top: number;
  bottom: number;
  nodes: ReactNode;
}

function largestDiameter(scenario: Scenario): number {
  const accepted = scenario.plates.filter((plate) => plate.diameter <= (scenario.maxPlateDiameter ?? Infinity));
  return Math.max(...accepted.map((plate) => plate.diameter));
}

function scaleOf(scenario: Scenario): number {
  return REF / largestDiameter(scenario);
}

function plateHeight(spec: PlateSpec, s: number, variant: Variant, scenario: Scenario): number {
  if (variant !== "B") return spec.diameter * s;
  const ratio = spec.diameter / largestDiameter(scenario);
  return ratio >= 0.85 ? REF : ratio >= 0.6 ? REF * 0.78 : ratio >= 0.4 ? REF * 0.58 : REF * 0.42;
}

function plateWidth(spec: PlateSpec, s: number, variant: Variant): number {
  const real = spec.thickness * s;
  return variant === "A" ? real : Math.max(real, variant === "B" ? 0.9 : 0.45);
}

function layoutPlates(
  scenario: Scenario,
  weights: number[],
  start: number,
  direction: 1 | -1,
  variant: Variant,
  rule: ColourRule,
): PlateDrawing[] {
  const s = scaleOf(scenario);
  let edge = start;
  return weights.map((weight): PlateDrawing => {
    const spec = plateSpec(scenario, weight);
    const width = plateWidth(spec, s, variant);
    const height = plateHeight(spec, s, variant, scenario);
    const x = direction === 1 ? edge : edge - width;
    edge += direction * width;
    const text = String(weight);
    const inside = textWidth(text, FONT_SIZE) + 2 * LABEL_PADDING <= width;
    return {
      weight,
      x,
      width,
      height,
      round: spec.shape === "round" && spec.diameter < 140,
      ...colourFor(scenario, weight, rule),
      label: { text, x: x + width / 2, y: inside ? FONT_SIZE * 0.35 : OUTSIDE_LABEL_Y, inside },
    };
  });
}

function stackWidth(plates: PlateDrawing[]): number {
  return plates.reduce((sum, plate) => sum + plate.width, 0);
}

// Hardware

function hardwareShape(hardware: HardwareSpec, s: number, variant: Variant): { width: number; height: number } {
  const width = Math.max(hardware.width * s, 0.35);
  if (variant !== "A") return { width, height: hardware.kind === "screw" ? 4 : hardware.kind === "pin" ? 5.2 : 2 };
  const heights: Record<HardwareSpec["style"], number> = { spring: 2, clamp: 2, spinlock: 2.2, screw: 4, pin: 5.2 };
  return { width, height: heights[hardware.style] };
}

function HardwareGlyph({ hardware, drawing, variant }: { hardware: HardwareSpec; drawing: HardwareDrawing; variant: Variant }) {
  const { x, width, height } = drawing;
  const centre = x + width / 2;
  const byKind = variant !== "A";
  const style = byKind ? (hardware.kind === "collar" ? "clamp-plain" : hardware.kind) : hardware.style;
  return (
    <g>
      {style === "pin" ? (
        <>
          <rect className="screw" x={centre - 0.12} y={-height / 2} width={0.24} height={height} rx={0.12} />
          {!byKind && <circle className="pp-ring" cx={centre} cy={-height / 2 - 0.3} r={0.38} />}
        </>
      ) : (
        <rect className={hardware.kind === "screw" ? "screw" : "collar"} x={x + 0.025} y={-height / 2} width={width - 0.05} height={height} rx={style === "screw" ? 0.15 : 0.18} />
      )}
      {style === "spring" && (
        <>
          <line className="pp-wire" x1={centre - 0.1} y1={-height / 2} x2={centre - 0.4} y2={-height / 2 - 0.7} />
          <line className="pp-wire" x1={centre + 0.1} y1={-height / 2} x2={centre + 0.4} y2={-height / 2 - 0.7} />
        </>
      )}
      {style === "clamp" && <rect className="collar" x={centre - 0.14} y={-height / 2 - 0.9} width={0.28} height={0.95} rx={0.1} />}
      {style === "spinlock" && (
        <>
          <line className="pp-facet" x1={x + 0.05} y1={-0.45} x2={x + width - 0.05} y2={-0.45} />
          <line className="pp-facet" x1={x + 0.05} y1={0.45} x2={x + width - 0.05} y2={0.45} />
        </>
      )}
      <CalloutLabel callout={drawing} />
    </g>
  );
}

function placeHardware(scenario: Scenario, x: number, pictureWidth: number, variant: Variant): HardwareDrawing | undefined {
  const hardware = scenario.hardware;
  if (!hardware) return undefined;
  return drawHardware(hardware.name, x, hardwareShape(hardware, scaleOf(scenario), variant), pictureWidth);
}

// Fixtures: what sits to the left of the first plate

function Fade({ x, length, y = 0 }: { x: number; length: number; y?: number }) {
  return <rect className="pp-fade" x={x} y={y - BAR_DIAMETER / 2 + 0.12} width={length} height={BAR_DIAMETER - 0.24} />;
}

function Stop({ x, y = 0 }: { x: number; y?: number }) {
  return <rect className="bar" x={x} y={y - STOP.height / 2} width={STOP.width} height={STOP.height} rx={0.08} />;
}

function Icon({ picture, x, y }: { picture: PictureId; x: number; y: number }) {
  const paths: Partial<Record<PictureId, string>> = {
    ez: "M0 0.7 L0.35 0.3 L0.7 0.9 L1.05 0.3 L1.4 0.7",
    swiss: "M0 0.25 H1.4 M0 0.95 H1.4 M0.45 0.25 V0.95 M0.95 0.25 V0.95",
    trap: "M0.35 0.1 H1.05 L1.4 0.6 L1.05 1.1 H0.35 L0 0.6 Z",
    "safety-squat": "M0 0.2 H0.8 Q1.2 0.2 1.2 0.7 V1.1 M0.25 0 H0.65",
    kettlebell: "M0.3 1.1 H1.1 M0.35 1.1 V0.7 Q0.35 0.1 0.7 0.1 Q1.05 0.1 1.05 0.7 V1.1",
    "dip-belt": "M0.1 0.1 Q0.7 0.5 1.3 0.1 M0.7 0.35 V1.1 M0.5 1.1 H0.9",
    landmine: "M0 1.1 H1.4 M0.3 1.1 L1.2 0.1",
    "leg-press": "M0 0.1 V1.1 M0.3 0.1 V1.1 M0.3 0.6 H1.4",
  };
  const d = paths[picture];
  if (!d) return null;
  return (
    <g className="pp-icon" transform={`translate(${x} ${y})`}>
      <path d={d} />
    </g>
  );
}

function barFixture(picture: PictureId, variant: Variant): Fixture {
  if (variant !== "A" || picture === "bar") {
    return {
      start: 1 + STOP.width,
      node: (
        <>
          <Fade x={0} length={1} />
          <Stop x={1} />
          {variant === "C" && <Icon picture={picture} x={0} y={-3.2} />}
        </>
      ),
    };
  }
  switch (picture) {
    case "ez":
      return {
        start: 2.8 + STOP.width,
        node: (
          <>
            <Fade x={0} length={0.8} />
            <path className="pp-shaft" d="M0.8 0 L1.35 -0.65 L1.9 0.65 L2.45 -0.65 L2.8 0" />
            <Stop x={2.8} />
          </>
        ),
      };
    case "swiss":
      return {
        start: 3.6 + STOP.width,
        node: (
          <>
            <Fade x={0} length={0.6} />
            <rect className="bar" x={0.6} y={-1.6} width={2.7} height={0.45} rx={0.1} />
            <rect className="bar" x={0.6} y={1.15} width={2.7} height={0.45} rx={0.1} />
            <rect className="bar" x={1.3} y={-1.6} width={0.4} height={3.2} rx={0.1} />
            <rect className="bar" x={2.3} y={-1.6} width={0.4} height={3.2} rx={0.1} />
            <rect className="bar" x={3.1} y={-1.6} width={0.3} height={3.2} rx={0.1} />
            <rect className="bar" x={3.3} y={-BAR_DIAMETER / 2} width={0.3} height={BAR_DIAMETER} />
            <Stop x={3.6} />
          </>
        ),
      };
    case "trap":
      return {
        start: 5.0 + STOP.width,
        node: (
          <>
            <Fade x={0} length={0.5} />
            <polygon className="pp-frame" points="0.5,0 1.5,-2.4 3.6,-2.4 4.6,0 3.6,2.4 1.5,2.4" />
            <rect className="bar" x={1.6} y={-1.25} width={1.9} height={0.45} rx={0.2} />
            <rect className="bar" x={1.6} y={0.8} width={1.9} height={0.45} rx={0.2} />
            <rect className="bar" x={4.5} y={-BAR_DIAMETER / 2} width={0.5} height={BAR_DIAMETER} />
            <Stop x={5.0} />
          </>
        ),
      };
    case "safety-squat":
      return {
        start: 3.3 + STOP.width,
        node: (
          <>
            <Fade x={0} length={0.9} y={-2.4} />
            <rect className="bar" x={0.9} y={-2.4 - BAR_DIAMETER / 2} width={1.2} height={BAR_DIAMETER} />
            <rect className="pp-pad" x={0.7} y={-3.2} width={1.3} height={1.3} rx={0.45} />
            <path className="pp-shaft" d="M2.1 -2.4 C 2.9 -2.4, 2.6 0, 3.35 0" />
            <Stop x={3.3} />
          </>
        ),
      };
    default:
      return barFixture("bar", variant);
  }
}

function stackFixture(picture: PictureId, variant: Variant): Fixture & { post: boolean; base?: number } {
  if (variant !== "A" || picture === "stack") {
    return {
      start: 0.6 + STOP.width,
      post: true,
      node: (
        <>
          <rect className="bar" x={MARGIN} y={-1.6} width={0.5} height={3.2} rx={0.15} />
          <Stop x={0.6} />
          {variant === "C" && <Icon picture={picture} x={0} y={-3.2} />}
        </>
      ),
    };
  }
  switch (picture) {
    case "kettlebell": {
      const loop = { left: MARGIN, radius: 2.2, thickness: 0.8, straight: 1.1 };
      const baseX = loop.left + loop.thickness / 2 + loop.radius + loop.straight;
      const base = { x: baseX, width: 0.75, height: REF * 0.6 };
      return {
        start: base.x + base.width,
        post: false,
        node: (
          <>
            <path
              className="handle"
              strokeWidth={loop.thickness}
              d={`M ${base.x + 0.1} ${-loop.radius} H ${loop.left + loop.thickness / 2 + loop.radius} A ${loop.radius} ${loop.radius} 0 0 0 ${loop.left + loop.thickness / 2 + loop.radius} ${loop.radius} H ${base.x + 0.1}`}
            />
            <rect className="bar" x={base.x} y={-base.height / 2} width={base.width} height={base.height} rx={0.12} />
          </>
        ),
      };
    }
    case "dip-belt":
      return {
        start: 3.0,
        post: false,
        node: (
          <>
            <path className="pp-belt" d="M1.0 -2.4 Q 0.2 0 1.0 2.4" />
            {[0, 1, 2, 3].map((i) => (
              <ellipse key={i} className="pp-link" cx={1.15 + i * 0.5} cy={0} rx={0.3} ry={0.17} />
            ))}
          </>
        ),
      };
    case "landmine":
      return {
        start: 2.9 + STOP.width,
        post: true,
        node: (
          <>
            <line className="pp-floor" x1={0} y1={3.1} x2={2.4} y2={3.1} />
            <rect className="bar" x={0.4} y={2.6} width={1.2} height={0.45} rx={0.1} />
            <rect className="pp-tube" x={0.9} y={0.1} width={1.2} height={2.6} rx={0.2} transform="rotate(-40 1.5 0.1)" />
            <Fade x={1.3} length={1.6} />
            <Stop x={2.9} />
          </>
        ),
      };
    case "leg-press":
      return {
        start: 1.5,
        post: true,
        node: (
          <>
            <rect className="bar" x={0.5} y={-3.3} width={1.0} height={6.6} rx={0.2} />
            <rect className="pp-pad" x={0.1} y={-3.3} width={0.4} height={6.6} rx={0.15} />
            <rect className="pp-stub" x={1.5} y={1.9} width={1.6} height={0.7} rx={0.1} />
          </>
        ),
      };
    default:
      return stackFixture("stack", variant);
  }
}

// Engines per kind

function drawBar(scenario: Scenario, variant: Variant, rule: ColourRule): Drawn {
  const s = scaleOf(scenario);
  const fixture = barFixture(scenario.picture, variant);
  const position = scenario.positions[0]!;
  const plates = layoutPlates(scenario, position.plates, fixture.start, 1, variant, rule);
  const loaded = stackWidth(plates);
  const hardwareWidth = scenario.hardware ? hardwareShape(scenario.hardware, s, variant).width : 0;
  const sleeveLength = scenario.positionLength * s;
  const width = fixture.start + Math.max(sleeveLength, loaded + hardwareWidth) + 0.5;
  placeOutsideLabels(plates, 0, width);
  const hardware = placeHardware(scenario, fixture.start + loaded, width, variant);
  return {
    width,
    top: LABELS_TOP,
    bottom: hardware ? HARDWARE_LABEL_BOTTOM : REF / 2 + MARGIN,
    nodes: (
      <>
        {fixture.node}
        <rect className="bar" x={fixture.start} y={-BAR_DIAMETER / 2} width={Math.max(sleeveLength, loaded + hardwareWidth)} height={BAR_DIAMETER} rx={0.08} />
        <Plates plates={plates} />
        {hardware && scenario.hardware && <HardwareGlyph hardware={scenario.hardware} drawing={hardware} variant={variant} />}
      </>
    ),
  };
}

function drawHandle(scenario: Scenario, variant: Variant, rule: ColourRule): Drawn {
  const s = scaleOf(scenario);
  const grip = { length: Math.max(2.4, 100 * s), diameter: 1.25 };
  const hardwareWidth = scenario.hardware ? hardwareShape(scenario.hardware, s, variant).width : 0;
  const ends = scenario.positions.map((position, index) => {
    const direction: 1 | -1 = index === 0 ? -1 : 1;
    const plates = layoutPlates(scenario, position.plates, 0, direction, variant, rule);
    return { position, direction, plates, reach: stackWidth(plates) + hardwareWidth };
  });
  const reach = Math.max(scenario.positionLength * s, ...ends.map((end) => end.reach));
  const inner = grip.length / 2 + STOP.width;
  const width = 2 * (inner + reach + MARGIN);
  const centre = width / 2;
  const left = centre - inner;
  const right = centre + inner;
  for (const end of ends) {
    const start = end.direction === -1 ? left : right;
    for (const plate of end.plates) {
      plate.x += start;
      plate.label.x += start;
    }
  }
  const allPlates = ends.flatMap((end) => end.plates);
  placeOutsideLabels(allPlates, 0, width);
  const hardwareDrawings = scenario.hardware
    ? ends.map((end) => {
        const edge = end.direction === -1 ? left - stackWidth(end.plates) - hardwareWidth : right + stackWidth(end.plates);
        return placeHardware(scenario, edge, width, variant)!;
      })
    : [];
  const label = hardwareDrawings[0];
  const screws = hardwareDrawings.map((item) => item.x + item.width / 2);
  const bracketY = REF / 2 + 0.15;
  return {
    width,
    top: LABELS_TOP,
    bottom: label ? HARDWARE_LABEL_BOTTOM : REF / 2 + MARGIN,
    nodes: (
      <>
        <rect className="bar" x={centre - grip.length / 2} y={-grip.diameter / 2} width={grip.length} height={grip.diameter} rx={0.3} />
        <Stop x={left} />
        <Stop x={right - STOP.width} />
        {ends.map((end, index) => (
          <g key={end.position.name}>
            <rect
              className="bar"
              x={end.direction === -1 ? left - reach : right}
              y={-BAR_DIAMETER / 2}
              width={reach}
              height={BAR_DIAMETER}
              rx={0.08}
            />
            <Plates plates={end.plates} />
            {hardwareDrawings[index] && scenario.hardware && (
              <HardwareGlyph
                hardware={scenario.hardware}
                drawing={{ ...hardwareDrawings[index]!, label: { ...hardwareDrawings[index]!.label, text: "" }, leaders: [] }}
                variant={variant}
              />
            )}
          </g>
        ))}
        {label && scenario.hardware && (
          <CalloutLabel
            callout={{
              label: { text: `${scenario.hardware.name}s`, x: centre, y: label.label.y },
              leaders: [
                ...screws.map((x) => ({ x1: x, y1: label.height / 2, x2: x, y2: bracketY })),
                { x1: Math.min(...screws), y1: bracketY, x2: Math.max(...screws), y2: bracketY },
                { x1: centre, y1: bracketY, x2: centre, y2: label.leaders[0]!.y2 },
              ],
            }}
          />
        )}
      </>
    ),
  };
}

function drawStack(scenario: Scenario, variant: Variant, rule: ColourRule): Drawn {
  const s = scaleOf(scenario);
  const fixture = stackFixture(scenario.picture, variant);
  const position = scenario.positions[0]!;
  const plates = layoutPlates(scenario, position.plates, fixture.start, 1, variant, rule);
  const loaded = stackWidth(plates);
  const hardwareWidth = scenario.hardware ? hardwareShape(scenario.hardware, s, variant).width : 0;
  const postLength = fixture.post ? Math.max(scenario.positionLength * s, loaded + hardwareWidth) + 0.5 : loaded + hardwareWidth;
  const width = fixture.start + postLength + MARGIN;
  placeOutsideLabels(plates, 0, width);
  const hardware = placeHardware(scenario, fixture.start + loaded, width, variant);
  return {
    width,
    top: LABELS_TOP,
    bottom: hardware ? HARDWARE_LABEL_BOTTOM : REF / 2 + MARGIN,
    nodes: (
      <>
        {fixture.node}
        {fixture.post && <rect className="bar" x={fixture.start} y={-BAR_DIAMETER / 2} width={postLength} height={BAR_DIAMETER} rx={0.08} />}
        {!fixture.post && scenario.picture === "dip-belt" && <line className="pp-chain" x1={fixture.start} y1={0} x2={fixture.start + loaded} y2={0} />}
        <Plates plates={plates} />
        {hardware && scenario.hardware && <HardwareGlyph hardware={scenario.hardware} drawing={hardware} variant={variant} />}
      </>
    ),
  };
}

function drawVest(scenario: Scenario, variant: Variant, rule: ColourRule): Drawn {
  const spec = scenario.plates[0]!;
  const single = scenario.positions.every((position) => position.plates.length <= 1);
  const columns = single ? 1 : 3;
  const perPanel = single ? 1 : Math.max(6, ...scenario.positions.map((position) => position.plates.length));
  const rows = Math.ceil(perPanel / columns);
  const block = single ? { width: 3.2, height: 2.6 } : { width: 1.6 * Math.min(1.4, Math.max(0.8, spec.thickness / spec.diameter / 1.6)), height: 1 };
  const gap = 0.15;
  const padding = 0.35;
  const panelWidth = columns * block.width + (columns - 1) * gap + 2 * padding;
  const panelHeight = rows * block.height + (rows - 1) * gap + 2 * padding;
  const panelGap = 1;
  const captionGap = 0.4;
  const width = 2 * MARGIN + scenario.positions.length * panelWidth + (scenario.positions.length - 1) * panelGap;
  const height = MARGIN + panelHeight + captionGap + FONT_SIZE * 0.75 + MARGIN + 0.2;
  return {
    width,
    top: 0,
    bottom: height,
    nodes: (
      <>
        {variant === "C" && <Icon picture={scenario.picture} x={width - 1.6} y={0} />}
        {scenario.positions.map((position, index) => {
          const x = MARGIN + index * (panelWidth + panelGap);
          const y = MARGIN;
          return (
            <g key={position.name}>
              <rect className="vest-panel" x={x} y={y} width={panelWidth} height={panelHeight} rx={0.5} />
              {Array.from({ length: perPanel }, (_, slot) => {
                const weight = position.plates[slot];
                const sx = x + padding + (slot % columns) * (block.width + gap);
                const sy = y + padding + Math.floor(slot / columns) * (block.height + gap);
                if (weight === undefined) return <rect key={slot} className="vest-slot" x={sx} y={sy} width={block.width} height={block.height} rx={0.1} />;
                const colour = colourFor(scenario, weight, rule);
                return (
                  <g key={slot}>
                    <rect x={sx} y={sy} width={block.width} height={block.height} rx={0.1} fill={colour.fill} />
                    <text x={sx + block.width / 2} y={sy + block.height / 2 + FONT_SIZE * 0.35} fontSize={FONT_SIZE} fill={colour.ink}>
                      {weight}
                    </text>
                  </g>
                );
              })}
              <text className="vest-caption" x={x + panelWidth / 2} y={y + panelHeight + captionGap + FONT_SIZE * 0.75} fontSize={FONT_SIZE}>
                {position.name}
              </text>
            </g>
          );
        })}
      </>
    ),
  };
}

export function ImplementPicture({ scenario, variant, rule }: { scenario: Scenario; variant: Variant; rule: ColourRule }) {
  const engines = { bar: drawBar, handle: drawHandle, stack: drawStack, vest: drawVest };
  const drawn = engines[scenario.kind](scenario, variant, rule);
  return (
    <svg
      role="img"
      aria-label={`${scenario.implementName}: ${scenario.positions.map((position) => `${position.name}: ${position.plates.join(", ")}`).join(". ")}`}
      className={`picture pp-picture ${scenario.kind === "vest" ? "vest" : ""}`}
      viewBox={`0 ${drawn.top} ${drawn.width} ${drawn.bottom - drawn.top}`}
    >
      <defs>
        <linearGradient id="pp-fade" x1="0" x2="1">
          <stop offset="0" className="bar-fade-start" />
          <stop offset="1" className="bar-fade-end" />
        </linearGradient>
      </defs>
      {drawn.nodes}
    </svg>
  );
}
