import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, type Inventory } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

function loadDumbbells(target: string, options: { pair?: boolean; uneven?: boolean; inventory?: Inventory } = {}) {
  const request = {
    targets: [{ implement: "dumbbell", target, ...(options.pair === undefined ? {} : { pair: options.pair }) }],
    ...(options.uneven === undefined ? {} : { uneven: options.uneven }),
  };
  return load(options.inventory ?? inventory, request);
}

function changed(edit: (copy: Inventory) => void): Inventory {
  const copy = structuredClone(inventory);
  edit(copy);
  return copy;
}

const byId = <T extends { id: string }>(list: T[], id: string) => list.find((item) => item.id === id)!;

const ends = (endA: number[], endB: number[] = endA) => [
  { name: "end-a", plates: endA },
  { name: "end-b", plates: endB },
];

describe("dumbbells Load: worked examples (spec section 7)", () => {
  it("example 4: a pair of 40 lb is exact with 3 × 5 on each end, standard screws, and uses 12 × 5 lb plates", () => {
    const response = loadDumbbells("40");
    const [result] = response.results;
    expect(result).toMatchObject({
      implement: "dumbbell",
      pair: true,
      target: { lb: 40, kg: 18.1 },
      exact: true,
      loading: {
        total: { lb: 40, kg: 18.1 },
        hardware: [{ id: "screw-standard", count: 2 }],
        positions: ends([5, 5, 5]),
        uneven: false,
      },
    });
    expect(response.leftover.plates["ql-5"]).toBe(24 - 12);
    expect(response.leftover.hardware["screw-standard"]).toBe(0);
  });

  it("example 5: one dumbbell of 12.5 lb is exact and uneven, with 1 × 2.5 on one end and the other end empty", () => {
    const [result] = loadDumbbells("12.5", { pair: false }).results;
    expect(result).toMatchObject({
      pair: false,
      exact: true,
      loading: {
        total: { lb: 12.5, kg: 5.7 },
        hardware: [{ id: "screw-standard", count: 2 }],
        positions: ends([2.5], []),
        uneven: true,
        heavier: "end-a",
      },
    });
  });

  it("example 6: one dumbbell of 47.5 lb is exact and uneven, with 4 × 5 on one end and 3 × 5 + 1 × 2.5 on the other", () => {
    const [result] = loadDumbbells("47.5", { pair: false }).results;
    expect(result).toMatchObject({
      exact: true,
      loading: {
        total: { lb: 47.5 },
        hardware: [{ id: "screw-standard", count: 2 }],
        positions: ends([5, 5, 5, 5], [5, 5, 5, 2.5]),
        uneven: true,
        heavier: "end-a",
      },
    });
  });

  it("example 7: a pair of 120 lb is exact with 1 × 22.5, 6 × 5, 1 × 2.5 on each end, long screws, using every 5 lb and 2.5 lb plate", () => {
    const response = loadDumbbells("120");
    const [result] = response.results;
    expect(result).toMatchObject({
      exact: true,
      loading: {
        total: { lb: 120, kg: 54.4 },
        hardware: [{ id: "screw-long", count: 2 }],
        positions: ends([22.5, 5, 5, 5, 5, 5, 5, 2.5]),
        uneven: false,
      },
    });
    expect(result?.loading).not.toHaveProperty("heavier");
    expect(response.leftover).toEqual({
      plates: { "ql-22.5": 1, "ql-5": 0, "ql-2.5": 0, "ql-micro": 4 },
      hardware: { "screw-standard": 4, "screw-long": 1, "collar-spinlock": 2, "collar-clamp": 4 },
    });
  });
});

describe("dumbbells Load: pair or one (spec 6.2)", () => {
  it("means a pair unless the request asks for one, and a pair uses twice the plates and screws of one dumbbell", () => {
    const pair = loadDumbbells("40");
    const one = loadDumbbells("40", { pair: false });
    expect(pair.results[0]?.loading).toEqual(one.results[0]?.loading);
    expect(pair.leftover.plates["ql-5"]).toBe(12);
    expect(one.leftover.plates["ql-5"]).toBe(18);
    expect(pair.leftover.hardware["screw-standard"]).toBe(0);
    expect(one.leftover.hardware["screw-standard"]).toBe(2);
  });

  it("gives both dumbbells in a pair a loading the pool can hold twice", () => {
    const [pair] = loadDumbbells("120").results;
    const [one] = loadDumbbells("120", { pair: false }).results;
    expect(pair?.loading?.positions).toEqual(ends([22.5, 5, 5, 5, 5, 5, 5, 2.5]));
    expect(one?.loading?.positions).toEqual(ends([22.5, 22.5, 5, 5]));
  });
});

