import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, reverse, type CurrentLoading, type Inventory, type Loading, type LoadRequest, type LoadResult, type ReverseRequest } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

const eachSide = (...plates: number[]) => [
  { name: "left", plates },
  { name: "right", plates },
];

function range(from: number, to: number, step: number): string[] {
  return Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => `${from + i * step}`);
}

const sweeps: { implement: string; pair?: { pair: boolean }; targets: string[]; currents: string[] }[] = [
  { implement: "barbell", targets: range(18, 230, 2.5), currents: ["18", "88", "173", "175.5"] },
  { implement: "dumbbell", targets: range(5, 125, 2.5), currents: ["7.5", "40", "70", "120"] },
  { implement: "dumbbell", pair: { pair: false }, targets: range(5, 125, 2.5), currents: ["7.5", "12.5", "47.5", "120"] },
  { implement: "kettlebell", targets: range(22.5, 85, 1.25), currents: ["22.5", "35", "80"] },
  { implement: "leg", targets: range(1.25, 105, 2.5), currents: ["10", "50"] },
  { implement: "vest", targets: range(1, 31, 1), currents: ["0.5", "9", "30"] },
];

function loadingsOf(result: LoadResult): Loading[] {
  return [result.loading, result.below, result.above, ...result.alternatives].filter((loading) => loading !== undefined);
}

const screwsOf: Record<string, ReverseRequest["screws"]> = { "screw-standard": "standard", "screw-long": "long" };

function reverseRequestFor(result: LoadResult, loading: Loading): ReverseRequest {
  const [hardware] = loading.hardware;
  return {
    implement: result.implement,
    ...(result.pair !== undefined ? { pair: result.pair } : {}),
    positions: loading.positions,
    ...(result.implement === "dumbbell" || result.implement === "kettlebell"
      ? { screws: hardware ? screwsOf[hardware.id]! : "none" }
      : {}),
    ...(result.implement === "dumbbell" && hardware?.count === 1 ? { screwOn: loading.heavier! } : {}),
  };
}

function* withCurrent(): Generator<{ result: LoadResult; loading: Loading; current: CurrentLoading }> {
  for (const { implement, pair, targets, currents } of sweeps) {
    for (const from of currents) {
      const [start] = load(inventory, { targets: [{ implement, target: from, ...pair }] }).results;
      const startLoading = start!.loading ?? start![start!.recommended!]!;
      const { implement: _, ...current } = reverseRequestFor(start!, startLoading);
      for (const target of targets) {
        const [result] = load(inventory, { targets: [{ implement, target, ...pair, current }] }).results;
        for (const loading of loadingsOf(result!)) yield { result: result!, loading, current };
      }
    }
  }
}

function loadFrom(implement: string, target: string, current: CurrentLoading, extra: Partial<LoadRequest> = {}) {
  const [result] = load(inventory, { targets: [{ implement, target, current }], ...extra }).results;
  return result!;
}

describe("Load with a current loading: worked examples (spec section 16.6)", () => {
  it("example 16: barbell 88 lb (7 × 5 per side) to 98 lb puts on 1 × 5 per side, 2 changes", () => {
    const result = loadFrom("barbell", "98", { positions: eachSide(5, 5, 5, 5, 5, 5, 5) });
    expect(result.exact).toBe(true);
    expect(result.loading).toMatchObject({
      total: { lb: 98 },
      positions: eachSide(5, 5, 5, 5, 5, 5, 5, 5),
      changes: {
        count: 2,
        positions: [
          { name: "left", keep: [5, 5, 5, 5, 5, 5, 5], remove: [], add: [5] },
          { name: "right", keep: [5, 5, 5, 5, 5, 5, 5], remove: [], add: [5] },
        ],
        hardware: [],
      },
    });
  });

  it("example 17: barbell 68 lb (5 × 5 per side) to 113 lb puts on 1 × 22.5 per side outside the 5s, 2 changes", () => {
    const result = loadFrom("barbell", "113", { positions: eachSide(5, 5, 5, 5, 5) });
    expect(result.exact).toBe(true);
    expect(result.loading).toMatchObject({
      total: { lb: 113 },
      positions: eachSide(5, 5, 5, 5, 5, 22.5),
      changes: { count: 2 },
    });
    expect(result.loading!.changes!.positions[0]).toEqual({ name: "left", keep: [5, 5, 5, 5, 5], remove: [], add: [22.5] });
  });

  it("example 18: barbell 173 lb to 175 lb recommends 175.5 lb (1 micro per side, 2 changes) over 173 lb (0 changes)", () => {
    const result = loadFrom("barbell", "175", { positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5) });
    expect(result.exact).toBe(false);
    expect(result.recommended).toBe("above");
    expect(result.below).toMatchObject({
      total: { lb: 173 },
      positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5),
      changes: { count: 0 },
    });
    expect(result.below!.changes!.positions.every(({ remove, add }) => remove.length === 0 && add.length === 0)).toBe(true);
    expect(result.above).toMatchObject({
      total: { lb: 175.5 },
      positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25),
      changes: { count: 2 },
    });
  });

  it("example 19: dumbbells 70 lb pair to 80 lb swaps to long screws and puts on 1 × 5 per end outside the 2.5, 12 changes", () => {
    const result = loadFrom("dumbbell", "80", {
      positions: [
        { name: "end-a", plates: [22.5, 5, 2.5] },
        { name: "end-b", plates: [22.5, 5, 2.5] },
      ],
      screws: "standard",
    });
    expect(result.exact).toBe(true);
    expect(result.loading).toMatchObject({
      total: { lb: 80 },
      hardware: [{ id: "screw-long", count: 2 }],
      positions: [
        { name: "end-a", plates: [22.5, 5, 2.5, 5] },
        { name: "end-b", plates: [22.5, 5, 2.5, 5] },
      ],
      changes: {
        count: 12,
        positions: [
          { name: "end-a", keep: [22.5, 5, 2.5], remove: [], add: [5] },
          { name: "end-b", keep: [22.5, 5, 2.5], remove: [], add: [5] },
        ],
        hardware: [{ from: "screw-standard", to: "screw-long", count: 2 }],
      },
    });
  });

  it("example 20: with no current loading there is no changes block and the result is identical to version 1", () => {
    const requests: LoadRequest[] = [
      { targets: [{ implement: "barbell", target: "175" }] },
      { targets: [{ implement: "dumbbell", target: "80" }] },
      { targets: [{ implement: "kettlebell", target: "40" }] },
      { targets: [{ implement: "vest", target: "13" }] },
    ];
    for (const request of requests) {
      const [result] = load(inventory, request).results;
      for (const loading of [result!.loading, result!.below, result!.above, ...result!.alternatives]) {
        expect(loading?.changes).toBeUndefined();
      }
    }
  });
});

