import { describe, expect, it } from "vitest";
import { load, readInventory, reverse, type Hardware, type Implement, type Inventory, type LoadRequest, type Plate } from "../src/index.js";

const value = (listed: number) => ({ listed, status: "verified" as const });
const plate = (id: string, weight: number, count: number, extra: Partial<Plate> = {}): Plate => ({
  id,
  type: "iron",
  count,
  weight: value(weight),
  stackLength: value(1),
  shape: "round",
  ...extra,
});
const item = (id: string, name: string, kind: Hardware["kind"], extra: Partial<Hardware> = {}): Hardware => ({
  id,
  name,
  kind,
  count: 4,
  unit: "lb",
  weight: value(1),
  ...extra,
});

function kit(implement: Partial<Implement> & Pick<Implement, "kind">, edit: (inventory: Inventory) => void = () => {}): Inventory {
  const inventory: Inventory = {
    format: 1,
    name: "Test kit",
    lengthUnit: "in",
    plateTypes: [{ id: "iron", name: "Iron", unit: "lb", bore: "standard" }],
    plates: [plate("ten", 10, 4), plate("five", 5, 4), plate("two", 2, 4)],
    hardware: [
      item("short-pin", "Short pin", "pin", { capacity: 2 }),
      item("long-pin", "Long pin", "pin", { capacity: 4, note: "It shows above the stack." }),
      item("collar", "Spring collar", "collar", { width: 1 }),
    ],
    implements: [{ id: "thing", name: "Plate stack", count: 1, unit: "lb", base: value(10), accepts: ["iron"], ...implement } as Implement],
  };
  edit(inventory);
  return readInventory(JSON.stringify(inventory));
}

const one = (inventory: Inventory, target: string, extra: Partial<LoadRequest> = {}, pair?: boolean) =>
  load(inventory, { targets: [{ implement: "thing", target, ...(pair === undefined ? {} : { pair }) }], ...extra }).results[0]!;

const pins = { options: ["short-pin", "long-pin", "none"], perPosition: 1 };

describe("hardware is chosen by capacity and minStack, in options order from default (spec 17.4)", () => {
  it("takes the first option whose capacity holds the stack", () => {
    const stack = kit({ kind: "stack", hardware: pins });
    expect(one(stack, "31").loading).toMatchObject({ hardware: [{ id: "short-pin", count: 1 }], positions: [{ ids: ["ten", "ten"] }] });
    expect(one(stack, "36").loading).toMatchObject({ hardware: [{ id: "long-pin", count: 1 }], positions: [{ ids: ["ten", "ten", "five"] }] });
  });

  it("starts at default", () => {
    const stack = kit({ kind: "stack", hardware: { ...pins, default: "long-pin" } });
    expect(one(stack, "31").loading?.hardware).toEqual([{ id: "long-pin", count: 1 }]);
  });

  it("passes over an option whose minStack the stack does not meet", () => {
    const stack = kit({ kind: "stack", hardware: { ...pins, default: "long-pin" } }, (inventory) => {
      inventory.hardware[1]!.minStack = value(3);
    });
    expect(one(stack, "31").loading?.hardware).toEqual([{ id: "short-pin", count: 1 }]);
    expect(one(stack, "36").loading?.hardware).toEqual([{ id: "long-pin", count: 1 }]);
  });

  it("falls back to the next option that fits when the first is not free, with the generic warning and the item's note", () => {
    const stack = kit({ kind: "stack", hardware: pins }, (inventory) => {
      inventory.hardware[0]!.count = 0;
    });
    const result = one(stack, "31");
    expect(result.loading?.hardware).toEqual([{ id: "long-pin", count: 1 }]);
    expect(result.warnings).toEqual(["No short pin is free, so the plate stack uses a long pin. It shows above the stack."]);
  });

  it("treats none as the bare implement when the options hold a pin or screw", () => {
    const stack = kit({ kind: "stack", hardware: pins });
    expect(one(stack, "10").loading).toMatchObject({ hardware: [], positions: [{ ids: [] }] });
    expect(one(stack, "11").loading).toMatchObject({ hardware: [{ id: "short-pin" }], positions: [{ ids: [] }] });
    expect(one(stack, "20", { hardware: { thing: "none" } })).toMatchObject({ exact: false, below: { total: { lb: 10 } } });
  });

  it("puts plates on with no hardware when every option is a collar and none is free", () => {
    const bar = kit({ kind: "bar", hardware: { options: ["collar", "none"], perPosition: 1 } }, (inventory) => {
      inventory.hardware[2]!.count = 1;
    });
    const result = one(bar, "30");
    expect(result.loading).toMatchObject({ hardware: [], positions: [{ ids: ["ten"] }, { ids: ["ten"] }] });
    expect(result.warnings).toEqual(["No spring collar is free, so the plate stack uses no locking hardware."]);
  });

  it("keeps a fixed choice: that option or no loading", () => {
    const bar = kit({ kind: "bar", hardware: { options: ["collar", "none"], perPosition: 1 } }, (inventory) => {
      inventory.hardware[2]!.count = 1;
    });
    const result = one(bar, "32", { hardware: { thing: "collar" } });
    expect(result).toMatchObject({ exact: false });
    expect(result.below).toBeUndefined();
    expect(result.warnings).toEqual(["The plate pool holds 1 Spring collar. The plate stack needs 2."]);
  });

  it("adds no hardware weight when the base includes it", () => {
    const stack = kit({ kind: "stack", hardware: pins, baseIncludesHardware: true });
    expect(one(stack, "30").loading).toMatchObject({ hardware: [{ id: "short-pin" }], positions: [{ ids: ["ten", "ten"] }] });
  });
});

