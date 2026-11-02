import { load, type Loading } from "@plate-pool/core";
import { describe, expect, it } from "vitest";
import { drawHandle } from "../src/handle-drawing";
import { MIN_PLATE_WIDTH, PLATE_HEIGHT } from "../src/plate-stack";
import { plateColour } from "../src/plate-colours";
import { olympic, owner as inventory } from "./kits";

const drawDumbbell = (loading: Loading, kit: typeof inventory, options = {}) => drawHandle("dumbbell", loading, kit, options);

function loadingFor(target: string, pair = true, pick: "loading" | "below" | "above" = "loading"): Loading {
  const [result] = load(inventory, { targets: [{ implement: "dumbbell", target, pair }] }).results;
  const loading = result?.[pick];
  if (!loading) throw new Error(`No ${pick} loading for ${target}`);
  return loading;
}

describe("dumbbell drawing: both ends", () => {
  it("stacks end A leftwards and end B rightwards from the handle, heaviest innermost (example 6)", () => {
    const { ends, handle } = drawDumbbell(loadingFor("47.5lb", false), inventory);
    const [a, b] = ends;
    expect(a!.plates.map((plate) => plate.weight)).toEqual([5, 5, 5, 5]);
    expect(b!.plates.map((plate) => plate.weight)).toEqual([5, 5, 5, 2.5]);
    expect(a!.plates[0]!.x + a!.plates[0]!.width).toBeCloseTo(handle.left);
    expect(b!.plates[0]!.x).toBeCloseTo(handle.right);
    for (let i = 1; i < 4; i++) {
      expect(a!.plates[i]!.x + a!.plates[i]!.width).toBeCloseTo(a!.plates[i - 1]!.x);
      expect(b!.plates[i]!.x).toBeCloseTo(b!.plates[i - 1]!.x + b!.plates[i - 1]!.width);
    }
  });

  it("draws plates at the barbell picture's sizes and colours (example 7)", () => {
    const { ends } = drawDumbbell(loadingFor("120lb"), inventory);
    const plates = ends[1]!.plates;
    expect(plates.map(({ weight, width, height }) => [weight, width, height])).toEqual([
      [22.5, 1.875, PLATE_HEIGHT],
      ...Array.from({ length: 6 }, () => [5, MIN_PLATE_WIDTH, PLATE_HEIGHT]),
      [2.5, MIN_PLATE_WIDTH, PLATE_HEIGHT],
    ]);
    const colourOf = (weight: number) => plateColour(inventory, inventory.plates.find((plate) => plate.weight.listed === weight)!).fill;
    for (const plate of plates) expect(plate.fill).toBe(colourOf(plate.weight));
  });

  it("puts a locking screw outside the last plate on each end, and one label naming both", () => {
    const { ends, hardwareLabel } = drawDumbbell(loadingFor("40lb"), inventory);
    const [a, b] = ends;
    expect(a!.hardware!.x + a!.hardware!.width).toBeCloseTo(a!.plates.at(-1)!.x);
    expect(b!.hardware!.x).toBeCloseTo(b!.plates.at(-1)!.x + b!.plates.at(-1)!.width);
    expect(hardwareLabel?.label.text).toBe("Standard locking screws");
    expect(hardwareLabel?.leaders.length).toBeGreaterThanOrEqual(2);
  });

  it("puts the screw against the handle on an end with no plates (example 5)", () => {
    const { ends, handle } = drawDumbbell(loadingFor("12.5lb", false), inventory);
    expect(ends[1]!.plates).toEqual([]);
    expect(ends[1]!.hardware!.x).toBeCloseTo(handle.right);
  });

  it("draws one screw on the heavier end only, with a label naming one screw (example 15)", () => {
    const { ends, handle, hardwareLabel, description } = drawDumbbell(loadingFor("7.5lb", false), inventory);
    expect(ends[0]!.hardware!.x + ends[0]!.hardware!.width).toBeCloseTo(handle.left);
    expect(ends[1]!.hardware).toBeUndefined();
    expect(hardwareLabel?.label.text).toBe("Standard locking screw");
    expect(description).toBe(
      "End A, inside to outside: no plates, then a standard locking screw. End B, inside to outside: no plates. End A is heavier",
    );
  });

  it("draws no screws on a bare handle", () => {
    const drawing = drawDumbbell(loadingFor("5lb", false), inventory);
    expect(drawing.ends.every((end) => end.hardware === undefined)).toBe(true);
    expect(drawing.hardwareLabel).toBeUndefined();
  });
});

describe("dumbbell drawing: the heavier end", () => {
  it("marks the heavier end over its whole length on an uneven dumbbell (example 6)", () => {
    const { ends, heavier } = drawDumbbell(loadingFor("47.5lb", false), inventory);
    const a = ends[0]!;
    expect(heavier?.text).toBe("End A heavier");
    expect(heavier?.from).toBeCloseTo(a.hardware!.x);
    expect(heavier?.to).toBeGreaterThan(a.plates[0]!.x);
  });

  it("marks no end on an even dumbbell (example 4)", () => {
    expect(drawDumbbell(loadingFor("40lb"), inventory).heavier).toBeUndefined();
  });
});

describe("dumbbell drawing: scale", () => {
  it("draws light and middling dumbbells at one scale", () => {
    const light = drawDumbbell(loadingFor("12.5lb", false), inventory);
    const middle = drawDumbbell(loadingFor("40lb"), inventory);
    expect(light.width).toBe(middle.width);
  });

  it("shares one scale between pictures shown side by side", () => {
    const below = loadingFor("121lb", false, "below");
    const light = loadingFor("40lb");
    const pair = [below, light].map((loading) => drawDumbbell(loading, inventory, { sideBySide: [below, light] }));
    expect(pair[0]!.width).toBe(pair[1]!.width);
  });

  it("shares one scale and one top between an even and an uneven dumbbell shown side by side", () => {
    const shown = [loadingFor("11lb", false, "below"), loadingFor("11lb", false, "above")];
    expect(shown.map((loading) => loading.uneven)).toEqual([false, true]);
    const pair = shown.map((loading) => drawDumbbell(loading, inventory, { sideBySide: shown }));
    expect(pair[0]!.width).toBe(pair[1]!.width);
    expect(pair[0]!.top).toBe(pair[1]!.top);
    expect(pair[0]!.height).toBe(pair[1]!.height);
  });
});

describe("handle drawing: any kit (spec 17.7)", () => {
  const olympicSingle = (target: string) => {
    const [result] = load(olympic, { targets: [{ implement: "dumbbell", target, pair: false }] }).results;
    return result!.loading!;
  };

  it("draws a sleeve at the handle's position length and a collar block on each end, named by its name", () => {
    const drawing = drawHandle("dumbbell", olympicSingle("7.5kg"), olympic);
    const factor = PLATE_HEIGHT / 450;
    expect(drawing.sleeves.map((sleeve) => sleeve.width)).toEqual([150 * factor, 150 * factor]);
    expect(drawing.hardwareKind).toBe("collar");
    expect(drawing.ends.map((end) => end.hardware?.width)).toEqual([60 * factor, 60 * factor]);
    expect(drawing.hardwareLabel?.label.text).toBe("Spring collars");
    expect(drawing.description).toBe("Each end, inside to outside: 2.5, then a spring collar");
  });

  it("draws no sleeve on a handle with no position length", () => {
    expect(drawDumbbell(loadingFor("40lb"), inventory).sleeves).toEqual([]);
  });
});
