import { createHash } from "node:crypto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { ownerText } from "./kits";

const fetchSpy = vi.fn();

beforeEach(() => {
  const sha256 = createHash("sha256").update(ownerText).digest("hex");
  localStorage.setItem("plate-pool:kit", JSON.stringify({ text: ownerText, sha256 }));
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchSpy.mockReset();
});

interface BrowserApis {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

function stubNavigator({ share, clipboard }: BrowserApis) {
  vi.stubGlobal("navigator", { userAgent: navigator.userAgent, language: navigator.language, share, clipboard });
}

async function pressShare() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
  });
}

describe("the Share button (spec 8.7)", () => {
  it("shows on the Load, List and Reverse screens", () => {
    render(<App />);
    for (const view of ["Load", "List", "Reverse"]) {
      fireEvent.click(screen.getByRole("button", { name: view }));
      expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();
    }
  });

  it("opens the share sheet with the URL the screen shows now, and makes no network request", async () => {
    const share = vi.fn(async (_data: ShareData) => {});
    const writeText = vi.fn(async (_text: string) => {});
    stubNavigator({ share, clipboard: { writeText } });
    window.history.replaceState(null, "", "/plate-pool/?barbell=173lb");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    await pressShare();
    expect(share).toHaveBeenCalledTimes(1);
    const url = share.mock.calls[0]![0].url!;
    expect(url).toBe(window.location.href);
    expect(new URL(url).searchParams.get("barbell")).toBe("173lb");
    expect(new URL(url).searchParams.get("view")).toBe("list");
    expect(writeText).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows no error when the share sheet is cancelled", async () => {
    const share = vi.fn(async () => {
      throw new DOMException("Share canceled", "AbortError");
    });
    const writeText = vi.fn(async (_text: string) => {});
    stubNavigator({ share, clipboard: { writeText } });
    render(<App />);
    await pressShare();
    expect(share).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText("Link copied")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Link" })).toBeNull();
  });

  it('without a share sheet, copies the link and says "Link copied"', async () => {
    const writeText = vi.fn(async (_text: string) => {});
    stubNavigator({ clipboard: { writeText } });
    window.history.replaceState(null, "", "/plate-pool/?barbell=173lb");
    render(<App />);
    await pressShare();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByText("Link copied")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("if copying also fails, shows the link as text to copy by hand", async () => {
    const writeText = vi.fn(async () => {
      throw new DOMException("Write permission denied", "NotAllowedError");
    });
    stubNavigator({ clipboard: { writeText } });
    window.history.replaceState(null, "", "/plate-pool/?barbell=173lb");
    render(<App />);
    await pressShare();
    const link = screen.getByRole("textbox", { name: "Link" }) as HTMLInputElement;
    expect(link.value).toBe(window.location.href);
    expect(link.readOnly).toBe(true);
    expect(screen.queryByText("Link copied")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("textbox", { name: "Link" })).toBeNull();
  });

  it("shows the link as text when the browser has neither a share sheet nor a clipboard", async () => {
    stubNavigator({});
    render(<App />);
    await pressShare();
    expect((screen.getByRole("textbox", { name: "Link" }) as HTMLInputElement).value).toBe(window.location.href);
  });
});
