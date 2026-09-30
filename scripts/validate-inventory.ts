import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const schemaPath = fileURLToPath(new URL("../inventory/inventory.schema.json", import.meta.url));
const defaultInventoryPath = fileURLToPath(new URL("../inventory/inventory.json", import.meta.url));

interface Identified {
  id: string;
}

interface SchemaValidInventory {
  plateTypes: Identified[];
  plates: (Identified & { type: string })[];
  hardware: Identified[];
  implements: (Identified & {
    accepts: string[];
    hardware?: { options: string[]; default?: string };
  })[];
}

export function inventoryErrors(inventory: unknown): string[] {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020.default({ allErrors: true });
  const matchesSchema = ajv.compile<SchemaValidInventory>(schema);
  if (!matchesSchema(inventory)) {
    return (matchesSchema.errors ?? []).map(
      (error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    );
  }
  return referenceErrors(inventory);
}

function referenceErrors(inventory: SchemaValidInventory): string[] {
  const errors: string[] = [];

  for (const list of ["plateTypes", "plates", "hardware", "implements"] as const) {
    const seen = new Set<string>();
    inventory[list].forEach((item, index) => {
      if (seen.has(item.id)) errors.push(`/${list}/${index}/id repeats "${item.id}"`);
      seen.add(item.id);
    });
  }

  const plateTypes = new Set(inventory.plateTypes.map((plateType) => plateType.id));
  const hardwareIds = new Set([...inventory.hardware.map((item) => item.id), "none"]);

  inventory.plates.forEach((plate, index) => {
    if (!plateTypes.has(plate.type)) {
      errors.push(`/plates/${index}/type names unknown plate type "${plate.type}"`);
    }
  });

  inventory.implements.forEach((implement, index) => {
    implement.accepts.forEach((type, typeIndex) => {
      if (!plateTypes.has(type)) {
        errors.push(`/implements/${index}/accepts/${typeIndex} names unknown plate type "${type}"`);
      }
    });
    const hardware = implement.hardware;
    if (!hardware) return;
    hardware.options.forEach((option, optionIndex) => {
      if (!hardwareIds.has(option)) {
        errors.push(`/implements/${index}/hardware/options/${optionIndex} names unknown hardware "${option}"`);
      }
    });
    if (hardware.default !== undefined && !hardwareIds.has(hardware.default)) {
      errors.push(`/implements/${index}/hardware/default names unknown hardware "${hardware.default}"`);
    } else if (hardware.default !== undefined && !hardware.options.includes(hardware.default)) {
      errors.push(`/implements/${index}/hardware/default "${hardware.default}" is not one of its options`);
    }
  });

  return errors;
}

function main(path: string): number {
  let inventory: unknown;
  try {
    inventory = JSON.parse(readFileSync(resolve(path), "utf8"));
  } catch (error) {
    console.error(`Cannot read ${path}: ${(error as Error).message}`);
    return 1;
  }
  const errors = inventoryErrors(inventory);
  if (errors.length > 0) {
    console.error(`${path} does not match the inventory schema:`);
    for (const error of errors) console.error(`  ${error}`);
    return 1;
  }
  console.log(`${path} matches the inventory schema.`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv[2] ?? process.env.PLATE_POOL_INVENTORY ?? defaultInventoryPath);
}