describe("Load with a current loading: properties (spec 16.6)", () => {
  it("with no current loading, every result equals the version 1 result and carries no changes block", () => {
    for (const { implement, pair, targets } of sweeps) {
      for (const target of targets) {
        const fresh = load(inventory, { targets: [{ implement, target, ...pair }] });
        for (const loading of loadingsOf(fresh.results[0]!)) expect(loading.changes).toBeUndefined();
      }
    }
  });

  it("Reverse of a loading with changes returns the same total as the loading", () => {
    let checked = 0;
    for (const { result, loading } of withCurrent()) {
      const reversed = reverse(inventory, reverseRequestFor(result, loading));
      expect(reversed.total, JSON.stringify(loading)).toEqual(loading.total);
      expect(reversed.hardware).toEqual(loading.hardware);
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("changes equal plates taken off plus plates put on plus screw changes, and never count a kept plate", () => {
    for (const { result, loading, current } of withCurrent()) {
      const changes = loading.changes!;
      const label = JSON.stringify({ current, loading });
      changes.positions.forEach(({ name, keep, remove, add }, i) => {
        const now = current.positions.find((position) => position.name === name)?.plates ?? [];
        expect(loading.positions[i]!.plates, label).toEqual([...keep, ...add]);
        expect(now, label).toEqual([...keep, ...remove]);
        if (remove.length > 0 && add.length > 0) expect(remove[0], label).not.toBe(add[0]);
      });
      const plates = changes.positions.reduce((sum, { remove, add }) => sum + remove.length + add.length, 0);
      const screws = changes.hardware.reduce((sum, { from, to, count }) => sum + count * (from && to ? 2 : 1), 0);
      const copies = result.implement === "dumbbell" && result.pair ? 2 : 1;
      expect(changes.count, label).toBe(copies * (plates + screws));
    }
  });
});

describe("Load with a current loading: rules (spec 16.3)", () => {
  it("keeps the shared innermost run and takes off everything outside it", () => {
    const kept = loadFrom("barbell", "73", { positions: eachSide(5, 22.5) });
    expect(kept.loading).toMatchObject({ positions: eachSide(5, 22.5), changes: { count: 0 } });

    const stripped = loadFrom("barbell", "68", { positions: eachSide(22.5, 2.5, 5) });
    expect(stripped.loading!.positions).toEqual(eachSide(22.5, 2.5));
    expect(stripped.loading!.changes!.positions[0]).toEqual({ name: "left", keep: [22.5, 2.5], remove: [5], add: [] });
  });

  it("puts added plates on outside the kept plates, heaviest first, micro plate outermost", () => {
    const result = loadFrom("barbell", "85.5", { positions: eachSide(5) });
    expect(result.loading).toMatchObject({ positions: eachSide(5, 22.5, 5, 1.25), changes: { count: 6 } });
  });

  it("orders the other ways by changes, fewest first, each in the order its kept plates force", () => {
    const result = loadFrom("barbell", "98", { positions: eachSide(5, 5, 5, 5, 5, 5, 5) });
    expect(result.loading!.changes!.count).toBe(2);
    const counts = result.alternatives.map((loading) => loading.changes!.count);
    expect(counts.length).toBeGreaterThan(1);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(result.alternatives.map((loading) => loading.positions[0]!.plates)).toContainEqual([5, 5, 5, 22.5, 2.5]);
  });

  it("never lets a loading that misses the target beat one that hits it, however few changes it needs", () => {
    const result = loadFrom("barbell", "63", { positions: eachSide(5, 5, 5, 5, 5, 5, 5) });
    expect(result.exact).toBe(true);
    expect(result.loading!.total.lb).toBe(63);
    expect(result.loading!.changes!.count).toBe(8);
  });

  it("on an impossible target at equal distance recommends the side with fewer changes", () => {
    const fresh = load(inventory, { targets: [{ implement: "barbell", target: "174.25" }] }).results[0]!;
    expect(fresh.recommended).toBe("below");

    const result = loadFrom("barbell", "174.25", { positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25) });
    expect(result.below).toMatchObject({ total: { lb: 173 }, changes: { count: 2 } });
    expect(result.above).toMatchObject({ total: { lb: 175.5 }, changes: { count: 0 } });
    expect(result.recommended).toBe("above");
  });

  it("turns an uneven dumbbell round so its heavier end stays where the plates already are", () => {
    const result = loadFrom("dumbbell", "12.5", {
      positions: [
        { name: "end-a", plates: [] },
        { name: "end-b", plates: [2.5] },
      ],
    });
    expect(result.loading).toMatchObject({
      positions: [
        { name: "end-a", plates: [] },
        { name: "end-b", plates: [2.5] },
      ],
      heavier: "end-b",
      changes: { count: 0 },
    });
  });

  it("counts a screw added or removed as one change and a screw taken off and put back as none", () => {
    const single = (current: CurrentLoading, target: string) =>
      load(inventory, { targets: [{ implement: "dumbbell", target, pair: false, current }] }).results[0]!.loading!;
    const fiveEachEnd = {
      positions: [
        { name: "end-a", plates: [5] },
        { name: "end-b", plates: [5] },
      ],
    };

    expect(single({ positions: [], screws: "none" }, "10").changes).toEqual({
      count: 2,
      positions: [
        { name: "end-a", keep: [], remove: [], add: [] },
        { name: "end-b", keep: [], remove: [], add: [] },
      ],
      hardware: [{ to: "screw-standard", count: 2 }],
    });
    expect(single(fiveEachEnd, "5").changes).toMatchObject({ count: 4, hardware: [{ from: "screw-standard", count: 2 }] });
    expect(single(fiveEachEnd, "30").changes).toMatchObject({ count: 2, hardware: [] });
  });

  it("counts both dumbbells of a pair", () => {
    const current = {
      positions: [
        { name: "end-a", plates: [5] },
        { name: "end-b", plates: [5] },
      ],
    };
    const [pair] = load(inventory, { targets: [{ implement: "dumbbell", target: "30", current }] }).results;
    const [one] = load(inventory, { targets: [{ implement: "dumbbell", target: "30", pair: false, current }] }).results;
    expect(pair!.loading!.changes!.count).toBe(4);
    expect(one!.loading!.changes!.count).toBe(2);
  });

  it("counts kettlebell and leg attachment plates on their one stack", () => {
    const kettlebell = loadFrom("kettlebell", "40", { positions: [{ name: "stack", plates: [5, 5] }] });
    expect(kettlebell.loading).toMatchObject({
      positions: [{ name: "stack", plates: [5, 5, 5] }],
      changes: { count: 1, hardware: [] },
    });
    const leg = loadFrom("leg", "50", { positions: [{ name: "stack", plates: [5] }] });
    expect(leg.loading).toMatchObject({ positions: [{ name: "stack", plates: [5, 22.5, 22.5] }], changes: { count: 2 } });
  });

  it("counts one change per vest block put on or taken off, split front and back as before", () => {
    const blocks = (count: number) => Array<number>(count).fill(1);
    const result = loadFrom("vest", "12", {
      positions: [
        { name: "front", plates: blocks(4) },
        { name: "back", plates: blocks(5) },
      ],
    });
    expect(result.loading).toMatchObject({
      positions: [
        { name: "front", plates: blocks(6) },
        { name: "back", plates: blocks(6) },
      ],
      changes: { count: 3 },
    });
  });

  it("affects its own implement only: plates on the bar stay available to the dumbbells", () => {
    const later = { implement: "dumbbell", target: "40" };
    const withCurrent = load(inventory, {
      targets: [{ implement: "barbell", target: "173", current: { positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5) } }, later],
    });
    const without = load(inventory, { targets: [{ implement: "barbell", target: "173" }, later] });
    expect(withCurrent.results[1]).toEqual(without.results[1]);
    expect(withCurrent.leftover).toEqual(without.leftover);
  });
});