describe("lengths and caps (spec 17.4)", () => {
  it("fits every position's plates and the hardware's width within positionLength", () => {
    const bar = kit({ kind: "bar", hardware: { options: ["collar"], perPosition: 1 }, positionLength: value(3) });
    expect(one(bar, "52").loading).toMatchObject({ positions: [{ ids: ["ten", "ten"] }, { ids: ["ten", "ten"] }] });
    expect(one(bar, "62").exact).toBe(false);
  });

  it("fits a position's plates within the hardware's capacity on every kind", () => {
    const handle = kit({ kind: "handle", count: 1, unevenAllowance: 0, hardware: { options: ["short-pin"], perPosition: 1 } });
    expect(one(handle, "52").exact).toBe(true);
    expect(one(handle, "72").exact).toBe(false);
  });

  it("never loads a plate wider than maxPlateDiameter", () => {
    const stack = kit({ kind: "stack", maxPlateDiameter: 300 }, (inventory) => {
      inventory.plates[0]!.diameter = 450;
    });
    expect(one(stack, "20").loading?.positions[0]?.ids).toEqual(["five", "five"]);
  });

  it("holds at most maxPerPosition of a plate on one position", () => {
    const stack = kit({ kind: "stack", maxPerPosition: { ten: 1 } });
    expect(one(stack, "30").loading?.positions[0]?.ids).toEqual(["ten", "five", "five"]);
  });

  it("refuses a target over maxTotal and states the limit", () => {
    const stack = kit({ kind: "stack", maxTotal: 40 });
    expect(one(stack, "45")).toMatchObject({ refused: { limit: { lb: 40 } }, below: { total: { lb: 40 } } });
  });
});

describe("handles (spec 17.4)", () => {
  const handle = (extra: Partial<Implement> = {}, edit?: (inventory: Inventory) => void) =>
    kit({ kind: "handle", count: 2, unevenAllowance: 2, hardware: { options: ["short-pin", "none"], perPosition: 1 }, ...extra }, edit);

  it("loads a pair unless the request asks for one, on a handle the gym has two of", () => {
    expect(one(handle(), "22")).toMatchObject({ pair: true, exact: true });
    expect(one(handle({ count: 1 }), "22")).toMatchObject({ pair: false });
    expect(() => one(handle({ count: 1 }), "22", {}, true)).toThrow("cannot be loaded as a pair");
  });

  it("lets the ends differ by unevenAllowance, and marks the heavier end", () => {
    expect(one(handle(), "24", {}, false).loading).toMatchObject({
      uneven: true,
      heavier: "a",
      positions: [{ ids: ["five", "two"] }, { ids: ["five"] }],
    });
    expect(one(handle({ unevenAllowance: 0 }), "24", {}, false).exact).toBe(false);
  });

  it("allows hardware on one end only when unevenAllowance is above 0, counting it toward the difference", () => {
    expect(one(handle(), "11", {}, false).loading).toMatchObject({ hardware: [{ id: "short-pin", count: 1 }], uneven: true });
    expect(one(handle({ unevenAllowance: 0 }), "11", {}, false).exact).toBe(false);
  });

  it("relaxes to unevenAllowanceRelaxed when no plate of the allowance or less is free, and says why", () => {
    const noSmall = handle({ unevenAllowanceRelaxed: 5 }, (inventory) => {
      inventory.plates[2]!.count = 0;
    });
    const result = one(noSmall, "17", {}, false);
    expect(result.loading).toMatchObject({ uneven: true, positions: [{ ids: ["five"] }, { ids: [] }] });
    expect(result.warnings).toEqual(["The ends differ by 5 lb because no plate of 2 lb or less is free."]);
    expect(one(handle({}, (inventory) => (inventory.plates[2]!.count = 0)), "17", {}, false).exact).toBe(false);
  });

  it("turns uneven loading off with the uneven switch", () => {
    expect(one(handle(), "24", { uneven: false }, false).exact).toBe(false);
  });
});

