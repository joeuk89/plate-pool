import type { Inventory, Loading } from "@plate-pool/core";
import { drawDumbbell, heavierTicks } from "./dumbbell-drawing";
import { CalloutLabel, Plates } from "./picture-parts";
import { HARDWARE_FONT_SIZE, type DrawOptions } from "./plate-stack";

interface Props extends DrawOptions {
  loading: Loading;
  inventory: Inventory;
}

export function DumbbellPicture({ loading, inventory, ...options }: Props) {
  const drawing = drawDumbbell(loading, inventory, options);
  const { handle, heavier, screwLabel } = drawing;

  return (
    <svg role="img" aria-label={drawing.description} className="picture" viewBox={`0 ${drawing.top} ${drawing.width} ${drawing.height}`}>
      {heavier && (
        <g className="heavier-mark">
          <text x={heavier.x} y={heavier.y} fontSize={HARDWARE_FONT_SIZE}>
            {heavier.text}
          </text>
          <line x1={heavier.from} y1={heavier.lineY} x2={heavier.to} y2={heavier.lineY} />
          {heavierTicks(heavier).map((tick, index) => (
            <line key={index} {...tick} />
          ))}
        </g>
      )}
      <rect className="bar" x={handle.grip.x} y={-handle.grip.height / 2} width={handle.grip.width} height={handle.grip.height} rx={0.3} />
      {handle.stops.map((stop, index) => (
        <rect key={index} className="bar" x={stop.x} y={-stop.height / 2} width={stop.width} height={stop.height} rx={0.08} />
      ))}
      {drawing.ends.map((end) => (
        <g key={end.name}>
          <Plates plates={end.plates} />
          {end.screw && (
            <rect className="screw" x={end.screw.x + 0.025} y={-end.screw.height / 2} width={end.screw.width - 0.05} height={end.screw.height} rx={0.15} />
          )}
        </g>
      ))}
      {screwLabel && <CalloutLabel callout={screwLabel} />}
    </svg>
  );
}
