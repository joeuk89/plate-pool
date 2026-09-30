import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Loading, LoadResponse } from "@plate-pool/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { run } from "../../cli/src/main.ts";
import { App } from "../src/App";
import { plateList } from "../src/describe";

afterEach(cleanup);

function text(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function open(link: string) {
  window.history.replaceState(null, "", link);
  render(<App />);
}

const card = (priority: number) => screen.getByRole("region", { name: new RegExp(`^${priority}\\. `) });
const cardNames = () => screen.getAllByRole("region", { name: /^\d\. / }).map((item) => item.getAttribute("aria-label"));
const result = (priority: number) => within(card(priority)).getByRole("region", { name: "Result" });

function expectSameAsCommandLine(targets: string[], options: string[] = []) {
  let stdout = "";
  const code = run(["load", ...targets, ...options, "--json"], {
    stdout: (output) => (stdout += output),
    stderr: () => {},
    defaultInventoryPath: join(dirname(fileURLToPath(import.meta.url)), "../../../inventory/inventory.json"),
  });
  expect(code).toBe(0);
  const response = JSON.parse(stdout) as LoadResponse;
  response.results.forEach((item, index) => {
    const loading = (item.loading ?? (item.recommended && item[item.recommended])) as Loading;
    const shown = text(result(index + 1));
    expect(shown).toContain(`${loading.total.lb} lb`);
    if (item.implement === "vest") return;
    for (const position of loading.positions) expect(shown).toContain(plateList(position.plates).replace(/\s/g, " "));
  });
}

const settings = () => JSON.parse(localStorage.getItem("plate-pool:settings") ?? "{}") as Record<string, unknown>;
const collar = (name: string) => within(screen.getByRole("radiogroup", { name: "Collars" })).getByRole("radio", { name });
const unevenSwitch = () => screen.getByRole("switch", { name: "Uneven loading" });

describe("links: the example in spec 8.7", () => {
  it("opens example 10's result: barbell 173 lb then dumbbells 40 lb, both exact, with the plates left over", () => {
    open("/plate-pool/?barbell=173&dumbbells=40");
    expect(cardNames()).toEqual(["1. Barbell", "2. Dumbbells"]);
    expect(text(result(1))).toContain("Exact");
    expect(text(result(1))).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5");
    expect(text(result(2))).toContain("Exact");
    expect(text(result(2))).toContain("Each end 3 × 5");
    expect(text(screen.getByRole("region", { name: "Left over" }))).toContain("Plates 1 × 22.5, 2 × 2.5, 4 × 1.25");
  });
});

describe("links: targets (spec 8.7)", () => {
  const unit = (priority: number) => within(card(priority)).getByRole("radiogroup", { name: "Unit" });

  it("reads a unit on the value: barbell=80kg is 80 kg on the barbell", () => {
    open("/plate-pool/?barbell=80kg&kettlebell=40");
    expect(within(unit(1)).getByRole("radio", { name: "kg" })).toHaveProperty("checked", true);
    expect(within(card(1)).getByLabelText("Target")).toHaveProperty("value", "80");
    expect(text(result(1))).toContain("No exact loading for 176.37 lb (80 kg)");
  });

  it("reads a bare number in the implement's own unit: vest=12 is example 13, and vest=12kg is the same", () => {
    open("/plate-pool/?vest=12");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Front 6 blocks");
    cleanup();
    open("/plate-pool/?vest=12kg");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Front 6 blocks");
  });

  it("reads vest=30lb as example 14: 13 kg below and 14 kg above", () => {
    open("/plate-pool/?vest=30lb");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("No exact loading for 13.6 kg (30 lb)");
  });

  it("reads dumbbell as one dumbbell: dumbbell=12.5 is example 5", () => {
    open("/plate-pool/?dumbbell=12.5");
    expect(within(screen.getByRole("radiogroup", { name: "Dumbbells" })).getByRole("radio", { name: "One" })).toHaveProperty("checked", true);
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("End A heavier 1 × 2.5");
  });

  it("puts the implements in the link's order, which is priority order: dumbbells 120 lb then kettlebell 40 lb is example 9", () => {
    open("/plate-pool/?dumbbells=120&kettlebell=40");
    expect(cardNames()).toEqual(["1. Dumbbells", "2. Kettlebell"]);
    expect(text(result(2))).toContain("Not exact because the dumbbells use the 5 lb plates the kettlebell needs to reach 40 lb.");
  });

  it("shows the reason on the card for a value that is not a weight", () => {
    open("/plate-pool/?barbell=abc");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain('"abc" is not a weight.');
  });

  it("reads the implement names and target syntax the command-line tool takes", () => {
    open("/plate-pool/?barbell=173lb&dumbbells=40&leg=50&vest=12kg");
    expect(cardNames()).toEqual(["1. Barbell", "2. Dumbbells", "3. Leg attachment", "4. Vest"]);
    expectSameAsCommandLine(["barbell=173lb", "dumbbells=40", "leg=50", "vest=12kg"]);
  });

  it("ignores parameters it does not know", () => {
    open("/plate-pool/?rack=100&barbell=173");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Exact");
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

  it("names the implement before a target is typed", () => {
    open("/plate-pool/");
    expect(window.location.pathname).toBe("/plate-pool/");
    expect(search()).toBe("?barbell&collars=clamp");
  });

  it("writes each target as it is typed, in priority order, with the collar choice and the uneven switch", () => {
    open("/plate-pool/");
    typeTarget(1, "173");
    expect(search()).toBe("?barbell=173&collars=clamp");
    addImplement("Dumbbells");
    typeTarget(2, "40");
    expect(search()).toBe("?barbell=173&dumbbells=40&collars=clamp&uneven=1");
  });

  it("writes the unit when it is not the implement's own", () => {
    open("/plate-pool/?barbell=80");
    fireEvent.click(within(within(card(1)).getByRole("radiogroup", { name: "Unit" })).getByRole("radio", { name: "kg" }));
    expect(search()).toBe("?barbell=80kg&collars=clamp");
  });

  it("writes one dumbbell as dumbbell and the uneven switch off as uneven=0", () => {
    open("/plate-pool/?dumbbells=12.5");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Dumbbells" })).getByRole("radio", { name: "One" }));
    fireEvent.click(unevenSwitch());
    expect(search()).toBe("?dumbbell=12.5&uneven=0");
  });

  it("writes the collar choice when it changes", () => {
    open("/plate-pool/?barbell=173");
    fireEvent.click(collar("Spin-lock"));
    expect(search()).toBe("?barbell=173&collars=spinlock");
  });

  it("writes the view when it is not Load", () => {
    open("/plate-pool/?kettlebell=40");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name: "List" }));
    expect(search()).toBe("?kettlebell=40&view=list");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name: "Reverse" }));
    expect(search()).toBe("?kettlebell=40&view=reverse");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Screens" })).getByRole("button", { name: "Load" }));
    expect(search()).toBe("?kettlebell=40");
  });

  it("writes the implement picked from the tabs", () => {
    open("/plate-pool/?barbell=173");
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
    addImplement("Dumbbells");
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
    open("/plate-pool/?barbell=173");
    expect(currentView().textContent).toBe("Load");
  });

  it("opens the List screen with view=list, on the link's implement", () => {
    open("/plate-pool/?kettlebell&view=list");
    expect(currentView().textContent).toBe("List");
    expect(selectedTab().textContent).toBe("Kettlebell");
    expect(screen.getByRole("region", { name: "Achievable weights" })).toBeTruthy();
  });

  it("opens the List screen for one dumbbell with dumbbell and view=list", () => {
    open("/plate-pool/?dumbbell&view=list");
    expect(currentView().textContent).toBe("List");
    expect(within(screen.getByRole("radiogroup", { name: "Dumbbells" })).getByRole("radio", { name: "One" })).toHaveProperty("checked", true);
  });

  it("opens the Reverse screen with view=reverse", () => {
    open("/plate-pool/?view=reverse&vest");
    expect(currentView().textContent).toBe("Reverse");
    expect(selectedTab().textContent).toBe("Vest");
    expect(screen.getByRole("region", { name: "Total" })).toBeTruthy();
  });

  it("opens the Load screen for a view it does not know", () => {
    open("/plate-pool/?view=settings");
    expect(currentView().textContent).toBe("Load");
  });
});

