import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

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
  render(<App />);
}

const collar = (name: string) => within(screen.getByRole("radiogroup", { name: "Collars" })).getByRole("radio", { name });

describe("settings: collar choice (spec 8.8)", () => {
  it("starts on the Mirafit clamp", () => {
    render(<App />);
    expect(collar("Clamp")).toHaveProperty("checked", true);
  });

  it("remembers the collar choice the next time the app opens", () => {
    render(<App />);
    fireEvent.click(collar("Spin-lock"));
    reopen();
    expect(collar("Spin-lock")).toHaveProperty("checked", true);
  });
});

describe("settings: uneven loading (spec 6.2 and 8.8)", () => {
  const unevenSwitch = () => screen.getByRole("switch", { name: "Uneven loading" });
  const result = () => screen.getByRole("region", { name: "Result" });

  function openOneDumbbell() {
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Dumbbells" })).getByRole("radio", { name: "One" }));
  }

  function typeTarget(value: string) {
    fireEvent.change(screen.getByLabelText("Target"), { target: { value } });
  }

  it("is on by default, and a target that needs uneven ends is exact", () => {
    render(<App />);
    openOneDumbbell();
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("true");
    typeTarget("11.25");
    expect(result().textContent).toContain("Exact");
    expect(within(result()).getByRole("list", { name: "Notes" }).textContent).toContain("Uneven: end A is 1.25 lb heavier than end B.");
  });

  it("when off, a target that needs uneven ends shows the closest even loadings below and above (spec 6.4)", () => {
    render(<App />);
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
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    fireEvent.click(unevenSwitch());
    reopen();
    expect(unevenSwitch().getAttribute("aria-checked")).toBe("false");
  });

  it("shows only on the dumbbells tab", () => {
    render(<App />);
    expect(screen.queryByRole("switch", { name: "Uneven loading" })).toBeNull();
  });
});

describe("settings: last implement used (spec 8.8)", () => {
  const selectedTab = () => within(screen.getByRole("tablist", { name: "Implements" })).getByRole("tab", { selected: true });

  it("opens on the barbell the first time", () => {
    render(<App />);
    expect(selectedTab().textContent).toBe("Barbell");
  });

  it("opens on the implement used last", () => {
    render(<App />);
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
    render(<App />);
    expect(selectedTab().textContent).toBe("Barbell");
    expect(collar("Clamp")).toHaveProperty("checked", true);

    fireEvent.click(collar("None"));
    expect(collar("None")).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    fireEvent.click(screen.getByRole("switch", { name: "Uneven loading" }));
    expect(screen.getByRole("switch", { name: "Uneven loading" }).getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("tab", { name: "Barbell" }));
    expect(collar("None")).toHaveProperty("checked", true);
  });

  it("keeps working when storage refuses to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    render(<App />);
    fireEvent.click(collar("Spin-lock"));
    expect(collar("Spin-lock")).toHaveProperty("checked", true);
  });

  it("falls back to the defaults for a stored value it cannot read", () => {
    localStorage.setItem("plate-pool:settings", "{not json");
    render(<App />);
    expect(selectedTab().textContent).toBe("Barbell");
    expect(collar("Clamp")).toHaveProperty("checked", true);
  });

  it("keeps the stored values it can read and uses the defaults for the rest", () => {
    localStorage.setItem("plate-pool:settings", JSON.stringify({ implement: "rack", collars: "none", uneven: "no" }));
    render(<App />);
    expect(selectedTab().textContent).toBe("Barbell");
    expect(collar("None")).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    expect(screen.getByRole("switch", { name: "Uneven loading" }).getAttribute("aria-checked")).toBe("true");
  });
});
