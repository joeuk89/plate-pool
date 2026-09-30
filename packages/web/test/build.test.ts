// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, type Deployment } from "./build-app";

const pagesPath = "/plate-pool/";

let deployment: Deployment;
let outDir: string;

function read(file: string): string {
  return readFileSync(join(outDir, file), "utf8");
}

function deployedFile(url: string): string {
  expect(url.startsWith(pagesPath)).toBe(true);
  return url.slice(pagesPath.length);
}

function pngSize(file: string): { width: number; height: number } {
  const png = readFileSync(join(outDir, file));
  expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

beforeAll(async () => {
  deployment = await buildApp();
  outDir = deployment.outDir;
}, 60_000);

afterAll(() => deployment.remove());

describe("web app build", () => {
  it("serves every script and stylesheet from the /plate-pool/ path of GitHub Pages", () => {
    const html = read("index.html");
    const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^\/plate-pool\/assets\//);
  });
});

describe("installable web app", () => {
  function manifestUrl(): string {
    const link = read("index.html").match(/<link rel="manifest" href="([^"]+)"/);
    expect(link).not.toBeNull();
    return link![1]!;
  }

  function manifest() {
    return JSON.parse(read(deployedFile(manifestUrl())));
  }

  it("links a web app manifest under the /plate-pool/ path", () => {
    expect(manifestUrl()).toBe("/plate-pool/manifest.webmanifest");
  });

  it("opens the app standalone at the /plate-pool/ path", () => {
    const base = new URL(manifestUrl(), "https://joeuk89.github.io");
    const { name, short_name, display, start_url, scope, id } = manifest();
    expect(name).toBe("plate-pool");
    expect(short_name).toBe("plate-pool");
    expect(display).toBe("standalone");
    expect(new URL(start_url, base).pathname).toBe(pagesPath);
    expect(new URL(scope, base).pathname).toBe(pagesPath);
    expect(new URL(id, base).pathname).toBe(pagesPath);
  });

  it("ships the 192 and 512 pixel icons Android needs to install it, and a maskable icon", () => {
    const base = new URL(manifestUrl(), "https://joeuk89.github.io");
    const icons: { src: string; sizes: string; type: string; purpose?: string }[] = manifest().icons;
    for (const icon of icons) {
      const file = deployedFile(new URL(icon.src, base).pathname);
      expect(existsSync(join(outDir, file))).toBe(true);
      if (icon.type === "image/png") {
        const { width, height } = pngSize(file);
        expect(`${width}x${height}`).toBe(icon.sizes);
      }
    }
    const pngSizes = icons.filter((icon) => icon.type === "image/png").map((icon) => icon.sizes);
    expect(pngSizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});
