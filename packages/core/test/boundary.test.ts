import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

describe("library boundary (spec 12.1)", () => {
  it("has no runtime dependencies", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    expect(manifest.dependencies ?? {}).toEqual({});
    expect(manifest.peerDependencies ?? {}).toEqual({});
    expect(manifest.optionalDependencies ?? {}).toEqual({});
  });

  it("imports only its own modules", () => {
    const sourceDir = join(packageRoot, "src");
    const specifiers = readdirSync(sourceDir, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".ts"))
      .flatMap((file) => {
        const source = readFileSync(join(sourceDir, file), "utf8");
        return [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((match) => match[1]);
      });
    expect(specifiers.filter((specifier) => !specifier?.startsWith("./"))).toEqual([]);
  });

  it("cannot reach files, network or browser features", () => {
    const result = spawnSync("npx", ["tsc", "-p", "test/probe/tsconfig.json"], {
      cwd: packageRoot,
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "document", "window", "localStorage", "navigator", "process", "require", "Buffer"]) {
      expect(result.stdout).toContain(`Cannot find name '${name}'`);
    }
    for (const module of ["node:fs", "fs", "node:http"]) {
      expect(result.stdout).toMatch(new RegExp(`Cannot find (module|name) '${module}'`));
    }
  });
});

describe("rules as data (spec 17.4)", () => {
  const kindWords = new Set(["bar", "handle", "stack", "vest", "left", "right", "a", "b", "front", "back", "screw", "collar", "pin", "none"]);
  const sources = readdirSync(join(packageRoot, "src"), { encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .map((file) => [file, readFileSync(join(packageRoot, "src", file), "utf8")] as const);

  it.each(["../../inventory/inventory.json", "test/fixtures/olympic-kit.json"])("names no plate, hardware or implement id from %s", (path) => {
    const file = JSON.parse(readFileSync(join(packageRoot, path), "utf8"));
    const ids: string[] = [...file.plates, ...file.hardware, ...file.implements].map((entry: { id: string }) => entry.id);
    expect(ids.length).toBeGreaterThan(5);
    for (const id of ids.filter((each) => !kindWords.has(each))) {
      for (const [name, source] of sources) expect(source.includes(`"${id}"`), `${name} names "${id}"`).toBe(false);
    }
  });
});
