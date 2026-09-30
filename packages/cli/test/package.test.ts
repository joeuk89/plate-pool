import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { list, load, readInventory, reverse } from "@plate-pool/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const inventoryFile = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../inventory/inventory.json", import.meta.url)), "utf8"),
);
const inventory = readInventory(inventoryFile);

let workDirectory: string;
let installDirectory: string;

function npm(args: string[], cwd: string): string {
  return execFileSync("npm", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function platePool(...args: string[]): unknown {
  const bin = join(installDirectory, "node_modules", ".bin", "plate-pool");
  return JSON.parse(execFileSync(bin, [...args, "--json"], { cwd: installDirectory, encoding: "utf8" }));
}

beforeAll(() => {
  workDirectory = mkdtempSync(join(tmpdir(), "plate-pool-pack-"));
  const [packed] = JSON.parse(npm(["pack", "--json", "--pack-destination", workDirectory], packageDirectory));
  installDirectory = join(workDirectory, "empty");
  mkdirSync(installDirectory);
  npm(["init", "--yes"], installDirectory);
  npm(["install", "--offline", "--no-audit", "--no-fund", join(workDirectory, packed.filename)], installDirectory);
}, 120_000);

afterAll(() => {
  if (workDirectory) rmSync(workDirectory, { recursive: true, force: true });
});

describe("the packed plate-pool package, installed in an empty directory", () => {
  it("is named plate-pool and can be published", () => {
    const manifest = JSON.parse(
      readFileSync(join(installDirectory, "node_modules", "plate-pool", "package.json"), "utf8"),
    );
    expect(manifest.name).toBe("plate-pool");
    expect(manifest.private).not.toBe(true);
  });

  it("runs inventory with the owner's inventory file bundled", () => {
    expect(platePool("inventory")).toEqual(inventory);
  });

  it("runs load and gives spec section 7 example 2", () => {
    const response = platePool("load", "barbell=173") as ReturnType<typeof load>;
    expect(response).toEqual(load(inventory, { targets: [{ implement: "barbell", target: "173" }] }));
    const [result] = response.results;
    expect(result?.exact).toBe(true);
    expect(result?.loading?.positions.map((position) => position.plates)).toEqual([
      [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5],
      [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5],
    ]);
  });

  it("runs list", () => {
    expect(platePool("list", "barbell", "--from", "100", "--to", "200")).toEqual(
      list(inventory, { implement: "barbell", from: "100", to: "200" }),
    );
  });

  it("runs reverse", () => {
    expect(platePool("reverse", "barbell", "--side", "22.5,22.5,5,5")).toEqual(
      reverse(inventory, {
        implement: "barbell",
        positions: [
          { name: "left", plates: [22.5, 22.5, 5, 5] },
          { name: "right", plates: [22.5, 22.5, 5, 5] },
        ],
      }),
    );
  });
});
