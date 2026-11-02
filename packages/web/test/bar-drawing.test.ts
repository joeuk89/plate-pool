import { load, type Inventory, type Loading } from "@plate-pool/core";
import { describe, expect, it } from "vitest";
import { drawBar } from "../src/bar-drawing";
import { MIN_PLATE_WIDTH, PLATE_HEIGHT, textWidth, FONT_SIZE } from "../src/plate-stack";
import { changed, olympic, owner } from "./kits";

function loadingFor(
  inventory: Inventory,
  implement: string,
  target: string,
  hardware?: string,
  pick: "loading" | "below" | "above" = "loading",
): Loading {
  const [result] = load(inventory, {
    targets: [{ implement, target }],
    ...(hardware ? { hardware: { [implement]: hardware } } : {}),
  }).results;
  const loading = result?.[pick];
  if (!loading) throw new Error(`No ${pick} loading for ${target}`);
  return loading;
}

const ownerBar = (target: string, hardware?: string, pick?: "loading" | "below" | "above") =>
  loadingFor(owner, "barbell", target, hardware, pick);

describe("bar drawing: plate sizes (spec 17.7)", () => {
  it("draws the owner's square plates at full height, as wide as their stack length or a two-digit label (example 2, 173 lb)", () => {
    const drawing = drawBar("barbell", ownerBar("173lb"), owner);
    const wide = (stackLength: number) => Math.max(stackLength, MIN_PLATE_WIDTH);
    expect(drawing.plates.map(({ weight, width, height }) => [weight, width, height])).toEqual([
      [22.5, 1.875, PLATE_HEIGHT],
      [22.5, 1.875, PLATE_HEIGHT],
      ...Array.from({ length: 6 }, () => [5, wide(0.5), PLATE_HEIGHT]),
      [2.5, wide(0.25), PLATE_HEIGHT],
    ]);
  });

  it("makes the minimum width hold a two-digit label inside", () => {
    expect(MIN_PLATE_WIDTH).toBeGreaterThanOrEqual(textWidth("20", FONT_SIZE));
  });

  it("stacks the plates outward from the inner stop with no gaps, heaviest innermost", () => {
    const { plates, sleeve } = drawBar("barbell", ownerBar("173lb"), owner);
    expect(plates[0]?.x).toBe(sleeve.x);
    for (let i = 1; i < plates.length; i++) {
      const previous = plates[i - 1]!;
      expect(plates[i]?.x).toBeCloseTo(previous.x + previous.width);
    }
  });

  it("draws the 5 in micro plate as the same rounded rectangle in the 0.78 band, outermost (example 1, above: 175.5 lb)", () => {
    const { plates } = drawBar("barbell", ownerBar("175lb", undefined, "above"), owner);
    const micro = plates.at(-1)!;
    expect(micro.weight).toBe(1.25);
    expect(micro.height).toBeCloseTo(PLATE_HEIGHT * 0.78);
    expect(micro).not.toHaveProperty("round");
  });

  it("draws a 450 mm plate in the full band and a 160 mm plate in the smallest on the same bar", () => {
    const kit = changed(olympic, (copy) => {
      copy.plates.push({
        id: "1.25",
        type: "olympic",
        count: 2,
        weight: { listed: 1.25, status: "verified" },
        stackLength: { listed: 15, status: "verified" },
        diameter: 160,
        shape: "round",
      });
    });
    const { plates } = drawBar("bar", loadingFor(kit, "bar", "63kg"), kit);
    expect(plates.map(({ weight, height }) => [weight, height])).toEqual([
      [20, PLATE_HEIGHT],
      [1.25, PLATE_HEIGHT * 0.42],
    ]);
  });

  it("starts the bands at 0.85, 0.6 and 0.4 of the largest plate", () => {
    const kit = changed(olympic, (copy) => {
      const diameters: Record<string, number> = { "20": 450, "10": 383, "5": 380, "2.5": 180 };
      for (const plate of copy.plates) if (diameters[plate.id]) plate.diameter = diameters[plate.id]!;
    });
    const { plates } = drawBar("bar", loadingFor(kit, "bar", "95.5kg"), kit);
    expect(plates.map(({ weight, height }) => [weight, height / PLATE_HEIGHT])).toEqual([
      [20, 1],
      [10, 1],
      [5, 0.78],
      [2.5, 0.58],
    ]);
  });

  it("caps the scale at maxPlateDiameter, so a 300 mm cap with 450 mm and 250 mm plates draws the 250 mm plate at 250 / 300", () => {
    const kit = changed(olympic, (copy) => {
      const bar = copy.implements.find((item) => item.id === "bar")!;
      bar.maxPlateDiameter = 300;
      for (const plate of copy.plates) if (plate.id === "10") plate.diameter = 250;
    });
    const { plates } = drawBar("bar", loadingFor(kit, "bar", "40.5kg"), kit);
    expect(plates.map(({ weight, height }) => [weight, height / PLATE_HEIGHT])).toEqual([[10, 0.78]]);
  });

  it("scales a millimetre kit to its largest plate, so a 415 mm sleeve draws 415 / 450 of a plate's height (example 25)", () => {
    const drawing = drawBar("bar", loadingFor(olympic, "bar", "95.5kg"), olympic);
    const factor = PLATE_HEIGHT / 450;
    expect(drawing.plates.map(({ height }) => height)).toEqual([PLATE_HEIGHT, PLATE_HEIGHT, PLATE_HEIGHT * 0.58, PLATE_HEIGHT * 0.58]);
    expect(drawing.plates.map(({ width }) => width)).toEqual([55, 40, 25, 20].map((length) => Math.max(length * factor, MIN_PLATE_WIDTH)));
    expect(drawing.sleeve.length).toBeCloseTo(415 * factor);
  });

  it("gives a 15 mm plate room for a two-digit label inside, or a leader above", () => {
    const kit = changed(olympic, (copy) => {
      copy.plates.find((plate) => plate.id === "10")!.stackLength = { listed: 15, status: "verified" };
      copy.plates.find((plate) => plate.id === "2.5")!.stackLength = { listed: 15, status: "verified" };
    });
    const { plates } = drawBar("bar", loadingFor(kit, "bar", "95.5kg"), kit);
    const ten = plates.find((plate) => plate.weight === 10)!;
    const small = plates.find((plate) => plate.weight === 2.5)!;
    expect(ten.width).toBe(MIN_PLATE_WIDTH);
    expect(ten.label.inside).toBe(true);
    expect(small.label.inside).toBe(false);
    expect(small.leader).toBeDefined();
  });

  it("draws a plate with no diameter at full height", () => {
    const kit = changed(olympic, (copy) => {
      delete copy.plates.find((plate) => plate.id === "5")!.diameter;
    });
    const { plates } = drawBar("bar", loadingFor(kit, "bar", "95.5kg"), kit);
    expect(plates.find((plate) => plate.weight === 5)!.height).toBe(PLATE_HEIGHT);
  });

  it("draws the full sleeve so light and heavy loadings share one scale", () => {
    const light = drawBar("barbell", ownerBar("23lb"), owner);
    const middle = drawBar("barbell", ownerBar("113lb"), owner);
    expect(light.sleeve.length).toBe(11.5);
    expect(light.width).toBe(middle.width);
  });

  it("crops the empty sleeve for pictures shown side by side, at one shared scale (example 1)", () => {
    const below = ownerBar("175lb", undefined, "below");
    const above = ownerBar("175lb", undefined, "above");
    const full = drawBar("barbell", above, owner);
    const pair = [below, above].map((loading) => drawBar("barbell", loading, owner, { sideBySide: [below, above] }));
    expect(pair[0]?.width).toBe(pair[1]?.width);
    expect(pair[1]!.width).toBeLessThan(full.width);
    const collar = pair[1]!.hardware!;
    expect(collar.x + collar.width).toBeLessThan(pair[1]!.width);
    expect(pair[1]?.plates.map((plate) => plate.width)).toEqual(full.plates.map((plate) => plate.width));
  });

  it("keeps a side-by-side picture of a bare bar wide enough to read", () => {
    const bare = ownerBar("18lb");
    const drawing = drawBar("barbell", bare, owner, { sideBySide: [bare] });
    expect(drawing.width).toBeGreaterThanOrEqual(drawing.height);
  });
});

