import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, RequestError, type CollarChoice, type Inventory } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

function loadBarbell(target: string, options: { collars?: CollarChoice; inventory?: Inventory } = {}) {
  const request = {
    targets: [{ implement: "barbell", target }],
    ...(options.collars ? { collars: options.collars } : {}),
  };
  const [result] = load(options.inventory ?? inventory, request).results;
  return result!;
}

function changed(edit: (copy: Inventory) => void): Inventory {
  const copy = structuredClone(inventory);
  edit(copy);
  return copy;
}

const byId = <T extends { id: string }>(list: T[], id: string) => list.find((item) => item.id === id)!;

const eachSide = (...plates: number[]) => [
  { name: "left", plates },
  { name: "right", plates },
];

describe("barbell Load: worked examples (spec section 7)", () => {
  it("example 2: 173 lb is exact with 2 × 22.5, 6 × 5, 1 × 2.5 on each side", () => {
    const result = loadBarbell("173");
    expect(result.exact).toBe(true);
    expect(result.loading).toEqual({
      total: { lb: 173, kg: 78.5 },
      hardware: [{ id: "collar-clamp", count: 2 }],
      positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5),
      uneven: false,
    });
  });

  it("example 1: 175 lb is not exact; below is 173 lb, above is 175.5 lb with a micro plate, and above is recommended", () => {
    const result = loadBarbell("175");
    expect(result).toMatchObject({
      implement: "barbell",
      target: { lb: 175, kg: 79.4 },
      exact: false,
      recommended: "above",
      below: {
        total: { lb: 173, kg: 78.5 },
        hardware: [{ id: "collar-clamp", count: 2 }],
        positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5),
        uneven: false,
      },
      above: {
        total: { lb: 175.5, kg: 79.6 },
        hardware: [{ id: "collar-clamp", count: 2 }],
        positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25),
        uneven: false,
      },
    });
    expect(result.loading).toBeUndefined();
  });

  it("example 3: 230 lb is refused over the 210 lb plate limit, showing the heaviest allowed loading of 228 lb", () => {
    const result = loadBarbell("230");
    expect(result).toMatchObject({
      exact: false,
      refused: { limit: { lb: 210, kg: 95.3 } },
      recommended: "below",
      below: {
        total: { lb: 228, kg: 103.4 },
        positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5),
      },
    });
    expect(result.above).toBeUndefined();
    expect(result.warnings).toEqual(["Refused: over the 210 lb plate limit. Heaviest allowed: 228 lb (103.4 kg)."]);
  });

  it("refuses any target that needs more than 210 lb of plates, and accepts one that needs exactly 210 lb", () => {
    expect(loadBarbell("228.5").refused).toEqual({ limit: { lb: 210, kg: 95.3 } });
    expect(loadBarbell("228").refused).toBeUndefined();
  });
});

describe("barbell Load: targets (spec 6.1 rules 1 and 4)", () => {
  it("reads a bare number as pounds and accepts an lb suffix", () => {
    expect(loadBarbell("175").target).toEqual({ lb: 175, kg: 79.4 });
    expect(loadBarbell("175lb").target).toEqual({ lb: 175, kg: 79.4 });
    expect(loadBarbell("175 LB").target).toEqual({ lb: 175, kg: 79.4 });
  });

  it("converts a target in kilograms to pounds", () => {
    const result = loadBarbell("80kg");
    expect(result.target).toEqual({ lb: 176.37, kg: 80 });
    expect(result.below?.total).toEqual({ lb: 175.5, kg: 79.6 });
    expect(result.above?.total).toEqual({ lb: 178, kg: 80.7 });
    expect(result.recommended).toBe("below");
  });

  it("treats the target as a total that includes the bar, so 18 lb is the empty bar", () => {
    const result = loadBarbell("18");
    expect(result.exact).toBe(true);
    expect(result.loading?.positions).toEqual(eachSide());
  });

  it("recommends the empty bar for a target below the bar's weight", () => {
    const result = loadBarbell("10");
    expect(result).toMatchObject({ exact: false, recommended: "above", above: { total: { lb: 18, kg: 8.2 } } });
    expect(result.below).toBeUndefined();
  });

  it("recommends the lower loading when below and above are equally near", () => {
    expect(loadBarbell("174.25")).toMatchObject({ recommended: "below", below: { total: { lb: 173 } }, above: { total: { lb: 175.5 } } });
  });

  it.each(["", "abc", "-5", "0", "175 stone", "17 5"])("rejects %j as a target", (target) => {
    expect(() => loadBarbell(target)).toThrow(RequestError);
  });
});

