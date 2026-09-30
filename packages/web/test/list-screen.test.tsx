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

function openList() {
  fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name: "List" }));
}

function setRange(from: string, to: string) {
  fireEvent.change(screen.getByLabelText("From"), { target: { value: from } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: to } });
}

function rows(): string[][] {
  const table = screen.getByRole("table");
  return within(table)
    .getAllByRole("row")
    .map((row) => [...within(row).queryAllByRole("columnheader"), ...within(row).queryAllByRole("cell")].map((cell) => text(cell)));
}

describe("List screen (spec 8.5)", () => {
  it("shows one table for the selected implement, with the columns in 8.5", () => {
    render(<App />);
    openList();
    setRange("170", "176");
    expect(rows()).toEqual([
      ["lb", "kg", "Plates", "Flags"],
      ["170.5", "77.3", "Each side 2 × 22.5, 6 × 5, 1 × 1.25", "Micro"],
      ["173", "78.5", "Each side 2 × 22.5, 6 × 5, 1 × 2.5", ""],
      ["175.5", "79.6", "Each side 2 × 22.5, 6 × 5, 1 × 2.5, 1 × 1.25", "Micro"],
    ]);
  });

  it("lists the implement's full range when the filter is empty", () => {
    render(<App />);
    openList();
    fireEvent.click(screen.getByRole("tab", { name: "Kettlebell" }));
    const all = rows();
    expect(all[1]?.[0]).toBe("22.5");
    expect(all.at(-1)).toEqual(["80", "36.3", "Stack 1 × 22.5, 6 × 5, 1 × 2.5", "Long screw"]);
  });

  it("lists one dumbbell with its ends, the uneven flag and the screw kind", () => {
    render(<App />);
    openList();
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    fireEvent.click(screen.getByRole("radio", { name: "One" }));
    setRange("12.5", "12.5");
    expect(rows()[1]).toEqual(["12.5", "5.7", "End A (heavier) 1 × 2.5 End B No plates", "Uneven Standard screws"]);
  });

  it("shows the vest in kilograms first", () => {
    render(<App />);
    openList();
    fireEvent.click(screen.getByRole("tab", { name: "Vest" }));
    setRange("12", "12");
    expect(rows()).toEqual([
      ["kg", "lb", "Plates", "Flags"],
      ["12", "26.46", "Front 6 blocks Back 6 blocks", ""],
    ]);
  });

  it("uses the collar choice", () => {
    render(<App />);
    openList();
    fireEvent.click(screen.getByRole("radio", { name: "None" }));
    setRange("18", "18");
    expect(rows()[1]).toEqual(["18", "8.2", "Each side No plates", ""]);
  });

  it("explains a range it cannot read", () => {
    render(<App />);
    openList();
    setRange("200", "100");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/Its start must not be above its end/)).toBeTruthy();
  });

  it("opens a tapped row's weight in the Load screen", () => {
    render(<App />);
    openList();
    setRange("170", "176");
    fireEvent.click(screen.getAllByRole("row")[2]!);
    expect((screen.getByLabelText("Target") as HTMLInputElement).value).toBe("173");
    const result = text(screen.getByRole("region", { name: "Result" }));
    expect(result).toContain("Exact");
    expect(result).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5");
  });

  it("opens a row with the same implement and options it was listed with", () => {
    render(<App />);
    openList();
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    fireEvent.click(screen.getByRole("radio", { name: "One" }));
    setRange("12.5", "12.5");
    fireEvent.click(screen.getByRole("button", { name: "Open 12.5 lb in Load" }));
    expect(screen.getByRole("tab", { name: "Dumbbells" }).getAttribute("aria-selected")).toBe("true");
    expect((screen.getByRole("radio", { name: "One" }) as HTMLInputElement).checked).toBe(true);
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Exact");
  });
});

describe("Load screen: step buttons (spec 8.2)", () => {
  const target = () => (screen.getByLabelText("Target") as HTMLInputElement).value;
  const up = () => fireEvent.click(screen.getByRole("button", { name: "Next heavier weight" }));
  const down = () => fireEvent.click(screen.getByRole("button", { name: "Next lighter weight" }));

  it("moves to the next achievable weight on each press", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "173" } });
    up();
    expect(target()).toBe("175.5");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Exact");
    down();
    down();
    expect(target()).toBe("170.5");
  });

  it("moves from a target no loading reaches to the nearest achievable weight (example 1)", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "175" } });
    down();
    expect(target()).toBe("173");
  });

  it("starts at the lightest weight, and cannot go below it", () => {
    render(<App />);
    up();
    expect(target()).toBe("18");
    expect((screen.getByRole("button", { name: "Next lighter weight" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("switches to the implement's unit, so each press lands on an exact weight", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("radio", { name: "kg" }));
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "79" } });
    up();
    expect(target()).toBe("175.5");
    expect((screen.getByRole("radio", { name: "lb" }) as HTMLInputElement).checked).toBe(true);
  });

  it("follows the dumbbell choice", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    fireEvent.click(screen.getByRole("radio", { name: "One" }));
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "10" } });
    up();
    expect(target()).toBe("11.25");
  });
});