describe("bar drawing: labels", () => {
  it("labels each plate with its weight", () => {
    const { plates } = drawBar("barbell", ownerBar("175lb", undefined, "above"), owner);
    expect(plates.map((plate) => plate.label.text)).toEqual(["22.5", "22.5", "5", "5", "5", "5", "5", "5", "2.5", "1.25"]);
  });

  it("puts a label inside its plate when it fits, and above the plates with a leader line when it does not", () => {
    const { plates } = drawBar("barbell", ownerBar("175lb", undefined, "above"), owner);
    const byWeight = (weight: number) => plates.find((plate) => plate.weight === weight)!;
    expect(byWeight(22.5).label.inside).toBe(true);
    expect(byWeight(5).label.inside).toBe(true);
    expect(byWeight(2.5).label.inside).toBe(false);
    expect(byWeight(2.5).leader).toBeDefined();
    expect(byWeight(1.25).label.inside).toBe(false);
  });

  it("keeps labels above the plates apart from each other", () => {
    const { plates } = drawBar("barbell", ownerBar("175lb", undefined, "above"), owner);
    const outside = plates.filter((plate) => !plate.label.inside).map((plate) => plate.label);
    for (let i = 1; i < outside.length; i++) {
      expect(outside[i]!.x - outside[i - 1]!.x).toBeGreaterThanOrEqual(FONT_SIZE * 1.5);
    }
  });
});

