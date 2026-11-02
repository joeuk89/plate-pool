import { createHash } from "node:crypto";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { olympicText, ownerText, setupFragment } from "./kits";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function text(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const shortHash = (file: string) => createHash("sha256").update(file).digest("hex").slice(0, 8);
const pasteField = () => screen.getByLabelText("Paste your inventory file") as HTMLTextAreaElement;

function paste(file: string) {
  fireEvent.change(pasteField(), { target: { value: file } });
  fireEvent.click(screen.getByRole("button", { name: "Use this file" }));
}

async function exampleTwoShows() {
  const result = await screen.findByRole("region", { name: "Result" });
  expect(text(result)).toContain("Exact");
  expect(text(result)).toContain("Each side 2 × 22.5, 6 × 5, 1 × 2.5");
  expect(text(result)).toContain("173 lb");
}

describe("the kit screen with no kit stored (spec 17.5.1)", () => {
  it("is the whole app: the masthead, what the app does, the set-up link card, the import panel and the pointer", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("plate-pool");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Screens" })).toBeNull();
    expect(screen.getByRole("region", { name: "Open your set-up link" })).toBeTruthy();
    expect(pasteField().value).toBe("");
    expect(screen.getByRole("button", { name: "Use this file" })).toBeTruthy();
    expect(screen.getByLabelText("Choose a file…")).toBeTruthy();
    const pointer = screen.getByText(/No file yet\?/);
    expect(text(pointer)).toBe(
      "No file yet? An inventory describes your plates, hardware and bars. Write one with strength-coach , which also makes your set-up link.",
    );
    expect(within(pointer).getByRole("link", { name: "strength-coach" }).getAttribute("href")).toBe(
      "https://github.com/joeuk89/strength-coach#readme",
    );
  });

  it("pasting the owner's file stores it, names it under the masthead and keeps the targets the URL carried (example 2)", async () => {
    window.history.replaceState(null, "", "/?barbell=173lb");
    render(<App />);
    paste(ownerText);
    await exampleTwoShows();
    expect(screen.getByRole("button", { name: /^Home gym/ })).toBeTruthy();

    cleanup();
    window.history.replaceState(null, "", "/");
    render(<App />);
    expect(screen.getByRole("tablist", { name: "Implements" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Home gym/ })).toBeTruthy();
  });

  it("shows the reader's error naming format for a format 2 file, and keeps the pasted text", async () => {
    render(<App />);
    const formatTwo = ownerText.replace('"format": 1', '"format": 2');
    paste(formatTwo);
    const errors = await screen.findByRole("alert");
    expect(text(errors)).toContain("Inventory format 2 is not supported. This version reads format 1.");
    expect(pasteField().value).toBe(formatTwo);
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("shows up to three of the reader's errors, each naming its JSON path", async () => {
    render(<App />);
    const file = JSON.parse(ownerText);
    delete file.name;
    delete file.lengthUnit;
    file.implements[1].kind = "wheel";
    file.implements[2].id = "kit";
    paste(JSON.stringify(file));
    const items = within(await screen.findByRole("alert")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "name: required",
      "lengthUnit: required",
      "implements[1].kind: must be one of bar, handle, stack, vest",
    ]);
  });

  it("a chosen file fills the field, and Use this file stores it with the hash of the file's bytes", async () => {
    render(<App />);
    const input = screen.getByLabelText("Choose a file…") as HTMLInputElement;
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(olympicText)]);
    fireEvent.change(input, { target: { files: [new File([bytes], "olympic.json", { type: "application/json" })] } });
    await screen.findByText("From olympic.json");
    expect(pasteField().value).toContain('"name": "Olympic kit"');
    fireEvent.click(screen.getByRole("button", { name: "Use this file" }));
    fireEvent.click(await screen.findByRole("button", { name: /^Olympic kit/ }));
    expect(text(screen.getByRole("region", { name: "Kit on this device" }))).toContain(
      `kit ${createHash("sha256").update(bytes).digest("hex").slice(0, 8)}`,
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Olympic bar", "Loadable dumbbell", "Dip belt", "Plate carrier"]);
  });
});

describe("the kit page (spec 17.5.3)", () => {
  it("opens from the chip and shows the name, the counts and the first 8 hex of the file's SHA-256", async () => {
    render(<App />);
    paste(ownerText);
    fireEvent.click(await screen.findByRole("button", { name: /^Home gym/ }));
    const page = screen.getByRole("region", { name: "Kit on this device" });
    expect(text(page)).toContain("Home gym");
    expect(text(page)).toContain("5 implements, 5 plate entries, 4 hardware items");
    expect(text(page)).toContain(`kit ${shortHash(ownerText)}`);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("tablist", { name: "Implements" })).toBeTruthy();
  });
});

