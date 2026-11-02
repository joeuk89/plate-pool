import { load, type Inventory, type Loading } from "@plate-pool/core";
import { describe, expect, it } from "vitest";
import { MIN_PLATE_WIDTH, PLATE_HEIGHT } from "../src/plate-stack";
import { drawStack } from "../src/stack-drawing";
import { changed, olympic, owner } from "./kits";

function loadingFor(implement: string, target: string, pick: "loading" | "below" | "above" = "loading", inventory: Inventory = owner): Loading {
  const [result] = load(inventory, { targets: [{ implement, target }] }).results;
  const loading = result?.[pick];
  if (!loading) throw new Error(`No ${pick} loading for ${implement} ${target}`);
  return loading;
}

describe("stack drawing: a mount, a stop and a post (spec 17.7)", () => {
  it("stacks the plates outward from the stop, heaviest innermost (example 8)", () => {
    const { plates, stop, mount } = drawStack("kettlebell", loadingFor("kettlebell", "80lb"), owner);
    expect(plates.map(({ weight, width, height }) => [weight, width, height])).toEqual([
      [22.5, 1.875, PLATE_HEIGHT],
      ...Array.from({ length: 6 }, () => [5, MIN_PLATE_WIDTH, PLATE_HEIGHT]),
      [2.5, MIN_PLATE_WIDTH, PLATE_HEIGHT],
    ]);
    expect(mount.x + mount.width).toBeCloseTo(stop.x);
    expect(plates[0]!.x).toBeCloseTo(stop.x + stop.width);
    for (let i = 1; i < plates.length; i++) expect(plates[i]!.x).toBeCloseTo(plates[i - 1]!.x + plates[i - 1]!.width);
  });

  it("draws the screw disc outside the last plate and names it by its name (example 8)", () => {
    const { plates, hardware } = drawStack("kettlebell", loadingFor("kettlebell", "80lb"), owner);
    const last = plates.at(-1)!;
    expect(hardware?.x).toBeCloseTo(last.x + last.width);
    expect(hardware?.kind).toBe("screw");
    expect(hardware?.label.text).toBe("Long locking screw");
  });

  it("names the standard locking screw on a lighter kettlebell", () => {
    expect(drawStack("kettlebell", loadingFor("kettlebell", "40lb"), owner).hardware?.label.text).toBe("Standard locking screw");
  });

  it("draws light and middling kettlebells at one scale", () => {
    const light = drawStack("kettlebell", loadingFor("kettlebell", "22.5lb"), owner);
    const middle = drawStack("kettlebell", loadingFor("kettlebell", "40lb"), owner);
    expect(light.width).toBe(middle.width);
  });

  it("draws a stack with no hardware, such as the leg attachment, with none (example 12)", () => {
    const { plates, hardware } = drawStack("leg", loadingFor("leg", "50lb"), owner);
    expect(plates.map((plate) => plate.weight)).toEqual([22.5, 22.5, 5]);
    expect(hardware).toBeUndefined();
  });

  it("draws the post past the last plate", () => {
    const { plates, post } = drawStack("leg", loadingFor("leg", "100lb"), owner);
    const last = plates.at(-1)!;
    expect(post.x + post.length).toBeGreaterThan(last.x + last.width);
  });

  it("draws a pin as a rod named by its name", () => {
    const kit = changed(olympic, (copy) => {
      copy.hardware.push({ id: "pin", name: "Loading pin", kind: "pin", count: 1, unit: "kg", weight: { listed: 0, status: "verified" } });
      copy.implements[2]!.hardware = { options: ["pin"], perPosition: 1 };
    });
    const { hardware, description } = drawStack("belt", loadingFor("belt", "20kg", "loading", kit), kit);
    expect(hardware?.kind).toBe("pin");
    expect(hardware?.label.text).toBe("Loading pin");
    expect(hardware!.height).toBeGreaterThan(hardware!.width * 10);
    expect(description).toBe("Stack, inside to outside: 20, then the loading pin");
  });
});

describe("stack drawing: side by side", () => {
  it("shares one scale between the pictures of an impossible target", () => {
    const below = loadingFor("kettlebell", "81lb", "below");
    const above = loadingFor("kettlebell", "24lb", "above");
    const pair = [below, above].map((loading) => drawStack("kettlebell", loading, owner, { sideBySide: [below, above] }));
    expect(pair[0]!.width).toBe(pair[1]!.width);
  });

  it("shares one scale between a bare kettlebell handle and one with a locking screw", () => {
    const shown = [loadingFor("kettlebell", "24lb", "below"), loadingFor("kettlebell", "24lb", "above")];
    expect(shown.map((loading) => loading.hardware.length)).toEqual([0, 1]);
    const pair = shown.map((loading) => drawStack("kettlebell", loading, owner, { sideBySide: shown }));
    expect(pair[0]!.width).toBe(pair[1]!.width);
    expect(pair[0]!.height).toBe(pair[1]!.height);
  });
});
