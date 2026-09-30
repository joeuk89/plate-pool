import type { Inventory, Loading } from "@plate-pool/core";
import { blockList } from "./describe";
import { plateColour } from "./plate-colours";
import { FONT_SIZE, MARGIN } from "./plate-stack";

export interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
  block?: { weight: number; label: string; fill: string; ink: string };
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

// Sizes in drawing units: Mirafit publishes no block size or pocket layout.
const COLUMNS = 3;
const BLOCK = { width: 1.6, height: 1 };
const BLOCK_GAP = 0.15;
const PANEL_PADDING = 0.35;
const PANEL_GAP = 1;
const CAPTION_GAP = 0.4;

const panelNames: Record<string, string> = { front: "Front", back: "Back" };

export function drawVest(loading: Loading, inventory: Inventory): VestDrawing {
  const vest = inventory.implements.find((implement) => implement.id === "vest");
  const positions = loading.positions;
  const perPanel = Math.max(Math.ceil((vest?.maxPlateWeight ?? 30) / Math.max(positions.length, 1)), ...positions.map((position) => position.plates.length));
  const rows = Math.ceil(perPanel / COLUMNS);
  const panelWidth = COLUMNS * BLOCK.width + (COLUMNS - 1) * BLOCK_GAP + 2 * PANEL_PADDING;
  const panelHeight = rows * BLOCK.height + (rows - 1) * BLOCK_GAP + 2 * PANEL_PADDING;

  const panels = positions.map((position, index): Panel => {
    const x = MARGIN + index * (panelWidth + PANEL_GAP);
    const y = MARGIN;
    const slots = Array.from({ length: perPanel }, (_, slot): Slot => {
      const weight = position.plates[slot];
      return {
        x: x + PANEL_PADDING + (slot % COLUMNS) * (BLOCK.width + BLOCK_GAP),
        y: y + PANEL_PADDING + Math.floor(slot / COLUMNS) * (BLOCK.height + BLOCK_GAP),
        ...BLOCK,
        ...(weight === undefined ? {} : { block: { weight, label: String(weight), ...plateColour(weight, "kg") } }),
      };
    });
    const caption = { x: x + panelWidth / 2, y: y + panelHeight + CAPTION_GAP + FONT_SIZE * 0.75 };
    return { name: panelNames[position.name] ?? position.name, x, y, width: panelWidth, height: panelHeight, slots, caption };
  });

  return {
    description: panels.map((panel, index) => `${panel.name}: ${blockList(positions[index]?.plates ?? []).toLowerCase()}`).join(". "),
    width: 2 * MARGIN + positions.length * panelWidth + (positions.length - 1) * PANEL_GAP,
    height: MARGIN + panelHeight + CAPTION_GAP + FONT_SIZE * 0.75 + MARGIN + 0.2,
    fontSize: FONT_SIZE,
    panels,
  };
}
