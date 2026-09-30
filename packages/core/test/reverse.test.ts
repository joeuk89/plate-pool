import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, RequestError, reverse, type Inventory, type Loading, type LoadResult, type ReverseRequest } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

const eachSide = (...plates: number[]) => [
  { name: "left", plates },
  { name: "right", plates },
];

describe("Reverse: worked examples (spec section 7)", () => {
  it("example 2: each side 2 × 22.5, 6 × 5, 1 × 2.5 on the barbell is 173 lb", () => {
    const result = reverse(inventory, { implement: "barbell", positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5) });
    expect(result).toEqual({
      implement: "barbell",
      total: { lb: 173, kg: 78.5 },
      hardware: [{ id: "collar-clamp", count: 2 }],
      positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5),
      uneven: false,
      warnings: [],
      notes: [],
      unverified: ["barbell.base", "collar-clamp.weight"],
    });
  });

  it("example 5: one dumbbell with 1 × 2.5 on one end and nothing on the other is 12.5 lb, uneven, with standard screws", () => {
    const result = reverse(inventory, {
      implement: "dumbbell",
      pair: false,
      positions: [{ name: "end-a", plates: [2.5] }],
    });
    expect(result).toMatchObject({
      implement: "dumbbell",
      pair: false,
      total: { lb: 12.5, kg: 5.7 },
      hardware: [{ id: "screw-standard", count: 2 }],
      positions: [
        { name: "end-a", plates: [2.5] },
        { name: "end-b", plates: [] },
      ],
      uneven: true,
      heavier: "end-a",
      warnings: [],
    });
  });

  it("example 6: one dumbbell with 3 × 5 + 1 × 2.5 on end A and 4 × 5 on end B is 47.5 lb, heavier at end B", () => {
    const result = reverse(inventory, {
      implement: "dumbbell",
      pair: false,
      positions: [
        { name: "end-a", plates: [5, 5, 5, 2.5] },
        { name: "end-b", plates: [5, 5, 5, 5] },
      ],
    });
    expect(result).toMatchObject({ total: { lb: 47.5, kg: 21.5 }, uneven: true, heavier: "end-b", warnings: [] });
  });

  it("example 4: a pair with 3 × 5 on each end is 40 lb each, with standard screws", () => {
    const result = reverse(inventory, {
      implement: "dumbbell",
      positions: [
        { name: "end-a", plates: [5, 5, 5] },
        { name: "end-b", plates: [5, 5, 5] },
      ],
    });
    expect(result).toMatchObject({
      pair: true,
      total: { lb: 40, kg: 18.1 },
      hardware: [{ id: "screw-standard", count: 2 }],
      uneven: false,
      warnings: [],
    });
    expect(result).not.toHaveProperty("heavier");
  });

  it("example 7: a pair with 1 × 22.5, 6 × 5, 1 × 2.5 on each end is 120 lb each, with long screws, and names the long screw's shortest stack", () => {
    const end = [22.5, 5, 5, 5, 5, 5, 5, 2.5];
    const result = reverse(inventory, {
      implement: "dumbbell",
      positions: [
        { name: "end-a", plates: end },
        { name: "end-b", plates: end },
      ],
    });
    expect(result).toMatchObject({
      total: { lb: 120, kg: 54.4 },
      hardware: [{ id: "screw-long", count: 2 }],
      warnings: [],
      unverified: ["screw-long.minStackIn"],
    });
  });

  it("example 8: 1 × 22.5, 6 × 5, 1 × 2.5 on the kettlebell is 80 lb, with a long screw", () => {
    const result = reverse(inventory, { implement: "kettlebell", positions: [{ name: "stack", plates: [22.5, 5, 5, 5, 5, 5, 5, 2.5] }] });
    expect(result).toEqual({
      implement: "kettlebell",
      total: { lb: 80, kg: 36.3 },
      hardware: [{ id: "screw-long", count: 1 }],
      positions: [{ name: "stack", plates: [22.5, 5, 5, 5, 5, 5, 5, 2.5] }],
      uneven: false,
      warnings: [],
      notes: [],
      unverified: [],
    });
  });

  it("uses a standard screw on the kettlebell up to 57.5 lb", () => {
    const result = reverse(inventory, { implement: "kettlebell", positions: [{ name: "stack", plates: [5, 5, 5] }] });
    expect(result).toMatchObject({ total: { lb: 40, kg: 18.1 }, hardware: [{ id: "screw-standard", count: 1 }] });
  });

  it("example 12: 2 × 22.5, 1 × 5 on the leg attachment is 50 lb, with the fixed note", () => {
    const result = reverse(inventory, { implement: "leg", positions: [{ name: "stack", plates: [22.5, 22.5, 5] }] });
    expect(result).toEqual({
      implement: "leg",
      total: { lb: 50, kg: 22.7 },
      hardware: [],
      positions: [{ name: "stack", plates: [22.5, 22.5, 5] }],
      uneven: false,
      warnings: [],
      notes: ["Plate weight only. The lever changes the resistance you feel."],
      unverified: [],
    });
  });

  it("example 13: 6 blocks on the front and 6 on the back of the vest is 12 kg, kilograms first", () => {
    const blocks = (count: number) => Array<number>(count).fill(1);
    const result = reverse(inventory, {
      implement: "vest",
      positions: [
        { name: "front", plates: blocks(6) },
        { name: "back", plates: blocks(6) },
      ],
    });
    expect(result).toEqual({
      implement: "vest",
      total: { kg: 12, lb: 26.46 },
      hardware: [],
      positions: [
        { name: "front", plates: blocks(6) },
        { name: "back", plates: blocks(6) },
      ],
      uneven: false,
      warnings: [],
      notes: [],
      unverified: ["vest.base", "vest-block.count"],
    });
    expect(Object.keys(result.total)).toEqual(["kg", "lb"]);
  });
});

