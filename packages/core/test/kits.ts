import { readFileSync } from "node:fs";
import { readInventory, type Inventory } from "../src/index.js";

export const ownerText = readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8");
export const olympicText = readFileSync(new URL("./fixtures/olympic-kit.json", import.meta.url), "utf8");

export const owner: Inventory = readInventory(ownerText);
export const olympic: Inventory = readInventory(olympicText);

export function changed(base: Inventory, edit: (copy: Inventory) => void): Inventory {
  const copy = structuredClone(base);
  edit(copy);
  return copy;
}

const ownerPlateIds: Record<number, string> = { 22.5: "ql-22.5", 5: "ql-5", 2.5: "ql-2.5", 1.25: "ql-micro", 1: "vest-block" };

/** The owner's plate ids for these weights, so an expected position can be written by weight. */
export const ownerIds = (plates: number[]) => plates.map((plate) => ownerPlateIds[plate]!);

export const placed = (name: string, plates: number[]) => ({ name, plates, ids: ownerIds(plates) });

export const byId =<T extends { id: string }>(list: T[], id: string) => list.find((item) => item.id === id)!;