describe("vests (spec 17.4)", () => {
  const vest = (edit?: (inventory: Inventory) => void) =>
    kit({ kind: "vest", base: value(0) }, (inventory) => {
      inventory.plateTypes[0]!.bore = "block";
      inventory.plates = [plate("eight", 8, 2, { shape: "block" }), plate("four", 4, 2, { shape: "block" })];
      edit?.(inventory);
    });

  it("splits plates as evenly as possible by weight, the heavier side at the back", () => {
    expect(one(vest(), "12").loading?.positions.map(({ ids }) => ids)).toEqual([["four"], ["eight"]]);
    expect(one(vest(), "16").loading?.positions.map(({ ids }) => ids)).toEqual([["eight"], ["eight"]]);
  });

  it("follows maxPerPosition, so a plate carrier takes one plate per panel", () => {
    const carrier = vest((inventory) => {
      inventory.implements[0]!.maxPerPosition = { eight: 1, four: 1 };
    });
    expect(one(carrier, "24").loading?.positions.map(({ ids }) => ids)).toEqual([["eight", "four"], ["eight", "four"]]);
    expect(one(carrier, "16").loading?.positions.map(({ ids }) => ids)).toEqual([["eight"], ["eight"]]);
  });
});

describe("notes and changes (spec 17.4)", () => {
  it("puts the implement's note on every result", () => {
    const stack = kit({ kind: "stack", note: "Plate weight only." });
    expect(one(stack, "20").warnings).toEqual(["Plate weight only."]);
    expect(one(stack, "21").warnings).toEqual(["Plate weight only."]);
    expect(reverse(stack, { implement: "thing", positions: [] }).notes).toEqual(["Plate weight only."]);
  });

  it("counts a pin swap as two changes and never counts a collar", () => {
    const stack = kit({ kind: "stack", hardware: pins });
    const swap = load(stack, {
      targets: [{ implement: "thing", target: "36", current: { positions: [{ name: "stack", plates: [10, 10] }], hardware: "short-pin" } }],
    }).results[0]!;
    expect(swap.loading?.changes).toMatchObject({ count: 3, hardware: [{ from: "short-pin", to: "long-pin", count: 1 }] });

    const bar = kit({ kind: "bar", hardware: { options: ["collar", "none"], perPosition: 1 } });
    const collars = load(bar, {
      targets: [{ implement: "thing", target: "32", current: { positions: [{ name: "left", plates: [10] }, { name: "right", plates: [10] }], hardware: "none" } }],
    }).results[0]!;
    expect(collars.loading).toMatchObject({ hardware: [{ id: "collar", count: 2 }], changes: { count: 0, hardware: [] } });
  });
});

describe("text names things by their name (spec 17.4)", () => {
  it("labels positions by kind in Reverse warnings", () => {
    const handle = kit({ kind: "handle", count: 1, unevenAllowance: 0, maxPerPosition: { two: 1 } });
    expect(reverse(handle, { implement: "thing", positions: [{ name: "b", plates: [2, 2] }] }).warnings).toContain(
      "End B holds 2 × 2 lb plates. It takes at most 1.",
    );
  });

  it("names a plate by its name when it has one", () => {
    const stack = kit({ kind: "stack", maxPerPosition: { two: 1 } }, (inventory) => {
      inventory.plates[2]!.name = "Fractional";
    });
    expect(reverse(stack, { implement: "thing", positions: [{ name: "stack", plates: [2, 2] }] }).warnings).toEqual([
      "The stack holds 2 × fractional plates. It takes at most 1.",
    ]);
  });

  it("asks for an id where two accepted plates share a weight, and takes one", () => {
    const stack = kit({ kind: "stack" }, (inventory) => {
      inventory.plates.push(plate("bumper-ten", 10, 2));
    });
    expect(() => reverse(stack, { implement: "thing", positions: [{ name: "stack", plates: [10] }] })).toThrow("Name one by its id");
    expect(reverse(stack, { implement: "thing", positions: [{ name: "stack", plates: [10], ids: ["bumper-ten"] }] }).positions).toEqual([
      { name: "stack", plates: [10], ids: ["bumper-ten"] },
    ]);
  });
});
