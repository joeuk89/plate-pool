import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { list, load, readInventory, reverse } from "@plate-pool/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const repoInventory = fileURLToPath(new URL("../../../inventory/inventory.json", import.meta.url));
const repoSchema = fileURLToPath(new URL("../../../inventory/inventory.schema.json", import.meta.url));
const inventoryText = readFileSync(repoInventory, "utf8");
const inventory = readInventory(inventoryText);

let workDirectory: string;
let installDirectory: string;
let inventoryOutside: string;
let packedFiles: string[];

function npm(args: string[], cwd: string): string {
  return execFileSync("npm", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function bin(): string {
  return join(installDirectory, "node_modules", ".bin", "plate-pool");
}

function platePool(...args: string[]): unknown {
  return JSON.parse(execFileSync(bin(), [...args, "--inventory", inventoryOutside, "--json"], { cwd: installDirectory, encoding: "utf8" }));
}

beforeAll(() => {
  workDirectory = mkdtempSync(join(tmpdir(), "plate-pool-pack-"));
  const [packed] = Object.values(JSON.parse(npm(["pack", "--json", "--pack-destination", workDirectory], packageDirectory))) as {
    filename: string;
    files: { path: string }[];
  }[];
  packedFiles = packed!.files.map((file) => file.path);
  installDirectory = join(workDirectory, "empty");
  mkdirSync(installDirectory);
  npm(["init", "--yes"], installDirectory);
  npm(["install", "--offline", "--no-audit", "--no-fund", join(workDirectory, packed!.filename)], installDirectory);
  inventoryOutside = join(workDirectory, "home.json");
  copyFileSync(repoInventory, inventoryOutside);
}, 120_000);

afterAll(() => {
  if (workDirectory) rmSync(workDirectory, { recursive: true, force: true });
});

describe("the packed plate-pool package, installed in an empty directory", () => {
  it("is named plate-pool and can be published", () => {
    const manifest = JSON.parse(readFileSync(join(installDirectory, "node_modules", "plate-pool", "package.json"), "utf8"));
    expect(manifest.name).toBe("plate-pool");
    expect(manifest.private).not.toBe(true);
  });

  it("carries the MIT licence", () => {
    const packageRoot = join(installDirectory, "node_modules", "plate-pool");
    expect(JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).license).toBe("MIT");
    expect(readFileSync(join(packageRoot, "LICENSE"), "utf8")).toMatch(/^MIT License/);
  });

  it("bundles the schema at plate-pool/inventory.schema.json and no inventory file", () => {
    expect(packedFiles).toContain("inventory.schema.json");
    expect(packedFiles.filter((path) => path !== "inventory.schema.json" && path !== "package.json" && path.endsWith(".json"))).toEqual([]);
    const schema = readFileSync(join(installDirectory, "node_modules", "plate-pool", "inventory.schema.json"), "utf8");
    expect(schema).toBe(readFileSync(repoSchema, "utf8"));
  });

  it("exits 1 with the missing-inventory sentence when no inventory is named", () => {
    const { PLATE_POOL_INVENTORY: _, ...env } = process.env;
    const result = spawnSync(bin(), ["inventory"], { cwd: installDirectory, encoding: "utf8", env });
    expect(result.status).toBe(1);
    expect(result.stderr).toBe("No inventory given. Pass --inventory <path> or set PLATE_POOL_INVENTORY.\n");
  });

  it("runs load against a file outside the repo and gives spec section 7 example 2", () => {
    const response = platePool("load", "barbell=173") as ReturnType<typeof load>;
    expect(response).toEqual(load(inventory, { targets: [{ implement: "barbell", target: "173" }] }));
    expect(response.results[0]?.exact).toBe(true);
  });

  it("reads PLATE_POOL_INVENTORY", () => {
    const output = execFileSync(bin(), ["load", "barbell=173", "--json"], {
      cwd: installDirectory,
      encoding: "utf8",
      env: { ...process.env, PLATE_POOL_INVENTORY: inventoryOutside },
    });
    expect(JSON.parse(output)).toEqual(load(inventory, { targets: [{ implement: "barbell", target: "173" }] }));
  });

  it("runs list", () => {
    expect(platePool("list", "barbell", "--from", "100", "--to", "200")).toEqual(list(inventory, { implement: "barbell", from: "100", to: "200" }));
  });

  it("runs reverse", () => {
    const side = [22.5, 22.5, 5, 5];
    expect(platePool("reverse", "barbell", "--side", "2x22.5,2x5")).toEqual(
      reverse(inventory, { implement: "barbell", positions: [{ name: "left", plates: side }, { name: "right", plates: side }] }),
    );
  });

  it("runs inventory, printing the file as read", () => {
    expect(execFileSync(bin(), ["inventory", "--inventory", inventoryOutside, "--json"], { encoding: "utf8" })).toBe(inventoryText);
  });

  it("runs achievable, with the package version in the header", () => {
    const written = platePool("achievable") as { plate_pool: string; name: string };
    const manifest = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));
    expect(written.plate_pool).toBe(manifest.version);
    expect(written.name).toBe("Home gym");
  });
});
