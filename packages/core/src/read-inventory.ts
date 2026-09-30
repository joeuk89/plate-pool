import type { Inventory } from "./inventory.js";

export class InventoryError extends Error {
  override name = "InventoryError";
}

type Check = (value: unknown, path: string) => void;

const fail = (path: string, message: string): never => {
  throw new InventoryError(`Inventory ${path || "/"} ${message}.`);
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const string: Check = (value, path) => {
  if (typeof value !== "string") fail(path, "must be a string");
};
const number: Check = (value, path) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(path, "must be a number of 0 or more");
};
const count: Check = (value, path) => {
  if (!Number.isInteger(value) || (value as number) < 0) fail(path, "must be a whole number of 0 or more");
};
const oneOf =
  (...allowed: string[]): Check =>
  (value, path) => {
    if (!allowed.includes(value as string)) fail(path, `must be one of ${allowed.join(", ")}`);
  };
const list =
  (item: Check): Check =>
  (value, path) => {
    if (!Array.isArray(value)) return fail(path, "must be a list");
    value.forEach((entry, index) => item(entry, `${path}/${index}`));
  };
const object =
  (required: Record<string, Check>, optional: Record<string, Check> = {}): Check =>
  (value, path) => {
    if (!isObject(value)) return fail(path, "must be an object");
    for (const [key, check] of Object.entries(required)) {
      if (value[key] === undefined) fail(`${path}/${key}`, "is missing");
      check(value[key], `${path}/${key}`);
    }
    for (const [key, check] of Object.entries(optional)) {
      if (value[key] !== undefined) check(value[key], `${path}/${key}`);
    }
  };

const status = oneOf("verified", "owner", "unverified");
const unit = oneOf("lb", "kg");
const weightValue = object({ listed: number, status }, { measured: number, note: string });

const checkInventory = object({
  plateTypes: list(object({ id: string, name: string, unit })),
  plates: list(
    object(
      { id: string, name: string, type: string, count, weight: weightValue, shape: oneOf("square", "round", "block") },
      { countStatus: status, stackLengthIn: weightValue },
    ),
  ),
  hardware: list(
    object(
      { id: string, name: string, kind: oneOf("screw", "collar"), count, unit, weight: weightValue },
      { capacityIn: number, minStackIn: weightValue, widthIn: number },
    ),
  ),
  implements: list(
    object(
      { id: string, name: string, count, unit, base: weightValue, positions: list(string), accepts: list(string) },
      {
        hardware: object({ options: list(string), perPosition: count }, { default: string }),
        maxPlateWeight: number,
        maxTotal: number,
        positionLengthIn: weightValue,
      },
    ),
  ),
});

export function readInventory(data: unknown): Inventory {
  checkInventory(data, "");
  const { plateTypes, plates, hardware, implements: implementList } = data as unknown as Inventory;
  return { plateTypes, plates, hardware, implements: implementList };
}
