import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Loading, LoadResponse } from "@plate-pool/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../../cli/src/main.ts";
import { App } from "../src/App";
import { plateList } from "../src/describe";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

function text(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const card = (priority: number) => screen.getByRole("region", { name: new RegExp(`^${priority}\\. `) });
const cards = () => screen.getAllByRole("region", { name: /^\d\. / });
const result = (priority: number) => within(card(priority)).getByRole("region", { name: "Result" });
const leftover = () => screen.getByRole("region", { name: "Left over" });

function typeTarget(priority: number, value: string) {
  fireEvent.change(within(card(priority)).getByLabelText("Target"), { target: { value } });
}

function addImplement(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Add implement" }));
  fireEvent.click(within(screen.getByRole("group", { name: "Implement to add" })).getByRole("button", { name }));
}

function commandLine(...targets: string[]): LoadResponse {
  let stdout = "";
  const code = run(["load", ...targets, "--json"], {
    stdout: (output) => (stdout += output),
    stderr: () => {},
    defaultInventoryPath: join(dirname(fileURLToPath(import.meta.url)), "../../../inventory/inventory.json"),
  });
  expect(code).toBe(0);
  return JSON.parse(stdout) as LoadResponse;
}

function expectSameAsCommandLine(response: LoadResponse) {
  response.results.forEach((item, index) => {
    const recommended = item.loading ?? (item.recommended && item[item.recommended]);
    const shown = text(result(index + 1));
    const loading = recommended as Loading;
    expect(shown).toContain(`${loading.total.lb} lb`);
    for (const position of loading.positions) expect(shown).toContain(plateList(position.plates).replace(/\s/g, " "));
    for (const warning of item.warnings) expect(shown).toContain(warning);
  });
}

describe("several implements: worked examples (spec section 7)", () => {
  it("example 9: dumbbells 120 lb then kettlebell 40 lb recommends 47.5 lb, with a warning that names the dumbbells", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    typeTarget(1, "120");
    addImplement("Kettlebell");
    typeTarget(2, "40");

    expect(text(result(1))).toContain("Exact");
    expect(text(result(1))).toContain("Each end 1 × 22.5, 6 × 5, 1 × 2.5");
    expect(text(result(2))).toContain("No exact loading for 40 lb");
    expect(text(within(result(2)).getByRole("article", { name: /Below/ }))).toContain("26.25 lb");
    const above = within(result(2)).getByRole("article", { name: /Above/ });
    expect(text(above)).toContain("47.5 lb");
    expect(text(above)).toContain("Recommended");
    expect(text(within(result(2)).getByRole("list", { name: "Notes" }))).toContain(
      "Not exact because the dumbbells use the 5 lb plates the kettlebell needs to reach 40 lb.",
    );
    expectSameAsCommandLine(commandLine("dumbbells=120", "kettlebell=40"));
  });

  it("example 10: barbell 173 lb then dumbbells 40 lb are both exact, and the line at the bottom shows what is left over", () => {
    render(<App />);
    typeTarget(1, "173");
    addImplement("Dumbbells");
    typeTarget(2, "40");

    expect(text(result(1))).toContain("Exact");
    expect(text(result(1))).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5");
    expect(text(result(2))).toContain("Exact");
    expect(text(result(2))).toContain("Each end 3 × 5");
    expect(text(result(2))).toContain("Screws per dumbbell 2 × Standard locking screw");
    expect(text(leftover())).toBe(
      'Left over Plates 1 × 22.5, 2 × 2.5, 4 × 1.25 Locking hardware 5 × Long locking screw, 2 × Ironmaster spin-lock collar, 2 × Mirafit 1" clamp collar',
    );
    expectSameAsCommandLine(commandLine("barbell=173", "dumbbells=40"));
  });

  it("example 11: barbell 88 lb gives up its fewest-plate loading so dumbbells 75 lb are exact", () => {
    render(<App />);
    typeTarget(1, "88");
    addImplement("Dumbbells");
    typeTarget(2, "75");

    expect(text(result(1))).toContain("Each side 7 × 5");
    expect(text(result(2))).toContain("Each end 1 × 22.5, 2 × 5");
    expect(text(result(2))).toContain("Screws per dumbbell 2 × Standard locking screw");
    expectSameAsCommandLine(commandLine("barbell=88", "dumbbells=75"));
  });
});

describe("several implements: cards (spec 8.3)", () => {
  it("stacks a new card under the first when an implement is added", () => {
    render(<App />);
    expect(cards()).toHaveLength(1);
    addImplement("Kettlebell");
    expect(cards().map((item) => item.getAttribute("aria-label"))).toEqual(["1. Barbell", "2. Kettlebell"]);
  });

  it("puts the cursor in the new card's target", () => {
    render(<App />);
    addImplement("Vest");
    expect(document.activeElement).toBe(within(card(2)).getByLabelText("Target"));
  });

  it("closes the list of implements to add on Cancel", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add implement" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cards()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add implement" })).toBeTruthy();
  });
});

