import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App";

afterEach(cleanup);

function text(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function openReverse(tab = "Barbell") {
  render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: tab }));
  fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name: "Reverse" }));
}

function add(name: string, times = 1) {
  const button = screen.getByRole("button", { name });
  for (let i = 0; i < times; i++) fireEvent.click(button);
}

const total = () => text(screen.getByRole("region", { name: "Total" }));
const picture = () => screen.getByRole("group", { name: /inside to outside|^Front:/ });
const labels = (svg: HTMLElement) => [...svg.querySelectorAll("text")].map((label) => label.textContent);

function buildExample2() {
  add("Add 22.5 lb to each side", 2);
  add("Add 5 lb to each side", 6);
  add("Add 2.5 lb to each side");
}

describe("barbell Reverse screen: worked examples (spec section 7)", () => {
  it("example 2: each side 2 × 22.5, 6 × 5, 1 × 2.5 totals 173 lb (78.5 kg)", () => {
    openReverse();
    buildExample2();
    expect(total()).toContain("173 lb 78.5 kg");
  });

  it("example 2: draws the same picture as Load, one side of the bar with the clamp collar", () => {
    openReverse();
    buildExample2();
    expect(picture().getAttribute("aria-label")).toBe(
      'Each side, inside to outside: 22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, then the Mirafit 1" clamp collar',
    );
    expect(labels(picture())).toEqual(["22.5", "22.5", "5", "5", "5", "5", "5", "5", "2.5", "Clamp collar"]);
  });

  it("example 1: example 2 plus 1 micro plate on each side totals 175.5 lb (79.6 kg)", () => {
    openReverse();
    buildExample2();
    add("Add 1.25 lb to each side");
    expect(total()).toContain("175.5 lb 79.6 kg");
    expect(screen.queryByRole("list", { name: "Warnings" })).toBeNull();
  });

  it("example 3: each side 2 × 22.5, 12 × 5 totals 228 lb, the heaviest allowed, with no warnings", () => {
    openReverse();
    add("Add 22.5 lb to each side", 2);
    add("Add 5 lb to each side", 12);
    expect(total()).toContain("228 lb 103.4 kg");
    expect(screen.queryByRole("list", { name: "Warnings" })).toBeNull();
  });

  it("example 3: warns when the plates go over the 210 lb plate limit", () => {
    openReverse();
    add("Add 22.5 lb to each side", 2);
    add("Add 5 lb to each side", 12);
    add("Add 2.5 lb to each side");
    expect(total()).toContain("233 lb");
    expect(text(warnings())).toContain("The plates total 215 lb, over the 210 lb plate limit.");
  });

  it("removes a plate from each side when it is tapped in the picture", () => {
    openReverse();
    buildExample2();
    fireEvent.click(within(picture()).getAllByRole("button", { name: "Remove 22.5 lb from each side" })[0]!);
    expect(total()).toContain("128 lb 58.1 kg");
    expect(picture().getAttribute("aria-label")).toBe(
      'Each side, inside to outside: 22.5, 5, 5, 5, 5, 5, 5, 2.5, then the Mirafit 1" clamp collar',
    );
  });
});

describe("Reverse screen: options", () => {
  it("uses the collar choice, shared with the Load screen", () => {
    openReverse();
    add("Add 5 lb to each side");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Collars" })).getByRole("radio", { name: "None" }));
    expect(picture().getAttribute("aria-label")).toBe("Each side, inside to outside: 5");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name: "Load" }));
    expect(within(screen.getByRole("radiogroup", { name: "Collars" })).getByRole("radio", { name: "None" })).toHaveProperty("checked", true);
  });

  it("clears every plate", () => {
    openReverse();
    buildExample2();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(total()).toContain("18 lb 8.2 kg");
    expect(picture().getAttribute("aria-label")).toBe('Each side, inside to outside: no plates, then the Mirafit 1" clamp collar');
  });

  it("starts empty again on another implement", () => {
    openReverse();
    buildExample2();
    fireEvent.click(screen.getByRole("tab", { name: "Kettlebell" }));
    fireEvent.click(screen.getByRole("tab", { name: "Barbell" }));
    expect(total()).toContain("18 lb");
  });
});

