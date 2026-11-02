import { describe, expect, it } from "vitest";
import { changed, olympic, owner } from "./kits";
import { plateColour } from "../src/plate-colours";

const red = "#c9353f";
const blue = "#2f67cc";
const yellow = "#e8b923";
const green = "#1c8a55";
const white = "#e9e9e9";

const fillOf = (inventory: typeof owner, id: string) => plateColour(inventory, inventory.plates.find((plate) => plate.id === id)!).fill;

describe("plate colours: a plate's colour wins (spec 17.7)", () => {
  it("draws the owner's plates in the colours their file sets", () => {
    expect(["ql-22.5", "ql-5", "ql-2.5", "ql-micro", "vest-block"].map((id) => fillOf(owner, id))).toEqual([
      "#c9353f",
      "#2f67cc",
      "#1c8a55",
      "#7a4fc4",
      "#a4521f",
    ]);
  });

  it("uses the Olympic kit's 20 kg colour, set in its file", () => {
    expect(fillOf(olympic, "20")).toBe("#1e5bb8");
  });

  it("chooses dark ink on a light colour and light ink on a dark one", () => {
    const kit = changed(olympic, (copy) => {
      copy.plates[0]!.colour = "#f4d03f";
    });
    expect(plateColour(kit, kit.plates[0]!).ink).toBe("#16191d");
    expect(plateColour(owner, owner.plates[0]!).ink).toBe("#ffffff");
  });
});

describe("plate colours: the palette by rank of distinct weights (spec 17.7)", () => {
  const plain = changed(olympic, (copy) => {
    for (const plate of copy.plates) delete plate.colour;
  });

  it("gives the kit's distinct weights, heaviest first, red, blue, yellow and green, and the carrier plate its own rank", () => {
    expect(fillOf(plain, "20")).toBe(red);
    expect(fillOf(plain, "10")).toBe(blue);
    expect(fillOf(plain, "carrier-8")).toBe(yellow);
    expect(fillOf(plain, "5")).toBe(green);
    expect(fillOf(plain, "2.5")).toBe(white);
  });

  it("counts a weight once, so two plates of one weight share its colour", () => {
    const bumpers = changed(plain, (copy) => {
      copy.plates.push({ ...copy.plates[1]!, id: "bumper-10" });
    });
    expect(fillOf(bumpers, "bumper-10")).toBe(blue);
    expect(fillOf(bumpers, "5")).toBe(green);
  });

  it("ranks weights within each unit, so a lb plate and a kg plate can share a rank", () => {
    const mixed = changed(plain, (copy) => {
      copy.plateTypes.push({ id: "standard", name: "Standard", unit: "lb", bore: "standard" });
      copy.plates.push({
        id: "lb-45",
        type: "standard",
        count: 2,
        weight: { listed: 45, status: "verified" },
        stackLength: { listed: 30, status: "verified" },
        shape: "round",
      });
    });
    expect(fillOf(mixed, "lb-45")).toBe(red);
    expect(fillOf(mixed, "20")).toBe(red);
  });

  it("keeps the palette's colour when a plate with colour set sits between plates without", () => {
    expect(fillOf(olympic, "10")).toBe(blue);
  });

  it("marks a near-white plate for a steel outline", () => {
    expect(plateColour(plain, plain.plates.find((plate) => plate.id === "2.5")!).outline).toBe(true);
    expect(plateColour(plain, plain.plates.find((plate) => plate.id === "20")!).outline).toBe(false);
  });
});
