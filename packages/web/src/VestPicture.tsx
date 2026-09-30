import type { Inventory, Loading } from "@plate-pool/core";
import { pictureRole, removable, type Editing } from "./picture-parts";
import { drawVest } from "./vest-drawing";

interface Props {
  loading: Loading;
  inventory: Inventory;
  editing?: Editing | undefined;
}

export function VestPicture({ loading, inventory, editing }: Props) {
  const drawing = drawVest(loading, inventory);
  const { fontSize } = drawing;

  return (
    <svg {...pictureRole(drawing.description, editing)} className="picture vest" viewBox={`0 0 ${drawing.width} ${drawing.height}`}>
      {drawing.panels.map((panel, panelIndex) => (
        <g key={panel.name}>
          <rect className="vest-panel" x={panel.x} y={panel.y} width={panel.width} height={panel.height} rx={0.5} />
          {panel.slots.map((slot, index) =>
            slot.block ? (
              <g key={index} {...removable(editing, loading.positions[panelIndex]?.name, index, slot.block.weight)}>
                <rect x={slot.x} y={slot.y} width={slot.width} height={slot.height} rx={0.1} fill={slot.block.fill} />
                <text x={slot.x + slot.width / 2} y={slot.y + slot.height / 2 + fontSize * 0.35} fontSize={fontSize} fill={slot.block.ink}>
                  {slot.block.label}
                </text>
              </g>
            ) : (
              <rect key={index} className="vest-slot" x={slot.x} y={slot.y} width={slot.width} height={slot.height} rx={0.1} />
            ),
          )}
          <text className="vest-caption" x={panel.caption.x} y={panel.caption.y} fontSize={fontSize}>
            {panel.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