describe("barbell Load: weights (spec 6.1 rules 2, 3 and 5)", () => {
  it("uses a measured bar weight in place of the listed one", () => {
    const measuredBar = changed((copy) => {
      byId(copy.implements, "barbell").base = { listed: 18, measured: 20, status: "owner" };
    });
    const result = loadBarbell("175", { inventory: measuredBar });
    expect(result.exact).toBe(true);
    expect(result.loading?.positions).toEqual(eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5));
    expect(result.unverified).toEqual(["collar-clamp.weight"]);
  });

  it("counts both collars' weight in the total", () => {
    const heavyCollars = changed((copy) => {
      byId(copy.hardware, "collar-clamp").weight = { listed: 0, measured: 0.5, status: "owner" };
    });
    const result = loadBarbell("174", { inventory: heavyCollars });
    expect(result.exact).toBe(true);
    expect(result.loading?.positions).toEqual(eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5));
  });

  it("adds weights in whole thousandths, so sums that drift in floating point stay exact", () => {
    const oddWeights = changed((copy) => {
      byId(copy.implements, "barbell").base = { listed: 18, measured: 18.1, status: "owner" };
      byId(copy.plates, "ql-micro").weight = { listed: 1.25, measured: 1.1, status: "owner" };
    });
    const result = loadBarbell("20.3", { inventory: oddWeights });
    expect(result.exact).toBe(true);
    expect(result.loading).toMatchObject({ total: { lb: 20.3, kg: 9.2 }, positions: eachSide(1.1) });
  });

  it("shows pounds to two decimals and kilograms to one", () => {
    const measuredBar = changed((copy) => {
      byId(copy.implements, "barbell").base = { listed: 18, measured: 18.126, status: "owner" };
    });
    expect(loadBarbell("18.126", { inventory: measuredBar }).loading?.total).toEqual({ lb: 18.13, kg: 8.2 });
  });

  it.each([
    ["clamp", ["barbell.base", "collar-clamp.weight"]],
    ["spinlock", ["barbell.base", "collar-spinlock.weight"]],
    ["none", ["barbell.base"]],
  ] as const)("names the unverified values it used with %s collars", (collars, unverified) => {
    expect(loadBarbell("175", { collars }).unverified).toEqual(unverified);
  });
});

describe("barbell Load: collars and fit (spec 6.2, 4.3 notes)", () => {
  it("uses clamp collars unless asked otherwise", () => {
    expect(loadBarbell("173").loading?.hardware).toEqual([{ id: "collar-clamp", count: 2 }]);
    expect(loadBarbell("173", { collars: "spinlock" }).loading?.hardware).toEqual([{ id: "collar-spinlock", count: 2 }]);
    expect(loadBarbell("173", { collars: "none" }).loading?.hardware).toEqual([]);
  });

  it("fits the plates and the collar within the length of a side", () => {
    const shortBar = changed((copy) => {
      byId(copy.implements, "barbell").positionLengthIn = { listed: 3.26, status: "verified" };
    });
    const clamp = loadBarbell("68", { inventory: shortBar });
    expect(clamp.exact).toBe(false);
    expect(clamp.below?.positions).toEqual(eachSide(22.5));
    expect(clamp.above).toBeUndefined();

    const spinLock = loadBarbell("68", { inventory: shortBar, collars: "spinlock" });
    expect(spinLock.exact).toBe(true);
    expect(spinLock.loading?.positions).toEqual(eachSide(22.5, 2.5));
  });

  it("puts at most one micro plate on a side", () => {
    const no2point5 = changed((copy) => {
      byId(copy.plates, "ql-2.5").count = 0;
    });
    const result = loadBarbell("23", { inventory: no2point5 });
    expect(result).toMatchObject({
      exact: false,
      below: { total: { lb: 20.5 }, positions: eachSide(1.25) },
      above: { total: { lb: 28 }, positions: eachSide(5) },
    });
  });
});

