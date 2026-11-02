import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Calculator } from "../src/Calculator";
import { olympic, owner } from "./kits";

afterEach(cleanup);

function text(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const tabs = () => within(screen.getByRole("tablist", { name: "Implements" })).getAllByRole("tab");
const options = (group: string) =>
  within(screen.getByRole("radiogroup", { name: group }))
    .getAllByRole("radio")
    .map((radio) => radio.closest("label")?.textContent);
const typeTarget = (value: string) => fireEvent.change(screen.getByLabelText("Target"), { target: { value } });
const view = (name: string) => fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name }));
const result = () => screen.getByRole("region", { name: "Result" });

describe("the Olympic kit: tabs and options (spec 17.5.4)", () => {
  it("shows its four implements in file order, labelled by name", () => {
    render(<Calculator inventory={olympic} />);
    expect(tabs().map((tab) => tab.textContent)).toEqual(["Olympic bar", "Loadable dumbbell", "Dip belt", "Plate carrier"]);
    expect(tabs()[0]!.getAttribute("aria-selected")).toBe("true");
  });

  it("offers a hardware choice on the bar, labelled by the hardware's name, starting on its default", () => {
    render(<Calculator inventory={olympic} />);
    expect(options("Collars")).toEqual(["Spring collar", "None"]);
    expect(within(screen.getByRole("radiogroup", { name: "Collars" })).getByRole("radio", { name: "Spring collar" })).toHaveProperty(
      "checked",
      true,
    );
  });

  it("offers pair or single on the dumbbell, no hardware choice with one option, and no uneven switch with an allowance of 0", () => {
    render(<Calculator inventory={olympic} />);
    fireEvent.click(screen.getByRole("tab", { name: "Loadable dumbbell" }));
    expect(options("Pair or single")).toEqual(["Pair", "Single"]);
    expect(screen.queryByRole("radiogroup", { name: "Collars" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Uneven loading" })).toBeNull();
  });

  it("offers no options on the dip belt or the plate carrier", () => {
    render(<Calculator inventory={olympic} />);
    for (const name of ["Dip belt", "Plate carrier"]) {
      fireEvent.click(screen.getByRole("tab", { name }));
      expect(screen.queryAllByRole("radiogroup").map((group) => group.getAttribute("aria-label"))).toEqual(["Unit"]);
      expect(screen.queryByRole("switch")).toBeNull();
    }
  });

  it("example 25: 95.5 kg on the Olympic bar, with each side and the spring collars, kilograms first", () => {
    render(<Calculator inventory={olympic} />);
    typeTarget("95.5");
    const shown = text(result());
    expect(shown).toContain("Exact");
    expect(shown).toContain("95.5 kg 210.54 lb");
    expect(shown).toContain("Each side 1 × 20, 1 × 10, 1 × 5, 1 × 2.5");
    expect(shown).toContain("Collars 2 × Spring collar");
  });

  it("example 26: a single dumbbell of 25 kg is not exact, because the ends may not differ", () => {
    render(<Calculator inventory={olympic} />);
    fireEvent.click(screen.getByRole("tab", { name: "Loadable dumbbell" }));
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Pair or single" })).getByRole("radio", { name: "Single" }));
    typeTarget("25");
    const shown = text(result());
    expect(shown).toContain("No exact loading for 25 kg");
    expect(text(within(result()).getByRole("article", { name: /Above/ }))).toContain("Each end 1 × 10, 1 × 2.5");
  });

  it("says when the kit cannot load an implement at all: two collars cannot lock a pair of dumbbells", () => {
    render(<Calculator inventory={olympic} />);
    fireEvent.click(screen.getByRole("tab", { name: "Loadable dumbbell" }));
    typeTarget("17");
    expect(text(result())).toContain("This kit's plates and hardware cannot load the loadable dumbbell pair.");
  });

  it("draws the dip belt as a stack and the plate carrier as front and back", () => {
    render(<Calculator inventory={olympic} />);
    fireEvent.click(screen.getByRole("tab", { name: "Dip belt" }));
    typeTarget("20");
    expect(within(result()).getByRole("img").getAttribute("aria-label")).toBe("Stack, inside to outside: 20");
    expect(text(result())).toContain("Stack 1 × 20");
    expect(text(result())).not.toContain("Collars");

    fireEvent.click(screen.getByRole("tab", { name: "Plate carrier" }));
    typeTarget("17.5");
    expect(text(result())).toContain("Front 1 block Back 1 block");
  });
});

describe("the owner's kit: options (spec 17.5.4)", () => {
  it("offers the dumbbell a screw choice that starts on Auto, since its hardware has no default", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    expect(options("Screws")).toEqual(["Auto", "Standard locking screw", "Long locking screw", "None"]);
    expect(within(screen.getByRole("radiogroup", { name: "Screws" })).getByRole("radio", { name: "Auto" })).toHaveProperty("checked", true);
    expect(screen.getByRole("switch", { name: "Uneven loading" })).toBeTruthy();
  });

  it("loads the dumbbell with the screw chosen, refusing what it cannot hold", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    typeTarget("40");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Screws" })).getByRole("radio", { name: "Long locking screw" }));
    expect(text(result())).toContain("Screws per dumbbell 2 × Long locking screw");
  });

  it("labels the bar's collars by name", () => {
    render(<Calculator inventory={owner} />);
    expect(options("Collars")).toEqual(['Mirafit 1" clamp collar', "Ironmaster spin-lock collar", "None"]);
  });
});

describe("List and Reverse on any kit (spec 17.5.4)", () => {
  it("lists the Olympic bar in kilograms with no screw column", () => {
    render(<Calculator inventory={olympic} />);
    view("List");
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["kg", "lb", "Plates", "Flags"]);
    expect(text(within(table).getAllByRole("row")[1]!)).toContain("20.5");
  });

  it("flags the smallest plate as Smallest", () => {
    render(<Calculator inventory={olympic} />);
    view("List");
    const row = within(screen.getByRole("table"))
      .getAllByRole("row")
      .find((each) => /^25.5 /.test(text(each)))!;
    expect(text(row)).toContain("Smallest");
  });

  it("offers the Olympic bar's accepted plates on Reverse, heaviest first, outlined by shape, with no mirroring switch", () => {
    render(<Calculator inventory={olympic} />);
    view("Reverse");
    const buttons = within(screen.getByRole("group", { name: "Each side" })).getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Add 20 kg to each side",
      "Add 10 kg to each side",
      "Add 5 kg to each side",
      "Add 2.5 kg to each side",
    ]);
    expect(buttons.every((button) => button.classList.contains("round"))).toBe(true);
    expect(screen.queryByRole("switch", { name: "Mirror ends" })).toBeNull();
  });

  it("shows the mirroring switch on a handle only", () => {
    render(<Calculator inventory={olympic} />);
    view("Reverse");
    fireEvent.click(screen.getByRole("tab", { name: "Loadable dumbbell" }));
    expect(screen.getByRole("switch", { name: "Mirror ends" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Dip belt" }));
    expect(screen.queryByRole("switch", { name: "Mirror ends" })).toBeNull();
  });

  it("totals a Reverse loading on the Olympic bar with its collars", () => {
    render(<Calculator inventory={olympic} />);
    view("Reverse");
    fireEvent.click(screen.getByRole("button", { name: "Add 20 kg to each side" }));
    expect(text(screen.getByRole("region", { name: "Total" }))).toContain("60.5 kg");
  });
});
