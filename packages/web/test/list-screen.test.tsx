import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Calculator } from "../src/Calculator";
import { owner } from "./kits";

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
    render(<Calculator inventory={owner} />);
    openList();
    setRange("170", "176");
    expect(rows()).toEqual([
      ["lb", "kg", "Plates", "Flags"],
      ["170.5", "77.3", "Each side 2 × 22.5, 6 × 5, 1 × 1.25", "Smallest"],
      ["173", "78.5", "Each side 2 × 22.5, 6 × 5, 1 × 2.5", ""],
      ["175.5", "79.6", "Each side 2 × 22.5, 6 × 5, 1 × 2.5, 1 × 1.25", "Smallest"],
    ]);
  });

  it("lists the implement's full range when the filter is empty", () => {
    render(<Calculator inventory={owner} />);
    openList();
    fireEvent.click(screen.getByRole("tab", { name: "Kettlebell" }));
    const all = rows();
    expect(all[1]?.[0]).toBe("22.5");
    expect(all.at(-1)).toEqual(["80", "36.3", "Stack 1 × 22.5, 6 × 5, 1 × 2.5 Screw 1 × Long locking screw", ""]);
  });

  it("lists one dumbbell with its ends and the screws in the loading, and the uneven flag", () => {
    render(<Calculator inventory={owner} />);
    openList();
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    fireEvent.click(screen.getByRole("radio", { name: "Single" }));
    setRange("12.5", "12.5");
    expect(rows()[1]).toEqual(["12.5", "5.7", "End A (heavier) 1 × 2.5 End B No plates Screws 2 × Standard locking screw", "Uneven"]);
  });

  it("shows the vest in kilograms first", () => {
    render(<Calculator inventory={owner} />);
    openList();
    fireEvent.click(screen.getByRole("tab", { name: "Weighted vest" }));
    setRange("12", "12");
    expect(rows()).toEqual([
      ["kg", "lb", "Plates", "Flags"],
      ["12", "26.46", "Front 6 blocks Back 6 blocks", ""],
    ]);
  });

  it("uses the collar choice", () => {
    render(<Calculator inventory={owner} />);
    openList();
    fireEvent.click(screen.getByRole("radio", { name: "None" }));
    setRange("18", "18");
    expect(rows()[1]).toEqual(["18", "8.2", "Each side No plates", ""]);
  });

  it("shares the collar choice with the Load screen", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(screen.getByRole("radio", { name: "Ironmaster spin-lock collar" }));
    openList();
    expect((screen.getByRole("radio", { name: "Ironmaster spin-lock collar" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "None" }));
    fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name: "Load" }));
    expect((screen.getByRole("radio", { name: "None" }) as HTMLInputElement).checked).toBe(true);
  });

  it("leaves out the weights that need uneven dumbbells when uneven loading is off", () => {
    render(<Calculator inventory={owner} />);
    openList();
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    fireEvent.click(screen.getByRole("radio", { name: "Single" }));
    setRange("10", "12.5");
    expect(rows().slice(1).map(([lb]) => lb)).toEqual(["10", "11.25", "12.5"]);
    fireEvent.click(screen.getByRole("switch", { name: "Uneven loading" }));
    expect(rows().slice(1).map(([lb]) => lb)).toEqual(["10", "12.5"]);
  });

  it("explains a range it cannot read", () => {
    render(<Calculator inventory={owner} />);
    openList();
    setRange("200", "100");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/Its start must not be above its end/)).toBeTruthy();
  });

  it("opens a tapped row's weight in the Load screen", () => {
    render(<Calculator inventory={owner} />);
    openList();
    setRange("170", "176");
    fireEvent.click(screen.getAllByRole("row")[2]!);
    expect((screen.getByLabelText("Target") as HTMLInputElement).value).toBe("173");
    const result = text(screen.getByRole("region", { name: "Result" }));
    expect(result).toContain("Exact");
    expect(result).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5");
  });

  it("opens a row with the same implement and options it was listed with", () => {
    render(<Calculator inventory={owner} />);
    openList();
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    fireEvent.click(screen.getByRole("radio", { name: "Single" }));
    setRange("12.5", "12.5");
    fireEvent.click(screen.getByRole("button", { name: "Open 12.5 lb in Load" }));
    expect(screen.getByRole("tab", { name: "Dumbbell" }).getAttribute("aria-selected")).toBe("true");
    expect((screen.getByRole("radio", { name: "Single" }) as HTMLInputElement).checked).toBe(true);
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Exact");
  });
});

describe("Load screen: step buttons (spec 8.2)", () => {
  const target = () => (screen.getByLabelText("Target") as HTMLInputElement).value;
  const up = () => fireEvent.click(screen.getByRole("button", { name: "Next heavier weight" }));
  const down = () => fireEvent.click(screen.getByRole("button", { name: "Next lighter weight" }));

  it("moves to the next achievable weight on each press", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "173" } });
    up();
    expect(target()).toBe("175.5");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Exact");
    down();
    down();
    expect(target()).toBe("170.5");
  });

  it("moves from a target no loading reaches to the nearest achievable weight (example 1)", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "175" } });
    down();
    expect(target()).toBe("173");
  });

  it("starts at the lightest weight, and cannot go below it", () => {
    render(<Calculator inventory={owner} />);
    up();
    expect(target()).toBe("18");
    expect((screen.getByRole("button", { name: "Next lighter weight" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("switches to the implement's unit, so each press lands on an exact weight", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(screen.getByRole("radio", { name: "kg" }));
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "79" } });
    up();
    expect(target()).toBe("175.5");
    expect((screen.getByRole("radio", { name: "lb" }) as HTMLInputElement).checked).toBe(true);
  });

  it("follows the dumbbell choice", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    fireEvent.click(screen.getByRole("radio", { name: "Single" }));
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "10" } });
    up();
    expect(target()).toBe("11.25");
    fireEvent.click(screen.getByRole("switch", { name: "Uneven loading" }));
    down();
    up();
    expect(target()).toBe("12.5");
  });
});