describe("barbell Load: the plate pool (spec 6.1 rule 6)", () => {
  it("uses no more plates than the pool holds", () => {
    const twoPlates = changed((copy) => {
      for (const plate of copy.plates) plate.count = plate.id === "ql-5" ? 2 : 0;
    });
    const result = loadBarbell("38", { inventory: twoPlates });
    expect(result).toMatchObject({ exact: false, recommended: "below", below: { total: { lb: 28 } } });
    expect(result.above).toBeUndefined();
  });

  it("gives no loading when the pool holds too few collars, and says why", () => {
    const oneSpinLock = changed((copy) => {
      byId(copy.hardware, "collar-spinlock").count = 1;
    });
    const result = loadBarbell("173", { inventory: oneSpinLock, collars: "spinlock" });
    expect(result).toMatchObject({ exact: false });
    expect(result.below).toBeUndefined();
    expect(result.above).toBeUndefined();
    expect(result.warnings).toEqual(["The plate pool holds 1 Ironmaster spin-lock collar. The straight bar needs 2."]);
  });

  it("reports the plates and locking hardware left over after the recommended loading", () => {
    expect(load(inventory, { targets: [{ implement: "barbell", target: "175" }] }).leftover).toEqual({
      plates: { "ql-22.5": 1, "ql-5": 12, "ql-2.5": 2, "ql-micro": 2 },
      hardware: { "screw-standard": 4, "screw-long": 5, "collar-clamp": 2, "collar-spinlock": 2 },
    });
  });
});

describe("barbell Load: rules that hold for every target", () => {
  const targets = Array.from({ length: (250 - 5) * 4 + 1 }, (_, i) => String(5 + i / 4));

  it.each(["clamp", "spinlock", "none"] as const)("with %s collars", (collars) => {
    const pool = new Map(
      inventory.plates.filter((plate) => plate.type === "quick-lock").map((plate) => [plate.weight.listed, plate.count]),
    );
    for (const target of targets) {
      const result = loadBarbell(target, { collars });
      const loadings = [result.loading, result.below, result.above].filter((loading) => loading !== undefined);
      expect(loadings.length, target).toBeGreaterThan(0);
      for (const loading of loadings) {
        const [left, right] = loading.positions;
        expect(right!.plates, target).toEqual(left!.plates);
        const side = left!.plates;
        expect(side, target).toEqual([...side].sort((a, b) => b - a));
        expect(side.filter((plate) => plate === 1.25).length, target).toBeLessThanOrEqual(1);
        expect(side.reduce((sum, plate) => sum + plate, 0) * 2, target).toBeLessThanOrEqual(210);
        for (const [weight, count] of pool) {
          expect(side.filter((plate) => plate === weight).length * 2, target).toBeLessThanOrEqual(count);
        }
      }
    }
  });
});

describe("barbell Load: the JSON shape in spec section 9", () => {
  it("matches the spec's example for 175 lb", () => {
    const side = [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5];
    expect(load(inventory, { targets: [{ implement: "barbell", target: "175" }] })).toStrictEqual({
      results: [
        {
          implement: "barbell",
          target: { lb: 175, kg: 79.4 },
          exact: false,
          recommended: "above",
          below: {
            total: { lb: 173, kg: 78.5 },
            hardware: [{ id: "collar-clamp", count: 2 }],
            positions: eachSide(...side),
            uneven: false,
          },
          above: {
            total: { lb: 175.5, kg: 79.6 },
            hardware: [{ id: "collar-clamp", count: 2 }],
            positions: eachSide(...side, 1.25),
            uneven: false,
          },
          alternatives: [],
          warnings: [],
          unverified: ["barbell.base", "collar-clamp.weight"],
        },
      ],
      leftover: {
        plates: { "ql-22.5": 1, "ql-5": 12, "ql-2.5": 2, "ql-micro": 2 },
        hardware: { "screw-standard": 4, "screw-long": 5, "collar-clamp": 2, "collar-spinlock": 2 },
      },
    });
  });
});
