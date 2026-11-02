import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readInventory, type Inventory } from "@plate-pool/core";

export const ownerText = readFileSync(resolve(import.meta.dirname, "../../../inventory/inventory.json"), "utf8");
export const olympicText = readFileSync(resolve(import.meta.dirname, "../../core/test/fixtures/olympic-kit.json"), "utf8");
export const owner: Inventory = readInventory(ownerText);
export const olympic: Inventory = readInventory(olympicText);

export function changed(base: Inventory, edit: (copy: Inventory) => void): Inventory {
  const copy = structuredClone(base);
  edit(copy);
  return copy;
}

/** The set-up link fragment for a file, made the way spec 17.6 says the coach makes it. */
export async function setupFragment(text: string): Promise<string> {
  const compressed = new Response(new TextEncoder().encode(text)).body!.pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(compressed).arrayBuffer());
  return `#inventory=${Buffer.from(bytes).toString("base64url")}`;
}
