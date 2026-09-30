import { load, type Loading } from "@plate-pool/core";
import { describe, expect, it } from "vitest";
import { drawDumbbell } from "../src/dumbbell-drawing";
import { inventory } from "../src/inventory";
import { plateColour } from "../src/plate-colours";

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
      [22.5, 1.875, 6.7],
      ...Array.from({ length: 6 }, () => [5, 0.5, 6.7]),
      [2.5, 0.25, 6.7],
    ]);
    for (const plate of plates) expect(plate.fill).toBe(plateColour(plate.weight, "lb").fill);
  });

  it("puts a locking screw outside the last plate on each end, and one label naming both", () => {
    const { ends, screwLabel } = drawDumbbell(loadingFor("40lb"), inventory);
    const [a, b] = ends;
    expect(a!.screw!.x + a!.screw!.width).toBeCloseTo(a!.plates.at(-1)!.x);
    expect(b!.screw!.x).toBeCloseTo(b!.plates.at(-1)!.x + b!.plates.at(-1)!.width);
    expect(screwLabel?.label.text).toBe("Standard locking screws");
    expect(screwLabel?.leaders.length).toBeGreaterThanOrEqual(2);
  });

  it("puts the screw against the handle on an end with no plates (example 5)", () => {
    const { ends, handle } = drawDumbbell(loadingFor("12.5lb", false), inventory);
    expect(ends[1]!.plates).toEqual([]);
    expect(ends[1]!.screw!.x).toBeCloseTo(handle.right);
  });

  it("draws no screws on a bare handle", () => {
    const drawing = drawDumbbell(loadingFor("5lb", false), inventory);
    expect(drawing.ends.every((end) => end.screw === undefined)).toBe(true);
    expect(drawing.screwLabel).toBeUndefined();
  });
});

describe("dumbbell drawing: the heavier end", () => {
  it("marks the heavier end over its whole length on an uneven dumbbell (example 6)", () => {
    const { ends, heavier } = drawDumbbell(loadingFor("47.5lb", false), inventory);
    const a = ends[0]!;
    expect(heavier?.text).toBe("End A heavier");
    expect(heavier?.from).toBeCloseTo(a.screw!.x);
    expect(heavier?.to).toBeGreaterThan(a.plates[0]!.x);
  });

  it("marks no end on an even dumbbell (example 4)", () => {
    expect(drawDumbbell(loadingFor("40lb"), inventory).heavier).toBeUndefined();
  });
});

describe("dumbbell drawing: scale", () => {
  it("draws every single dumbbell picture at one scale", () => {
    const light = drawDumbbell(loadingFor("12.5lb", false), inventory);
    const heavy = drawDumbbell(loadingFor("120lb"), inventory);
    expect(light.width).toBe(heavy.width);
  });

  it("shares one scale between pictures shown side by side", () => {
    const below = loadingFor("121lb", false, "below");
    const light = loadingFor("40lb");
    const pair = [below, light].map((loading) => drawDumbbell(loading, inventory, { sideBySide: [below, light] }));
    expect(pair[0]!.width).toBe(pair[1]!.width);
  });
});
