import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, type Inventory } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

function loadKettlebell(target: string, options: { inventory?: Inventory } = {}) {
  const [result] = load(options.inventory ?? inventory, { targets: [{ implement: "kettlebell", target }] }).results;
  return result!;
}

const stack = (...plates: number[]) => [{ name: "stack", plates }];

describe("kettlebell Load: worked examples (spec section 7)", () => {
  it("example 8: 80 lb is exact with 1 × 22.5, 6 × 5, 1 × 2.5 on a long screw", () => {
    const result = loadKettlebell("80");
    expect(result.exact).toBe(true);
    expect(result.loading).toEqual({
      total: { lb: 80, kg: 36.3 },
      hardware: [{ id: "screw-long", count: 1 }],
      positions: stack(22.5, 5, 5, 5, 5, 5, 5, 2.5),
      uneven: false,
    });
  });
});

function changed(edit: (copy: Inventory) => void): Inventory {
  const copy = structuredClone(inventory);
  edit(copy);
  return copy;
}

const byId = <T extends { id: string }>(list: T[], id: string) => list.find((item) => item.id === id)!;

const stickOutWarning =
  "No standard locking screw is free, so the kettlebell uses a long locking screw. It may stick out at the top, which Ironmaster's manual calls normal.";

describe("kettlebell Load: locking screw (spec 6.2)", () => {
  it("uses a standard screw up to 57.5 lb", () => {
    expect(loadKettlebell("57.5")).toMatchObject({
      exact: true,
      loading: { hardware: [{ id: "screw-standard", count: 1 }], positions: stack(22.5, 5, 5) },
    });
  });

  it("uses a long screw above 57.5 lb", () => {
    expect(loadKettlebell("60")).toMatchObject({
      exact: true,
      loading: { hardware: [{ id: "screw-long", count: 1 }], positions: stack(22.5, 5, 5, 2.5) },
    });
  });

  it("weighs 25 lb with a standard screw and no plates", () => {
    expect(loadKettlebell("25")).toMatchObject({
      exact: true,
      loading: { total: { lb: 25, kg: 11.3 }, hardware: [{ id: "screw-standard", count: 1 }], positions: stack() },
    });
  });

  it("takes a long screw when no standard screw is free, and warns that it may stick out at the top", () => {
    const noStandard = changed((copy) => {
      byId(copy.hardware, "screw-standard").count = 0;
    });
    const result = loadKettlebell("40", { inventory: noStandard });
    expect(result).toMatchObject({
      exact: true,
      loading: { total: { lb: 40, kg: 18.1 }, hardware: [{ id: "screw-long", count: 1 }], positions: stack(5, 5, 5) },
    });
    expect(result.warnings).toEqual([stickOutWarning]);
  });

  it("gives no stick-out warning when a standard screw is free or the long screw is due anyway", () => {
    expect(loadKettlebell("40").warnings).toEqual([]);
    const noStandard = changed((copy) => {
      byId(copy.hardware, "screw-standard").count = 0;
    });
    expect(loadKettlebell("70", { inventory: noStandard }).warnings).toEqual([]);
  });

  it("offers only the bare handle when no screw is free, and says why", () => {
    const noScrews = changed((copy) => {
      byId(copy.hardware, "screw-standard").count = 0;
      byId(copy.hardware, "screw-long").count = 0;
    });
    const result = loadKettlebell("40", { inventory: noScrews });
    expect(result).toMatchObject({ exact: false, recommended: "below", below: { total: { lb: 22.5 }, hardware: [] } });
    expect(result.above).toBeUndefined();
    expect(result.warnings).toEqual(["No locking screw is free, so the kettlebell can only be the bare handle."]);
  });
});

describe("kettlebell Load: bare handle (spec 4.3 notes)", () => {
  it("is a valid loading of 22.5 lb with no screw and no plates", () => {
    const result = loadKettlebell("22.5");
    expect(result.exact).toBe(true);
    expect(result.loading).toEqual({ total: { lb: 22.5, kg: 10.2 }, hardware: [], positions: stack(), uneven: false });
  });

  it("recommends the bare handle for a target just above it", () => {
    expect(loadKettlebell("23")).toMatchObject({
      exact: false,
      recommended: "below",
      below: { total: { lb: 22.5 }, hardware: [] },
      above: { total: { lb: 25 }, hardware: [{ id: "screw-standard", count: 1 }] },
    });
  });
});

