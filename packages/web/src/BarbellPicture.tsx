import type { Inventory, Loading } from "@plate-pool/core";
import { useId } from "react";
import { drawBarbell, type DrawOptions, type Line } from "./barbell-drawing";

const PLATE_GAP = 0.05;

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
      {drawing.plates.map((plate, index) => {
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
              fontSize={drawing.fontSize}
              {...(plate.label.inside ? { fill: plate.ink } : {})}
            >
              {plate.label.text}
            </text>
          </g>
        );
      })}
      {collar && (
        <g>
          <rect className="collar" x={collar.x + PLATE_GAP / 2} y={-collar.height / 2} width={collar.width - PLATE_GAP} height={collar.height} rx={0.18} />
          <Leader line={collar.leader} />
          <text x={collar.label.x} y={collar.label.y} className="collar-label" fontSize={drawing.collarFontSize}>
            {collar.label.text}
          </text>
        </g>
      )}
    </svg>
  );
}

function Leader({ line }: { line: Line }) {
  return <line className="leader" {...line} />;
}
