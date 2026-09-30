import { load, type CollarChoice, type Loading } from "@plate-pool/core";
import { describe, expect, it } from "vitest";
import { drawBarbell } from "../src/barbell-drawing";
import { inventory } from "../src/inventory";

function loadingFor(target: string, collars: CollarChoice = "clamp", pick: "loading" | "below" | "above" = "loading"): Loading {
  const [result] = load(inventory, { targets: [{ implement: "barbell", target }], collars }).results;
  const loading = result?.[pick];
  if (!loading) throw new Error(`No ${pick} loading for ${target}`);
  return loading;
}

describe("barbell drawing: plates at relative size", () => {
  it("draws each plate as wide as its stack length and Quick-Lock plates 6.7 in high (example 2, 173 lb)", () => {
    const drawing = drawBarbell(loadingFor("173"), inventory);
    expect(drawing.plates.map(({ weight, width, height }) => [weight, width, height])).toEqual([
      [22.5, 1.875, 6.7],
      [22.5, 1.875, 6.7],
      [5, 0.5, 6.7],
      [5, 0.5, 6.7],
      [5, 0.5, 6.7],
      [5, 0.5, 6.7],
      [5, 0.5, 6.7],
      [5, 0.5, 6.7],
      [2.5, 0.25, 6.7],
    ]);
  });

  it("stacks the plates outward from the inner stop with no gaps, heaviest innermost", () => {
    const { plates, sleeve } = drawBarbell(loadingFor("173"), inventory);
    expect(plates[0]?.x).toBe(sleeve.x);
    for (let i = 1; i < plates.length; i++) {
      const previous = plates[i - 1]!;
      expect(plates[i]?.x).toBeCloseTo(previous.x + previous.width);
    }
  });

  it("draws the micro plate as a smaller round disc, outermost (example 1, above: 175.5 lb)", () => {
    const { plates } = drawBarbell(loadingFor("175", "clamp", "above"), inventory);
    const micro = plates.at(-1);
    expect(micro?.weight).toBe(1.25);
    expect(micro?.round).toBe(true);
    expect(micro?.width).toBe(0.25);
    expect(micro?.height).toBeLessThan(6.7);
    expect(plates.filter((plate) => plate.round)).toHaveLength(1);
  });

  it("draws the full 11.5 in sleeve so every barbell picture shares one scale", () => {
    const light = drawBarbell(loadingFor("23"), inventory);
    const heavy = drawBarbell(loadingFor("228"), inventory);
    expect(light.sleeve.length).toBe(11.5);
    expect(light.width).toBe(heavy.width);
  });

  it("crops the empty sleeve for pictures shown side by side, at one shared scale (example 1)", () => {
    const below = loadingFor("175", "clamp", "below");
    const above = loadingFor("175", "clamp", "above");
    const full = drawBarbell(above, inventory);
    const pair = [below, above].map((loading) => drawBarbell(loading, inventory, { sideBySide: [below, above] }));
    expect(pair[0]?.width).toBe(pair[1]?.width);
    expect(pair[1]!.width).toBeLessThan(full.width);
    const collar = pair[1]!.collar!;
    expect(collar.x + collar.width).toBeLessThan(pair[1]!.width);
    expect(pair[1]?.plates.map((plate) => plate.width)).toEqual(full.plates.map((plate) => plate.width));
  });

  it("keeps a side-by-side picture of a bare bar wide enough to read", () => {
    const bare = loadingFor("18");
    const drawing = drawBarbell(bare, inventory, { sideBySide: [bare] });
    expect(drawing.width).toBeGreaterThanOrEqual(drawing.height);
  });
});

describe("barbell drawing: labels and colours", () => {
  it("labels each plate with its weight", () => {
    const { plates } = drawBarbell(loadingFor("175", "clamp", "above"), inventory);
    expect(plates.map((plate) => plate.label.text)).toEqual(["22.5", "22.5", "5", "5", "5", "5", "5", "5", "2.5", "1.25"]);
  });

  it("puts a label inside its plate when it fits, and above the plates with a leader line when it does not", () => {
    const { plates } = drawBarbell(loadingFor("175", "clamp", "above"), inventory);
    const byWeight = (weight: number) => plates.find((plate) => plate.weight === weight)!;
    expect(byWeight(22.5).label.inside).toBe(true);
    expect(byWeight(5).label.inside).toBe(true);
    expect(byWeight(2.5).label.inside).toBe(false);
    expect(byWeight(2.5).leader).toBeDefined();
    expect(byWeight(1.25).label.inside).toBe(false);
  });

  it("keeps labels above the plates apart from each other", () => {
    const { plates, fontSize } = drawBarbell(loadingFor("175", "clamp", "above"), inventory);
    const outside = plates.filter((plate) => !plate.label.inside).map((plate) => plate.label);
    for (let i = 1; i < outside.length; i++) {
      const gap = outside[i]!.x - outside[i - 1]!.x;
      expect(gap).toBeGreaterThanOrEqual(fontSize * 1.5);
    }
  });

  it("colours plates by weight: the same weight has the same colour in every picture", () => {
    const first = drawBarbell(loadingFor("175", "clamp", "above"), inventory).plates;
    const second = drawBarbell(loadingFor("38", "none"), inventory).plates;
    const colours = new Map<number, string>();
    for (const plate of [...first, ...second]) {
      const seen = colours.get(plate.weight);
      if (seen) expect(plate.fill).toBe(seen);
      colours.set(plate.weight, plate.fill);
    }
    expect([...colours.keys()].sort((a, b) => a - b)).toEqual([1.25, 2.5, 5, 22.5]);
    expect(new Set(colours.values()).size).toBe(4);
  });
});

describe("barbell drawing: collars", () => {
  it("draws the clamp collar outside the last plate at its 1.26 in width, and names it", () => {
    const { plates, collar } = drawBarbell(loadingFor("173"), inventory);
    const last = plates.at(-1)!;
    expect(collar?.x).toBeCloseTo(last.x + last.width);
    expect(collar?.width).toBe(1.26);
    expect(collar?.name).toBe("Clamp collar");
  });

  it("names the spin-lock collar", () => {
    expect(drawBarbell(loadingFor("173", "spinlock"), inventory).collar?.name).toBe("Spin-lock collar");
  });

  it("draws no collar when the loading has none", () => {
    expect(drawBarbell(loadingFor("173", "none"), inventory).collar).toBeUndefined();
  });

  it("puts the collar against the inner stop on a bare bar", () => {
    const { plates, collar, sleeve } = drawBarbell(loadingFor("18"), inventory);
    expect(plates).toEqual([]);
    expect(collar?.x).toBe(sleeve.x);
  });
});
