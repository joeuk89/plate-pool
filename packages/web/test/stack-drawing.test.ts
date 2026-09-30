import { load, type Loading } from "@plate-pool/core";
import { describe, expect, it } from "vitest";
import { inventory } from "../src/inventory";
import { plateColour } from "../src/plate-colours";
import { drawStack } from "../src/stack-drawing";

function loadingFor(implement: string, target: string, pick: "loading" | "below" | "above" = "loading"): Loading {
  const [result] = load(inventory, { targets: [{ implement, target }] }).results;
  const loading = result?.[pick];
  if (!loading) throw new Error(`No ${pick} loading for ${implement} ${target}`);
  return loading;
}

describe("kettlebell drawing", () => {
  it("stacks the plates outward from the handle's base, heaviest innermost, at the barbell picture's sizes and colours (example 8)", () => {
    const { plates, base } = drawStack("kettlebell", loadingFor("kettlebell", "80lb"), inventory);
    expect(plates.map(({ weight, width, height }) => [weight, width, height])).toEqual([
      [22.5, 1.875, 6.7],
      ...Array.from({ length: 6 }, () => [5, 0.5, 6.7]),
      [2.5, 0.25, 6.7],
    ]);
    expect(plates[0]!.x).toBeCloseTo(base.x + base.width);
    for (let i = 1; i < plates.length; i++) expect(plates[i]!.x).toBeCloseTo(plates[i - 1]!.x + plates[i - 1]!.width);
    for (const plate of plates) expect(plate.fill).toBe(plateColour(plate.weight, "lb").fill);
  });

  it("draws the locking screw outside the last plate and names it (example 8)", () => {
    const { plates, screw } = drawStack("kettlebell", loadingFor("kettlebell", "80lb"), inventory);
    const last = plates.at(-1)!;
    expect(screw?.x).toBeCloseTo(last.x + last.width);
    expect(screw?.name).toBe("Long locking screw");
  });

  it("names the standard locking screw on a lighter kettlebell", () => {
    expect(drawStack("kettlebell", loadingFor("kettlebell", "40lb"), inventory).screw?.name).toBe("Standard locking screw");
  });

  it("draws every single kettlebell picture at one scale", () => {
    const light = drawStack("kettlebell", loadingFor("kettlebell", "22.5lb"), inventory);
    const heavy = drawStack("kettlebell", loadingFor("kettlebell", "80lb"), inventory);
    expect(light.width).toBe(heavy.width);
  });
});

describe("leg attachment drawing", () => {
  it("stacks the plates outward from the lever with no locking hardware (example 12)", () => {
    const { plates, base, screw } = drawStack("leg", loadingFor("leg", "50lb"), inventory);
    expect(plates.map((plate) => plate.weight)).toEqual([22.5, 22.5, 5]);
    expect(plates[0]!.x).toBeCloseTo(base.x + base.width);
    expect(screw).toBeUndefined();
  });

  it("draws the plate holder past the last plate", () => {
    const { plates, holder } = drawStack("leg", loadingFor("leg", "100lb"), inventory);
    const last = plates.at(-1)!;
    expect(holder.x + holder.length).toBeGreaterThan(last.x + last.width);
  });
});

describe("stack drawing: side by side", () => {
  it("shares one scale between the pictures of an impossible target", () => {
    const below = loadingFor("kettlebell", "81lb", "below");
    const above = loadingFor("kettlebell", "24lb", "above");
    const pair = [below, above].map((loading) => drawStack("kettlebell", loading, inventory, { sideBySide: [below, above] }));
    expect(pair[0]!.width).toBe(pair[1]!.width);
  });
});
