import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { InventoryError, readInventory } from "../packages/core/src/index.js";

const schemaPath = fileURLToPath(new URL("../inventory/inventory.schema.json", import.meta.url));
const defaultInventoryPath = fileURLToPath(new URL("../inventory/inventory.json", import.meta.url));

/** What the JSON Schema finds wrong with a parsed file, by JSON pointer. */
export function schemaErrors(inventory: unknown): string[] {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020.default({ allErrors: true });
  const matchesSchema = ajv.compile(schema);
  if (matchesSchema(inventory)) return [];
  return (matchesSchema.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`);
}

/** What the library's reader finds wrong with a file's text, by JSON path. */
export function readerErrors(text: string): string[] {
  try {
    readInventory(text);
    return [];
  } catch (error) {
    if (error instanceof InventoryError) return error.errors;
    throw error;
  }
}

export function inventoryErrors(text: string): string[] {
  let inventory: unknown;
  try {
    inventory = JSON.parse(text);
  } catch (error) {
    return [`not valid JSON: ${(error as Error).message}`];
  }
  const fromSchema = schemaErrors(inventory);
  return fromSchema.length > 0 ? fromSchema : readerErrors(text);
}

function main(path: string): number {
  let text: string;
  try {
    text = readFileSync(resolve(path), "utf8");
  } catch (error) {
    console.error(`Cannot read ${path}: ${(error as Error).message}`);
    return 1;
  }
  const errors = inventoryErrors(text);
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
