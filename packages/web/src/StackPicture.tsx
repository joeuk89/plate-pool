import type { Inventory, Loading } from "@plate-pool/core";
import { HardwarePart, Plates } from "./picture-parts";
import type { DrawOptions } from "./plate-stack";
import { drawStack } from "./stack-drawing";

interface Props extends DrawOptions {
  implement: string;
  loading: Loading;
  inventory: Inventory;
}

export function StackPicture({ implement, loading, inventory, ...options }: Props) {
  const drawing = drawStack(implement, loading, inventory, options);
  const { base, loop, lever, holder, screw } = drawing;

  return (
    <svg role="img" aria-label={drawing.description} className="picture" viewBox={`0 ${drawing.top} ${drawing.width} ${drawing.height}`}>
      {loop && (
        <path
          className="handle"
          strokeWidth={loop.thickness}
          d={`M ${base.x + 0.1} ${-loop.radius} H ${loop.left + loop.thickness / 2 + loop.radius} A ${loop.radius} ${loop.radius} 0 0 0 ${loop.left + loop.thickness / 2 + loop.radius} ${loop.radius} H ${base.x + 0.1}`}
        />
      )}
      {lever && <rect className="bar" x={lever.x} y={-lever.height / 2} width={lever.width} height={lever.height} rx={0.3} />}
      {holder.length > 0 && (
        <rect className="bar" x={holder.x} y={-holder.diameter / 2} width={holder.length} height={holder.diameter} rx={0.08} />
      )}
      <rect className="bar" x={base.x} y={-base.height / 2} width={base.width} height={base.height} rx={0.12} />
      <Plates plates={drawing.plates} />
      {screw && <HardwarePart hardware={screw} className="screw" radius={0.15} />}
    </svg>
  );
}
