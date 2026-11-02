import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readerErrors, schemaErrors } from "./validate-inventory.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const inventoryPath = join(repoRoot, "inventory", "inventory.json");

function validate(path: string) {
  return spawnSync("npx", ["tsx", "scripts/validate-inventory.ts", path], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, npm_config_loglevel: "warn" },
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
    expect(result.stderr).toContain('implements[0].accepts[0]: "olympic" names no plate type');
  });

  it("fails when a plate has a plate type the file does not define", () => {
    const path = brokenCopy((inventory) => {
      inventory.plates[0].type = "olympic";
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('plates[0].type: "olympic" names no plate type');
  });

  it("fails when an implement names locking hardware the file does not define", () => {
    const path = brokenCopy((inventory) => {
      inventory.implements[0].hardware.options = ["collar-magic", "none"];
      inventory.implements[0].hardware.default = "collar-magic";
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('implements[0].hardware.options[0]: "collar-magic" names no hardware');
    expect(result.stderr).toContain('implements[0].hardware.default: "collar-magic" names no hardware');
  });

  it("fails when two plates share an id", () => {
    const path = brokenCopy((inventory) => {
      inventory.plates.splice(1, 0, { ...inventory.plates[0] });
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('plates[1].id: "ql-22.5" is already the id of an earlier entry');
  });

  it("fails a handle with no uneven allowance, naming the JSON path", () => {
    const path = brokenCopy((inventory) => {
      delete inventory.implements[1].unevenAllowance;
    });
    const result = validate(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("/implements/1 must have required property 'unevenAllowance'");
  });
});

describe("the reader and the schema agree (spec 17.11)", () => {
  const owner = () => JSON.parse(readFileSync(inventoryPath, "utf8"));
  const olympic = () => JSON.parse(readFileSync(join(repoRoot, "packages", "core", "test", "fixtures", "olympic-kit.json"), "utf8"));
  const edited = (base: () => any, edit: (file: any) => void) => {
    const file = base();
    edit(file);
    return file;
  };

  const files: [string, unknown][] = [
    ["the owner's file", owner()],
    ["the Olympic kit", olympic()],
    ["a kit with no hardware", edited(olympic, (file) => {
      file.hardware = [];
      for (const implement of file.implements) delete implement.hardware;
    })],
    ["a handle with a relaxed allowance and a pin", edited(olympic, (file) => {
      file.hardware.push({ id: "pin", name: "Pin", kind: "pin", count: 1, unit: "kg", weight: { listed: 0.5, status: "unverified" }, capacity: 300, minStack: { listed: 10, status: "unverified" } });
      file.implements[2].hardware = { options: ["pin", "none"], perPosition: 1 };
      file.implements[1].unevenAllowanceRelaxed = 2.5;
      file.implements[0].baseIncludesHardware = true;
      file.implements[0].maxPlateDiameter = 450;
    })],
    ["format 2", edited(owner, (file) => (file.format = 2))],
    ["no format", edited(owner, (file) => delete file.format)],
    ["no name", edited(owner, (file) => delete file.name)],
    ["a length unit of feet", edited(owner, (file) => (file.lengthUnit = "ft"))],
    ["a plate type with no bore", edited(owner, (file) => delete file.plateTypes[0].bore)],
    ["a plate with a fractional count", edited(owner, (file) => (file.plates[0].count = 1.5))],
    ["a bare-number weight", edited(owner, (file) => (file.plates[0].weight = 5))],
    ["an unknown shape", edited(owner, (file) => (file.plates[0].shape = "star"))],
    ["an unknown hardware kind", edited(owner, (file) => (file.hardware[0].kind = "clip"))],
    ["the old capacityIn field", edited(owner, (file) => (file.hardware[0].capacityIn = 3.25))],
    ["the old positions field", edited(owner, (file) => (file.implements[0].positions = ["left", "right"]))],
    ["an unknown kind", edited(owner, (file) => (file.implements[0].kind = "trap"))],
    ["an implement with no kind", edited(owner, (file) => delete file.implements[0].kind)],
    ["a handle without unevenAllowance", edited(owner, (file) => delete file.implements[1].unevenAllowance)],
    ["a bar with unevenAllowance", edited(owner, (file) => (file.implements[0].unevenAllowance = 2.5))],
    ["a stack with unevenAllowanceRelaxed", edited(owner, (file) => (file.implements[2].unevenAllowanceRelaxed = 5))],
    ["a vest with hardware", edited(owner, (file) => (file.implements[4].hardware = { options: ["none"], perPosition: 1 }))],
    ["a vest with positionLength", edited(owner, (file) => (file.implements[4].positionLength = { listed: 10, status: "verified" }))],
    ["an implement id kit", edited(owner, (file) => (file.implements[0].id = "kit"))],
    ["an implement id with a dot", edited(owner, (file) => (file.implements[0].id = "bar.bell"))],
    ["an upper-case plate id", edited(owner, (file) => (file.plates[0].id = "QL-5"))],
    ["a negative listed weight", edited(owner, (file) => (file.plates[0].weight.listed = -1))],
    ["a zero capacity", edited(owner, (file) => (file.hardware[0].capacity = 0))],
    ["no implements", edited(owner, (file) => (file.implements = []))],
    ["an empty accepts", edited(owner, (file) => (file.implements[0].accepts = []))],
    ["a perPosition of 0", edited(owner, (file) => (file.implements[0].hardware.perPosition = 0))],
    ["an implement count of 0", edited(owner, (file) => (file.implements[0].count = 0))],
    ["a maxPerPosition of a half", edited(owner, (file) => (file.implements[0].maxPerPosition = { "ql-micro": 0.5 }))],
    ["an extra top-level field", edited(owner, (file) => (file.address = "somewhere"))],
    ["a duplicate id", edited(owner, (file) => (file.plates[1].id = "ql-22.5"))],
    ["an unresolved accepts", edited(owner, (file) => (file.implements[0].accepts = ["olympic"]))],
    ["a default outside options", edited(owner, (file) => (file.implements[0].hardware.default = "screw-long"))],
    ["a plate with no stack length", edited(owner, (file) => delete file.plates[0].stackLength)],
    ["a list", []],
  ];

  it.each(files)("%s: a file the reader accepts passes the schema, and one the schema rejects the reader rejects", (_, file) => {
    const readerAccepts = readerErrors(JSON.stringify(file)).length === 0;
    const schemaAccepts = schemaErrors(file).length === 0;
    if (readerAccepts) expect(schemaAccepts).toBe(true);
    if (!schemaAccepts) expect(readerAccepts).toBe(false);
  });

  it("covers files both accept and files both reject", () => {
    const verdicts = files.map(([, file]) => [readerErrors(JSON.stringify(file)).length === 0, schemaErrors(file).length === 0]);
    expect(verdicts.filter(([reader, schema]) => reader && schema).length).toBeGreaterThanOrEqual(4);
    expect(verdicts.filter(([reader, schema]) => !reader && !schema).length).toBeGreaterThanOrEqual(25);
  });
});
