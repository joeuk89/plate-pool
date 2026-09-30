import type { Inventory, Loading } from "@plate-pool/core";
import { useId } from "react";
import { drawBarbell } from "./barbell-drawing";
import { HardwarePart, Plates } from "./picture-parts";
import type { DrawOptions } from "./plate-stack";

interface Props extends DrawOptions {
  loading: Loading;
  inventory: Inventory;
}

export function BarbellPicture({ loading, inventory, ...options }: Props) {
  const drawing = drawBarbell(loading, inventory, options);
  const fadeId = useId();
  const { handle, stop, sleeve, barDiameter, collar } = drawing;
  const barEnd = Math.min(sleeve.x + sleeve.length, drawing.width);

  return (
    <svg
      role="img"
      aria-label={drawing.description}
      className="picture"
      viewBox={`0 ${drawing.top} ${drawing.width} ${drawing.height}`}
    >
      <defs>
        <linearGradient id={fadeId} x1="0" x2={handle.length + stop.width} gradientUnits="userSpaceOnUse">
          <stop offset="0" className="bar-fade-start" />
          <stop offset="1" className="bar-fade-end" />
        </linearGradient>
      </defs>
      <rect x={handle.x} y={-barDiameter / 2 + 0.12} width={handle.length} height={barDiameter - 0.24} fill={`url(#${fadeId})`} />
      <rect className="bar" x={sleeve.x} y={-barDiameter / 2} width={barEnd - sleeve.x} height={barDiameter} rx={0.08} />
      <rect className="bar" x={stop.x} y={-stop.height / 2} width={stop.width} height={stop.height} rx={0.08} />
      <Plates plates={drawing.plates} />
      {collar && <HardwarePart hardware={collar} className="collar" radius={0.18} />}
    </svg>
  );
}