function loadingsFrom(result: LoadResult): Loading[] {
  return [result.loading, result.below, result.above, ...result.alternatives].filter((loading) => loading !== undefined);
}

function range(from: number, to: number, step: number): number[] {
  return Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);
}

const collarOf: Record<string, ReverseRequest["collars"]> = { "collar-clamp": "clamp", "collar-spinlock": "spinlock" };
const screwsOf: Record<string, ReverseRequest["screws"]> = { "screw-standard": "standard", "screw-long": "long" };

function requestFor(result: LoadResult, loading: Loading): ReverseRequest {
  const [hardware] = loading.hardware;
  return {
    implement: result.implement,
    ...(result.pair !== undefined ? { pair: result.pair } : {}),
    positions: loading.positions,
    ...(result.implement === "barbell" ? { collars: hardware ? collarOf[hardware.id]! : "none" } : {}),
    ...(result.implement === "dumbbell" || result.implement === "kettlebell"
      ? { screws: hardware ? screwsOf[hardware.id]! : "none" }
      : {}),
  };
}

const loadRequests = [
  ...(["clamp", "spinlock", "none"] as const).flatMap((collars) =>
    range(18, 230, 1.25).map((target) => ({ targets: [{ implement: "barbell", target: `${target}` }], collars })),
  ),
  ...[true, false].flatMap((pair) =>
    range(5, 125, 2.5).map((target) => ({ targets: [{ implement: "dumbbell", target: `${target}`, pair }] })),
  ),
  ...range(22.5, 85, 1.25).map((target) => ({ targets: [{ implement: "kettlebell", target: `${target}` }] })),
  ...range(1.25, 105, 1.25).map((target) => ({ targets: [{ implement: "leg", target: `${target}` }] })),
  ...range(0.5, 32, 0.5).map((target) => ({ targets: [{ implement: "vest", target: `${target}` }] })),
];

