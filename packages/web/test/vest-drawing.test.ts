import { load, type Loading } from "@plate-pool/core";
import { describe, expect, it } from "vitest";
import { inventory } from "../src/inventory";
import { plateColour } from "../src/plate-colours";
import { drawVest } from "../src/vest-drawing";

function loadingFor(target: string): Loading {
  const [result] = load(inventory, { targets: [{ implement: "vest", target }] }).results;
  if (!result?.loading) throw new Error(`No loading for vest ${target}`);
  return result.loading;
}

describe("vest drawing", () => {
  it("draws a front grid and a back grid, each with room for half the vest's 30 blocks", () => {
    const { panels } = drawVest(loadingFor("12kg"), inventory);
    expect(panels.map((panel) => panel.name)).toEqual(["Front", "Back"]);
    for (const panel of panels) expect(panel.slots).toHaveLength(15);
  });

  it("fills one slot per block, with the extra block of an odd count on the back", () => {
    const { panels } = drawVest(loadingFor("13kg"), inventory);
    expect(panels.map((panel) => panel.slots.filter((slot) => slot.block).length)).toEqual([6, 7]);
  });

  it("labels each block with its weight and colours it by weight, unlike any Quick-Lock plate", () => {
    const { panels } = drawVest(loadingFor("2kg"), inventory);
    const blocks = panels.flatMap((panel) => panel.slots.flatMap((slot) => (slot.block ? [slot.block] : [])));
    expect(blocks.map((block) => block.label)).toEqual(["1", "1"]);
    const fill = plateColour(1, "kg").fill;
    for (const block of blocks) expect(block.fill).toBe(fill);
    expect([22.5, 5, 2.5, 1.25].map((weight) => plateColour(weight, "lb").fill)).not.toContain(fill);
  });

  it("draws both grids empty for an empty vest", () => {
    const empty: Loading = {
      total: { kg: 0, lb: 0 },
      hardware: [],
      positions: [
        { name: "front", plates: [] },
        { name: "back", plates: [] },
      ],
      uneven: false,
    };
    const { panels, description } = drawVest(empty, inventory);
    expect(panels.every((panel) => panel.slots.every((slot) => !slot.block))).toBe(true);
    expect(description).toBe("Front: no blocks. Back: no blocks");
  });
});
