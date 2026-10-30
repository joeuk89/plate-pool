import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function text(element: Element): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function reopen() {
  cleanup();
  render(<App />);
}

function typeTarget(value: string) {
  fireEvent.change(screen.getByLabelText("Target"), { target: { value } });
}

const targetValue = () => (screen.getByLabelText("Target") as HTMLInputElement).value;
const result = () => screen.getByRole("region", { name: "Result" });
const strip = () => screen.queryByRole("region", { name: "Current loading" });
const loadingCard = (heading: string) => within(result()).getByRole("article", { name: new RegExp(`^${heading}`) });
const changesOf = (element: HTMLElement) => within(element).queryByRole("group", { name: "Changes" });
const otherWays = () => within(result()).getByRole("group", { name: /Other ways to make this/ });
const otherRows = () => within(otherWays()).getAllByRole("listitem");
const pin = (element: HTMLElement) => fireEvent.click(within(element).getByRole("button", { name: "Loaded" }));
const unload = () => fireEvent.click(within(strip()!).getByRole("button", { name: "Unload" }));
const addedPlates = (element: HTMLElement) => [...element.querySelectorAll("svg .added")].map((plate) => plate.getAttribute("data-weight"));

function openTab(name: string) {
  fireEvent.click(screen.getByRole("tab", { name }));
}

function pinOtherWay(rowText: string) {
  const row = otherRows().find((item) => text(item).includes(rowText));
  expect(row, `no other way reads "${rowText}"`).toBeDefined();
  pin(row!);
}

describe("current loading: Loaded and the strip (spec 16.4)", () => {
  it("shows no strip and no changes without a current loading", () => {
    render(<App />);
    typeTarget("173");
    expect(strip()).toBeNull();
    expect(changesOf(result())).toBeNull();
  });

  it("pins the exact result and shows it in a strip with an Unload button", () => {
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    expect(text(strip()!)).toBe("On the bar · 173 lb · each side 2 × 22.5, 6 × 5, 1 × 2.5 Unload");
    expect(text(changesOf(loadingCard("Exact"))!)).toBe("No changes");
  });

  it("pinning a row under Other ways promotes it to the main result", () => {
    render(<App />);
    typeTarget("88");
    pinOtherWay("7 × 5");
    expect(text(strip()!)).toContain("On the bar · 88 lb · each side 7 × 5");
    const exact = loadingCard("Exact");
    expect(text(exact)).toContain("No changes");
    expect(within(exact).getByRole("img").getAttribute("aria-label")).toContain("5, 5, 5, 5, 5, 5, 5");
  });

  it("pinning below or above moves the target to that loading and promotes it", () => {
    render(<App />);
    typeTarget("175");
    pin(loadingCard("Above"));
    expect(targetValue()).toBe("175.5");
    expect(text(loadingCard("Exact"))).toContain("175.5 lb");
    expect(text(strip()!)).toContain("On the bar · 175.5 lb");
  });

  it("names each implement in the strip", () => {
    render(<App />);
    openTab("Dumbbells");
    typeTarget("40");
    pin(loadingCard("Exact"));
    expect(text(strip()!)).toMatch(/^On the dumbbells · 40 lb · each end 3 × 5/);

    openTab("Kettlebell");
    typeTarget("80");
    pin(loadingCard("Exact"));
    expect(text(strip()!)).toMatch(/^On the kettlebell · 80 lb · stack 1 × 22.5, 6 × 5, 1 × 2.5/);

    openTab("Leg attachment");
    typeTarget("50");
    pin(loadingCard("Exact"));
    expect(text(strip()!)).toMatch(/^On the attachment · 50 lb · stack 2 × 22.5, 1 × 5/);

    openTab("Vest");
    typeTarget("12");
    pin(loadingCard("Exact"));
    expect(text(strip()!)).toMatch(/^In the vest · 12 kg · front 6 blocks, back 6 blocks/);
  });

  it("says On the dumbbell for one dumbbell", () => {
    render(<App />);
    openTab("Dumbbells");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Dumbbells" })).getByRole("radio", { name: "One" }));
    typeTarget("12.5");
    pin(loadingCard("Exact"));
    expect(text(strip()!)).toMatch(/^On the dumbbell · 12.5 lb/);
  });

  it("Unload clears the current loading and the changes block", () => {
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    unload();
    expect(strip()).toBeNull();
    expect(changesOf(result())).toBeNull();
    expect(text(loadingCard("Exact"))).toContain("Each side");
  });
});

