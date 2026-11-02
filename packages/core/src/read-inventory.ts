import type { ImplementKind, Inventory } from "./inventory.js";

export class InventoryError extends Error {
  override name = "InventoryError";

  constructor(readonly errors: string[]) {
    super(errors.join("\n"));
  }
}

type Json = Record<string, unknown>;
type Check = (value: unknown, path: string, errors: string[]) => void;

const RESERVED_IMPLEMENT_IDS = ["view", "uneven", "kit", "inventory", "single", "pair", "hardware"];
const IMPLEMENT_ID = /^[a-z0-9-]+$/;
const ITEM_ID = /^[a-z0-9.-]+$/;
const KINDS: ImplementKind[] = ["bar", "handle", "stack", "vest"];

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

const string: Check = (value, path, errors) => {
  if (typeof value !== "string") errors.push(`${path}: must be text`);
};
const number: Check = (value, path, errors) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) errors.push(`${path}: must be a number of 0 or more`);
};
const positive: Check = (value, path, errors) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) errors.push(`${path}: must be a number above 0`);
};
const count: Check = (value, path, errors) => {
  if (!Number.isInteger(value) || (value as number) < 0) errors.push(`${path}: must be a whole number of 0 or more`);
};
const atLeastOne: Check = (value, path, errors) => {
  if (!Number.isInteger(value) || (value as number) < 1) errors.push(`${path}: must be a whole number of 1 or more`);
};
const boolean: Check = (value, path, errors) => {
  if (typeof value !== "boolean") errors.push(`${path}: must be true or false`);
};
const oneOf =
  (...allowed: (string | number)[]): Check =>
  (value, path, errors) => {
    if (!allowed.includes(value as string)) errors.push(`${path}: must be one of ${allowed.join(", ")}`);
  };
const list =
  (item: Check, { nonEmpty = false } = {}): Check =>
  (value, path, errors) => {
    if (!Array.isArray(value)) return void errors.push(`${path}: must be a list`);
    if (nonEmpty && value.length === 0) errors.push(`${path}: must hold at least one entry`);
    value.forEach((entry, index) => item(entry, `${path}[${index}]`, errors));
  };
const map =
  (item: Check): Check =>
  (value, path, errors) => {
    if (!isObject(value)) return void errors.push(`${path}: must be an object`);
    for (const [key, entry] of Object.entries(value)) item(entry, `${path}.${key}`, errors);
  };
const object =
  (noun: string, required: Record<string, Check>, optional: Record<string, Check> = {}): Check =>
  (value, path, errors) => {
    if (!isObject(value)) return void errors.push(`${path || "inventory"}: must be an object`);
    const at = (key: string) => (path ? `${path}.${key}` : key);
    for (const key of Object.keys(value)) {
      if (!(key in required) && !(key in optional)) errors.push(`${at(key)}: not a field of ${noun}`);
    }
    for (const [key, check] of Object.entries(required)) {
      if (value[key] === undefined) errors.push(`${at(key)}: required`);
      else check(value[key], at(key), errors);
    }
    for (const [key, check] of Object.entries(optional)) {
      if (value[key] !== undefined) check(value[key], at(key), errors);
    }
  };

const status = oneOf("verified", "owner", "unverified");
const unit = oneOf("lb", "kg");
const value = object("a value", { listed: number, status }, { measured: number, note: string });

const shape = object(
  "an inventory",
  {
    format: () => {},
    name: string,
    lengthUnit: oneOf("mm", "in"),
    plateTypes: list(object("a plate type", { id: string, name: string, unit, bore: oneOf("olympic", "standard", "quick-lock", "block") }), { nonEmpty: true }),
    plates: list(
      object(
        "a plate",
        { id: string, type: string, count, weight: value, shape: oneOf("square", "round", "hexagonal", "twelve-sided", "block") },
        { name: string, countStatus: status, stackLength: value, diameter: positive, colour: string },
      ),
      { nonEmpty: true },
    ),
    hardware: list(
      object(
        "a hardware item",
        { id: string, name: string, kind: oneOf("screw", "collar", "pin"), count, unit, weight: value },
        { capacity: positive, minStack: value, width: positive, note: string },
      ),
    ),
    implements: list(
      object(
        "an implement",
        { id: string, name: string, kind: oneOf(...KINDS), count: atLeastOne, unit, base: value, accepts: list(string, { nonEmpty: true }) },
        {
          hardware: object("hardware options", { options: list(string, { nonEmpty: true }), perPosition: atLeastOne }, { default: string }),
          positionLength: value,
          unevenAllowance: number,
          unevenAllowanceRelaxed: number,
          maxPlateDiameter: positive,
          maxPerPosition: map(count),
          maxPlateWeight: positive,
          maxTotal: positive,
          note: string,
          baseIncludesHardware: boolean,
        },
      ),
      { nonEmpty: true },
    ),
  },
  { $schema: string },
);

const KIND_ONLY: Record<string, ImplementKind[]> = {
  hardware: ["bar", "handle", "stack"],
  positionLength: ["bar", "handle", "stack"],
  maxPlateDiameter: ["bar", "handle", "stack"],
  baseIncludesHardware: ["bar", "handle", "stack"],
  unevenAllowance: ["handle"],
  unevenAllowanceRelaxed: ["handle"],
};

