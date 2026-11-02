import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readInventory, type Inventory } from "@plate-pool/core";

export const owner: Inventory = readInventory(readFileSync(resolve(import.meta.dirname, "../../../inventory/inventory.json"), "utf8"));
export const olympic: Inventory = readInventory(
  readFileSync(resolve(import.meta.dirname, "../../core/test/fixtures/olympic-kit.json"), "utf8"),
);

export function changed(base: Inventory, edit: (copy: Inventory) => void): Inventory {
  const copy = structuredClone(base);
  edit(copy);
  return copy;
}