describe("current loading: the changes block (spec 16.4 and 16.6)", () => {
  it("example 16: from 88 lb (7 × 5 per side) to 98 lb puts on 1 × 5 per side, 2 changes", () => {
    render(<App />);
    typeTarget("88");
    pinOtherWay("7 × 5");
    typeTarget("98");
    const exact = loadingCard("Exact");
    expect(text(changesOf(exact)!)).toBe("2 changes Each side put on 5");
    expect(addedPlates(exact)).toEqual(["5"]);
  });

  it("example 17: from 68 lb (5 × 5 per side) to 113 lb puts the 22.5 outside the 5s", () => {
    render(<App />);
    typeTarget("68");
    pinOtherWay("5 × 5");
    typeTarget("113");
    const exact = loadingCard("Exact");
    expect(text(changesOf(exact)!)).toBe("2 changes Each side put on 22.5");
    expect(within(exact).getByRole("img").getAttribute("aria-label")).toContain("5, 5, 5, 5, 5, 22.5");
    expect(addedPlates(exact)).toEqual(["22.5"]);
  });

  it("example 18: below and above each carry their own changes block", () => {
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    typeTarget("175");
    expect(text(changesOf(loadingCard("Below"))!)).toBe("No changes");
    expect(text(changesOf(loadingCard("Above"))!)).toBe("2 changes Each side put on 1.25");
    expect(text(loadingCard("Above"))).toContain("Recommended");
    expect(addedPlates(loadingCard("Below"))).toEqual([]);
    expect(addedPlates(loadingCard("Above"))).toEqual(["1.25"]);
  });

  it("example 19: dumbbells 70 lb to 80 lb swap to long screws and put on 1 × 5 per end, 12 changes", () => {
    render(<App />);
    openTab("Dumbbells");
    typeTarget("70");
    pin(loadingCard("Exact"));
    expect(text(strip()!)).toContain("each end 1 × 22.5, 1 × 5, 1 × 2.5");
    typeTarget("80");
    expect(text(changesOf(loadingCard("Exact"))!)).toBe(
      "12 changes, 6 per dumbbell Each end put on 5 · swap standard screw for long screw",
    );
  });

  it("names plates taken off before plates put on", () => {
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    typeTarget("170.5");
    expect(text(changesOf(loadingCard("Exact"))!)).toBe("4 changes Each side take off 2.5 · put on 1.25");
  });

  it("counts vest blocks per panel", () => {
    render(<App />);
    openTab("Vest");
    typeTarget("12");
    pin(loadingCard("Exact"));
    typeTarget("15");
    expect(text(changesOf(loadingCard("Exact"))!)).toBe("3 changes Front put on 1 block Back put on 2 blocks");
  });

  it("reads unchanged for a position with nothing to do", () => {
    render(<App />);
    openTab("Dumbbells");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Dumbbells" })).getByRole("radio", { name: "One" }));
    typeTarget("40");
    pin(loadingCard("Exact"));
    typeTarget("42.5");
    expect(text(changesOf(loadingCard("Exact"))!)).toMatch(/End [AB] unchanged/);
  });

  it("prefixes each row under Other ways with its count, fewest first", () => {
    render(<App />);
    typeTarget("88");
    pinOtherWay("7 × 5");
    const counts = otherRows().map((row) => Number(/^(\d+) changes?/.exec(text(row))?.[1]));
    expect(counts.every(Number.isFinite)).toBe(true);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  it("step buttons still move to the next achievable weight", () => {
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    fireEvent.click(screen.getByRole("button", { name: "Next heavier weight" }));
    expect(targetValue()).toBe("175.5");
  });
});

describe("current loading: Reverse (spec 16.4)", () => {
  it("Loaded on Reverse pins the built loading and opens the Load screen at its total", () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name: "Reverse" }));
    const add = (name: string, times: number) => {
      for (let i = 0; i < times; i++) fireEvent.click(screen.getByRole("button", { name }));
    };
    add("Add 5 lb to each side", 7);
    fireEvent.click(screen.getByRole("button", { name: "Loaded" }));
    expect(screen.getByRole("button", { name: "Load" }).getAttribute("aria-current")).toBe("page");
    expect(targetValue()).toBe("88");
    expect(text(strip()!)).toContain("On the bar · 88 lb · each side 7 × 5");
    expect(text(changesOf(loadingCard("Exact"))!)).toBe("No changes");
  });
});

describe("current loading: storage, links and scope (spec 16.4)", () => {
  it("keeps the current loading after a reload", () => {
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    reopen();
    typeTarget("175");
    expect(text(strip()!)).toContain("On the bar · 173 lb");
    expect(text(changesOf(loadingCard("Above"))!)).toBe("2 changes Each side put on 1.25");
  });

  it("keeps the current loading only until Unload", () => {
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    unload();
    reopen();
    expect(strip()).toBeNull();
  });

  it("works when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    expect(text(strip()!)).toContain("On the bar · 173 lb");
  });

  it("ignores a stored current loading it cannot read", () => {
    localStorage.setItem("plate-pool:current", '{"barbell": {"positions": "nonsense"}}');
    render(<App />);
    typeTarget("173");
    expect(strip()).toBeNull();
  });

  it("leaves the current loading out of the URL", () => {
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    expect(window.location.search).toBe("?barbell=173&collars=clamp");
  });

  it("affects its own implement only", () => {
    render(<App />);
    typeTarget("173");
    pin(loadingCard("Exact"));
    openTab("Kettlebell");
    typeTarget("40");
    expect(strip()).toBeNull();
    expect(changesOf(result())).toBeNull();
  });
});