describe("several implements: priority order (spec 8.3)", () => {
  function stackCards() {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const slots = [...(this.parentElement?.children ?? [])];
      const top = this.tagName === "LI" ? slots.indexOf(this) * 100 : 0;
      return DOMRect.fromRect({ x: 0, y: top, width: 400, height: this.tagName === "LI" ? 90 : 0 });
    });
  }

  function planDumbbellsThenKettlebell() {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    typeTarget(1, "120");
    addImplement("Kettlebell");
    typeTarget(2, "40");
  }

  function drag(grip: HTMLElement, distance: number, pointerType: string) {
    const start = 145;
    fireEvent.pointerDown(grip, { pointerId: 1, pointerType, button: 0, clientY: start });
    fireEvent.pointerMove(grip, { pointerId: 1, pointerType, clientY: start + distance / 2 });
    fireEvent.pointerMove(grip, { pointerId: 1, pointerType, clientY: start + distance });
    fireEvent.pointerUp(grip, { pointerId: 1, pointerType, clientY: start + distance });
  }

  function expectKettlebellServedFirst() {
    expect(cards().map((item) => item.getAttribute("aria-label"))).toEqual(["1. Kettlebell", "2. Dumbbells"]);
    expect(text(result(1))).toContain("Exact");
    expect(text(result(1))).toContain("40 lb");
    expect(text(result(2))).toContain("No exact loading for 120 lb");
    expect(text(within(result(2)).getByRole("list", { name: "Notes" }))).toMatch(/Not exact because the kettlebell uses the .* the dumbbells need to reach 120 lb\./);
  }

  it("serves the first card first: dumbbells 120 lb are exact and the kettlebell below them misses", () => {
    planDumbbellsThenKettlebell();
    expect(text(result(1))).toContain("Exact");
    expect(text(result(2))).toContain("No exact loading for 40 lb");
  });

  it("drags a card above another with a mouse, and the results update", () => {
    planDumbbellsThenKettlebell();
    stackCards();
    drag(within(card(2)).getByRole("button", { name: "Move Kettlebell" }), -120, "mouse");
    expectKettlebellServedFirst();
  });

  it("drags a card by touch", () => {
    planDumbbellsThenKettlebell();
    stackCards();
    drag(within(card(2)).getByRole("button", { name: "Move Kettlebell" }), -120, "touch");
    expectKettlebellServedFirst();
  });

  it("leaves the order alone when a card is dropped where it started", () => {
    planDumbbellsThenKettlebell();
    stackCards();
    drag(within(card(2)).getByRole("button", { name: "Move Kettlebell" }), -30, "touch");
    expect(cards().map((item) => item.getAttribute("aria-label"))).toEqual(["1. Dumbbells", "2. Kettlebell"]);
  });

  it("moves a card with the arrow keys on its handle, and keeps focus on the handle", () => {
    planDumbbellsThenKettlebell();
    fireEvent.keyDown(within(card(2)).getByRole("button", { name: "Move Kettlebell" }), { key: "ArrowUp" });
    expectKettlebellServedFirst();
    expect(document.activeElement).toBe(within(card(1)).getByRole("button", { name: "Move Kettlebell" }));
  });

  it("selects the first card's implement in the implement tabs", () => {
    planDumbbellsThenKettlebell();
    fireEvent.keyDown(within(card(2)).getByRole("button", { name: "Move Kettlebell" }), { key: "ArrowUp" });
    expect(screen.getByRole("tab", { name: "Kettlebell" }).getAttribute("aria-selected")).toBe("true");
  });

  it("changes the first card's implement from the implement tabs and keeps the cards under it", () => {
    planDumbbellsThenKettlebell();
    fireEvent.click(screen.getByRole("tab", { name: "Barbell" }));
    expect(cards().map((item) => item.getAttribute("aria-label"))).toEqual(["1. Barbell", "2. Kettlebell"]);
    expect(within(card(2)).getByLabelText("Target")).toHaveProperty("value", "40");
  });

  it("removes a card, and the next one moves up", () => {
    planDumbbellsThenKettlebell();
    fireEvent.click(within(card(1)).getByRole("button", { name: "Remove Dumbbells" }));
    expect(cards().map((item) => item.getAttribute("aria-label"))).toEqual(["1. Kettlebell"]);
    expect(text(result(1))).toContain("Exact");
    expect(screen.queryByRole("region", { name: "Left over" })).toBeNull();
  });
});

describe("several implements: the plate pool", () => {
  const choices = () => within(screen.getByRole("group", { name: "Implement to add" })).getAllByRole("button").map((button) => button.textContent);

  it("offers only the implements that are still free", () => {
    render(<App />);
    addImplement("Dumbbells");
    fireEvent.click(screen.getByRole("button", { name: "Add implement" }));
    expect(choices()).toEqual(["Kettlebell", "Leg attachment", "Vest", "Cancel"]);
  });

  it("offers one dumbbell when the other is in use", () => {
    render(<App />);
    addImplement("Dumbbells");
    fireEvent.click(within(within(card(2)).getByRole("radiogroup", { name: "Dumbbells" })).getByRole("radio", { name: "One" }));
    addImplement("One dumbbell");
    expect(cards().map((item) => item.getAttribute("aria-label"))).toEqual(["1. Barbell", "2. One dumbbell", "3. One dumbbell"]);
  });

  it("explains a card that asks for more of an implement than the inventory holds, and serves the cards above it", () => {
    render(<App />);
    addImplement("Dumbbells");
    typeTarget(2, "40");
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    typeTarget(1, "30");
    expect(text(result(1))).toContain("Exact");
    expect(text(result(2))).toBe("The request needs 4 × dumbbell. The inventory holds 2.");
  });

  it("explains a target it cannot read on its own card only", () => {
    render(<App />);
    typeTarget(1, "173");
    addImplement("Kettlebell");
    typeTarget(2, "abc");
    expect(text(result(1))).toContain("Exact");
    expect(text(result(2))).toContain('"abc" is not a weight.');
  });

  it("shows vest blocks in the line at the bottom", () => {
    render(<App />);
    typeTarget(1, "173");
    addImplement("Vest");
    typeTarget(2, "12");
    expect(text(leftover())).toContain("Plates 1 × 22.5, 12 × 5, 2 × 2.5, 4 × 1.25, 18 vest blocks");
  });
});