describe("Reverse: properties (spec section 7)", () => {
  it("returns the same total, hardware and flags for every loading from Load, with no warnings", () => {
    let checked = 0;
    for (const request of loadRequests) {
      const [result] = load(inventory, request).results;
      for (const loading of loadingsFrom(result!)) {
        const reversed = reverse(inventory, requestFor(result!, loading));
        expect(reversed, JSON.stringify({ request, loading })).toMatchObject({
          total: loading.total,
          hardware: loading.hardware,
          positions: loading.positions,
          uneven: loading.uneven,
          warnings: [],
        });
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it("picks the screw kind that the rules give for the total, as Load does, when the request names none", () => {
    for (const request of loadRequests.filter(({ targets }) => ["dumbbell", "kettlebell"].includes(targets[0]!.implement))) {
      const [result] = load(inventory, request).results;
      for (const loading of loadingsFrom(result!).filter(({ positions }) => positions.some(({ plates }) => plates.length > 0))) {
        const { screws: _, ...inferred } = requestFor(result!, loading);
        expect(reverse(inventory, inferred).hardware, JSON.stringify({ request, loading })).toEqual(loading.hardware);
      }
    }
  });
});

function changed(edit: (copy: Inventory) => void): Inventory {
  const copy = structuredClone(inventory);
  edit(copy);
  return copy;
}

describe("Reverse: barbell rules (spec 6.2)", () => {
  const barbell = (positions: ReverseRequest["positions"], options: Partial<ReverseRequest> = {}, from = inventory) =>
    reverse(from, { implement: "barbell", positions, ...options });

  it("warns when the sides differ, and still returns the total", () => {
    const result = barbell([
      { name: "left", plates: [22.5, 5] },
      { name: "right", plates: [22.5] },
    ]);
    expect(result.total).toEqual({ lb: 68, kg: 30.8 });
    expect(result.warnings).toEqual(["The sides differ. Both sides carry the same plates in the same order."]);
  });

  it("warns when the sides carry the same plates in a different order", () => {
    const result = barbell([
      { name: "left", plates: [22.5, 5] },
      { name: "right", plates: [5, 22.5] },
    ]);
    expect(result.warnings).toContain("The sides differ. Both sides carry the same plates in the same order.");
  });

  it("warns when the plates total more than the 210 lb plate limit", () => {
    const result = barbell(eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 2.5));
    expect(result.total).toEqual({ lb: 233, kg: 105.7 });
    expect(result.warnings).toEqual(["The plates total 215 lb, over the 210 lb plate limit."]);
  });

  it("warns once per side that holds more than one micro plate", () => {
    const result = barbell(eachSide(5, 1.25, 1.25));
    expect(result.total).toEqual({ lb: 33, kg: 15 });
    expect(result.warnings).toEqual([
      "The left side holds 2 micro plates. It takes at most one.",
      "The right side holds 2 micro plates. It takes at most one.",
    ]);
  });

  it("warns when the plates on a side are out of order", () => {
    const result = barbell(eachSide(5, 22.5));
    expect(result.warnings).toEqual([
      "The plates on the left side are out of order. Put the heaviest plate innermost and the micro plate outermost.",
      "The plates on the right side are out of order. Put the heaviest plate innermost and the micro plate outermost.",
    ]);
  });

  it("warns when the plates on a side are longer than the side holds with the collar", () => {
    const longStack = changed((copy) => {
      copy.implements.find(({ id }) => id === "barbell")!.positionLengthIn = { listed: 4, status: "verified" };
    });
    const result = barbell(eachSide(22.5, 5, 5), {}, longStack);
    expect(result.warnings).toEqual([
      'The plates on the left side are 2.875 in long. The side holds 2.74 in with the Mirafit 1" clamp collar.',
      'The plates on the right side are 2.875 in long. The side holds 2.74 in with the Mirafit 1" clamp collar.',
    ]);
  });

  it("warns when the loading uses more plates than the plate pool holds", () => {
    const result = barbell(eachSide(22.5, 22.5, 22.5));
    expect(result.total).toEqual({ lb: 153, kg: 69.4 });
    expect(result.warnings).toEqual(["The loading uses 6 × 22.5 lb plates. The plate pool holds 5."]);
  });

  it("warns when the loading uses more collars than the plate pool holds", () => {
    const oneSpinLock = changed((copy) => {
      copy.hardware.find(({ id }) => id === "collar-spinlock")!.count = 1;
    });
    const result = barbell(eachSide(5), { collars: "spinlock" }, oneSpinLock);
    expect(result.warnings).toEqual(["The loading uses 2 × Ironmaster spin-lock collars. The plate pool holds 1."]);
  });
});

describe("Reverse: dumbbell rules (spec 6.2)", () => {
  const ends = (endA: number[], endB: number[]) => [
    { name: "end-a", plates: endA },
    { name: "end-b", plates: endB },
  ];
  const dumbbell = (endA: number[], endB: number[], options: Partial<ReverseRequest> = {}) =>
    reverse(inventory, { implement: "dumbbell", pair: false, positions: ends(endA, endB), ...options });

  it("warns when the ends differ by more than 2.5 lb, and still returns the total", () => {
    const result = dumbbell([5], []);
    expect(result).toMatchObject({ total: { lb: 15, kg: 6.8 }, uneven: true, heavier: "end-a" });
    expect(result.warnings).toEqual(["The ends differ by 5 lb. They may differ by at most 2.5 lb."]);
  });

  it("warns about uneven ends when uneven loading is off", () => {
    expect(dumbbell([2.5], [], { uneven: false }).warnings).toEqual(["Uneven loading is off, and the ends differ by 2.5 lb."]);
  });

  it("warns when an end holds more than one micro plate", () => {
    expect(dumbbell([5, 1.25, 1.25], [5, 2.5]).warnings).toEqual(["End A holds 2 micro plates. It takes at most one."]);
  });

  it("warns when an end's plates are out of order", () => {
    expect(dumbbell([5], [2.5, 5]).warnings).toEqual([
      "The plates on end B are out of order. Put the heaviest plate innermost and the micro plate outermost.",
    ]);
  });

  it("warns when standard screws hold a dumbbell over 75 lb, and names the screws used", () => {
    const result = dumbbell([22.5, 5, 5, 2.5], [22.5, 5, 5, 2.5], { screws: "standard" });
    expect(result).toMatchObject({ total: { lb: 80, kg: 36.3 }, hardware: [{ id: "screw-standard", count: 2 }] });
    expect(result.warnings).toEqual([
      "The dumbbell is 80 lb, so it takes long locking screws. Standard locking screws are for dumbbells up to 75 lb.",
    ]);
  });

  it("warns when long screws hold a dumbbell of 75 lb or less, and when an end is too short for a long screw to lock", () => {
    const result = dumbbell([22.5], [22.5], { screws: "long" });
    expect(result.total).toEqual({ lb: 55, kg: 24.9 });
    expect(result.warnings).toEqual([
      "The dumbbell is 55 lb, so it takes standard locking screws. Long locking screws are for dumbbells over 75 lb.",
      "The plates on end A are 1.875 in long. A long locking screw needs at least 3 in to lock.",
      "The plates on end B are 1.875 in long. A long locking screw needs at least 3 in to lock.",
    ]);
  });

  it("warns when an end's plates are longer than the screw holds", () => {
    const result = dumbbell([5, 5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5, 2.5], { screws: "standard" });
    expect(result.warnings).toContain("The plates on end A are 3.5 in long. A standard locking screw holds up to 3.25 in.");
  });

  it("warns when a dumbbell is over the 120 lb limit", () => {
    const result = dumbbell([22.5, 22.5, 5, 5, 2.5], [22.5, 22.5, 5, 5, 2.5]);
    expect(result.total).toEqual({ lb: 125, kg: 56.7 });
    expect(result.warnings).toEqual(["The dumbbell is 125 lb, over the 120 lb limit per dumbbell."]);
  });

  it("warns when plates are on a dumbbell with no screws", () => {
    const result = dumbbell([5], [5], { screws: "none" });
    expect(result).toMatchObject({ total: { lb: 15, kg: 6.8 }, hardware: [] });
    expect(result.warnings).toEqual(["Plates on a dumbbell need two locking screws."]);
  });

  it("reads the bare handle with no screws as 5 lb, with no warnings", () => {
    expect(dumbbell([], [], { screws: "none" })).toMatchObject({ total: { lb: 5, kg: 2.3 }, hardware: [], warnings: [] });
  });

  it("warns when a pair uses more plates than the plate pool holds", () => {
    const result = reverse(inventory, { implement: "dumbbell", positions: ends([5, 2.5, 2.5], [5, 2.5, 2.5]) });
    expect(result.total).toEqual({ lb: 30, kg: 13.6 });
    expect(result.warnings).toEqual(["The pair uses 8 × 2.5 lb plates. The plate pool holds 4."]);
  });
});

describe("Reverse: kettlebell rules (spec 6.2)", () => {
  const kettlebell = (plates: number[], options: Partial<ReverseRequest> = {}) =>
    reverse(inventory, { implement: "kettlebell", positions: [{ name: "stack", plates }], ...options });

  it("warns when a standard screw holds a kettlebell over 57.5 lb", () => {
    const result = kettlebell([22.5, 5, 5, 2.5], { screws: "standard" });
    expect(result.total).toEqual({ lb: 60, kg: 27.2 });
    expect(result.warnings).toEqual([
      "The kettlebell is 60 lb, so it takes a long locking screw. A standard locking screw is for a kettlebell up to 57.5 lb.",
    ]);
  });

  it("warns that a long screw on a kettlebell of 57.5 lb or less may stick out at the top", () => {
    expect(kettlebell([5, 5, 5], { screws: "long" }).warnings).toEqual([
      "The kettlebell is 40 lb, so it takes a standard locking screw. A long locking screw may stick out at the top, which Ironmaster's manual calls normal.",
    ]);
  });

  it("warns when the kettlebell is over the 80 lb limit", () => {
    const result = kettlebell([22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25]);
    expect(result.total).toEqual({ lb: 81.25, kg: 36.9 });
    expect(result.warnings).toContain("The kettlebell is 81.25 lb, over the 80 lb limit.");
  });

  it("warns when the stack holds more than one 22.5 lb plate", () => {
    expect(kettlebell([22.5, 22.5]).warnings).toEqual(["The kettlebell holds 2 × 22.5 lb plates. It takes at most one."]);
  });

  it("warns when the stack holds more than one micro plate", () => {
    expect(kettlebell([5, 1.25, 1.25]).warnings).toEqual(["The stack holds 2 micro plates. It takes at most one."]);
  });

  it("warns when the stack is longer than the screw holds", () => {
    const result = kettlebell([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(result).toMatchObject({ total: { lb: 80, kg: 36.3 }, hardware: [{ id: "screw-long", count: 1 }] });
    expect(result.warnings).toEqual(["The plates on the stack are 5.5 in long. A long locking screw holds up to 5.125 in."]);
  });

  it("warns when plates are on the kettlebell with no screw", () => {
    expect(kettlebell([5], { screws: "none" }).warnings).toEqual(["Plates on the kettlebell need a locking screw."]);
  });
});

describe("Reverse: leg attachment and vest rules (spec 6.2)", () => {
  it("warns when the leg attachment's plates total more than 100 lb, and keeps the fixed note", () => {
    const result = reverse(inventory, { implement: "leg", positions: [{ name: "stack", plates: [22.5, 22.5, 22.5, 22.5, 5, 5, 5] }] });
    expect(result.total).toEqual({ lb: 105, kg: 47.6 });
    expect(result.warnings).toEqual(["The plates total 105 lb, over the 100 lb plate limit."]);
    expect(result.notes).toEqual(["Plate weight only. The lever changes the resistance you feel."]);
  });

  const vest = (front: number, back: number) =>
    reverse(inventory, {
      implement: "vest",
      positions: [
        { name: "front", plates: Array<number>(front).fill(1) },
        { name: "back", plates: Array<number>(back).fill(1) },
      ],
    });

  it.each([
    [8, 4],
    [7, 6],
  ])("warns when the blocks split %i front and %i back", (front, back) => {
    const result = vest(front, back);
    expect(result.total.kg).toBe(front + back);
    expect(result.warnings).toEqual([
      `The blocks split ${front} front and ${back} back. Split them evenly, with any extra block on the back.`,
    ]);
  });

  it("warns when the vest holds more than 30 blocks, and more than the plate pool holds", () => {
    const result = vest(16, 16);
    expect(result.total).toEqual({ kg: 32, lb: 70.55 });
    expect(result.warnings).toEqual([
      "The vest holds 32 blocks, over the 30 block limit.",
      "The loading uses 32 × vest blocks. The plate pool holds 30.",
    ]);
  });
});

describe("Reverse: invalid loadings", () => {
  it.each([
    [{ implement: "rowing", positions: [] }, 'Unknown implement "rowing".'],
    [{ implement: "barbell", positions: [{ name: "end-a", plates: [5] }] }, 'The straight bar has no position "end-a".'],
    [{ implement: "barbell", positions: eachSide(10) }, "The straight bar takes no 10 plate."],
    [{ implement: "vest", positions: [{ name: "front", plates: [5] }] }, "The weighted vest takes no 5 plate."],
  ])("refuses %j", (request, reason) => {
    expect(() => reverse(inventory, request)).toThrow(new RequestError(reason));
  });
});

