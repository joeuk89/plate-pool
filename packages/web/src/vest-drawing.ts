import type { Inventory, Loading } from "@plate-pool/core";
import { blockList } from "./describe";
import { acceptedPlates, implementOf, used } from "./kit";
import { FONT_SIZE, MARGIN, platesAt, scaleFor } from "./plate-stack";
import { plateColour, unknownPlate } from "./plate-colours";

export interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
  block?: { weight: number; label: string; fill: string; ink: string; outline: boolean };
}

export interface Panel {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  slots: Slot[];
  caption: { x: number; y: number };
}

export interface VestDrawing {
  description: string;
  width: number;
  height: number;
  fontSize: number;
  panels: Panel[];
}

// Drawing units: vest makers publish no block size or pocket layout.
const COLUMNS = 3;
const BLOCK = { width: 1.6, height: 1 };
const SINGLE_BLOCK = { width: 2.4, height: 1.9 };
/** Keeps a carrier with one plate a side drawn at the same scale as a vest with many blocks. */
const MIN_WIDTH = 12;
const BLOCK_GAP = 0.15;
const PANEL_PADDING = 0.35;
const PANEL_GAP = 1;
const CAPTION_GAP = 0.4;

const panelNames: Record<string, string> = { front: "Front", back: "Back" };

/** How many blocks one panel can hold: the caps per position, else half the weight limit in the lightest block, else half the blocks. */
function slotsPerPanel(inventory: Inventory, implement: string): number {
  const vest = implementOf(inventory, implement);
  const plates = acceptedPlates(inventory, implement);
  if (plates.length === 0) return 1;
  const caps = plates.map((plate) => vest?.maxPerPosition?.[plate.id]);
  if (caps.every((cap) => cap !== undefined)) return caps.reduce((sum, cap) => sum + cap!, 0);
  const lightest = Math.min(...plates.map((plate) => used(plate.weight)));
  if (vest?.maxPlateWeight !== undefined) return Math.ceil(vest.maxPlateWeight / lightest / 2);
  return Math.ceil(plates.reduce((sum, plate) => sum + plate.count, 0) / 2);
}

export function drawVest(implement: string, loading: Loading, inventory: Inventory): VestDrawing {
  const scale = scaleFor(inventory, implement);
  const positions = loading.positions;
  const perPanel = Math.max(1, slotsPerPanel(inventory, implement), ...positions.map((position) => position.plates.length));
  const single = perPanel === 1;
  const columns = single ? 1 : COLUMNS;
  const block = single ? SINGLE_BLOCK : BLOCK;
  const rows = Math.ceil(perPanel / columns);
  const panelWidth = columns * block.width + (columns - 1) * BLOCK_GAP + 2 * PANEL_PADDING;
  const panelHeight = rows * block.height + (rows - 1) * BLOCK_GAP + 2 * PANEL_PADDING;

  const drawnWidth = 2 * MARGIN + positions.length * panelWidth + (positions.length - 1) * PANEL_GAP;
  const width = Math.max(drawnWidth, MIN_WIDTH);
  const left = MARGIN + (width - drawnWidth) / 2;
  const panels = positions.map((position, index): Panel => {
    const x = left + index * (panelWidth + PANEL_GAP);
    const y = MARGIN;
    const plates = platesAt(scale, position);
    const slots = Array.from({ length: perPanel }, (_, slot): Slot => {
      const weight = position.plates[slot];
      const plate = plates[slot];
      const colour = plate ? plateColour(inventory, plate) : unknownPlate;
      return {
        x: x + PANEL_PADDING + (slot % columns) * (block.width + BLOCK_GAP),
        y: y + PANEL_PADDING + Math.floor(slot / columns) * (block.height + BLOCK_GAP),
        ...block,
        ...(weight === undefined ? {} : { block: { weight, label: String(weight), ...colour } }),
      };
    });
    const caption = { x: x + panelWidth / 2, y: y + panelHeight + CAPTION_GAP + FONT_SIZE * 0.75 };
    return { name: panelNames[position.name] ?? position.name, x, y, width: panelWidth, height: panelHeight, slots, caption };
  });

  return {
    description: panels.map((panel, index) => `${panel.name}: ${blockList(positions[index]?.plates ?? []).toLowerCase()}`).join(". "),
    width,
    height: MARGIN + panelHeight + CAPTION_GAP + FONT_SIZE * 0.75 + MARGIN + 0.2,
    fontSize: FONT_SIZE,
    panels,
  };
}
