import { forgetCurrentLoadings } from "./current";
import { inventoryOf, type KitFile } from "./kit-file";
import { forgetKitSettings } from "./settings";

const storageKey = "plate-pool:kit";

export function readStoredKit(): KitFile | undefined {
  try {
    const { text, sha256 } = JSON.parse(localStorage.getItem(storageKey) ?? "null") ?? {};
    if (typeof text !== "string" || typeof sha256 !== "string") return undefined;
    return { text, sha256, inventory: inventoryOf(text) };
  } catch {
    return undefined;
  }
}

/** Stores the kit. Replacing a kit also clears every current loading, the last implement and every hardware choice. */
export function storeKit(kit: KitFile, { replacing }: { replacing: boolean }): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ text: kit.text, sha256: kit.sha256 }));
  } catch {
    // Storage is blocked or full: the kit lasts until the page closes.
  }
  if (!replacing) return;
  forgetCurrentLoadings();
  forgetKitSettings();
}