describe("bar drawing: hardware (spec 17.7)", () => {
  it("draws the clamp collar outside the last plate at its 1.26 in width, named by its name", () => {
    const { plates, hardware } = drawBar("barbell", ownerBar("173lb"), owner);
    const last = plates.at(-1)!;
    expect(hardware?.x).toBeCloseTo(last.x + last.width);
    expect(hardware?.width).toBe(1.26);
    expect(hardware?.kind).toBe("collar");
    expect(hardware?.label.text).toBe('Mirafit 1" clamp collar');
  });

  it("names the spin-lock collar by its name and draws it at the collar block's width", () => {
    const { hardware } = drawBar("barbell", ownerBar("175lb", "collar-spinlock"), owner);
    expect(hardware?.label.text).toBe("Ironmaster spin-lock collar");
    expect(hardware?.width).toBe(1);
  });

  it("sets a millimetre collar's drawn width from its width", () => {
    const { hardware } = drawBar("bar", loadingFor(olympic, "bar", "95.5kg"), olympic);
    expect(hardware?.width).toBeCloseTo((60 * PLATE_HEIGHT) / 450);
    expect(hardware?.label.text).toBe("Spring collar");
  });

  it("draws no hardware when the loading has none", () => {
    expect(drawBar("barbell", ownerBar("173lb", "none"), owner).hardware).toBeUndefined();
  });

  it("puts the collar against the inner stop on a bare bar", () => {
    const { plates, hardware, sleeve } = drawBar("barbell", ownerBar("18lb"), owner);
    expect(plates).toEqual([]);
    expect(hardware?.x).toBe(sleeve.x);
  });

  it("widens the picture to fit plates that run past the end of the sleeve, as a Reverse loading can", () => {
    const tooLong: Loading = {
      total: { lb: 243, kg: 110.2 },
      hardware: [{ id: "collar-clamp", count: 2 }],
      positions: ["left", "right"].map((name) => ({ name, plates: Array<number>(6).fill(22.5), ids: Array<string>(6).fill("ql-22.5") })),
      uneven: false,
    };
    const { hardware, width } = drawBar("barbell", tooLong, owner);
    expect(hardware!.x + hardware!.width).toBeLessThanOrEqual(width);
  });
});
