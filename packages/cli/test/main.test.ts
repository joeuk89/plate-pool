import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { load, readInventory } from "@plate-pool/core";
import { describe, expect, it } from "vitest";
import { run } from "../src/main.js";

const inventoryPath = fileURLToPath(new URL("../../../inventory/inventory.json", import.meta.url));
const inventoryFile = JSON.parse(readFileSync(inventoryPath, "utf8"));
const inventory = readInventory(inventoryFile);

function runWith(args: string[]) {
  const output = { stdout: "", stderr: "" };
  const code = run(args, {
    stdout: (text) => (output.stdout += text),
    stderr: (text) => (output.stderr += text),
    defaultInventoryPath: inventoryPath,
  });
  return { code, ...output };
}

describe("plate-pool command-line tool", () => {
  it("exits 1 with the reason on standard error for an unknown command", () => {
    const result = runWith(["weigh"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown command "weigh"');
  });

  it("exits 1 with usage on standard error when no command is given", () => {
    const result = runWith([]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Usage: plate-pool <command>");
  });
});

describe("plate-pool load", () => {
  it("prints the same JSON as the library's result (spec 12.3)", () => {
    const result = runWith(["load", "barbell=175", "--json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(load(inventory, { targets: [{ implement: "barbell", target: "175" }] }));
  });

  it("lists the other loadings that reach the target under alternatives", () => {
    const [result] = JSON.parse(runWith(["load", "barbell=88", "--json"]).stdout).results;
    const [expected] = load(inventory, { targets: [{ implement: "barbell", target: "88" }] }).results;
    expect(result.alternatives).toHaveLength(2);
    expect(result.alternatives).toEqual(expected!.alternatives);
    expect(result.alternatives[0].positions[0]).toEqual({ name: "left", plates: [5, 5, 5, 5, 5, 5, 5] });
  });

  it("orders each result's fields as the JSON example in spec section 9 does", () => {
    const [result] = JSON.parse(runWith(["load", "barbell=175", "--json"]).stdout).results;
    expect(Object.keys(result)).toEqual([
      "implement",
      "target",
      "exact",
      "recommended",
      "below",
      "above",
      "alternatives",
      "warnings",
      "unverified",
    ]);
  });

  it("prints text in the layout of spec section 9 when no loading is exact", () => {
    const result = runWith(["load", "barbell=175"]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(
      [
        "Barbell  target 175 lb (79.4 kg)  no exact loading",
        "",
        "  below  173 lb (78.5 kg)",
        "         each side: 22.5 22.5 5 5 5 5 5 5 2.5 | clamp collar",
        "* above  175.5 lb (79.6 kg)",
        "         each side: 22.5 22.5 5 5 5 5 5 5 2.5 1.25 | clamp collar",
        "",
        "Unverified: bar weight, collar weight",
        "",
      ].join("\n"),
    );
  });

  it("prints one loading when it is exact", () => {
    expect(runWith(["load", "barbell=173"]).stdout).toBe(
      [
        "Barbell  target 173 lb (78.5 kg)  exact",
        "",
        "  exact  173 lb (78.5 kg)",
        "         each side: 22.5 22.5 5 5 5 5 5 5 2.5 | clamp collar",
        "",
        "Unverified: bar weight, collar weight",
        "",
      ].join("\n"),
    );
  });

  it("states the limit and the heaviest allowed loading for a refused target, and exits 0", () => {
    const result = runWith(["load", "barbell=230"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      [
        "Barbell  target 230 lb (104.3 kg)  refused",
        "",
        "* below  228 lb (103.4 kg)",
        "         each side: 22.5 22.5 5 5 5 5 5 5 5 5 5 5 5 5 | clamp collar",
        "",
        "Refused: over the 210 lb plate limit. Heaviest allowed: 228 lb (103.4 kg).",
        "Unverified: bar weight, collar weight",
        "",
      ].join("\n"),
    );
  });

  it("accepts a target in kilograms", () => {
    expect(runWith(["load", "barbell=80kg"]).stdout).toContain("target 176.37 lb (80 kg)");
  });

  it.each([
    ["spinlock", "each side: 22.5 22.5 5 5 5 5 5 5 2.5 | spin-lock collar"],
    ["none", "each side: 22.5 22.5 5 5 5 5 5 5 2.5 | no collars"],
  ])("takes --collars %s", (collars, line) => {
    expect(runWith(["load", "barbell=173", "--collars", collars]).stdout).toContain(line);
    expect(runWith(["load", `--collars=${collars}`, "barbell=173"]).stdout).toContain(line);
  });

  it("shows an empty side as no plates", () => {
    expect(runWith(["load", "barbell=18"]).stdout).toContain("each side: no plates | clamp collar");
  });

  it("uses a different inventory file with --inventory", () => {
    const measuredBar = structuredClone(inventoryFile);
    measuredBar.implements[0].base = { listed: 18, measured: 20, status: "owner" };
    const path = join(mkdtempSync(join(tmpdir(), "plate-pool-")), "inventory.json");
    writeFileSync(path, JSON.stringify(measuredBar));

    const result = runWith(["load", "barbell=175", "--inventory", path]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Barbell  target 175 lb (79.4 kg)  exact");
    expect(result.stdout).toContain("Unverified: collar weight");
  });

  it.each([
    [["load"], "Name a target"],
    [["load", "barbell"], 'Write "barbell" as implement=target'],
    [["load", "barbell=heavy"], '"heavy" is not a weight'],
    [["load", "rowing=40"], 'Unknown implement "rowing"'],
    [["load", "barbell=175", "--collars", "magnetic"], "--collars takes clamp, spinlock or none"],
    [["load", "barbell=175", "--collars"], "--collars takes clamp, spinlock or none"],
    [["load", "barbell=175", "--fast"], 'Unknown option "--fast"'],
    [["load", "barbell=175", "--inventory", "/no/such/inventory.json"], "Cannot read /no/such/inventory.json"],
  ])("exits 1 with the reason on standard error for %j", (args, reason) => {
    const result = runWith(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(reason);
  });

  it("exits 1 for an inventory file that does not match the inventory's shape", () => {
    const path = join(mkdtempSync(join(tmpdir(), "plate-pool-")), "inventory.json");
    writeFileSync(path, JSON.stringify({ plates: [] }));
    const result = runWith(["load", "barbell=175", "--inventory", path]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Inventory /plateTypes is missing");
  });
});

describe("plate-pool load vest=", () => {
  it.each(["12kg", "30lb", "35"])("prints the same JSON as the library's result for vest=%s", (target) => {
    const result = runWith(["load", `vest=${target}`, "--json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(load(inventory, { targets: [{ implement: "vest", target }] }));
  });

  it("prints kilograms first and the blocks on the front and back", () => {
    expect(runWith(["load", "vest=12kg"]).stdout).toBe(
      [
        "Vest  target 12 kg (26.46 lb)  exact",
        "",
        "  exact  12 kg (26.46 lb)",
        "         front: 6 blocks",
        "         back: 6 blocks",
        "",
        "Unverified: empty vest weight, vest block count",
        "",
      ].join("\n"),
    );
  });

  it("converts a target in pounds, and recommends the nearer number of blocks", () => {
    expect(runWith(["load", "vest=30lb"]).stdout).toBe(
      [
        "Vest  target 13.6 kg (30 lb)  no exact loading",
        "",
        "  below  13 kg (28.66 lb)",
        "         front: 6 blocks",
        "         back: 7 blocks",
        "* above  14 kg (30.86 lb)",
        "         front: 7 blocks",
        "         back: 7 blocks",
        "",
        "Unverified: empty vest weight, vest block count",
        "",
      ].join("\n"),
    );
  });

  it("reads a bare number as kilograms", () => {
    expect(runWith(["load", "vest=12"]).stdout).toContain("Vest  target 12 kg (26.46 lb)  exact");
  });

  it("states the 30 block limit and the heaviest allowed loading for a refused target", () => {
    const result = runWith(["load", "vest=35"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      [
        "Vest  target 35 kg (77.16 lb)  refused",
        "",
        "* below  30 kg (66.14 lb)",
        "         front: 15 blocks",
        "         back: 15 blocks",
        "",
        "Refused: over the 30 block limit. Heaviest allowed: 30 kg (66.14 lb).",
        "Unverified: empty vest weight, vest block count",
        "",
      ].join("\n"),
    );
  });

  it("names one block in the singular and an empty position as no blocks", () => {
    const text = runWith(["load", "vest=1"]).stdout;
    expect(text).toContain("front: no blocks\n");
    expect(text).toContain("back: 1 block\n");
  });
});

describe("plate-pool load kettlebell= and leg=", () => {
  it.each(["kettlebell", "leg"])("prints the same JSON as the library's result for %s", (implement) => {
    const result = runWith(["load", `${implement}=80`, "--json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(load(inventory, { targets: [{ implement, target: "80" }] }));
  });

  it("prints the kettlebell's stack and locking screw", () => {
    expect(runWith(["load", "kettlebell=80"]).stdout).toBe(
      [
        "Kettlebell  target 80 lb (36.3 kg)  exact",
        "",
        "  exact  80 lb (36.3 kg)",
        "         stack: 22.5 5 5 5 5 5 5 2.5 | long screw",
        "",
      ].join("\n"),
    );
    expect(runWith(["load", "kettlebell=40"]).stdout).toContain("stack: 5 5 5 | standard screw");
  });

  it("prints the bare kettlebell handle as no plates and no screw", () => {
    expect(runWith(["load", "kettlebell=22.5"]).stdout).toContain("stack: no plates | no screw");
  });

  it("refuses a kettlebell target over the 80 lb limit, and exits 0", () => {
    const result = runWith(["load", "kettlebell=85"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Kettlebell  target 85 lb (38.6 kg)  refused");
    expect(result.stdout).toContain("Refused: over the 80 lb limit. Heaviest allowed: 80 lb (36.3 kg).");
  });

  it("prints the leg attachment's stack with its fixed note", () => {
    expect(runWith(["load", "leg=50"]).stdout).toBe(
      [
        "Leg attachment  target 50 lb (22.7 kg)  exact",
        "",
        "  exact  50 lb (22.7 kg)",
        "         stack: 22.5 22.5 5",
        "",
        "Plate weight only. The lever changes the resistance you feel.",
        "",
      ].join("\n"),
    );
  });
});

describe("plate-pool inventory", () => {
  it("prints the same JSON as the library's result (spec 12.3)", () => {
    const result = runWith(["inventory", "--json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(inventory);
  });

  it("prints what the owner has as text", () => {
    const result = runWith(["inventory"]);
    expect(result.code).toBe(0);
    const lines = result.stdout.split("\n");
    expect(lines).toContain("Plates");
    expect(lines).toContain("Locking hardware");
    expect(lines).toContain("Implements");
    expect(result.stdout).toMatch(/22\.5 lb +× 5 +22\.5 lb each\n/);
    expect(result.stdout).toMatch(/Micro +× 4 +1\.25 lb each\n/);
    expect(result.stdout).toMatch(/Vest block +× 30 +1 kg each, count unverified\n/);
    expect(result.stdout).toMatch(/Mirafit 1" clamp collar +× 4 +0 lb each, weight unverified\n/);
    expect(result.stdout).toMatch(/Straight bar +× 1 +base 18 lb, unverified\n/);
  });

  it("marks a measured weight", () => {
    const measuredBar = structuredClone(inventoryFile);
    measuredBar.implements[0].base = { listed: 18, measured: 20, status: "owner" };
    const path = join(mkdtempSync(join(tmpdir(), "plate-pool-")), "inventory.json");
    writeFileSync(path, JSON.stringify(measuredBar));
    expect(runWith(["inventory", "--inventory", path]).stdout).toMatch(/Straight bar +× 1 +base 20 lb, measured\n/);
  });
});