describe("dumbbells Load: locking screws (spec 6.2)", () => {
  it("uses standard screws up to 75 lb per dumbbell and long screws above", () => {
    const [at75] = loadDumbbells("75").results;
    expect(at75?.loading).toMatchObject({ hardware: [{ id: "screw-standard", count: 2 }], positions: ends([22.5, 5, 5]) });
    expect(at75?.unverified).toEqual([]);

    const [at77point5] = loadDumbbells("77.5").results;
    expect(at77point5?.loading).toMatchObject({ hardware: [{ id: "screw-long", count: 2 }], positions: ends([22.5, 5, 5, 1.25]) });
  });

  it("flags the long screw's shortest stack as unverified when it uses long screws", () => {
    expect(loadDumbbells("120").results[0]?.unverified).toEqual(["screw-long.minStackIn"]);
    expect(loadDumbbells("40").results[0]?.unverified).toEqual([]);
  });

  it("puts at least the long screw's shortest stack on each end, using a measured value when there is one", () => {
    expect(loadDumbbells("80", { pair: false }).results[0]?.loading?.positions).toEqual(ends([22.5, 5, 5, 2.5]));

    const longerStack = changed((copy) => {
      byId(copy.hardware, "screw-long").minStackIn = { listed: 3, measured: 3.5, status: "owner" };
    });
    const [result] = loadDumbbells("80", { pair: false, inventory: longerStack }).results;
    expect(result?.loading?.positions).toEqual(ends([5, 5, 5, 5, 5, 5, 5]));
    expect(result?.unverified).toEqual([]);
  });

  it("fits the plates on each end within the screw's capacity", () => {
    const shortStandard = changed((copy) => {
      byId(copy.hardware, "screw-standard").capacityIn = 1;
    });
    const [result] = loadDumbbells("40", { inventory: shortStandard }).results;
    expect(result).toMatchObject({ exact: false, below: { total: { lb: 30 }, positions: ends([5, 5]) } });
  });
});

describe("dumbbells Load: uneven ends (spec 6.2)", () => {
  it("lets the ends differ by at most 2.5 lb", () => {
    const [result] = loadDumbbells("15", { pair: false }).results;
    expect(result?.loading).toMatchObject({ positions: ends([2.5]), uneven: false });
  });

  it("lets the ends differ by 5 lb when no 2.5 lb or micro plate is free, and says why", () => {
    const noSmallPlates = changed((copy) => {
      byId(copy.plates, "ql-2.5").count = 0;
      byId(copy.plates, "ql-micro").count = 0;
    });
    const [result] = loadDumbbells("15", { pair: false, inventory: noSmallPlates }).results;
    expect(result).toMatchObject({
      exact: true,
      loading: { positions: ends([5], []), uneven: true, heavier: "end-a" },
      warnings: ["The ends differ by 5 lb because no 2.5 lb or micro plate is free."],
    });
  });

  it("keeps to 2.5 lb while a micro plate is free", () => {
    const oneMicro = changed((copy) => {
      byId(copy.plates, "ql-2.5").count = 0;
      byId(copy.plates, "ql-micro").count = 1;
    });
    const [result] = loadDumbbells("15", { pair: false, inventory: oneMicro }).results;
    expect(result?.exact).toBe(false);
    expect(result?.warnings).toEqual([]);
  });

  it("counts a small plate as free for a pair only when there is one for each dumbbell", () => {
    const oneSmallPlate = changed((copy) => {
      byId(copy.plates, "ql-2.5").count = 1;
      byId(copy.plates, "ql-micro").count = 0;
    });
    const [result] = loadDumbbells("15", { inventory: oneSmallPlate }).results;
    expect(result).toMatchObject({ exact: true, loading: { positions: ends([5], []), uneven: true } });
  });

  it("follows the impossible-target rule for a target that needs uneven ends when uneven loading is off", () => {
    expect(loadDumbbells("11.25", { pair: false }).results[0]?.loading).toMatchObject({ positions: ends([1.25], []), uneven: true });

    const [result] = loadDumbbells("11.25", { pair: false, uneven: false }).results;
    expect(result).toMatchObject({
      exact: false,
      recommended: "below",
      below: { total: { lb: 10 }, positions: ends([]), uneven: false },
      above: { total: { lb: 12.5 }, positions: ends([1.25]), uneven: false },
    });
    expect(result?.loading).toBeUndefined();
  });

  it("puts at most one micro plate on an end", () => {
    const microsOnly = changed((copy) => {
      byId(copy.plates, "ql-2.5").count = 0;
    });
    const [result] = loadDumbbells("15", { pair: false, uneven: false, inventory: microsOnly }).results;
    expect(result).toMatchObject({ exact: false, below: { total: { lb: 12.5 }, positions: ends([1.25]) }, above: { total: { lb: 20 } } });
  });
});