function meaning(file: Json, errors: string[]): void {
  const entries = (key: string) => (Array.isArray(file[key]) ? (file[key] as unknown[]).filter(isObject) : []);
  const ids = (key: string) => new Set(entries(key).map((entry) => entry.id));

  for (const key of ["plateTypes", "plates", "hardware", "implements"]) {
    const seen = new Set<unknown>();
    (file[key] as unknown[] | undefined)?.forEach((entry, index) => {
      if (!isObject(entry) || typeof entry.id !== "string") return;
      const path = `${key}[${index}].id`;
      const implement = key === "implements";
      if (!(implement ? IMPLEMENT_ID : ITEM_ID).test(entry.id)) {
        errors.push(`${path}: "${entry.id}" must use only a to z, 0 to 9${implement ? "" : ", dots"} and hyphens`);
      }
      else if (seen.has(entry.id)) errors.push(`${path}: "${entry.id}" is already the id of an earlier entry`);
      else if (implement && RESERVED_IMPLEMENT_IDS.includes(entry.id)) {
        errors.push(`${path}: "${entry.id}" is reserved, because it is a link parameter`);
      }
      seen.add(entry.id);
    });
  }

  const plateTypes = new Map(entries("plateTypes").map((type) => [type.id, type]));
  const plates = ids("plates");
  const hardware = ids("hardware");

  (file.plates as unknown[] | undefined)?.forEach((plate, index) => {
    if (!isObject(plate) || typeof plate.type !== "string") return;
    const type = plateTypes.get(plate.type);
    if (!type) return void errors.push(`plates[${index}].type: "${plate.type}" names no plate type`);
    if (type.bore !== "block" && plate.stackLength === undefined && typeof type.bore === "string") {
      errors.push(`plates[${index}].stackLength: required, because the ${type.bore} bore stacks`);
    }
  });

  (file.implements as unknown[] | undefined)?.forEach((implement, index) => {
    if (!isObject(implement)) return;
    const at = (key: string) => `implements[${index}].${key}`;
    const kind = implement.kind as ImplementKind;
    if (Array.isArray(implement.accepts)) {
      implement.accepts.forEach((type, i) => {
        if (typeof type === "string" && !plateTypes.has(type)) errors.push(`${at(`accepts[${i}]`)}: "${type}" names no plate type`);
      });
    }
    const options = isObject(implement.hardware) && Array.isArray(implement.hardware.options) ? implement.hardware.options : undefined;
    const resolves = (id: unknown) => id === "none" || hardware.has(id);
    options?.forEach((option, i) => {
      if (typeof option === "string" && !resolves(option)) errors.push(`${at(`hardware.options[${i}]`)}: "${option}" names no hardware`);
    });
    const preferred = isObject(implement.hardware) ? implement.hardware.default : undefined;
    if (typeof preferred === "string" && options) {
      if (!resolves(preferred)) errors.push(`${at("hardware.default")}: "${preferred}" names no hardware`);
      else if (!options.includes(preferred)) errors.push(`${at("hardware.default")}: "${preferred}" is not one of its options`);
    }
    if (isObject(implement.maxPerPosition)) {
      for (const key of Object.keys(implement.maxPerPosition)) {
        if (!plates.has(key)) errors.push(`${at(`maxPerPosition.${key}`)}: "${key}" names no plate`);
      }
    }
    if (!KINDS.includes(kind)) return;
    for (const [field, kinds] of Object.entries(KIND_ONLY)) {
      if (implement[field] !== undefined && !kinds.includes(kind)) errors.push(`${at(field)}: not allowed on a ${kind}`);
    }
    if (kind === "handle" && implement.unevenAllowance === undefined) errors.push(`${at("unevenAllowance")}: required on a handle`);
  });
}

/** Reads an inventory file's text. Throws an InventoryError that lists every problem found. */
export function readInventory(text: string): Inventory {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new InventoryError(["inventory: not valid JSON"]);
  }
  if (isObject(file) && file.format !== 1) {
    throw new InventoryError([`Inventory format ${JSON.stringify(file.format ?? null)} is not supported. This version reads format 1.`]);
  }
  const errors: string[] = [];
  shape(file, "", errors);
  if (isObject(file)) meaning(file, errors);
  if (errors.length > 0) throw new InventoryError(sortedByPath(errors));
  return file as Inventory;
}

const SECTIONS = ["format", "name", "lengthUnit", "plateTypes", "plates", "hardware", "implements"];

function sortedByPath(errors: string[]): string[] {
  const keyOf = (error: string) => {
    const path = error.slice(0, error.indexOf(":"));
    const section = SECTIONS.indexOf(path.split(/[.[]/)[0]!);
    const index = Number(/^\w+\[(\d+)\]/.exec(path)?.[1] ?? -1);
    return [section === -1 ? SECTIONS.length : section, index];
  };
  return errors
    .map((error, order) => ({ error, order, key: keyOf(error) }))
    .sort((a, b) => a.key[0]! - b.key[0]! || a.key[1]! - b.key[1]! || a.order - b.order)
    .map(({ error }) => error);
}