describe("dumbbell Reverse screen: worked examples (spec section 7)", () => {
  const mirrorSwitch = () => screen.getByRole("switch", { name: "Mirror ends" });
  const chooseOne = () => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Dumbbells" })).getByRole("radio", { name: "One" }));

  it("mirrors the ends by default", () => {
    openReverse("Dumbbells");
    expect(mirrorSwitch().getAttribute("aria-checked")).toBe("true");
  });

  it("example 4: each end 3 × 5 totals 40 lb with standard screws", () => {
    openReverse("Dumbbells");
    add("Add 5 lb to each end", 3);
    expect(total()).toContain("40 lb 18.1 kg");
    expect(picture().getAttribute("aria-label")).toBe("Each end, inside to outside: 5, 5, 5, then a standard locking screw");
  });

  it("example 5: with mirroring off, one 2.5 lb plate on end A totals 12.5 lb and marks end A heavier", () => {
    openReverse("Dumbbells");
    chooseOne();
    fireEvent.click(mirrorSwitch());
    add("Add 2.5 lb to end A");
    expect(total()).toContain("12.5 lb 5.7 kg");
    expect(labels(picture())).toEqual(["End A heavier", "2.5", "Standard locking screws"]);
  });

  it("example 6: with mirroring off, builds 4 × 5 on end A and 3 × 5 + 1 × 2.5 on end B for 47.5 lb", () => {
    openReverse("Dumbbells");
    chooseOne();
    fireEvent.click(mirrorSwitch());
    add("Add 5 lb to end A", 4);
    add("Add 5 lb to end B", 3);
    add("Add 2.5 lb to end B");
    expect(total()).toContain("47.5 lb 21.5 kg");
  });

  it("example 7: each end 1 × 22.5, 6 × 5, 1 × 2.5 totals 120 lb per dumbbell with long screws, and the pair fits the plate pool", () => {
    openReverse("Dumbbells");
    add("Add 22.5 lb to each end");
    add("Add 5 lb to each end", 6);
    add("Add 2.5 lb to each end");
    expect(total()).toContain("120 lb 54.4 kg");
    expect(picture().getAttribute("aria-label")).toBe("Each end, inside to outside: 22.5, 5, 5, 5, 5, 5, 5, 2.5, then a long locking screw");
    expect(screen.queryByRole("list", { name: "Warnings" })).toBeNull();
  });

  it("with mirroring off, tapping a plate removes it from its own end only", () => {
    openReverse("Dumbbells");
    add("Add 5 lb to each end", 3);
    fireEvent.click(mirrorSwitch());
    fireEvent.click(within(picture()).getAllByRole("button", { name: "Remove 5 lb from end B" })[0]!);
    expect(total()).toContain("35 lb");
  });

  it("with mirroring on, tapping a plate removes it from both ends", () => {
    openReverse("Dumbbells");
    add("Add 5 lb to each end", 3);
    fireEvent.click(within(picture()).getAllByRole("button", { name: "Remove 5 lb from each end" })[0]!);
    expect(total()).toContain("30 lb");
  });

  it("gives the barbell no mirroring switch", () => {
    openReverse();
    expect(screen.queryByRole("switch", { name: "Mirror ends" })).toBeNull();
  });

  it("starts on the bare handle, 5 lb with no locking screws", () => {
    openReverse("Dumbbells");
    expect(total()).toContain("5 lb 2.3 kg");
  });

  it("notes the heavier end of an uneven dumbbell", () => {
    openReverse("Dumbbells");
    chooseOne();
    fireEvent.click(mirrorSwitch());
    add("Add 2.5 lb to end A");
    expect(text(notes())).toContain("Uneven: end A is 2.5 lb heavier than end B.");
  });
});

const warnings = () => within(screen.getByRole("region", { name: "Total" })).getByRole("list", { name: "Warnings" });
const notes = () => within(screen.getByRole("region", { name: "Total" })).getByRole("list", { name: "Notes" });

describe("kettlebell, leg attachment and vest Reverse screens: worked examples (spec section 7)", () => {
  it("example 8: a kettlebell stack of 1 × 22.5, 6 × 5, 1 × 2.5 totals 80 lb with the long locking screw", () => {
    openReverse("Kettlebell");
    add("Add 22.5 lb to the stack");
    add("Add 5 lb to the stack", 6);
    add("Add 2.5 lb to the stack");
    expect(total()).toContain("80 lb 36.3 kg");
    expect(labels(picture())).toContain("Long locking screw");
  });

  it("starts the kettlebell on the bare handle, 22.5 lb", () => {
    openReverse("Kettlebell");
    expect(total()).toContain("22.5 lb 10.2 kg");
  });

  it("example 12: a leg attachment stack of 2 × 22.5, 1 × 5 totals 50 lb, with the plate-weight note", () => {
    openReverse("Leg attachment");
    add("Add 22.5 lb to the stack", 2);
    add("Add 5 lb to the stack");
    expect(total()).toContain("50 lb 22.7 kg");
    expect(text(notes())).toContain("Plate weight only. The lever changes the resistance you feel.");
  });

  it("example 13: 6 blocks on the front and 6 on the back total 12 kg, kilograms first", () => {
    openReverse("Vest");
    add("Add 1 kg to the front", 6);
    add("Add 1 kg to the back", 6);
    expect(total()).toContain("12 kg 26.46 lb");
    expect(picture().getAttribute("aria-label")).toBe("Front: 6 blocks. Back: 6 blocks");
  });

  it("removes a vest block when it is tapped in the picture", () => {
    openReverse("Vest");
    add("Add 1 kg to the front", 2);
    fireEvent.click(within(picture()).getAllByRole("button", { name: "Remove 1 kg from the front" })[0]!);
    expect(total()).toContain("1 kg");
  });
});

describe("Reverse screen: rule warnings under the total (spec 6.6)", () => {
  it("shows no warnings for a loading that keeps every rule", () => {
    openReverse();
    add("Add 22.5 lb to each side");
    expect(screen.queryByRole("list", { name: "Warnings" })).toBeNull();
  });

  it("warns when a side holds two micro plates, and still shows the total", () => {
    openReverse();
    add("Add 1.25 lb to each side", 2);
    expect(total()).toContain("23 lb");
    expect(text(warnings())).toContain("The left side holds 2 micro plates. It takes at most one.");
  });

  it("warns when a pair of dumbbells needs more plates than the plate pool holds", () => {
    openReverse("Dumbbells");
    add("Add 22.5 lb to each end", 2);
    expect(text(warnings())).toContain("The pair uses 8 × 22.5 lb plates. The plate pool holds 5.");
  });

  it("warns when the vest's blocks are not split evenly", () => {
    openReverse("Vest");
    add("Add 1 kg to the front");
    expect(text(warnings())).toContain("The blocks split 1 front and 0 back.");
  });

  it("names the unverified values the total uses", () => {
    openReverse();
    expect(text(notes())).toContain("Unverified: bar weight, collar weight");
  });
});
