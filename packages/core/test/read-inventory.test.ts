import { describe, expect, it } from "vitest";
import { InventoryError, readInventory } from "../src/index.js";
import { olympicText, ownerText } from "./kits.js";

const owner = () => JSON.parse(ownerText);
const olympic = () => JSON.parse(olympicText);

function errorsOf(file: unknown): string[] {
  try {
    readInventory(typeof file === "string" ? file : JSON.stringify(file));
  } catch (error) {
    expect(error).toBeInstanceOf(InventoryError);
    return (error as InventoryError).errors;
  }
  return [];
}

function edited(base: () => any, edit: (file: any) => void): any {
  const file = base();
  edit(file);
  return file;
}

describe("readInventory: valid files (spec 17.3)", () => {
  it("reads the owner's file as written", () => {
    expect(readInventory(ownerText)).toEqual(JSON.parse(ownerText));
  });

  it("reads the Olympic kit, a kilogram and millimetre file with one implement of each kind", () => {
    const kit = readInventory(olympicText);
    expect(kit.name).toBe("Olympic kit");
    expect(kit.lengthUnit).toBe("mm");
    expect(kit.implements.map((implement) => implement.kind)).toEqual(["bar", "handle", "stack", "vest"]);
  });
});

describe("readInventory: the acceptance cases (spec 17.11, examples 21 and 22)", () => {
  it("example 21: refuses format 2 by name", () => {
    expect(errorsOf(edited(owner, (file) => (file.format = 2)))).toEqual([
      "Inventory format 2 is not supported. This version reads format 1.",
    ]);
  });

  it("example 22: refuses an implement id kit, naming implements[0].id", () => {
    const errors = errorsOf(edited(owner, (file) => (file.implements[0].id = "kit")));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^implements\[0\]\.id: /);
  });

  it.each([
    ["a duplicate id", (file: any) => (file.plates[1].id = "ql-22.5"), "plates[1].id"],
    ["an unresolved accepts", (file: any) => (file.implements[0].accepts = ["olympic"]), "implements[0].accepts[0]"],
    ["a default outside options", (file: any) => (file.implements[0].hardware.default = "screw-long"), "implements[0].hardware.default"],
    ["a handle without unevenAllowance", (file: any) => delete file.implements[1].unevenAllowance, "implements[1].unevenAllowance"],
    ["a bar with unevenAllowance", (file: any) => (file.implements[0].unevenAllowance = 2.5), "implements[0].unevenAllowance"],
    ["an implement id kit", (file: any) => (file.implements[2].id = "kit"), "implements[2].id"],
  ])("refuses %s, naming the JSON path", (_, edit, path) => {
    const errors = errorsOf(edited(owner, edit));
    expect(errors).toHaveLength(1);
    expect(errors[0]!.startsWith(`${path}: `), errors[0]).toBe(true);
  });

  it("names the handle rule in the words of the spec", () => {
    expect(errorsOf(edited(owner, (file) => delete file.implements[1].unevenAllowance))).toEqual([
      "implements[1].unevenAllowance: required on a handle",
    ]);
  });
});

