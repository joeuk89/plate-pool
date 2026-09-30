import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, type Inventory } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

function loadVest(target: string, options: { inventory?: Inventory } = {}) {
  const [result] = load(options.inventory ?? inventory, { targets: [{ implement: "vest", target }] }).results;
  return result!;
}

const blocks = (count: number) => Array<number>(count).fill(1);

const frontAndBack = (front: number, back: number) => [
  { name: "front", plates: blocks(front) },
  { name: "back", plates: blocks(back) },
];

describe("vest Load: worked examples (spec section 7)", () => {
  it("example 13: 12 kg is exact with 12 blocks, 6 on the front and 6 on the back", () => {
    const result = loadVest("12");
    expect(result.exact).toBe(true);
    expect(result.loading).toEqual({
      total: { kg: 12, lb: 26.46 },
      hardware: [],
      positions: frontAndBack(6, 6),
      uneven: false,
    });
  });

  it("example 14: 30 lb is not exact (13.6 kg); below is 13 kg, above is 14 kg, and above is recommended", () => {
    const result = loadVest("30lb");
    expect(result).toMatchObject({
      implement: "vest",
      target: { kg: 13.6, lb: 30 },
      exact: false,
      recommended: "above",
      below: { total: { kg: 13, lb: 28.66 }, positions: frontAndBack(6, 7) },
      above: { total: { kg: 14, lb: 30.86 }, positions: frontAndBack(7, 7) },
    });
    expect(result.loading).toBeUndefined();
  });
});

describe("vest Load: targets (spec 6.1 rule 4, 6.2)", () => {
  it("reads a bare number as kilograms and accepts a kg suffix", () => {
    expect(loadVest("12").target).toEqual({ kg: 12, lb: 26.46 });
    expect(loadVest("12kg").target).toEqual({ kg: 12, lb: 26.46 });
    expect(loadVest("12 KG").target).toEqual({ kg: 12, lb: 26.46 });
  });

  it("shows kilograms first, with pounds beside them", () => {
    expect(Object.keys(loadVest("12").target)).toEqual(["kg", "lb"]);
    expect(Object.keys(loadVest("12").loading!.total)).toEqual(["kg", "lb"]);
  });

  it("recommends the lower number of blocks when below and above are equally near", () => {
    expect(loadVest("12.5")).toMatchObject({ recommended: "below", below: { total: { kg: 12 } }, above: { total: { kg: 13 } } });
  });
});

describe("vest Load: front and back (spec 6.2)", () => {
  it.each([
    [1, 0, 1],
    [2, 1, 1],
    [7, 3, 4],
    [29, 14, 15],
    [30, 15, 15],
  ])("splits %i blocks into %i on the front and %i on the back", (count, front, back) => {
    expect(loadVest(String(count)).loading?.positions).toEqual(frontAndBack(front, back));
  });

  it("gives the empty vest for 0 blocks when the target is under one block", () => {
    const result = loadVest("0.4");
    expect(result).toMatchObject({ exact: false, recommended: "below", below: { total: { kg: 0 }, positions: frontAndBack(0, 0) } });
  });
});

function changed(edit: (copy: Inventory) => void): Inventory {
  const copy = structuredClone(inventory);
  edit(copy);
  return copy;
}

const byId = <T extends { id: string }>(list: T[], id: string) => list.find((item) => item.id === id)!;

describe("vest Load: the 30 block limit (spec 4.3)", () => {
  it("refuses a target above 30 blocks, stating the limit and showing the heaviest allowed loading", () => {
    const result = loadVest("35");
    expect(result).toMatchObject({
      exact: false,
      refused: { limit: { kg: 30, lb: 66.14 } },
      recommended: "below",
      below: { total: { kg: 30, lb: 66.14 }, positions: frontAndBack(15, 15) },
    });
    expect(result.above).toBeUndefined();
    expect(result.warnings).toEqual(["Refused: over the 30 block limit. Heaviest allowed: 30 kg (66.14 lb)."]);
  });

  it("refuses any target above 30 kg, and accepts 30 kg", () => {
    expect(loadVest("30.4").refused).toEqual({ limit: { kg: 30, lb: 66.14 } });
    expect(loadVest("30").refused).toBeUndefined();
    expect(loadVest("30").exact).toBe(true);
  });
});

describe("vest Load: unverified values (spec 6.1 rule 3, 4.3 notes)", () => {
  it("flags the empty vest's weight and the block count", () => {
    expect(loadVest("12").unverified).toEqual(["vest.base", "vest-block.count"]);
  });

  it("drops each flag once the owner measures or counts it", () => {
    const checked = changed((copy) => {
      byId(copy.implements, "vest").base = { listed: 0, measured: 0, status: "owner" };
      byId(copy.plates, "vest-block").countStatus = "owner";
    });
    expect(loadVest("12", { inventory: checked }).unverified).toEqual([]);
  });

  it("counts a measured empty vest in the total", () => {
    const heavyVest = changed((copy) => {
      byId(copy.implements, "vest").base = { listed: 0, measured: 1.5, status: "owner" };
    });
    const result = loadVest("13.5", { inventory: heavyVest });
    expect(result.exact).toBe(true);
    expect(result.loading?.positions).toEqual(frontAndBack(6, 6));
  });
});

describe("vest Load: the plate pool (spec 6.1 rule 6)", () => {
  it("uses no more blocks than the pool holds", () => {
    const tenBlocks = changed((copy) => {
      byId(copy.plates, "vest-block").count = 10;
    });
    const result = loadVest("12", { inventory: tenBlocks });
    expect(result).toMatchObject({ exact: false, recommended: "below", below: { total: { kg: 10 } } });
    expect(result.above).toBeUndefined();
  });

  it("reports the blocks and locking hardware left over", () => {
    expect(load(inventory, { targets: [{ implement: "vest", target: "30lb" }] }).leftover).toEqual({
      plates: { "vest-block": 16 },
      hardware: { "screw-standard": 4, "screw-long": 5, "collar-spinlock": 2, "collar-clamp": 4 },
    });
  });
});

describe("vest Load: rules that hold for every target", () => {
  it("splits blocks evenly with any extra on the back, and stays within 30 blocks", () => {
    for (let quarter = 1; quarter <= 40 * 4; quarter++) {
      const target = String(quarter / 4);
      const result = loadVest(target);
      const loadings = [result.loading, result.below, result.above].filter((loading) => loading !== undefined);
      expect(loadings.length, target).toBeGreaterThan(0);
      for (const loading of loadings) {
        const [front, back] = loading.positions;
        expect([front!.name, back!.name], target).toEqual(["front", "back"]);
        expect(back!.plates.length - front!.plates.length, target).toBeOneOf([0, 1]);
        expect(front!.plates.length + back!.plates.length, target).toBeLessThanOrEqual(30);
        expect(loading.total.kg, target).toBe(front!.plates.length + back!.plates.length);
      }
    }
  });
});

describe("vest Load: the JSON shape in spec section 9", () => {
  it("orders each result's fields as the barbell's do", () => {
    const [result] = load(inventory, { targets: [{ implement: "vest", target: "35" }] }).results;
    expect(Object.keys(result!)).toEqual([
      "implement",
      "target",
      "exact",
      "refused",
      "recommended",
      "below",
      "alternatives",
      "warnings",
      "unverified",
    ]);
  });
});
