import type { Inventory, Loading } from "@plate-pool/core";
import { drawHandle, heavierTicks } from "./handle-drawing";
import { addedFrom, CalloutLabel, HardwareGlyph, pictureRole, Plates, type Editing } from "./picture-parts";
import { HARDWARE_FONT_SIZE, type DrawOptions } from "./plate-stack";

interface Props extends DrawOptions {
  implement: string;
  loading: Loading;
  inventory: Inventory;
  editing?: Editing | undefined;
}

export function HandlePicture({ implement, loading, inventory, editing, ...options }: Props) {
  const drawing = drawHandle(implement, loading, inventory, options);
  const { handle, heavier, hardwareKind, hardwareLabel } = drawing;

  return (
    <svg {...pictureRole(drawing.description, editing)} className="picture" viewBox={`0 ${drawing.top} ${drawing.width} ${drawing.height}`}>
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
      {drawing.sleeves.map((sleeve, index) => (
        <rect key={index} className="bar" x={sleeve.x} y={-sleeve.height / 2} width={sleeve.width} height={sleeve.height} rx={0.08} />
      ))}
      <rect className="bar" x={handle.grip.x} y={-handle.grip.height / 2} width={handle.grip.width} height={handle.grip.height} rx={0.3} />
      {handle.stops.map((stop, index) => (
        <rect key={index} className="bar" x={stop.x} y={-stop.height / 2} width={stop.width} height={stop.height} rx={0.08} />
      ))}
      {drawing.ends.map((end) => (
        <g key={end.name}>
          <Plates plates={end.plates} position={end.name} editing={editing} added={addedFrom(loading, end.name)} />
          {end.hardware && hardwareKind && <HardwareGlyph kind={hardwareKind} part={end.hardware} />}
        </g>
      ))}
      {hardwareLabel && <CalloutLabel callout={hardwareLabel} />}
    </svg>
  );
}
