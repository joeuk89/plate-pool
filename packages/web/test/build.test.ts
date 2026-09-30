// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { describe, expect, it } from "vitest";

const webRoot = fileURLToPath(new URL("..", import.meta.url));

describe("web app build", () => {
  it("serves every script and stylesheet from the /plate-pool/ path of GitHub Pages", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "plate-pool-web-"));
    let html: string;
    try {
      await build({ root: webRoot, logLevel: "silent", build: { outDir, emptyOutDir: true } });
      html = readFileSync(join(outDir, "index.html"), "utf8");
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }

    const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^\/plate-pool\/assets\//);
  }, 60_000);
});
