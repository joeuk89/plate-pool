import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, RequestError, type CollarChoice, type Implement, type Inventory, type Loading, type Unit } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

function loadBarbell(target: string, options: { collars?: CollarChoice; inventory?: Inventory } = {}) {
  const request = { targets: [{ implement: "barbell", target }], ...(options.collars ? { collars: options.collars } : {}) };
  const [result] = load(options.inventory ?? inventory, request).results;
  return result!;
}

const eachSide = (...plates: number[]) => [
  { name: "left", plates },
  { name: "right", plates },
];

describe("other ways to make this (spec 6.3)", () => {
  it("example 11: barbell 88 lb lists the other loadings that reach 88 lb, fewest plates first", () => {
    const result = loadBarbell("88");
    expect(result.loading?.positions).toEqual(eachSide(22.5, 5, 5, 2.5));
    expect(result.alternatives).toEqual([
      { total: { lb: 88, kg: 39.9 }, hardware: [{ id: "collar-clamp", count: 2 }], positions: eachSide(5, 5, 5, 5, 5, 5, 5), uneven: false },
      { total: { lb: 88, kg: 39.9 }, hardware: [{ id: "collar-clamp", count: 2 }], positions: eachSide(5, 5, 5, 5, 5, 5, 2.5, 2.5), uneven: false },
    ]);
  });

  it("holds at most five other loadings, and drops those with the most plates", () => {
    const many2point5 = structuredClone(inventory);
    many2point5.plates.find((plate) => plate.id === "ql-2.5")!.count = 20;
    const result = loadBarbell("68", { inventory: many2point5 });
    expect(result.loading?.positions).toEqual(eachSide(22.5, 2.5));
    expect(result.alternatives.map((loading) => loading.positions)).toEqual([
      eachSide(5, 5, 5, 5, 5),
      eachSide(5, 5, 5, 5, 2.5, 2.5),
      eachSide(5, 5, 5, 2.5, 2.5, 2.5, 2.5),
      eachSide(5, 5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5),
      eachSide(5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5),
    ]);
  });

  it("lists none when no loading reaches the target, as the JSON example in spec section 9 shows", () => {
    expect(loadBarbell("175").alternatives).toEqual([]);
    expect(loadBarbell("230").alternatives).toEqual([]);
  });

  it("names an unverified plate weight that only another loading uses (spec 6.1 rule 3)", () => {
    const unverified5 = structuredClone(inventory);
    unverified5.plates.find((plate) => plate.id === "ql-5")!.weight.status = "unverified";
    const result = loadBarbell("68", { inventory: unverified5 });
    expect(result.loading?.positions).toEqual(eachSide(22.5, 2.5));
    expect(result.alternatives[0]?.positions).toEqual(eachSide(5, 5, 5, 5, 5));
    expect(result.unverified).toContain("ql-5.weight");
  });

  it("uses the collars asked for", () => {
    const result = loadBarbell("88", { collars: "spinlock" });
    expect(result.alternatives.map((loading) => loading.hardware)).toEqual([
      [{ id: "collar-spinlock", count: 2 }],
      [{ id: "collar-spinlock", count: 2 }],
    ]);
  });
});

describe("other ways to make this: rules that hold for every implement Load supports", () => {
  const supported = inventory.implements.filter((implement) => {
    try {
      load(inventory, { targets: [{ implement: implement.id, target: "1" }] });
      return true;
    } catch (error) {
      if (error instanceof RequestError) return false;
      throw error;
    }
  });

  const targetsFor = (unit: Unit) =>
    unit === "kg"
      ? Array.from({ length: 40 }, (_, i) => `${i + 1}kg`)
      : Array.from({ length: 1000 }, (_, i) => `${(i + 1) / 4}lb`);

  const plateSizes = (implement: Implement) =>
    new Set(inventory.plates.filter((plate) => implement.accepts.includes(plate.type) && plate.count > 0).map((plate) => plate.weight.listed));

  const layout = (loading: Loading) => JSON.stringify([loading.hardware, loading.positions]);

  it("covers the barbell at least", () => {
    expect(supported.map((implement) => implement.id)).toContain("barbell");
  });

  it.each(supported.map((implement) => [implement.id, implement] as const))("%s", (_, implement) => {
    const pool = new Map<number, number>();
    for (const plate of inventory.plates.filter((item) => implement.accepts.includes(item.type))) {
      pool.set(plate.weight.listed, (pool.get(plate.weight.listed) ?? 0) + plate.count);
    }

    let listed = 0;
    for (const target of targetsFor(implement.unit)) {
      const [result] = load(inventory, { targets: [{ implement: implement.id, target }] }).results;
      const { loading, alternatives } = result!;
      if (!loading) {
        expect(alternatives, target).toEqual([]);
        continue;
      }
      expect(alternatives.length, target).toBeLessThanOrEqual(5);
      const layouts = [loading, ...alternatives].map(layout);
      expect(new Set(layouts).size, target).toBe(layouts.length);

      const plateCounts = alternatives.map((other) => other.positions.flatMap((position) => position.plates).length);
      expect(plateCounts, target).toEqual([...plateCounts].sort((a, b) => a - b));
      for (const other of alternatives) {
        expect(other.total, target).toEqual(loading.total);
        const plates = other.positions.flatMap((position) => position.plates);
        for (const [weight, count] of pool) {
          expect(plates.filter((plate) => plate === weight).length, target).toBeLessThanOrEqual(count);
        }
      }
      listed += alternatives.length;
    }
    if (plateSizes(implement).size > 1) expect(listed).toBeGreaterThan(0);
  });
});