describe("links: a parameter wins over a remembered setting", () => {
  it("uses collars from the link over the remembered collar choice, and leaves the remembered choice alone", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ collars: "spinlock" }));
    open("/plate-pool/?barbell=173&collars=none");
    expect(collar("None")).toHaveProperty("checked", true);
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Collars None");
    expect(settings().collars ?? "spinlock").toBe("spinlock");
  });

  it("uses the remembered collar choice when the link names none", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ collars: "spinlock" }));
    open("/plate-pool/?barbell=173");
    expect(collar("Spin-lock")).toHaveProperty("checked", true);
  });

  it("turns uneven loading off with uneven=0, over the remembered switch", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ uneven: true }));
    open("/plate-pool/?dumbbell=11.25&uneven=0");
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("false");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("No exact loading for 11.25 lb");
    expectSameAsCommandLine(["dumbbell=11.25"], ["--no-uneven"]);
  });

  it("turns uneven loading on with uneven=1, over the remembered switch", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ uneven: false }));
    open("/plate-pool/?dumbbell=11.25&uneven=1");
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("true");
    expect(text(screen.getByRole("region", { name: "Result" }))).toContain("Exact");
  });

  it("remembers a choice the owner makes after opening a link", () => {
    open("/plate-pool/?barbell=173&collars=none");
    fireEvent.click(collar("Spin-lock"));
    expect(settings().collars).toBe("spinlock");
  });

  it("ignores a collars or uneven value it does not know", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ collars: "spinlock", uneven: false }));
    open("/plate-pool/?barbell=173&collars=rope&dumbbell=11.25&uneven=maybe");
    expect(collar("Spin-lock")).toHaveProperty("checked", true);
  });
});