describe("dumbbells Load: the bare handle and the limit (spec 4.3, 6.2)", () => {
  it("counts a handle with no screws and no plates as a valid loading of 5 lb", () => {
    const response = loadDumbbells("5");
    expect(response.results[0]).toMatchObject({ exact: true, loading: { total: { lb: 5 }, hardware: [], positions: ends([]), uneven: false } });
    expect(response.leftover.hardware).toMatchObject({ "screw-standard": 4, "screw-long": 5 });
  });

  it("recommends the nearer of the bare handle and the handle with screws for a target between them", () => {
    expect(loadDumbbells("7").results[0]).toMatchObject({
      recommended: "below",
      below: { total: { lb: 5 }, hardware: [] },
      above: { total: { lb: 10 }, hardware: [{ id: "screw-standard", count: 2 }], positions: ends([]) },
    });
  });

  it("refuses a target above 120 lb per dumbbell, stating the limit and showing the heaviest allowed loading", () => {
    const [result] = loadDumbbells("130").results;
    expect(result).toMatchObject({
      exact: false,
      refused: { limit: { lb: 120, kg: 54.4 } },
      recommended: "below",
      below: { total: { lb: 120 }, positions: ends([22.5, 5, 5, 5, 5, 5, 5, 2.5]) },
      warnings: ["Refused: over the 120 lb limit per dumbbell. Heaviest allowed: 120 lb (54.4 kg)."],
    });
    expect(result?.above).toBeUndefined();
    expect(loadDumbbells("120.5").results[0]?.refused).toBeDefined();
    expect(loadDumbbells("120").results[0]?.refused).toBeUndefined();
  });
});

describe("dumbbells Load: rules that hold for every target", () => {
  const targets = Array.from({ length: (130 - 5) * 4 + 1 }, (_, i) => String(5 + i / 4));
  const stackLength = new Map(inventory.plates.map((plate) => [plate.weight.listed, plate.stackLengthIn?.listed ?? 0]));
  const count = new Map(inventory.plates.filter((plate) => plate.type === "quick-lock").map((plate) => [plate.weight.listed, plate.count]));
  const sum = (plates: number[], of: (plate: number) => number = (plate) => plate) => plates.reduce((total, plate) => total + of(plate), 0);

  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])("pair %s, uneven %s", (pair, uneven) => {
    const dumbbells = pair ? 2 : 1;
    for (const target of targets) {
      const [result] = loadDumbbells(target, { pair, uneven }).results;
      const loadings = [result!.loading, result!.below, result!.above].filter((loading) => loading !== undefined);
      expect(loadings.length, target).toBeGreaterThan(0);
      for (const loading of loadings) {
        const [endA, endB] = loading.positions.map((position) => position.plates) as [number[], number[]];
        const difference = sum(endA) - sum(endB);
        expect(difference, target).toBeGreaterThanOrEqual(0);
        expect(difference, target).toBeLessThanOrEqual(uneven ? 2.5 : 0);
        expect(loading.uneven, target).toBe(difference > 0);
        expect(loading.total.lb, target).toBeLessThanOrEqual(120);

        const [screw] = loading.hardware;
        if (!screw) {
          expect(loading.total.lb, target).toBe(5);
          continue;
        }
        expect(screw, target).toEqual({ id: loading.total.lb <= 75 ? "screw-standard" : "screw-long", count: 2 });
        expect(loading.total.lb, target).toBe(10 + sum(endA) + sum(endB));
        for (const end of [endA, endB]) {
          expect(end, target).toEqual([...end].sort((a, b) => b - a));
          expect(end.filter((plate) => plate === 1.25).length, target).toBeLessThanOrEqual(1);
          const length = sum(end, (plate) => stackLength.get(plate)!);
          expect(length, target).toBeLessThanOrEqual(screw.id === "screw-long" ? 5.125 : 3.25);
          if (screw.id === "screw-long") expect(length, target).toBeGreaterThanOrEqual(3);
        }
        for (const [weight, available] of count) {
          const used = [...endA, ...endB].filter((plate) => plate === weight).length * dumbbells;
          expect(used, target).toBeLessThanOrEqual(available);
        }
      }
    }
  });
});
