import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App";

afterEach(cleanup);

function typeTarget(value: string) {
  fireEvent.change(screen.getByLabelText("Target"), { target: { value } });
}

function text(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

describe("barbell Load screen: worked examples (spec section 7)", () => {
  it("example 2: 173 lb is exact, with each side's plates and the collars to use", () => {
    render(<App />);
    typeTarget("173");
    const result = text(screen.getByRole("region", { name: "Result" }));
    expect(result).toContain("Exact");
    expect(result).toContain("173 lb");
    expect(result).toContain("78.5 kg");
    expect(result).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5");
    expect(result).toContain('Collars 2 × Mirafit 1" clamp collar');
  });

  it("example 1: 175 lb shows below and above side by side, with above recommended", () => {
    render(<App />);
    typeTarget("175");
    const result = screen.getByRole("region", { name: "Result" });
    expect(text(result)).toContain("No exact loading for 175 lb (79.4 kg)");

    const below = within(result).getByRole("article", { name: /Below/ });
    expect(text(below)).toContain("173 lb 78.5 kg");
    expect(text(below)).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5");
    expect(text(below)).not.toContain("Recommended");

    const above = within(result).getByRole("article", { name: /Above/ });
    expect(text(above)).toContain("175.5 lb 79.6 kg");
    expect(text(above)).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5, 1 × 1.25");
    expect(text(above)).toContain("Recommended");
    expect(above.classList).toContain("recommended");
  });

  it("example 3: 230 lb is refused, showing the 210 lb plate limit and the heaviest allowed loading", () => {
    render(<App />);
    typeTarget("230");
    const result = screen.getByRole("region", { name: "Result" });
    expect(text(result)).toContain("Refused: over the 210 lb plate limit");

    const heaviest = within(result).getByRole("article", { name: /Heaviest allowed/ });
    expect(text(heaviest)).toContain("228 lb 103.4 kg");
    expect(text(heaviest)).toContain("Each side 2 × 22.5, 12 × 5");
    expect(within(result).queryByRole("article", { name: /Below|Above/ })).toBeNull();
    expect(text(result).match(/Refused/g)).toHaveLength(1);
  });
});

describe("Load screen: implement tabs", () => {
  const tabs = () => within(screen.getByRole("tablist", { name: "Implements" })).getAllByRole("tab");

  it("opens on the barbell, with the kettlebell, leg attachment and vest tabs beside it", () => {
    render(<App />);
    expect(tabs().map((tab) => [tab.textContent, tab.getAttribute("aria-selected")])).toEqual([
      ["Barbell", "true"],
      ["Kettlebell", "false"],
      ["Leg attachment", "false"],
      ["Vest", "false"],
    ]);
  });

  it("selects the tab that is pressed", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Kettlebell" }));
    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual(["false", "true", "false", "false"]);
    expect(screen.getByRole("tabpanel", { name: "Kettlebell" })).toBeTruthy();
  });

  it("switches to the vest and back", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Vest" }));
    expect(screen.getByRole("tab", { name: "Vest" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Barbell" }).getAttribute("aria-selected")).toBe("false");
    expect(screen.queryByRole("radiogroup", { name: "Collars" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Barbell" }));
    expect(screen.getByRole("radiogroup", { name: "Collars" })).not.toBeNull();
  });
});

describe("vest Load screen", () => {
  function openVest() {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Vest" }));
  }

  it("starts its unit switch on kilograms", () => {
    openVest();
    expect(within(screen.getByRole("radiogroup", { name: "Unit" })).getByRole("radio", { name: "kg" })).toHaveProperty("checked", true);
  });

  it("example 13: 12 kg is exact, with 6 blocks on the front and 6 on the back, kilograms first", () => {
    openVest();
    typeTarget("12");
    const result = text(screen.getByRole("region", { name: "Result" }));
    expect(result).toContain("Exact");
    expect(result).toContain("12 kg 26.46 lb");
    expect(result).toContain("Front 6 blocks");
    expect(result).toContain("Back 6 blocks");
    expect(result).not.toContain("Collars");
  });

  it("example 14: 30 lb shows 13 kg below and 14 kg above, with above recommended", () => {
    openVest();
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Unit" })).getByRole("radio", { name: "lb" }));
    typeTarget("30");
    const result = screen.getByRole("region", { name: "Result" });
    expect(text(result)).toContain("No exact loading for 13.6 kg (30 lb)");

    const below = within(result).getByRole("article", { name: /Below/ });
    expect(text(below)).toContain("13 kg 28.66 lb");
    expect(text(below)).toContain("Front 6 blocks Back 7 blocks");
    expect(text(below)).not.toContain("Recommended");

    const above = within(result).getByRole("article", { name: /Above/ });
    expect(text(above)).toContain("14 kg 30.86 lb");
    expect(text(above)).toContain("Front 7 blocks Back 7 blocks");
    expect(text(above)).toContain("Recommended");
  });

  it("refuses a target above 30 blocks, showing the limit and the heaviest allowed loading", () => {
    openVest();
    typeTarget("35");
    const result = screen.getByRole("region", { name: "Result" });
    expect(text(result)).toContain("Refused: over the 30 block limit");
    expect(text(within(result).getByRole("article", { name: /Heaviest allowed/ }))).toContain("30 kg 66.14 lb");
    expect(text(result).match(/Refused/g)).toHaveLength(1);
  });

  it("names the empty vest's weight and the block count as unverified", () => {
    openVest();
    typeTarget("12");
    const notes = within(screen.getByRole("region", { name: "Result" })).getByRole("list", { name: "Notes" });
    expect(text(notes)).toBe("Unverified: empty vest weight, vest block count");
  });

  it("names one block in the singular and an empty position as no blocks", () => {
    openVest();
    typeTarget("1");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Front No blocks Back 1 block");
  });
});

describe("kettlebell Load screen", () => {
  function openKettlebell() {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Kettlebell" }));
  }

  it("example 8: 80 lb is exact, with the stack and the long locking screw", () => {
    openKettlebell();
    typeTarget("80");
    const result = text(screen.getByRole("region", { name: "Result" }));
    expect(result).toContain("Exact");
    expect(result).toContain("80 lb 36.3 kg");
    expect(result).toContain("Stack 1 × 22.5, 6 × 5, 1 × 2.5");
    expect(result).toContain("Locking screw 1 × Long locking screw");
  });

  it("shows the bare handle with no locking screw", () => {
    openKettlebell();
    typeTarget("22.5");
    const result = text(screen.getByRole("region", { name: "Result" }));
    expect(result).toContain("Stack No plates");
    expect(result).toContain("Locking screw None");
  });

  it("has no collar choice", () => {
    openKettlebell();
    expect(screen.queryByRole("radiogroup", { name: "Collars" })).toBeNull();
  });

  it("refuses a target over 80 lb, showing the limit and the heaviest allowed loading", () => {
    openKettlebell();
    typeTarget("85");
    const result = screen.getByRole("region", { name: "Result" });
    expect(text(result)).toContain("Refused: over the 80 lb limit");
    expect(text(within(result).getByRole("article", { name: /Heaviest allowed/ }))).toContain("80 lb 36.3 kg");
    expect(text(result).match(/Refused/g)).toHaveLength(1);
  });
});

describe("leg attachment Load screen", () => {
  function openLeg() {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Leg attachment" }));
  }

  it("example 12: 50 lb is exact, with the stack and no locking hardware", () => {
    openLeg();
    typeTarget("50");
    const result = screen.getByRole("region", { name: "Result" });
    expect(text(result)).toContain("50 lb 22.7 kg");
    expect(text(result)).toContain("Stack 2 × 22.5, 1 × 5");
    expect(text(result)).not.toContain("screw");
    expect(text(result)).not.toContain("Collars");
  });

  it("carries the fixed note under the result", () => {
    openLeg();
    typeTarget("50");
    const notes = within(screen.getByRole("region", { name: "Result" })).getByRole("list", { name: "Notes" });
    expect(text(notes)).toBe("Plate weight only. The lever changes the resistance you feel.");
  });

  it("refuses a target over 100 lb of plates, showing the limit and the heaviest allowed loading", () => {
    openLeg();
    typeTarget("120");
    const result = screen.getByRole("region", { name: "Result" });
    expect(text(result)).toContain("Refused: over the 100 lb plate limit");
    expect(text(within(result).getByRole("article", { name: /Heaviest allowed/ }))).toContain("100 lb 45.4 kg");
  });
});

describe("barbell Load screen: target", () => {
  it("reads the target in kilograms when the unit switch is on kg", () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Unit" })).getByRole("radio", { name: "kg" }));
    typeTarget("80");
    const result = screen.getByRole("region", { name: "Result" });
    expect(text(result)).toContain("No exact loading for 176.37 lb (80 kg)");
    expect(text(within(result).getByRole("article", { name: /Below/ }))).toContain("Recommended");
    expect(text(within(result).getByRole("article", { name: /Below/ }))).toContain("175.5 lb 79.6 kg");
  });

  it("recommends the bare bar, alone, for a target under the base weight", () => {
    render(<App />);
    typeTarget("5");
    const result = screen.getByRole("region", { name: "Result" });
    expect(text(result)).toContain("No exact loading for 5 lb (2.3 kg)");
    expect(within(result).queryByRole("article", { name: /Below/ })).toBeNull();

    const above = within(result).getByRole("article", { name: /Above/ });
    expect(text(above)).toContain("18 lb 8.2 kg");
    expect(text(above)).toContain("Each side No plates");
    expect(text(above)).toContain("Recommended");
    expect(above.parentElement?.classList).toContain("single");
  });

  it("shows no result until a target is typed", () => {
    render(<App />);
    expect(screen.getByRole("region", { name: "Result" }).textContent).toBe("");
  });

  it("explains a target it cannot read", () => {
    render(<App />);
    typeTarget("abc");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain('"abc" is not a weight.');
  });
});

describe("barbell Load screen: collars", () => {
  const collars = () => screen.getByRole("radiogroup", { name: "Collars" });

  it("uses the clamp collar unless another is picked", () => {
    render(<App />);
    typeTarget("173");
    expect(within(collars()).getByRole("radio", { name: "Clamp" })).toHaveProperty("checked", true);
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain('Collars 2 × Mirafit 1" clamp collar');
  });

  it("switches to spin-lock collars", () => {
    render(<App />);
    typeTarget("173");
    fireEvent.click(within(collars()).getByRole("radio", { name: "Spin-lock" }));
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Collars 2 × Ironmaster spin-lock collar");
  });

  it("loads with no collars, and drops the collar weight from the unverified values", () => {
    render(<App />);
    typeTarget("173");
    fireEvent.click(within(collars()).getByRole("radio", { name: "None" }));
    const result = text(screen.getByRole("region", { name: "Result" }));
    expect(result).toContain("Collars None");
    expect(result).toContain("Unverified: bar weight");
    expect(result).not.toContain("collar weight");
  });
});

describe("barbell Load screen: notes", () => {
  it("names the unverified values under the result", () => {
    render(<App />);
    typeTarget("173");
    const notes = within(screen.getByRole("region", { name: "Result" })).getByRole("list", { name: "Notes" });
    expect(text(notes)).toBe("Unverified: bar weight, collar weight");
  });
});
