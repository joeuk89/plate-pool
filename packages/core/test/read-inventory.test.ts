import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { InventoryError, readInventory } from "../src/index.js";

const file = JSON.parse(readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"));

describe("readInventory", () => {
  it("returns the plate types, plates, locking hardware and implements of the inventory file", () => {
    const { $schema, ...equipment } = file;
    expect(readInventory(file)).toEqual(equipment);
  });

  it.each([
    ["a list", [], "/"],
    ["no implements", { ...file, implements: undefined }, "/implements"],
    ["a plate with no count", { ...file, plates: [{ ...file.plates[0], count: undefined }] }, "/plates/0/count"],
    [
      "a weight with no listed value",
      { ...file, hardware: [{ ...file.hardware[0], weight: { status: "verified" } }] },
      "/hardware/0/weight/listed",
    ],
    ["an unknown status", { ...file, implements: [{ ...file.implements[0], base: { listed: 18, status: "maybe" } }] }, "/implements/0/base/status"],
  ])("rejects %s and names where", (_, data, path) => {
    expect(() => readInventory(data)).toThrow(InventoryError);
    expect(() => readInventory(data)).toThrow(path);
  });
});
