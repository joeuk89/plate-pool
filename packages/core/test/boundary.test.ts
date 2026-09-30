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
