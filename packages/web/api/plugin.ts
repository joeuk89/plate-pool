import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// Vite loads its config without the @plate-pool/core alias, and core's dist is not built before the tests run.
import { list, readInventory, type CollarChoice, type Inventory, type ListRequest, type ListResponse } from "../../core/src/index.ts";
import type { Plugin } from "vite";

const inventoryPath = fileURLToPath(new URL("../../../inventory/inventory.json", import.meta.url));

const collarChoices: CollarChoice[] = ["clamp", "spinlock", "none"];

const tableRequests: ListRequest[] = [
  ...collarChoices.map((collars) => ({ implement: "barbell", collars })),
  { implement: "dumbbell", pair: true },
  { implement: "dumbbell", pair: false },
  { implement: "kettlebell" },
  { implement: "leg" },
  { implement: "vest" },
];

type Table = ListResponse & { collars?: CollarChoice };

function achievable(inventory: Inventory): { tables: Table[] } {
  return {
    tables: tableRequests.map((request) => {
      const { implement, ...table } = list(inventory, request);
      return { implement, ...(request.collars ? { collars: request.collars } : {}), ...table };
    }),
  };
}

export function staticJson(): Plugin {
  return {
    name: "plate-pool:static-json",
    apply: "build",
    buildStart() {
      this.addWatchFile(inventoryPath);
      const text = readFileSync(inventoryPath, "utf8");
      this.emitFile({ type: "asset", fileName: "api/inventory.json", source: text });
      this.emitFile({ type: "asset", fileName: "api/achievable.json", source: JSON.stringify(achievable(readInventory(JSON.parse(text)))) });
    },
  };
}
