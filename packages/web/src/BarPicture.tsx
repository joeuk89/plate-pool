import type { Inventory, Loading } from "@plate-pool/core";
import { useId } from "react";
import { drawBar } from "./bar-drawing";
import { addedFrom, HardwarePart, pictureRole, Plates, type Editing } from "./picture-parts";
import type { DrawOptions } from "./plate-stack";

interface Props extends DrawOptions {
  implement: string;
  loading: Loading;
  inventory: Inventory;
  editing?: Editing | undefined;
}

export function BarPicture({ implement, loading, inventory, editing, ...options }: Props) {
  const drawing = drawBar(implement, loading, inventory, options);
  const fadeId = useId();
  const { handle, stop, sleeve, barDiameter, hardware } = drawing;
  const barEnd = Math.min(sleeve.x + sleeve.length, drawing.width);
  const position = loading.positions[0]?.name;

  return (
    <svg
      {...pictureRole(drawing.description, editing)}
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
      <Plates plates={drawing.plates} position={position} editing={editing} added={addedFrom(loading, position)} />
      {hardware && <HardwarePart hardware={hardware} />}
    </svg>
  );
}
