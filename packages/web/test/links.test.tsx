import { load, type Loading, type LoadRequest } from "@plate-pool/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { plateList } from "../src/describe";
import { olympic, owner } from "./kits";

afterEach(cleanup);

function text(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function open(link: string, inventory = owner) {
  window.history.replaceState(null, "", link);
  render(<App inventory={inventory} />);
}

const card = (priority: number) => screen.getByRole("region", { name: new RegExp(`^${priority}\\. `) });
const cardNames = () => screen.getAllByRole("region", { name: /^\d\. / }).map((item) => item.getAttribute("aria-label"));
const result = (priority: number) => within(card(priority)).getByRole("region", { name: "Result" });

function expectSameAsLibrary(request: LoadRequest) {
  const response = load(owner, request);
  response.results.forEach((item, index) => {
    const loading = (item.loading ?? (item.recommended && item[item.recommended])) as Loading;
    const shown = text(result(index + 1));
    expect(shown).toContain(`${loading.total.lb} lb`);
    if (item.implement === "vest") return;
    for (const position of loading.positions) expect(shown).toContain(plateList(position.plates).replace(/\s/g, " "));
  });
}

const settings = () => JSON.parse(localStorage.getItem("plate-pool:settings") ?? "{}") as { hardware?: Record<string, string> };
const collar = (name: string) => within(screen.getByRole("radiogroup", { name: "Collars" })).getByRole("radio", { name });
const unevenSwitch = () => screen.getByRole("switch", { name: "Uneven loading" });
const pairOrSingle = (name: string) => within(screen.getByRole("radiogroup", { name: "Pair or single" })).getByRole("radio", { name });

describe("links: per-line links (spec 17.6)", () => {
  it("opens the issue's link: example 2 and example 5 with the spin-lock collar", () => {
    open("/plate-pool/?barbell=173lb&dumbbell.single=12.5lb&barbell.hardware=collar-spinlock");
    expect(cardNames()).toEqual(["1. Straight bar", "2. Dumbbell single"]);
    expect(collar("Ironmaster spin-lock collar")).toHaveProperty("checked", true);
    expect(text(result(1))).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5");
    expect(text(result(1))).toContain("Collars 2 × Ironmaster spin-lock collar");
    expect(text(result(2))).toContain("Exact");
    expect(text(result(2))).toContain("End A heavier 1 × 2.5");
  });

  it("opens example 10's result: barbell 173 lb then a pair of dumbbells 40 lb, with the plates left over", () => {
    open("/plate-pool/?barbell=173lb&dumbbell=40lb");
    expect(cardNames()).toEqual(["1. Straight bar", "2. Dumbbell pair"]);
    expect(text(result(1))).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5");
    expect(text(result(2))).toContain("Each end 3 × 5");
    const leftover = text(screen.getByRole("region", { name: "Left over" }));
    expect(leftover).toContain("Plates 1 × 22.5, 2 × 2.5, 4 × 1.25");
    expect(leftover).toContain("Locking hardware 5 × Long locking screw");
  });

  it("reads <id>.pair as the explicit pair form", () => {
    open("/plate-pool/?dumbbell.pair=40lb");
    expect(pairOrSingle("Pair")).toHaveProperty("checked", true);
    expect(text(result(1))).toContain("Each end 3 × 5");
  });

  it("refuses <id>.pair on a handle the kit holds one of", () => {
    const one = structuredClone(olympic);
    one.implements[1]!.count = 1;
    open("/plate-pool/?dumbbell.pair=7.5kg", one);
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("cannot be loaded as a pair");
  });

  it("reads a unit on the value, and a bare value in the implement's unit", () => {
    open("/plate-pool/?barbell=80kg&vest=12");
    const unit = (priority: number) => within(card(priority)).getByRole("radiogroup", { name: "Unit" });
    expect(within(unit(1)).getByRole("radio", { name: "kg" })).toHaveProperty("checked", true);
    expect(text(result(1))).toContain("No exact loading for 176.37 lb (80 kg)");
    expect(text(result(2))).toContain("Front 6 blocks");
  });

  it("reads a bare value in a kilogram kit's unit", () => {
    open("/plate-pool/?bar=95.5", olympic);
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("95.5 kg");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Exact");
  });

  it("puts targets in the link's order, which is priority order (example 9)", () => {
    open("/plate-pool/?dumbbell=120lb&kettlebell=40lb");
    expect(cardNames()).toEqual(["1. Dumbbell pair", "2. Kettlebell"]);
    expect(text(result(2))).toContain("Not exact because the dumbbells use the 5 lb plates the kettlebell needs to reach 40 lb.");
  });

  it("shows the library's results for the same targets", () => {
    open("/plate-pool/?barbell=173lb&dumbbell=40lb&leg=50lb&vest=12kg");
    expect(cardNames()).toEqual(["1. Straight bar", "2. Dumbbell pair", "3. Leg attachment", "4. Weighted vest"]);
    expectSameAsLibrary({
      targets: [
        { implement: "barbell", target: "173lb" },
        { implement: "dumbbell", target: "40lb", pair: true },
        { implement: "leg", target: "50lb" },
        { implement: "vest", target: "12kg" },
      ],
    });
  });

  it("shows the reason on the card for a value that is not a weight", () => {
    open("/plate-pool/?barbell=abc");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain('"abc" is not a weight.');
  });

  it("ignores the retired dumbbells and collars parameters and any it does not know", () => {
    open("/plate-pool/?rack=100&dumbbells=40&collars=none&barbell.single=5&barbell=173lb&kit=00000000");
    expect(cardNames()).toEqual(["1. Straight bar"]);
    expect(collar('Mirafit 1" clamp collar')).toHaveProperty("checked", true);
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Exact");
  });

  it("ignores a hardware id the implement does not take", () => {
    open("/plate-pool/?barbell=173lb&barbell.hardware=screw-long");
    expect(collar('Mirafit 1" clamp collar')).toHaveProperty("checked", true);
  });
});

describe("links: the URL follows the result", () => {
  const search = () => decodeURIComponent(window.location.search);

  function typeTarget(priority: number, value: string) {
    fireEvent.change(within(card(priority)).getByLabelText("Target"), { target: { value } });
  }

  function addImplement(name: string) {
    fireEvent.click(screen.getByRole("button", { name: "Add implement" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Implement to add" })).getByRole("button", { name }));
  }

  it("names the implement and its hardware before a target is typed", () => {
    open("/plate-pool/");
    expect(window.location.pathname).toBe("/plate-pool/");
    expect(search()).toBe("?barbell&barbell.hardware=collar-clamp");
  });

  it("writes each target with its unit suffix, in priority order, with the hardware choice and the uneven switch", () => {
    open("/plate-pool/");
    typeTarget(1, "173");
    expect(search()).toBe("?barbell=173lb&barbell.hardware=collar-clamp");
    addImplement("Dumbbell pair");
    typeTarget(2, "40");
    expect(search()).toBe("?barbell=173lb&dumbbell=40lb&barbell.hardware=collar-clamp&uneven=1");
  });

  it("writes the unit the target is typed in", () => {
    open("/plate-pool/?barbell=80lb");
    fireEvent.click(within(within(card(1)).getByRole("radiogroup", { name: "Unit" })).getByRole("radio", { name: "kg" }));
    expect(search()).toBe("?barbell=80kg&barbell.hardware=collar-clamp");
  });

  it("writes a single as <id>.single and the uneven switch off as uneven=0", () => {
    open("/plate-pool/?dumbbell=12.5lb");
    fireEvent.click(pairOrSingle("Single"));
    fireEvent.click(unevenSwitch());
    expect(search()).toBe("?dumbbell.single=12.5lb&uneven=0");
  });

  it("writes a hardware choice made on a handle", () => {
    open("/plate-pool/?dumbbell=40lb");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Screws" })).getByRole("radio", { name: "Long locking screw" }));
    expect(search()).toBe("?dumbbell=40lb&dumbbell.hardware=screw-long&uneven=1");
  });

  it("writes no uneven switch for a handle that may not be uneven", () => {
    open("/plate-pool/?dumbbell=7.5kg", olympic);
    expect(search()).toBe("?dumbbell=7.5kg");
  });

  it("writes the collar choice when it changes", () => {
    open("/plate-pool/?barbell=173lb");
    fireEvent.click(collar("Ironmaster spin-lock collar"));
    expect(search()).toBe("?barbell=173lb&barbell.hardware=collar-spinlock");
  });

  it("writes the view when it is not Load", () => {
    open("/plate-pool/?kettlebell=40lb");
    const go = (name: string) => fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name }));
    go("List");
    expect(search()).toBe("?kettlebell=40lb&view=list");
    go("Reverse");
    expect(search()).toBe("?kettlebell=40lb&view=reverse");
    go("Load");
    expect(search()).toBe("?kettlebell=40lb");
  });

  it("writes the implement picked from the tabs", () => {
    open("/plate-pool/?barbell=173lb");
    fireEvent.click(screen.getByRole("tab", { name: "Leg attachment" }));
    expect(search()).toBe("?leg");
  });

  it("replaces the page's history entry instead of adding one for every change", () => {
    open("/plate-pool/");
    const entries = window.history.length;
    typeTarget(1, "1");
    typeTarget(1, "17");
    typeTarget(1, "173");
    expect(window.history.length).toBe(entries);
  });

  it("opens the URL it writes to the same result", () => {
    open("/plate-pool/");
    typeTarget(1, "88");
    fireEvent.click(collar("None"));
    addImplement("Dumbbell pair");
    typeTarget(2, "75");
    const shown = [text(result(1)), text(result(2))];
    const link = `${window.location.pathname}${window.location.search}`;

    cleanup();
    localStorage.clear();
    open(link);
    expect([text(result(1)), text(result(2))]).toEqual(shown);
  });
});

describe("links: view", () => {
  const currentView = () => within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { current: "page" });
  const selectedTab = () => within(screen.getByRole("tablist", { name: "Implements" })).getByRole("tab", { selected: true });

  it("opens the Load screen when the link names no view", () => {
    open("/plate-pool/?barbell=173lb");
    expect(currentView().textContent).toBe("Load");
  });

  it("opens the List screen with view=list, on the link's implement", () => {
    open("/plate-pool/?kettlebell&view=list");
    expect(currentView().textContent).toBe("List");
    expect(selectedTab().textContent).toBe("Kettlebell");
    expect(screen.getByRole("region", { name: "Achievable weights" })).toBeTruthy();
  });

  it("opens the List screen for a single with <id>.single and view=list", () => {
    open("/plate-pool/?dumbbell.single&view=list");
    expect(currentView().textContent).toBe("List");
    expect(pairOrSingle("Single")).toHaveProperty("checked", true);
  });

  it("opens the Reverse screen with view=reverse", () => {
    open("/plate-pool/?view=reverse&vest");
    expect(currentView().textContent).toBe("Reverse");
    expect(selectedTab().textContent).toBe("Weighted vest");
    expect(screen.getByRole("region", { name: "Total" })).toBeTruthy();
  });

  it("opens the Load screen for a view it does not know", () => {
    open("/plate-pool/?view=settings");
    expect(currentView().textContent).toBe("Load");
  });
});