describe("kettlebell Load: stack (spec 6.2)", () => {
  it("puts at most one micro plate on the stack", () => {
    const no2point5 = changed((copy) => {
      byId(copy.plates, "ql-2.5").count = 0;
    });
    expect(loadKettlebell("27.5", { inventory: no2point5 })).toMatchObject({
      exact: false,
      below: { total: { lb: 26.25 }, positions: stack(1.25) },
      above: { total: { lb: 30 }, positions: stack(5) },
    });
  });

  it("puts at most one 22.5 lb plate on the stack", () => {
    expect(loadKettlebell("70").loading?.positions).toEqual(stack(22.5, 5, 5, 5, 5, 2.5));
  });

  it("fits the plates within the locking screw's capacity", () => {
    const shortScrew = changed((copy) => {
      byId(copy.hardware, "screw-standard").capacityIn = 0.5;
    });
    expect(loadKettlebell("35", { inventory: shortScrew })).toMatchObject({
      exact: false,
      below: { total: { lb: 30 }, positions: stack(5) },
      above: { total: { lb: 58.75 }, hardware: [{ id: "screw-long", count: 1 }] },
    });
  });
});

describe("kettlebell Load: 80 lb limit (spec 4.3)", () => {
  it("refuses a target above 80 lb, stating the limit and showing the heaviest allowed loading", () => {
    const result = loadKettlebell("85");
    expect(result).toMatchObject({
      exact: false,
      refused: { limit: { lb: 80, kg: 36.3 } },
      recommended: "below",
      below: { total: { lb: 80, kg: 36.3 }, positions: stack(22.5, 5, 5, 5, 5, 5, 5, 2.5) },
    });
    expect(result.above).toBeUndefined();
    expect(result.warnings).toEqual(["Refused: over the 80 lb limit. Heaviest allowed: 80 lb (36.3 kg)."]);
  });

  it("refuses 80.5 lb and accepts 80 lb", () => {
    expect(loadKettlebell("80.5").refused).toEqual({ limit: { lb: 80, kg: 36.3 } });
    expect(loadKettlebell("80").refused).toBeUndefined();
  });
});

describe("kettlebell Load: rules that hold for every target", () => {
  const lengthOf = new Map(inventory.plates.map((plate) => [plate.weight.listed, plate.stackLengthIn?.listed ?? 0]));
  const capacityOf = new Map(inventory.hardware.map((item) => [item.id, item.capacityIn ?? 0]));
  const pool = new Map(
    inventory.plates.filter((plate) => plate.type === "quick-lock").map((plate) => [plate.weight.listed, plate.count]),
  );
  const targets = Array.from({ length: (90 - 5) * 4 + 1 }, (_, i) => String(5 + i / 4));

  it("keeps every loading within the pool, the screw's capacity and the kettlebell's rules", () => {
    for (const target of targets) {
      const result = loadKettlebell(target);
      const loadings = [result.loading, result.below, result.above].filter((loading) => loading !== undefined);
      expect(loadings.length, target).toBeGreaterThan(0);
      for (const loading of loadings) {
        const plates = loading.positions[0]!.plates;
        const total = loading.total.lb;
        expect(total, target).toBeLessThanOrEqual(80);
        expect(plates, target).toEqual([...plates].sort((a, b) => b - a));
        expect(plates.filter((plate) => plate === 1.25).length, target).toBeLessThanOrEqual(1);
        expect(plates.filter((plate) => plate === 22.5).length, target).toBeLessThanOrEqual(1);
        for (const [weight, count] of pool) {
          expect(plates.filter((plate) => plate === weight).length, target).toBeLessThanOrEqual(count);
        }
        if (total === 22.5) {
          expect(loading.hardware, target).toEqual([]);
          continue;
        }
        const screw = total <= 57.5 ? "screw-standard" : "screw-long";
        expect(loading.hardware, target).toEqual([{ id: screw, count: 1 }]);
        const length = plates.reduce((sum, plate) => sum + lengthOf.get(plate)!, 0);
        expect(length, target).toBeLessThanOrEqual(capacityOf.get(screw)!);
        expect(total, target).toBe(25 + plates.reduce((sum, plate) => sum + plate, 0));
      }
    }
  });
});

describe("kettlebell Load: the plate pool (spec 6.1 rule 6)", () => {
  it("reports the plates and locking hardware left over after the loading", () => {
    expect(load(inventory, { targets: [{ implement: "kettlebell", target: "80" }] }).leftover).toEqual({
      plates: { "ql-22.5": 4, "ql-5": 18, "ql-2.5": 3, "ql-micro": 4 },
      hardware: { "screw-standard": 4, "screw-long": 4, "collar-clamp": 4, "collar-spinlock": 2 },
    });
  });

  it("names no unverified values, because every kettlebell weight is verified", () => {
    expect(loadKettlebell("80").unverified).toEqual([]);
  });
});
