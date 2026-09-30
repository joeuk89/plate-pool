import type { Unit } from "@plate-pool/core";

export interface PlateColour {
  fill: string;
  ink: string;
}

const byWeight: Record<string, PlateColour> = {
  "22.5 lb": { fill: "#c9353f", ink: "#ffffff" },
  "5 lb": { fill: "#2f67cc", ink: "#ffffff" },
  "2.5 lb": { fill: "#1c8a55", ink: "#ffffff" },
  "1.25 lb": { fill: "#7a4fc4", ink: "#ffffff" },
  "1 kg": { fill: "#a4521f", ink: "#ffffff" },
};

const unknown: PlateColour = { fill: "#6f7780", ink: "#ffffff" };

export function plateColour(weight: number, unit: Unit): PlateColour {
  return byWeight[`${weight} ${unit}`] ?? unknown;
}