describe("links: a parameter wins over a remembered setting", () => {
  it("uses the link's hardware over the remembered choice, and leaves the remembered choice alone", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ hardware: { barbell: "collar-spinlock" } }));
    open("/plate-pool/?barbell=173lb&barbell.hardware=none");
    expect(collar("None")).toHaveProperty("checked", true);
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Collars None");
    expect(settings().hardware).toEqual({ barbell: "collar-spinlock" });
  });

  it("uses the remembered hardware choice when the link names none", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ hardware: { barbell: "collar-spinlock" } }));
    open("/plate-pool/?barbell=173lb");
    expect(collar("Ironmaster spin-lock collar")).toHaveProperty("checked", true);
  });

  it("turns uneven loading off with uneven=0, over the remembered switch", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ uneven: true }));
    open("/plate-pool/?dumbbell.single=11.25lb&uneven=0");
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("false");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("No exact loading for 11.25 lb");
    expectSameAsLibrary({ targets: [{ implement: "dumbbell", target: "11.25lb", pair: false }], uneven: false });
  });

  it("turns uneven loading on with uneven=1, over the remembered switch", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ uneven: false }));
    open("/plate-pool/?dumbbell.single=11.25lb&uneven=1");
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("true");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Exact");
  });

  it("remembers a choice the owner makes after opening a link", () => {
    open("/plate-pool/?barbell=173lb&barbell.hardware=none");
    fireEvent.click(collar("Ironmaster spin-lock collar"));
    expect(settings().hardware).toEqual({ barbell: "collar-spinlock" });
  });

  it("ignores a hardware or uneven value it does not know", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ hardware: { barbell: "collar-spinlock" }, uneven: false }));
    open("/plate-pool/?barbell=173lb&barbell.hardware=rope&dumbbell.single=11.25lb&uneven=maybe");
    expect(collar("Ironmaster spin-lock collar")).toHaveProperty("checked", true);
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("false");
  });
});
