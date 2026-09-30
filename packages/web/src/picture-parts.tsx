import type { HardwareDrawing, Line, PlateDrawing } from "./plate-stack";
import { FONT_SIZE, HARDWARE_FONT_SIZE } from "./plate-stack";

const PLATE_GAP = 0.05;

export function Plates({ plates }: { plates: PlateDrawing[] }) {
  return (
    <>
      {plates.map((plate, index) => {
        const width = plate.width - PLATE_GAP;
        return (
          <g key={index}>
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
      <HardwareLabel hardware={hardware} />
    </g>
  );
}

export function HardwareLabel({ hardware }: { hardware: HardwareDrawing }) {
  return (
    <>
      {hardware.leaders.map((line, index) => (
        <Leader key={index} line={line} />
      ))}
      <text x={hardware.label.x} y={hardware.label.y} className="hardware-label" fontSize={HARDWARE_FONT_SIZE}>
        {hardware.label.text}
      </text>
    </>
  );
}

export function Leader({ line }: { line: Line }) {
  return <line className="leader" {...line} />;
}
