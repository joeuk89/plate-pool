import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { list, load, RequestError, step, type Inventory, type ListRequest } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

const totals = (response: ReturnType<typeof list>) => response.rows.map((row) => row.total.lb);

describe("List (spec 6.5)", () => {
  it("returns every achievable barbell total within the range, in ascending order", () => {
    const response = list(inventory, { implement: "barbell", from: "100", to: "110" });
    expect(response.implement).toBe("barbell");
    expect(totals(response)).toEqual([100.5, 103, 105.5, 108]);
  });

  it("gives each row the recommended loading and flags (examples 1 and 2)", () => {
    const [exact, withMicro] = list(inventory, { implement: "barbell", from: "173", to: "175.5" }).rows;
    const side = [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5];
    expect(exact).toEqual({
      total: { lb: 173, kg: 78.5 },
      loading: {
        total: { lb: 173, kg: 78.5 },
        hardware: [{ id: "collar-clamp", count: 2 }],
        positions: [
          { name: "left", plates: side },
          { name: "right", plates: side },
        ],
        uneven: false,
      },
      uneven: false,
      micro: false,
    });
    expect(withMicro).toMatchObject({ total: { lb: 175.5 }, uneven: false, micro: true });
    expect(withMicro?.loading.positions[0]?.plates).toEqual([...side, 1.25]);
  });

  it("flags an uneven dumbbell and names the screw kind (examples 5 and 7)", () => {
    const [single] = list(inventory, { implement: "dumbbell", pair: false, from: "12.5", to: "12.5" }).rows;
    expect(single).toMatchObject({ total: { lb: 12.5 }, uneven: true, micro: false, screw: "screw-standard" });
    expect(single?.loading.heavier).toBe("end-a");

    const [heaviest] = list(inventory, { implement: "dumbbell", from: "120", to: "120" }).rows;
    expect(heaviest).toMatchObject({ total: { lb: 120 }, uneven: false, screw: "screw-long" });
  });

  it("lists the vest in kilograms, one row per block count", () => {
    const response = list(inventory, { implement: "vest" });
    expect(response.rows.map((row) => row.total.kg)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(response.rows[11]?.loading.positions.map((position) => position.plates.length)).toEqual([6, 6]);
  });

  it("covers each implement's full range when no range is given", () => {
    const ends = (request: ListRequest) => {
      const all = totals(list(inventory, request));
      return [all[0], all.at(-1)];
    };
    expect(ends({ implement: "barbell" })).toEqual([18, 228]);
    expect(ends({ implement: "dumbbell" })).toEqual([5, 120]);
    expect(ends({ implement: "dumbbell", pair: false })).toEqual([5, 120]);
    expect(ends({ implement: "kettlebell" })).toEqual([22.5, 80]);
    expect(ends({ implement: "leg" })).toEqual([1.25, 100]);
  });

  it("loads the barbell with the chosen collars", () => {
    const heavyCollars = structuredClone(inventory);
    heavyCollars.hardware.find((item) => item.id === "collar-spinlock")!.weight.listed = 1;
    const spinlock = list(heavyCollars, { implement: "barbell", collars: "spinlock", from: "18", to: "23" });
    expect(totals(spinlock)).toEqual([20, 22.5]);
    expect(spinlock.rows[0]?.loading.hardware).toEqual([{ id: "collar-spinlock", count: 2 }]);

    const none = list(heavyCollars, { implement: "barbell", collars: "none", from: "18", to: "18" });
    expect(none.rows[0]?.loading.hardware).toEqual([]);
  });

  it("leaves out the totals that need uneven dumbbells when uneven loading is off", () => {
    expect(totals(list(inventory, { implement: "dumbbell", pair: false, from: "10", to: "12.5" }))).toEqual([10, 11.25, 12.5]);

    const even = list(inventory, { implement: "dumbbell", pair: false, uneven: false, from: "10", to: "12.5" });
    expect(totals(even)).toEqual([10, 12.5]);
    expect(even.rows[1]).toMatchObject({ uneven: false, micro: true });
  });

  it("accepts 0 as the start of the range, and leaves out an empty leg attachment because Load takes no 0 target", () => {
    expect(totals(list(inventory, { implement: "leg", from: "0", to: "2.5" }))).toEqual([1.25, 2.5]);
  });

  it("refuses a range whose start is above its end, an unknown implement, and a range that is not a weight", () => {
    expect(() => list(inventory, { implement: "barbell", from: "200", to: "100" })).toThrow(RequestError);
    expect(() => list(inventory, { implement: "rack" })).toThrow(RequestError);
    expect(() => list(inventory, { implement: "barbell", to: "heavy" })).toThrow(RequestError);
  });

  it("names the unverified values its rows use (spec 6.1)", () => {
    expect(list(inventory, { implement: "barbell", from: "100", to: "110" }).unverified).toEqual(["barbell.base", "collar-clamp.weight"]);
    expect(list(inventory, { implement: "vest", to: "2" }).unverified).toEqual(["vest.base", "vest-block.count"]);
  });

  it("carries the leg attachment's fixed note (spec 6.2)", () => {
    expect(list(inventory, { implement: "leg", to: "10" }).warnings).toEqual([
      "Plate weight only. The lever changes the resistance you feel.",
    ]);
    expect(list(inventory, { implement: "barbell", to: "30" }).warnings).toEqual([]);
  });

  it("accepts a range in the other unit", () => {
    expect(totals(list(inventory, { implement: "barbell", from: "45kg", to: "47kg" }))).toEqual([100.5, 103]);
  });
});

describe("List: every row, passed to Load as a target, returns an exact result (spec section 7 properties)", () => {
  const requests: ListRequest[] = [
    { implement: "barbell" },
    { implement: "barbell", collars: "spinlock" },
    { implement: "barbell", collars: "none" },
    { implement: "dumbbell" },
    { implement: "dumbbell", pair: false },
    { implement: "dumbbell", uneven: false },
    { implement: "dumbbell", pair: false, uneven: false },
    { implement: "kettlebell" },
    { implement: "leg" },
    { implement: "vest" },
  ];

  it.each(requests)("%o", (request) => {
    const { rows } = list(inventory, request);
    const unit = inventory.implements.find((implement) => implement.id === request.implement)!.unit;
    expect(rows.length).toBeGreaterThan(0);
    for (const [i, row] of rows.entries()) {
      if (i > 0) expect(row.total[unit]).toBeGreaterThan(rows[i - 1]!.total[unit]);
      const [result] = load(inventory, {
        targets: [{ implement: request.implement, target: `${row.total[unit]}${unit}`, ...(request.pair === undefined ? {} : { pair: request.pair }) }],
        ...(request.collars === undefined ? {} : { collars: request.collars }),
        ...(request.uneven === undefined ? {} : { uneven: request.uneven }),
      }).results;
      expect(result?.exact).toBe(true);
      expect(result?.loading).toEqual(row.loading);
    }
  });
});

describe("step: the next achievable weight up or down (spec 8.2)", () => {
  const lb = (weight: { lb: number } | undefined) => weight?.lb;

  it("moves from an achievable barbell weight to its neighbours", () => {
    expect(lb(step(inventory, { implement: "barbell", target: "173" }, "up"))).toBe(175.5);
    expect(lb(step(inventory, { implement: "barbell", target: "173" }, "down"))).toBe(170.5);
  });

  it("moves from a target no loading reaches to the nearest achievable weight in that direction (example 1)", () => {
    expect(lb(step(inventory, { implement: "barbell", target: "175" }, "up"))).toBe(175.5);
    expect(lb(step(inventory, { implement: "barbell", target: "175" }, "down"))).toBe(173);
    expect(lb(step(inventory, { implement: "barbell", target: "79kg" }, "up"))).toBe(175.5);
  });

  it("starts from the lightest weight when there is no target, and stops at the ends of the range", () => {
    expect(lb(step(inventory, { implement: "barbell" }, "up"))).toBe(18);
    expect(step(inventory, { implement: "barbell" }, "down")).toBeUndefined();
    expect(step(inventory, { implement: "barbell", target: "18" }, "down")).toBeUndefined();
    expect(step(inventory, { implement: "barbell", target: "228" }, "up")).toBeUndefined();
    expect(lb(step(inventory, { implement: "barbell", target: "230" }, "down"))).toBe(228);
  });

  it("follows the same options as Load", () => {
    expect(lb(step(inventory, { implement: "dumbbell", pair: false, target: "10" }, "up"))).toBe(11.25);
    expect(lb(step(inventory, { implement: "dumbbell", pair: false, uneven: false, target: "10" }, "up"))).toBe(12.5);
    expect(step(inventory, { implement: "vest", target: "12" }, "up")?.kg).toBe(13);
  });
});
