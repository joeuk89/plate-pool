import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const inventoryPath = fileURLToPath(new URL("../../../inventory/inventory.json", import.meta.url));

export function staticJson(): Plugin {
  return {
    name: "plate-pool:static-json",
    apply: "build",
    buildStart() {
      this.addWatchFile(inventoryPath);
      this.emitFile({ type: "asset", fileName: "api/inventory.json", source: readFileSync(inventoryPath, "utf8") });
    },
  };
}
