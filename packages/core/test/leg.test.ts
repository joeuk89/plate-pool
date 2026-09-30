import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, type Inventory } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

function loadLeg(target: string, options: { inventory?: Inventory } = {}) {
  const [result] = load(options.inventory ?? inventory, { targets: [{ implement: "leg", target }] }).results;
  return result!;
}

function changed(edit: (copy: Inventory) => void): Inventory {
  const copy = structuredClone(inventory);
  edit(copy);
  return copy;
}

const byId = <T extends { id: string }>(list: T[], id: string) => list.find((item) => item.id === id)!;

const stack = (...plates: number[]) => [{ name: "stack", plates }];

const legNote = "Plate weight only. The lever changes the resistance you feel.";

describe("leg attachment Load: worked examples (spec section 7)", () => {
  it("example 12: 50 lb is exact with 2 × 22.5, 1 × 5", () => {
    const result = loadLeg("50");
    expect(result.exact).toBe(true);
    expect(result.loading).toEqual({
      total: { lb: 50, kg: 22.7 },
      hardware: [],
      positions: stack(22.5, 22.5, 5),
      uneven: false,
    });
  });
});

describe("leg attachment Load: rules (spec 6.2)", () => {
  it("carries the fixed note on every result", () => {
    expect(loadLeg("50").warnings).toEqual([legNote]);
    expect(loadLeg("51").warnings).toEqual([legNote]);
    expect(loadLeg("120").warnings).toContain(legNote);
  });

  it("uses no locking hardware from the plate pool", () => {
    const response = load(inventory, { targets: [{ implement: "leg", target: "100" }] });
    expect(response.results[0]!.loading?.hardware).toEqual([]);
    expect(response.leftover).toEqual({
      plates: { "ql-22.5": 1, "ql-5": 22, "ql-2.5": 4, "ql-micro": 4 },
      hardware: { "screw-standard": 4, "screw-long": 5, "collar-clamp": 4, "collar-spinlock": 2 },
    });
  });

  it("reports plate weight only, so the empty leg attachment weighs 0 lb", () => {
    expect(loadLeg("1")).toMatchObject({
      exact: false,
      recommended: "above",
      below: { total: { lb: 0, kg: 0 }, positions: stack() },
      above: { total: { lb: 1.25 }, positions: stack(1.25) },
    });
  });

  it("puts at most one micro plate on the stack", () => {
    const no2point5 = changed((copy) => {
      byId(copy.plates, "ql-2.5").count = 0;
    });
    expect(loadLeg("2.5", { inventory: no2point5 })).toMatchObject({
      exact: false,
      below: { total: { lb: 1.25 }, positions: stack(1.25) },
      above: { total: { lb: 5 }, positions: stack(5) },
    });
  });

  it("uses no more plates than the pool holds", () => {
    const fewPlates = changed((copy) => {
      for (const plate of copy.plates) plate.count = plate.id === "ql-22.5" ? 1 : 0;
    });
    expect(loadLeg("50", { inventory: fewPlates })).toMatchObject({ exact: false, below: { total: { lb: 22.5 } } });
  });
});

describe("leg attachment Load: 100 lb plate limit (spec 6.2)", () => {
  it("refuses a target above 100 lb, stating the limit and showing the heaviest allowed loading", () => {
    const result = loadLeg("120");
    expect(result).toMatchObject({
      exact: false,
      refused: { limit: { lb: 100, kg: 45.4 } },
      recommended: "below",
      below: { total: { lb: 100, kg: 45.4 }, positions: stack(22.5, 22.5, 22.5, 22.5, 5, 5) },
    });
    expect(result.above).toBeUndefined();
    expect(result.warnings).toEqual(["Refused: over the 100 lb plate limit. Heaviest allowed: 100 lb (45.4 kg).", legNote]);
  });

  it("refuses 100.25 lb and accepts 100 lb", () => {
    expect(loadLeg("100.25").refused).toEqual({ limit: { lb: 100, kg: 45.4 } });
    expect(loadLeg("100").refused).toBeUndefined();
  });

  it("keeps every loading at or under 100 lb of plates", () => {
    for (let quarter = 4; quarter <= 130 * 4; quarter++) {
      const target = String(quarter / 4);
      const result = loadLeg(target);
      for (const loading of [result.loading, result.below, result.above].filter((item) => item !== undefined)) {
        const plates = loading.positions[0]!.plates;
        expect(plates.reduce((sum, plate) => sum + plate, 0), target).toBeLessThanOrEqual(100);
        expect(plates, target).toEqual([...plates].sort((a, b) => b - a));
        expect(loading.hardware, target).toEqual([]);
      }
    }
  });
});