async function install(file: string) {
  render(<App />);
  paste(file);
  await screen.findByRole("tablist", { name: "Implements" });
  cleanup();
}

const confirmCard = () => screen.findByRole("region", { name: "Set-up link opened" });
const replaceWarning = "Replacing the kit clears what is loaded on every implement and forgets the last implement you used.";

describe("arrival by set-up link (spec 17.5.2)", () => {
  it("example 27: the owner's file as a set-up link names Home gym; the tap stores it, drops the fragment and shows example 2", async () => {
    window.history.replaceState(null, "", `/?barbell=173lb${await setupFragment(ownerText)}`);
    render(<App />);
    const card = await confirmCard();
    expect(text(card)).toContain("Home gym");
    expect(text(card)).toContain("5 implements, 5 plate entries, 4 hardware items");
    expect(text(card)).not.toContain("replaces");
    expect(screen.queryByRole("tablist")).toBeNull();
    fireEvent.click(within(card).getByRole("button", { name: "Use Home gym on this phone" }));
    await exampleTwoShows();
    expect(window.location.hash).toBe("");
    expect(new URLSearchParams(window.location.search).get("barbell")).toBe("173lb");
    expect(screen.getByRole("button", { name: /^Home gym/ })).toBeTruthy();
  });

  it("the tap lands on Load even when the link names another view", async () => {
    window.history.replaceState(null, "", `/?barbell=173lb&view=list${await setupFragment(ownerText)}`);
    render(<App />);
    fireEvent.click(within(await confirmCard()).getByRole("button", { name: "Use Home gym on this phone" }));
    await exampleTwoShows();
    expect(screen.getByRole("button", { name: "Load" }).getAttribute("aria-current")).toBe("page");
    expect(new URLSearchParams(window.location.search).get("view")).toBeNull();
  });

  it("installs with the network off: the device decodes and hashes the link itself", async () => {
    const fragment = await setupFragment(ownerText);
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    window.history.replaceState(null, "", `/?barbell=173lb${fragment}`);
    render(<App />);
    fireEvent.click(within(await confirmCard()).getByRole("button", { name: "Use Home gym on this phone" }));
    await exampleTwoShows();
  });

  it("with the Olympic kit stored, the card says it replaces Olympic kit and what that clears", async () => {
    await install(olympicText);
    window.history.replaceState(null, "", `/${await setupFragment(ownerText)}`);
    render(<App />);
    const card = await confirmCard();
    expect(within(card).getByText(/^It replaces/).textContent).toBe(`It replaces Olympic kit. ${replaceWarning}`);
    fireEvent.click(within(card).getByRole("button", { name: "Use Home gym on this phone" }));
    expect((await screen.findAllByRole("tab")).map((tab) => tab.textContent)).toContain("Straight bar");
    expect(screen.getByRole("button", { name: /^Home gym/ })).toBeTruthy();
  });

  it("Keep leaves the stored kit in place and drops the fragment", async () => {
    await install(olympicText);
    window.history.replaceState(null, "", `/${await setupFragment(ownerText)}`);
    render(<App />);
    fireEvent.click(within(await confirmCard()).getByRole("button", { name: "Keep Olympic kit" }));
    expect(screen.getByRole("button", { name: /^Olympic kit/ })).toBeTruthy();
    expect(window.location.hash).toBe("");
  });

  it("a link for the kit already stored opens the app with no card", async () => {
    await install(ownerText);
    window.history.replaceState(null, "", `/?barbell=173lb${await setupFragment(ownerText)}`);
    render(<App />);
    await exampleTwoShows();
    expect(window.location.hash).toBe("");
  });

  it("a fragment that fails to decode shows its error above the import panel", async () => {
    window.history.replaceState(null, "", "/#inventory=not-a-deflate-stream");
    render(<App />);
    const alert = await screen.findByRole("alert");
    expect(text(alert)).toContain("This set-up link is damaged");
    expect(alert.compareDocumentPosition(pasteField()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("with a kit stored, a damaged fragment opens the kit page with the error and the Replace panel, and Done keeps the kit", async () => {
    await install(ownerText);
    window.history.replaceState(null, "", "/?barbell=173lb#inventory=not-a-deflate-stream");
    render(<App />);
    expect(text(await screen.findByRole("alert"))).toContain("This set-up link is damaged");
    expect(text(screen.getByRole("region", { name: "Kit on this device" }))).toContain("Home gym");
    expect(text(screen.getByRole("region", { name: "Replace kit" }))).toContain(replaceWarning);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await exampleTwoShows();
    expect(window.location.hash).toBe("");
  });

  it("a fragment that fails to validate shows the reader's errors", async () => {
    window.history.replaceState(null, "", `/${await setupFragment(ownerText.replace('"format": 1', '"format": 2'))}`);
    render(<App />);
    expect(text(await screen.findByRole("alert"))).toContain("Inventory format 2 is not supported.");
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});

describe("Replace kit (spec 17.5.3)", () => {
  const openReplace = async () => {
    fireEvent.click(await screen.findByRole("button", { name: /^Home gym/ }));
    fireEvent.click(screen.getByRole("button", { name: "Replace kit" }));
  };

  it("warns what it clears, and a file that fails validation leaves the old kit in place", async () => {
    await install(ownerText);
    render(<App />);
    await openReplace();
    expect(text(screen.getByRole("region", { name: "Replace kit" }))).toContain(replaceWarning);
    paste(olympicText.replace('"format": 1', '"format": 2'));
    expect(text(await screen.findByRole("alert"))).toContain("Inventory format 2 is not supported.");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("button", { name: /^Home gym/ })).toBeTruthy();

    cleanup();
    render(<App />);
    expect(screen.getByRole("button", { name: /^Home gym/ })).toBeTruthy();
  });

  it("clears every current loading, the last implement and the hardware choices, and keeps the uneven switch", async () => {
    await install(ownerText);
    window.history.replaceState(null, "", "/?dumbbell=40lb&dumbbell.hardware=screw-long&uneven=0");
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Loaded" }));
    fireEvent.click(screen.getByRole("switch", { name: "Uneven loading" }));
    fireEvent.click(screen.getByRole("switch", { name: "Uneven loading" }));
    expect(JSON.parse(localStorage.getItem("plate-pool:settings")!)).toMatchObject({ implement: "dumbbell", uneven: false });

    await openReplace();
    paste(ownerText.replace('"name": "Home gym"', '"name": "Home gym 2"'));
    await screen.findByRole("button", { name: /^Home gym 2/ });
    expect(screen.queryByRole("region", { name: "Current loading" })).toBeNull();
    expect(JSON.parse(localStorage.getItem("plate-pool:settings")!)).toEqual({ uneven: false });
    expect(JSON.parse(localStorage.getItem("plate-pool:current") ?? "{}")).toEqual({});
  });
});

describe("hash mismatch (spec 17.5.5)", () => {
  const banner = () => screen.queryByText(/worked out for a different kit/);

  it("example 28: a per-line link for another kit shows example 2 with the banner, and changing the target removes it", async () => {
    await install(ownerText);
    window.history.replaceState(null, "", "/?barbell=173lb&kit=00000000");
    render(<App />);
    await exampleTwoShows();
    expect(banner()?.textContent).toBe(
      "These targets were worked out for a different kit. Open your set-up link again if your gym has changed.",
    );
    expect(banner()!.compareDocumentPosition(screen.getByRole("tablist")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "175" } });
    expect(banner()).toBeNull();
  });

  it("shows no banner when the link's kit is the stored kit, and the app's own URL names the stored kit", async () => {
    await install(ownerText);
    window.history.replaceState(null, "", `/?barbell=173lb&kit=${shortHash(ownerText)}`);
    render(<App />);
    await exampleTwoShows();
    expect(banner()).toBeNull();
    expect(new URLSearchParams(window.location.search).get("kit")).toBe(shortHash(ownerText));
  });

  it("goes when the kit is replaced", async () => {
    await install(ownerText);
    window.history.replaceState(null, "", "/?barbell=173lb&kit=00000000");
    render(<App />);
    await exampleTwoShows();
    fireEvent.click(screen.getByRole("button", { name: /^Home gym/ }));
    fireEvent.click(screen.getByRole("button", { name: "Replace kit" }));
    paste(ownerText.replace('"name": "Home gym"', '"name": "Home gym 2"'));
    await screen.findByRole("button", { name: /^Home gym 2/ });
    expect(banner()).toBeNull();
  });
});
