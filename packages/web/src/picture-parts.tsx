import type { KeyboardEvent } from "react";
import type { Callout, HardwareDrawing, Line, PlateDrawing } from "./plate-stack";
import { FONT_SIZE, HARDWARE_FONT_SIZE } from "./plate-stack";

const PLATE_GAP = 0.05;

export interface Editing {
  remove: (position: string, index: number) => void;
  removeLabel: (position: string, weight: number) => string;
}

export function pictureRole(description: string, editing: Editing | undefined) {
  return { role: editing ? "group" : "img", "aria-label": description };
}

export function removable(editing: Editing | undefined, position: string | undefined, index: number, weight: number) {
  if (!editing || position === undefined) return {};
  const remove = () => editing.remove(position, index);
  return {
    role: "button",
    tabIndex: 0,
    className: "removable",
    "aria-label": editing.removeLabel(position, weight),
    onClick: remove,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      remove();
    },
  };
}

interface PlatesProps {
  plates: PlateDrawing[];
  position?: string | undefined;
  editing?: Editing | undefined;
}

export function Plates({ plates, position, editing }: PlatesProps) {
  return (
    <>
      {plates.map((plate, index) => {
        const width = plate.width - PLATE_GAP;
        return (
          <g key={index} {...removable(editing, position, index, plate.weight)}>
            <rect
              x={plate.x + PLATE_GAP / 2}
              y={-plate.height / 2}
              width={width}
              height={plate.height}
              rx={plate.round ? width / 2 : 0.1}
              fill={plate.fill}
            />
            {plate.leader && <Leader line={plate.leader} />}
            <text
              x={plate.label.x}
              y={plate.label.y}
              className={plate.label.inside ? "plate-label" : "plate-label outside"}
              fontSize={FONT_SIZE}
              {...(plate.label.inside ? { fill: plate.ink } : {})}
            >
              {plate.label.text}
            </text>
          </g>
        );
      })}
    </>
  );
}

export function HardwarePart({ hardware, className, radius }: { hardware: HardwareDrawing; className: string; radius: number }) {
  return (
    <g>
      <rect
        className={className}
        x={hardware.x + PLATE_GAP / 2}
        y={-hardware.height / 2}
        width={hardware.width - PLATE_GAP}
        height={hardware.height}
        rx={radius}
      />
      <CalloutLabel callout={hardware} />
    </g>
  );
}

export function CalloutLabel({ callout }: { callout: Callout }) {
  return (
    <>
      {callout.leaders.map((line, index) => (
        <Leader key={index} line={line} />
      ))}
      <text x={callout.label.x} y={callout.label.y} className="hardware-label" fontSize={HARDWARE_FONT_SIZE}>
        {callout.label.text}
      </text>
    </>
  );
}

export function Leader({ line }: { line: Line }) {
  return <line className="leader" {...line} />;
}