describe("readInventory: what a schema cannot check (spec 17.3.6)", () => {
  it.each(["view", "uneven", "kit", "inventory", "single", "pair", "hardware"])("refuses the reserved implement id %s", (id) => {
    expect(errorsOf(edited(olympic, (file) => (file.implements[3].id = id)))).toEqual([
      `implements[3].id: "${id}" is reserved, because it is a link parameter`,
    ]);
  });

  it("refuses an id that is not lower-case letters, digits and hyphens", () => {
    expect(errorsOf(edited(olympic, (file) => (file.plates[0].id = "Twenty")))).toEqual([
      'plates[0].id: "Twenty" must use only a to z, 0 to 9, dots and hyphens',
    ]);
  });

  it("allows the same id in two different lists", () => {
    expect(errorsOf(edited(olympic, (file) => (file.plates[0].id = "belt")))).toEqual([]);
  });

  it.each([
    ["a plate type", (file: any) => (file.plates[0].type = "bumper"), 'plates[0].type: "bumper" names no plate type'],
    ["an option", (file: any) => (file.implements[0].hardware.options = ["collar", "clip", "none"]), 'implements[0].hardware.options[1]: "clip" names no hardware'],
    ["a maxPerPosition key", (file: any) => (file.implements[3].maxPerPosition = { "carrier-9": 1 }), 'implements[3].maxPerPosition.carrier-9: "carrier-9" names no plate'],
  ])("refuses %s that resolves to nothing", (_, edit, message) => {
    expect(errorsOf(edited(olympic, edit))).toEqual([message]);
  });

  it("requires stackLength on a plate whose bore is not block, and not on a block", () => {
    expect(errorsOf(edited(olympic, (file) => delete file.plates[1].stackLength))).toEqual([
      "plates[1].stackLength: required, because the olympic bore stacks",
    ]);
    expect(errorsOf(edited(olympic, (file) => (file.plates[4].stackLength = { listed: 30, status: "verified" })))).toEqual([]);
  });

  it.each([
    ["hardware", 3, { options: ["collar"], perPosition: 1 }],
    ["positionLength", 3, { listed: 100, status: "verified" }],
    ["baseIncludesHardware", 3, true],
    ["maxPlateDiameter", 3, 300],
    ["unevenAllowanceRelaxed", 2, 5],
    ["unevenAllowance", 2, 5],
  ])("refuses %s on a kind that does not allow it", (field, index, value) => {
    const kind = olympic().implements[index].kind;
    expect(errorsOf(edited(olympic, (file) => (file.implements[index][field] = value)))).toEqual([
      `implements[${index}].${field}: not allowed on a ${kind}`,
    ]);
  });
});

describe("readInventory: shape and enumerations (spec 17.3.6)", () => {
  it.each([
    ["text that is not JSON", "{ format: 1", "inventory: not valid JSON"],
    ["a list", [], "inventory: must be an object"],
    ["no name", edited(olympic, (file) => delete file.name), "name: required"],
    ["a length unit of feet", edited(olympic, (file) => (file.lengthUnit = "ft")), "lengthUnit: must be one of mm, in"],
    ["a plate with no count", edited(olympic, (file) => delete file.plates[0].count), "plates[0].count: required"],
    ["a fractional count", edited(olympic, (file) => (file.plates[0].count = 1.5)), "plates[0].count: must be a whole number of 0 or more"],
    ["a weight with no listed value", edited(olympic, (file) => delete file.hardware[0].weight.listed), "hardware[0].weight.listed: required"],
    ["a bare-number weight", edited(olympic, (file) => (file.plates[0].weight = 20)), "plates[0].weight: must be an object"],
    ["an unknown status", edited(olympic, (file) => (file.implements[0].base.status = "maybe")), "implements[0].base.status: must be one of verified, owner, unverified"],
    ["an unknown bore", edited(olympic, (file) => (file.plateTypes[0].bore = "wide")), "plateTypes[0].bore: must be one of olympic, standard, quick-lock, block"],
    ["an unknown kind", edited(olympic, (file) => (file.implements[0].kind = "trap")), "implements[0].kind: must be one of bar, handle, stack, vest"],
    ["an unknown hardware kind", edited(olympic, (file) => (file.hardware[0].kind = "clip")), "hardware[0].kind: must be one of screw, collar, pin"],
    ["an extra field", edited(olympic, (file) => (file.plates[0].price = 1)), "plates[0].price: not a field of a plate"],
    ["the old positions field", edited(olympic, (file) => (file.implements[0].positions = ["left", "right"])), "implements[0].positions: not a field of an implement"],
    ["a negative weight", edited(olympic, (file) => (file.plates[0].weight.listed = -1)), "plates[0].weight.listed: must be a number of 0 or more"],
  ])("refuses %s, naming where", (_, file, message) => {
    expect(errorsOf(file)).toEqual([message]);
  });

  it("returns every error it finds, not only the first", () => {
    const file = edited(olympic, (each) => {
      delete each.name;
      each.plates[0].count = "two";
      each.implements[1].id = "pair";
      delete each.implements[1].unevenAllowance;
    });
    expect(errorsOf(file)).toEqual([
      "name: required",
      "plates[0].count: must be a whole number of 0 or more",
      'implements[1].id: "pair" is reserved, because it is a link parameter',
      "implements[1].unevenAllowance: required on a handle",
    ]);
  });

  it("puts every error in the thrown message", () => {
    expect(() => readInventory(JSON.stringify(edited(olympic, (file) => delete file.name)))).toThrow("name: required");
  });
});
