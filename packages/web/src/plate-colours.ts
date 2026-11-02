import type { Inventory, Plate } from "@plate-pool/core";
import { plateUnit, used } from "./kit";

export interface PlateColour {
  fill: string;
  ink: string;
  /** A near-white plate gets a steel outline so it shows on a light page. */
  outline: boolean;
}

const darkInk = "#16191d";
const lightInk = "#ffffff";

const palette = [
  "#c9353f", // red
  "#2f67cc", // blue
  "#e8b923", // yellow
  "#1c8a55", // green
  "#e9e9e9", // white
  "#7a4fc4", // purple
  "#d8731d", // orange
  "#1f8f8f", // teal
  "#a4521f", // brown
  "#6f7780", // grey
];

function luminance(fill: string): number | undefined {
  const hex = /^#([0-9a-f]{6})$/i.exec(fill.trim())?.[1];
  if (!hex) return undefined;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (r! * 299 + g! * 587 + b! * 114) / 1000;
}

function colourOf(fill: string): PlateColour {
  const light = luminance(fill);
  return { fill, ink: light !== undefined && light > 150 ? darkInk : lightInk, outline: light !== undefined && light > 215 };
}

export function plateColour(inventory: Inventory, plate: Plate): PlateColour {
  if (plate.colour) return colourOf(plate.colour);
  const unit = plateUnit(inventory, plate);
  const weights = [
    ...new Set(inventory.plates.filter((each) => plateUnit(inventory, each) === unit).map((each) => used(each.weight))),
  ].sort((a, b) => b - a);
  const rank = weights.indexOf(used(plate.weight));
  return colourOf(palette[Math.max(0, rank) % palette.length]!);
}

export const unknownPlate: PlateColour = colourOf("#6f7780");
