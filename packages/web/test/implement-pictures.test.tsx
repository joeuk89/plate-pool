import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App";

afterEach(cleanup);

function open(tab: string, target: string) {
  render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: tab }));
  fireEvent.change(screen.getByLabelText("Target"), { target: { value: target } });
}

function chooseOne() {
  fireEvent.click(within(screen.getByRole("radiogroup", { name: "Dumbbells" })).getByRole("radio", { name: "One" }));
}

function picture(heading: RegExp = /Exact/) {
  const article = within(screen.getByRole("region", { name: "Result" })).getByRole("article", { name: heading });
  return within(article).getByRole("img");
}

function labels(svg: HTMLElement): string[] {
  return [...svg.querySelectorAll("text")].map((text) => text.textContent ?? "");
}

describe("dumbbell picture: worked examples (spec section 7)", () => {
  it("example 4: 40 lb pair draws both ends with 3 × 5 each and names the standard locking screws", () => {
    open("Dumbbells", "40");
    const svg = picture();
    expect(svg.getAttribute("aria-label")).toBe(
      "Each end, inside to outside: 5, 5, 5, then a standard locking screw",
    );
    expect(labels(svg)).toEqual(["5", "5", "5", "5", "5", "5", "Standard locking screws"]);
  });

  it("example 5: one 12.5 lb dumbbell marks end A, with its one 2.5 lb plate, as the heavier end", () => {
    open("Dumbbells", "12.5");
    chooseOne();
    const svg = picture();
    expect(svg.getAttribute("aria-label")).toBe(
      "End A, inside to outside: 2.5, then a standard locking screw. " +
        "End B, inside to outside: no plates, then a standard locking screw. End A is heavier",
    );
    expect(labels(svg)).toEqual(["End A heavier", "2.5", "Standard locking screws"]);
  });

  it("example 6: one 47.5 lb dumbbell draws 4 × 5 on end A and 3 × 5 + 1 × 2.5 on end B, end A heavier", () => {
    open("Dumbbells", "47.5");
    chooseOne();
    const svg = picture();
    expect(svg.getAttribute("aria-label")).toBe(
      "End A, inside to outside: 5, 5, 5, 5, then a standard locking screw. " +
        "End B, inside to outside: 5, 5, 5, 2.5, then a standard locking screw. End A is heavier",
    );
    expect(labels(svg)).toEqual(["End A heavier", "5", "5", "5", "5", "5", "5", "5", "2.5", "Standard locking screws"]);
  });

  it("example 7: 120 lb pair draws 1 × 22.5, 6 × 5, 1 × 2.5 on each end with long locking screws", () => {
    open("Dumbbells", "120");
    const svg = picture();
    expect(svg.getAttribute("aria-label")).toBe(
      "Each end, inside to outside: 22.5, 5, 5, 5, 5, 5, 5, 2.5, then a long locking screw",
    );
    expect(labels(svg).at(-1)).toBe("Long locking screws");
    expect(labels(svg).filter((label) => label === "22.5")).toHaveLength(2);
  });
});

describe("kettlebell and leg attachment pictures: worked examples (spec section 7)", () => {
  it("example 8: 80 lb kettlebell draws its one stack, 1 × 22.5, 6 × 5, 1 × 2.5, and names the long locking screw", () => {
    open("Kettlebell", "80");
    const svg = picture();
    expect(svg.getAttribute("aria-label")).toBe(
      "Stack, inside to outside: 22.5, 5, 5, 5, 5, 5, 5, 2.5, then the long locking screw",
    );
    expect(labels(svg)).toEqual(["22.5", "5", "5", "5", "5", "5", "5", "2.5", "Long locking screw"]);
  });

  it("draws a bare kettlebell handle with no screw", () => {
    open("Kettlebell", "22.5");
    const svg = picture();
    expect(svg.getAttribute("aria-label")).toBe("Stack, inside to outside: no plates");
    expect(labels(svg)).toEqual([]);
  });

  it("example 12: 50 lb leg attachment draws its one stack, 2 × 22.5, 1 × 5, with no locking hardware", () => {
    open("Leg attachment", "50");
    const svg = picture();
    expect(svg.getAttribute("aria-label")).toBe("Stack, inside to outside: 22.5, 22.5, 5");
    expect(labels(svg)).toEqual(["22.5", "22.5", "5"]);
  });
});

describe("vest picture: worked examples (spec section 7)", () => {
  it("example 13: 12 kg draws front and back grids with 6 blocks each, each labelled with its weight", () => {
    open("Vest", "12");
    const svg = picture();
    expect(svg.getAttribute("aria-label")).toBe("Front: 6 blocks. Back: 6 blocks");
    const six = Array.from({ length: 6 }, () => "1");
    expect(labels(svg)).toEqual([...six, "Front", ...six, "Back"]);
  });
});
