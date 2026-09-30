import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const inventoryPath = join(repoRoot, "inventory", "inventory.json");

function validate(path: string) {
  return spawnSync("npx", ["tsx", "scripts/validate-inventory.ts", path], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function brokenCopy(breakIt: (inventory: any) => void): string {
  const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
  breakIt(inventory);
  const path = join(mkdtempSync(join(tmpdir(), "plate-pool-")), "inventory.json");
  writeFileSync(path, JSON.stringify(inventory, null, 2));
  return path;
}

describe("build", () => {
  it("fails when the inventory file does not match the schema", () => {
    const path = brokenCopy((inventory) => {
      inventory.plates[0].count = "five";
    });
    const result = spawnSync("npm", ["run", "build"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, PLATE_POOL_INVENTORY: path },
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("does not match the inventory schema");
    expect(result.stderr).toContain("/plates/0/count must be integer");
  });
});

describe("inventory validation", () => {
  it("accepts the owner's inventory file", () => {
    const result = validate(inventoryPath);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("fails when a weight has no listed value", () => {
    const path = brokenCopy((inventory) => {
      delete inventory.plates[0].weight.listed;
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("/plates/0/weight");
    expect(result.stderr).toContain("listed");
  });

  it("accepts a measured weight beside the listed one", () => {
    const path = brokenCopy((inventory) => {
      inventory.implements[0].base = { listed: 18, measured: 18.4, status: "owner" };
    });
    expect(validate(path).status).toBe(0);
  });

  it("fails when a weight has no status", () => {
    const path = brokenCopy((inventory) => {
      delete inventory.hardware[0].weight.status;
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("/hardware/0/weight must have required property 'status'");
  });

  it("fails when a status is not verified, owner or unverified", () => {
    const path = brokenCopy((inventory) => {
      inventory.plates[0].weight.status = "probably";
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("/plates/0/weight/status must be equal to one of the allowed values");
  });

  it.each([
    ["an order number", (inventory: any) => (inventory.plates[0].orderNumber = "A1")],
    ["a price", (inventory: any) => (inventory.hardware[0].price = 1)],
    ["a purchase date", (inventory: any) => (inventory.implements[0].purchased = "2000-01-01")],
    ["an address", (inventory: any) => (inventory.address = "1 Example Street")],
  ])("fails when the file holds %s", (_, addField) => {
    const path = brokenCopy(addField);
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must NOT have additional properties");
  });

  it("fails when an implement accepts a plate type the file does not define", () => {
    const path = brokenCopy((inventory) => {
      inventory.implements[0].accepts = ["olympic"];
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('/implements/0/accepts/0 names unknown plate type "olympic"');
  });

  it("fails when a plate has a plate type the file does not define", () => {
    const path = brokenCopy((inventory) => {
      inventory.plates[0].type = "olympic";
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('/plates/0/type names unknown plate type "olympic"');
  });

  it("fails when an implement names locking hardware the file does not define", () => {
    const path = brokenCopy((inventory) => {
      inventory.implements[0].hardware.options = ["collar-magic", "none"];
      inventory.implements[0].hardware.default = "collar-magic";
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('/implements/0/hardware/options/0 names unknown hardware "collar-magic"');
    expect(result.stderr).toContain('/implements/0/hardware/default names unknown hardware "collar-magic"');
  });

  it("fails when two plates share an id", () => {
    const path = brokenCopy((inventory) => {
      inventory.plates.splice(1, 0, { ...inventory.plates[0] });
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('/plates/1/id repeats "ql-22.5"');
  });
});
