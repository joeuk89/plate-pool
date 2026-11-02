import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Calculator } from "../src/Calculator";
import { owner } from "./kits";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function text(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function reopen() {
  cleanup();
  render(<Calculator inventory={owner} />);
}

const collar = (name: string) => within(screen.getByRole("radiogroup", { name: "Collars" })).getByRole("radio", { name });

describe("settings: collar choice (spec 8.8)", () => {
  it("starts on the Mirafit clamp", () => {
    render(<Calculator inventory={owner} />);
    expect(collar('Mirafit 1" clamp collar')).toHaveProperty("checked", true);
  });

  it("remembers the collar choice the next time the app opens", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(collar("Ironmaster spin-lock collar"));
    reopen();
    expect(collar("Ironmaster spin-lock collar")).toHaveProperty("checked", true);
  });
});

describe("settings: uneven loading (spec 6.2 and 8.8)", () => {
  const unevenSwitch = () => screen.getByRole("switch", { name: "Uneven loading" });
  const result = () => screen.getByRole("region", { name: "Result" });

  function openOneDumbbell() {
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Pair or single" })).getByRole("radio", { name: "Single" }));
  }

  function typeTarget(value: string) {
    fireEvent.change(screen.getByLabelText("Target"), { target: { value } });
  }

  it("is on by default, and a target that needs uneven ends is exact", () => {
    render(<Calculator inventory={owner} />);
    openOneDumbbell();
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("true");
    typeTarget("11.25");
    expect(result().textContent).toContain("Exact");
    expect(within(result()).getByRole("list", { name: "Notes" }).textContent).toContain("Uneven: end A is 1.25 lb heavier than end B.");
  });

  it("when off, a target that needs uneven ends shows the closest even loadings below and above (spec 6.4)", () => {
    render(<Calculator inventory={owner} />);
    openOneDumbbell();
    fireEvent.click(unevenSwitch());
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("false");
    typeTarget("11.25");
    expect(result().textContent).toContain("No exact loading for 11.25 lb");
    const below = within(result()).getByRole("article", { name: /Below/ });
    const above = within(result()).getByRole("article", { name: /Above/ });
    expect(below.textContent).toContain("10 lb");
    expect(below.textContent).toContain("Recommended");
    expect(above.textContent).toContain("12.5 lb");
    expect(text(above)).toContain("Each end 1 × 1.25");
    expect(result().textContent).not.toContain("uneven");
  });

  it("remembers the switch the next time the app opens", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    fireEvent.click(unevenSwitch());
    reopen();
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("false");
  });

  it("shows only on the dumbbells tab", () => {
    render(<Calculator inventory={owner} />);
    expect(screen.queryByRole("switch", { name: "Uneven loading" })).toBeNull();
  });
});

describe("settings: last implement used (spec 8.8)", () => {
  const selectedTab = () => within(screen.getByRole("tablist", { name: "Implements" })).getByRole("tab", { selected: true });

  it("opens on the first implement the first time", () => {
    render(<Calculator inventory={owner} />);
    expect(selectedTab().textContent).toBe("Straight bar");
  });

  it("opens on the implement used last", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(screen.getByRole("tab", { name: "Kettlebell" }));
    reopen();
    expect(selectedTab().textContent).toBe("Kettlebell");
    expect(screen.getByRole("tabpanel", { name: "Kettlebell" })).toBeTruthy();
  });
});

describe("settings: empty or blocked storage (spec 8.8)", () => {
  const selectedTab = () => within(screen.getByRole("tablist", { name: "Implements" })).getByRole("tab", { selected: true });

  function blockStorage() {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
  }

  it("opens with the defaults when storage is blocked, and still keeps choices while open", () => {
    blockStorage();
    render(<Calculator inventory={owner} />);
    expect(selectedTab().textContent).toBe("Straight bar");
    expect(collar('Mirafit 1" clamp collar')).toHaveProperty("checked", true);

    fireEvent.click(collar("None"));
    expect(collar("None")).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    fireEvent.click(screen.getByRole("switch", { name: "Uneven loading" }));
    expect(screen.getByRole("switch", { name: "Uneven loading" }).getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("tab", { name: "Straight bar" }));
    expect(collar("None")).toHaveProperty("checked", true);
  });

  it("keeps working when storage refuses to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    render(<Calculator inventory={owner} />);
    fireEvent.click(collar("Ironmaster spin-lock collar"));
    expect(collar("Ironmaster spin-lock collar")).toHaveProperty("checked", true);
  });

  it("falls back to the defaults for a stored value it cannot read", () => {
    localStorage.setItem("plate-pool:settings", "{not json");
    render(<Calculator inventory={owner} />);
    expect(selectedTab().textContent).toBe("Straight bar");
    expect(collar('Mirafit 1" clamp collar')).toHaveProperty("checked", true);
  });

  it("keeps the stored values it can read and uses the defaults for the rest", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ implement: "rack", hardware: { barbell: "none", dumbbell: "screw-giant", rack: "none" }, uneven: "no" }));
    render(<Calculator inventory={owner} />);
    expect(selectedTab().textContent).toBe("Straight bar");
    expect(collar("None")).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    expect(screen.getByRole("switch", { name: "Uneven loading" }).getAttribute("aria-checked")).toBe("true");
    expect(within(screen.getByRole("radiogroup", { name: "Screws" })).getByRole("radio", { name: "Auto" })).toHaveProperty("checked", true);
  });
});

describe("settings: a hardware choice per implement (spec 17.5.4)", () => {
  const screws = (name: string) => within(screen.getByRole("radiogroup", { name: "Screws" })).getByRole("radio", { name });

  it("keeps each implement's hardware choice apart, keyed by its id, and remembers it", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(collar("None"));
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    fireEvent.click(screws("Long locking screw"));
    fireEvent.click(screen.getByRole("tab", { name: "Kettlebell" }));
    expect(screws("Auto")).toHaveProperty("checked", true);
    expect(JSON.parse(localStorage.getItem("plate-pool:settings")!).hardware).toEqual({ barbell: "none", dumbbell: "screw-long" });

    reopen();
    fireEvent.click(screen.getByRole("tab", { name: "Straight bar" }));
    expect(collar("None")).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    expect(screws("Long locking screw")).toHaveProperty("checked", true);
  });

  it("forgets a choice when Auto is picked again", () => {
    render(<Calculator inventory={owner} />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbell" }));
    fireEvent.click(screws("Long locking screw"));
    fireEvent.click(screws("Auto"));
    expect(JSON.parse(localStorage.getItem("plate-pool:settings")!).hardware).toEqual({});
  });
});
