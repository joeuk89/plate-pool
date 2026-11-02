import type { Inventory, Loading } from "@plate-pool/core";
import { addedFrom, HardwarePart, pictureRole, Plates, type Editing } from "./picture-parts";
import type { DrawOptions } from "./plate-stack";
import { drawStack } from "./stack-drawing";

interface Props extends DrawOptions {
  implement: string;
  loading: Loading;
  inventory: Inventory;
  editing?: Editing | undefined;
}

export function StackPicture({ implement, loading, inventory, editing, ...options }: Props) {
  const drawing = drawStack(implement, loading, inventory, options);
  const { mount, stop, post, hardware } = drawing;
  const position = loading.positions[0]?.name;

  return (
    <svg {...pictureRole(drawing.description, editing)} className="picture" viewBox={`0 ${drawing.top} ${drawing.width} ${drawing.height}`}>
      <rect className="bar" x={mount.x} y={-mount.height / 2} width={mount.width} height={mount.height} rx={0.15} />
      <rect className="bar" x={post.x} y={-post.diameter / 2} width={post.length} height={post.diameter} rx={0.08} />
      <rect className="bar" x={stop.x} y={-stop.height / 2} width={stop.width} height={stop.height} rx={0.08} />
      <Plates plates={drawing.plates} position={position} editing={editing} added={addedFrom(loading, position)} />
      {hardware && <HardwarePart hardware={hardware} />}
    </svg>
  );
}
