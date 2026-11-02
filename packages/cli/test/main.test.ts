import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { achievable, list, load, readInventory, reverse, type AchievableTable, type Inventory } from "@plate-pool/core";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import { run } from "../src/main.js";

const inventoryPath = fileURLToPath(new URL("../../../inventory/inventory.json", import.meta.url));
const olympicPath = fileURLToPath(new URL("../../core/test/fixtures/olympic-kit.json", import.meta.url));
const inventoryText = readFileSync(inventoryPath, "utf8");
const inventoryFile = JSON.parse(inventoryText);
const inventory = readInventory(inventoryText);
const olympic = readInventory(readFileSync(olympicPath, "utf8"));

const noInventory = "No inventory given. Pass --inventory <path> or set PLATE_POOL_INVENTORY.\n";

function runWith(args: string[], variables: Record<string, string | undefined> = { PLATE_POOL_INVENTORY: inventoryPath }) {
  const output = { stdout: "", stderr: "" };
  const code = run(args, {
    stdout: (text) => (output.stdout += text),
    stderr: (text) => (output.stderr += text),
    variables,
  });
  return { code, ...output };
}

function jsonOf(args: string[], variables?: Record<string, string | undefined>) {
  const result = runWith([...args, "--json"], variables);
  expect(result.stderr).toBe("");
  expect(result.code).toBe(0);
  return JSON.parse(result.stdout);
}

function writeInventory(file: unknown): string {
  const path = join(mkdtempSync(join(tmpdir(), "plate-pool-")), "inventory.json");
  writeFileSync(path, typeof file === "string" ? file : JSON.stringify(file));
  return path;
}

const side173 = [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5];
const example2 = load(inventory, { targets: [{ implement: "barbell", target: "173" }] });

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

  it("prints usage on standard output for --help, and exits 0 without an inventory", () => {
    const result = runWith(["--help"], {});
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: plate-pool <command>");
  });

  it("names no implement, plate or hardware id in its usage", () => {
    const usage = runWith([]).stderr;
    const kinds = ["bar", "handle", "stack", "vest"];
    const ids = [...inventory.implements, ...inventory.plates, ...inventory.hardware].map((item) => item.id).filter((id) => !kinds.includes(id));
    for (const id of ids) expect(usage).not.toMatch(new RegExp(`(^|[^a-z0-9.-])${id.replace(".", "\\.")}([^a-z0-9.-]|$)`, "m"));
    expect(usage).toContain("--inventory <path>");
    expect(usage).toContain("PLATE_POOL_INVENTORY");
    expect(usage).toContain("achievable");
  });

  it("names no implement, plate or hardware id in its source", () => {
    const kinds = ["bar", "handle", "stack", "vest"];
    const ids = [...inventory.implements, ...inventory.plates, ...inventory.hardware].map((item) => item.id).filter((id) => !kinds.includes(id));
    for (const file of readdirSync(fileURLToPath(new URL("../src", import.meta.url)))) {
      const source = readFileSync(fileURLToPath(new URL(`../src/${file}`, import.meta.url)), "utf8");
      for (const id of ids) expect(source, `${file} names ${id}`).not.toMatch(new RegExp(`\\b${id.replace(".", "\\.")}\\b`));
    }
  });
});

describe("naming the inventory file (spec 17.8)", () => {
  it("reads the file named by --inventory (spec 7 example 2)", () => {
    expect(jsonOf(["load", "barbell=173", "--inventory", inventoryPath], {})).toEqual(example2);
    expect(jsonOf(["load", `--inventory=${inventoryPath}`, "barbell=173"], {})).toEqual(example2);
  });

  it("reads the file named by PLATE_POOL_INVENTORY when no --inventory is given", () => {
    expect(jsonOf(["load", "barbell=173"], { PLATE_POOL_INVENTORY: inventoryPath })).toEqual(example2);
  });

  it("lets --inventory win over PLATE_POOL_INVENTORY", () => {
    const response = jsonOf(["load", "bar=95.5", "--inventory", olympicPath], { PLATE_POOL_INVENTORY: inventoryPath });
    expect(response.results[0].exact).toBe(true);
  });

  it.each([["load", "barbell=173"], ["list", "barbell"], ["reverse", "barbell"], ["inventory"], ["achievable"]])(
    "exits 1 with the missing-inventory sentence for %s with neither given",
    (...args) => {
      for (const variables of [{}, { PLATE_POOL_INVENTORY: "" }]) {
        const result = runWith(args, variables);
        expect(result.code).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toBe(noInventory);
      }
    },
  );

  it.each([
    [["load", "barbell=175", "--inventory", "/no/such/inventory.json"], "Cannot read /no/such/inventory.json"],
    [["load", "barbell=175", "--inventory"], "--inventory takes the path of an inventory file"],
  ])("exits 1 with the reason on standard error for %j", (args, reason) => {
    const result = runWith(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(reason);
  });

  it("exits 1 naming the JSON path for a file the reader refuses", () => {
    const result = runWith(["load", "barbell=175", "--inventory", writeInventory({ format: 1, plates: [] })]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("plateTypes: required");
  });

  it("refuses another format by name (spec 17.11 example 21)", () => {
    const result = runWith(["inventory", "--inventory", writeInventory({ ...inventoryFile, format: 2 })]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Inventory format 2 is not supported. This version reads format 1.");
  });

  it("refuses a reserved implement id, naming its path (spec 17.11 example 22)", () => {
    const file = structuredClone(inventoryFile);
    file.implements[0].id = "kit";
    const result = runWith(["load", "kit=100", "--inventory", writeInventory(file)]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("implements[0].id");
  });
});

describe("plate-pool load", () => {
  it("prints the same JSON as the library's result", () => {
    expect(jsonOf(["load", "barbell=175"])).toEqual(load(inventory, { targets: [{ implement: "barbell", target: "175" }] }));
  });

  it("orders each result's fields as the JSON example in spec section 9 does", () => {
    const [result] = jsonOf(["load", "barbell=175"]).results;
    expect(Object.keys(result)).toEqual(["implement", "target", "exact", "recommended", "below", "above", "alternatives", "warnings", "unverified"]);
  });

  it("gives every position its plate ids", () => {
    const [result] = jsonOf(["load", "barbell=88"]).results;
    expect(result.alternatives[0].positions[0]).toEqual({ name: "left", plates: [5, 5, 5, 5, 5, 5, 5], ids: Array(7).fill("ql-5") });
  });

  it("heads text with the implement's name and names the hardware (spec 9 layout)", () => {
    const result = runWith(["load", "barbell=175"]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(
      [
        "Straight bar  target 175 lb (79.4 kg)  no exact loading",
        "",
        "  below  173 lb (78.5 kg)",
        '         each side: 22.5 22.5 5 5 5 5 5 5 2.5 | Mirafit 1" clamp collar',
        "* above  175.5 lb (79.6 kg)",
        '         each side: 22.5 22.5 5 5 5 5 5 5 2.5 1.25 | Mirafit 1" clamp collar',
        "",
      ].join("\n"),
    );
  });

  it("states the limit and the heaviest allowed loading for a refused target, and exits 0", () => {
    const result = runWith(["load", "barbell=230"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Straight bar  target 230 lb (104.3 kg)  refused");
    expect(result.stdout).toContain("Refused: over the 210 lb plate limit. Heaviest allowed: 228 lb (103.4 kg).");
  });

  it("reads a bare value in the implement's unit and a suffix as an override", () => {
    expect(runWith(["load", "barbell=80kg"]).stdout).toContain("target 176.37 lb (80 kg)");
    expect(runWith(["load", "vest=12"]).stdout).toContain("Weighted vest  target 12 kg (26.46 lb)  exact");
  });

  it("shows an empty side as no plates", () => {
    expect(runWith(["load", "barbell=18"]).stdout).toContain('each side: no plates | Mirafit 1" clamp collar');
  });

  it.each([
    [["load"], "Name a target, such as barbell="],
    [["load", "barbell"], 'Write "barbell" as <id>=<target>'],
    [["load", "barbell=heavy"], '"heavy" is not a weight'],
    [["load", "rowing=40"], 'Unknown implement "rowing". The kit\'s implements: barbell, dumbbell, kettlebell, leg, vest.'],
    [["load", "dumbbells=40"], 'Unknown implement "dumbbells"'],
    [["load", "barbell=175", "--collars", "none"], 'Unknown option "--collars"'],
    [["load", "barbell=175", "--fast"], 'Unknown option "--fast"'],
    [["load", "barbell=100", "barbell=120"], "The request needs 2 × straight bar. The inventory holds 1."],
  ])("exits 1 with the reason on standard error for %j", (args, reason) => {
    const result = runWith(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(reason);
  });
});

describe("plate-pool load: pair and single by key suffix (spec 17.8)", () => {
  it("reads <id>= as a pair on a handle the kit has two of (spec 17.11 example 24)", () => {
    const response = jsonOf(["load", "dumbbell=80"]);
    expect(response).toEqual(load(inventory, { targets: [{ implement: "dumbbell", target: "80" }] }));
    const [result] = response.results;
    expect(result.pair).toBe(true);
    expect(result.exact).toBe(true);
    expect(result.loading.hardware).toEqual([{ id: "screw-standard", count: 2 }]);
    expect(result.loading.positions.map((position: { plates: number[] }) => position.plates)).toEqual([
      [22.5, 5, 5, 2.5],
      [22.5, 5, 5, 2.5],
    ]);
  });

  it("reads <id>.single= as one (spec 7 example 5)", () => {
    const response = jsonOf(["load", "dumbbell.single=12.5"]);
    expect(response).toEqual(load(inventory, { targets: [{ implement: "dumbbell", target: "12.5", pair: false }] }));
    expect(response.results[0].pair).toBe(false);
    expect(response.results[0].exact).toBe(true);
  });

  it("reads <id>.pair= as the explicit pair", () => {
    expect(jsonOf(["load", "dumbbell.pair=40"])).toEqual(jsonOf(["load", "dumbbell=40"]));
  });

  it("exits 1 for <id>.pair= on a handle the kit has one of", () => {
    const file = structuredClone(inventoryFile);
    file.implements[1].count = 1;
    const result = runWith(["load", "dumbbell.pair=40", "--inventory", writeInventory(file)]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("The inventory holds 1 dumbbell, so it cannot be loaded as a pair.");
  });

  it.each([
    [["load", "barbell.single=100"], '"barbell.single": the straight bar is not a handle, so it has no pair or single.'],
    [["load", "dumbbell.both=40"], 'Unknown implement "dumbbell.both"'],
  ])("exits 1 with the reason on standard error for %j", (args, reason) => {
    const result = runWith(args);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(reason);
  });

  it("heads text with pair or single after a handle's name", () => {
    expect(runWith(["load", "dumbbell=40"]).stdout).toBe(
      [
        "Dumbbell pair  target 40 lb (18.1 kg) each  exact",
        "",
        "  exact  40 lb (18.1 kg)",
        "         each end: 5 5 5 | Standard locking screw",
        "",
      ].join("\n"),
    );
    expect(runWith(["load", "dumbbell.single=47.5"]).stdout).toBe(
      [
        "Dumbbell single  target 47.5 lb (21.5 kg)  exact",
        "",
        "  exact  47.5 lb (21.5 kg)  uneven",
        "         end A: 5 5 5 5 (heavier)",
        "         end B: 5 5 5 2.5",
        "         Standard locking screw on each end",
        "",
      ].join("\n"),
    );
  });

  it("turns uneven loading off for every handle with --no-uneven", () => {
    const response = jsonOf(["load", "dumbbell.single=11.25", "--no-uneven"]);
    expect(response).toEqual(load(inventory, { targets: [{ implement: "dumbbell", target: "11.25", pair: false }], uneven: false }));
    expect(response.results[0].exact).toBe(false);
  });

  it("names unverified values by their item's name", () => {
    const output = runWith(["load", "dumbbell=120"]).stdout;
    expect(output).toContain("each end: 22.5 5 5 5 5 5 5 2.5 | Long locking screw");
    expect(output).toContain("Unverified: shortest stack on a long locking screw");
  });

  it("names the bare handle's lack of hardware", () => {
    expect(runWith(["load", "dumbbell.single=5"]).stdout).toContain("each end: no plates | no hardware");
  });
});

describe("plate-pool load: hardware by <id>.hardware (spec 17.8)", () => {
  it("adds a spin-lock collar's 1 lb per side to the barbell's base", () => {
    const response = jsonOf(["load", "barbell=20", "barbell.hardware=collar-spinlock"]);
    expect(response).toEqual(load(inventory, { targets: [{ implement: "barbell", target: "20" }], hardware: { barbell: "collar-spinlock" } }));
    expect(response.results[0].exact).toBe(true);
    expect(response.results[0].loading.positions[0].plates).toEqual([]);
    expect(runWith(["load", "barbell=173", "barbell.hardware=collar-spinlock"]).stdout).toContain("no exact loading");
  });

  it("takes none from the implement's options", () => {
    expect(runWith(["load", "barbell=173", "barbell.hardware=none"]).stdout).toContain("each side: 22.5 22.5 5 5 5 5 5 5 2.5 | no hardware");
  });

  it("does not count .hardware toward priority order", () => {
    expect(jsonOf(["load", "barbell.hardware=none", "dumbbell=40", "barbell=173"])).toEqual(
      load(inventory, {
        targets: [
          { implement: "dumbbell", target: "40" },
          { implement: "barbell", target: "173" },
        ],
        hardware: { barbell: "none" },
      }),
    );
  });

  it.each([
    [["load", "barbell=173", "barbell.hardware=screw-long"], 'The straight bar takes no "screw-long" hardware. It takes collar-clamp, collar-spinlock or none.'],
    [["load", "leg=50", "leg.hardware=none"], "The leg attachment has no hardware to choose."],
    [["load", "vest=12", "vest.hardware=none"], "The weighted vest has no hardware to choose."],
    [["load", "barbell=173", "barbell.hardware=none", "barbell.hardware=collar-clamp"], "One barbell.hardware per implement."],
    [["load", "rowing.hardware=none", "barbell=173"], 'Unknown implement "rowing"'],
  ])("exits 1 with the reason on standard error for %j", (args, reason) => {
    const result = runWith(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(reason);
  });
});

describe("plate-pool load for every kind", () => {
  it("prints a vest's front and back by weight (spec 17.4 labels)", () => {
    expect(runWith(["load", "vest=12kg"]).stdout).toBe(
      [
        "Weighted vest  target 12 kg (26.46 lb)  exact",
        "",
        "  exact  12 kg (26.46 lb)",
        "         front: 1 1 1 1 1 1",
        "         back: 1 1 1 1 1 1",
        "",
        "Unverified: weighted vest base weight, 1 kg plate count",
        "",
      ].join("\n"),
    );
  });

  it("prints a stack with its hardware, and a stack with no hardware without it", () => {
    expect(runWith(["load", "kettlebell=40"]).stdout).toContain("stack: 5 5 5 | Standard locking screw");
    expect(runWith(["load", "kettlebell=22.5"]).stdout).toContain("stack: no plates | no hardware");
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

  it("loads a kilogram kit, with lengths in millimetres (spec 17.11 example 25)", () => {
    const response = jsonOf(["load", "bar=95.5", "--inventory", olympicPath], {});
    expect(response).toEqual(load(olympic, { targets: [{ implement: "bar", target: "95.5" }] }));
    const [result] = response.results;
    expect(result.exact).toBe(true);
    expect(result.loading.hardware).toEqual([{ id: "collar", count: 2 }]);
    expect(result.loading.positions[0].plates).toEqual([20, 10, 5, 2.5]);
    expect(runWith(["load", "bar=95.5", "--inventory", olympicPath], {}).stdout).toContain(
      "Olympic bar  target 95.5 kg (210.54 lb)  exact\n\n  exact  95.5 kg (210.54 lb)\n         each side: 20 10 5 2.5 | Spring collar\n",
    );
  });
});

describe("plate-pool load with several targets", () => {
  it("prints the same JSON as the library's result, leftover included", () => {
    expect(jsonOf(["load", "barbell=173", "dumbbell=40"])).toEqual(
      load(inventory, {
        targets: [
          { implement: "barbell", target: "173" },
          { implement: "dumbbell", target: "40" },
        ],
      }),
    );
  });

  it("reads argument order as priority order", () => {
    const outcome = (args: string[]) => jsonOf(["load", ...args]).results.map((result: { implement: string; exact: boolean }) => [result.implement, result.exact]);
    expect(outcome(["dumbbell=120", "kettlebell=40"])).toEqual([
      ["dumbbell", true],
      ["kettlebell", false],
    ]);
    expect(outcome(["kettlebell=40", "dumbbell=120"])).toEqual([
      ["kettlebell", true],
      ["dumbbell", false],
    ]);
  });

  it("prints each result in order, then what is left over by weight and hardware name", () => {
    expect(runWith(["load", "barbell=173", "dumbbell=40"]).stdout).toBe(
      [
        "Straight bar  target 173 lb (78.5 kg)  exact",
        "",
        "  exact  173 lb (78.5 kg)",
        '         each side: 22.5 22.5 5 5 5 5 5 5 2.5 | Mirafit 1" clamp collar',
        "",
        "Dumbbell pair  target 40 lb (18.1 kg) each  exact",
        "",
        "  exact  40 lb (18.1 kg)",
        "         each end: 5 5 5 | Standard locking screw",
        "",
        "Left over",
        "  plates: 1 × 22.5 lb, 2 × 2.5 lb, 4 × 1.25 lb",
        '  locking hardware: 5 × Long locking screw, 2 × Ironmaster spin-lock collar, 2 × Mirafit 1" clamp collar',
        "",
      ].join("\n"),
    );
  });

  it("prints the warning for a later implement that misses its target", () => {
    expect(runWith(["load", "dumbbell=120", "kettlebell=40"]).stdout).toContain(
      "Not exact because the dumbbells use the 5 lb plates the kettlebell needs to reach 40 lb.",
    );
  });
});

describe("plate-pool load --from", () => {
  const eachSide = (plates: number[]) => [
    { name: "left", plates },
    { name: "right", plates },
  ];

  it("prints the same JSON as the library's result for a current loading (spec 16.6 example 18)", () => {
    const response = jsonOf(["load", "barbell=175", "--from", "barbell", "--side", "2x22.5,6x5,2.5"]);
    expect(response).toEqual(load(inventory, { targets: [{ implement: "barbell", target: "175", current: { positions: eachSide(side173) } }] }));
    expect(response.results[0].below.changes.count).toBe(0);
    expect(response.results[0].above.changes.count).toBe(2);
  });

  it("prints a changes line under each loading", () => {
    expect(runWith(["load", "barbell=175", "--from", "barbell", "--side", side173.join(",")]).stdout).toBe(
      [
        "Straight bar  target 175 lb (79.4 kg)  no exact loading",
        "",
        "  below  173 lb (78.5 kg)",
        '         each side: 22.5 22.5 5 5 5 5 5 5 2.5 | Mirafit 1" clamp collar',
        "         0 changes. Each side: unchanged.",
        "* above  175.5 lb (79.6 kg)",
        '         each side: 22.5 22.5 5 5 5 5 5 5 2.5 1.25 | Mirafit 1" clamp collar',
        "         2 changes. Each side: put on 1.25.",
        "",
      ].join("\n"),
    );
  });

  it("keeps standard screws for a pair at 80 lb (spec 17.11 example 19)", () => {
    const [result] = jsonOf(["load", "dumbbell=80", "--from", "dumbbell", "--end-a", "22.5,5,2.5", "--end-b", "22.5,5,2.5"]).results;
    expect(result.loading.changes.count).toBe(4);
    expect(result.loading.changes.hardware).toEqual([]);
    expect(result.loading.hardware).toEqual([{ id: "screw-standard", count: 2 }]);
  });

  it("names a screw swap by the hardware's names", () => {
    const end = "22.5,5,2.5";
    expect(runWith(["load", "dumbbell=85", "--from", "dumbbell", "--end-a", end, "--end-b", end]).stdout).toContain(
      "Swap 2 × Standard locking screw for Long locking screw on each dumbbell.",
    );
    expect(runWith(["load", "dumbbell.single=45", "--from", "dumbbell", "--end-a", "5,5,5,2.5", "--end-b", "5,5,5"]).stdout).toContain(
      "1 change. End A: unchanged. End B: put on 2.5.",
    );
  });

  it("takes --front and --back for a vest and --stack for a stack", () => {
    const vest = jsonOf(["load", "vest=10", "--from", "vest", "--front", "4x1", "--back", "4x1"]);
    const four = [1, 1, 1, 1];
    expect(vest).toEqual(
      load(inventory, {
        targets: [
          {
            implement: "vest",
            target: "10",
            current: {
              positions: [
                { name: "front", plates: four },
                { name: "back", plates: four },
              ],
            },
          },
        ],
      }),
    );
    expect(runWith(["load", "vest=10", "--from", "vest", "--front", "4x1", "--back", "4x1"]).stdout).toContain(
      "2 changes. Front: put on 1. Back: put on 1.",
    );
    expect(runWith(["load", "kettlebell=40", "--from", "kettlebell", "--stack", "5,5"]).stdout).toContain("1 change. Stack: put on 5.");
  });

  it("gives each implement its own current loading, matched by id", () => {
    const response = jsonOf(["load", "barbell=98", "dumbbell=40", "--from", "dumbbell", "--end-a", "5,5", "--end-b", "5,5", "--from", "barbell", "--side", "7x5"]);
    expect(response).toEqual(
      load(inventory, {
        targets: [
          { implement: "barbell", target: "98", current: { positions: eachSide([5, 5, 5, 5, 5, 5, 5]) } },
          {
            implement: "dumbbell",
            target: "40",
            current: {
              positions: [
                { name: "a", plates: [5, 5] },
                { name: "b", plates: [5, 5] },
              ],
            },
          },
        ],
      }),
    );
  });

  it("matches --from <id> to a single as well as a pair", () => {
    const [result] = jsonOf(["load", "dumbbell.single=17.5", "--from", "dumbbell", "--end-a", "5", "--end-b", "5"]).results;
    expect(result.loading.changes).toBeDefined();
  });

  it("leaves out the changes block for an implement with no --from (spec 16.6 example 20)", () => {
    const [barbell, dumbbell] = jsonOf(["load", "barbell=98", "dumbbell=40", "--from", "barbell"]).results;
    expect(barbell.loading).toHaveProperty("changes");
    expect(dumbbell.loading).not.toHaveProperty("changes");
  });

  it.each([
    [["load", "barbell=175", "--from"], "--from takes an implement id"],
    [["load", "barbell=175", "--from", "--side", "5"], "--from takes an implement id"],
    [["load", "barbell=175", "--from", "rowing"], 'Unknown implement "rowing"'],
    [["load", "barbell=175", "--from", "dumbbell.single"], 'Unknown implement "dumbbell.single"'],
    [["load", "barbell=175", "--from", "dumbbell", "--end-a", "5"], "--from dumbbell needs a dumbbell target"],
    [["load", "barbell=175", "--from", "barbell", "--from", "barbell"], "One --from per implement"],
    [["load", "barbell=175", "--from", "barbell", "--stack", "5"], "--stack is for a stack. The straight bar is a bar: use --side."],
    [["load", "barbell=175", "--from", "barbell", "--side", "10"], "The straight bar takes no 10 lb plate"],
    [["load", "barbell=175", "--side", "5"], "In load, --side follows --from <id>"],
    [["load", "barbell=175", "--to", "200"], "--to works with list only"],
  ])("exits 1 with the reason on standard error for %j", (args, reason) => {
    const result = runWith(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(reason);
  });
});

describe("plate-pool reverse", () => {
  it("prints the same JSON as the library's result, reading count x weight", () => {
    const response = jsonOf(["reverse", "barbell", "--side", "2x22.5,6x5,2.5"]);
    expect(response).toEqual(reverse(inventory, { implement: "barbell", positions: [{ name: "left", plates: side173 }, { name: "right", plates: side173 }] }));
    expect(response.total).toEqual({ lb: 173, kg: 78.5 });
  });

  it("prints the total and each side as text", () => {
    expect(runWith(["reverse", "barbell", "--side", "2x22.5,6x5,2.5"]).stdout).toBe(
      ["Straight bar  total 173 lb (78.5 kg)", "", '  each side: 22.5 22.5 5 5 5 5 5 5 2.5 | Mirafit 1" clamp collar', ""].join("\n"),
    );
  });

  it("totals a vest's front and back (12 kg)", () => {
    const response = jsonOf(["reverse", "vest", "--front", "6x1", "--back", "6x1"]);
    expect(response.total).toEqual({ kg: 12, lb: 26.46 });
    expect(runWith(["reverse", "vest", "--front", "6x1", "--back", "7x1"]).stdout).toBe(
      [
        "Weighted vest  total 13 kg (28.66 lb)",
        "",
        "  front: 1 1 1 1 1 1",
        "  back: 1 1 1 1 1 1 1",
        "",
        "Unverified: weighted vest base weight, 1 kg plate count",
        "",
      ].join("\n"),
    );
  });

  it("takes .hardware for the implement", () => {
    expect(runWith(["reverse", "barbell", "--side=5", "barbell.hardware=none"]).stdout).toContain("each side: 5 | no hardware");
    expect(jsonOf(["reverse", "barbell", "barbell.hardware=collar-spinlock"]).total.lb).toBe(20);
  });

  it("reads a handle as a pair and <id>.single as one", () => {
    expect(jsonOf(["reverse", "dumbbell", "--end-a", "5,5,5", "--end-b", "5,5,5"])).toMatchObject({ pair: true, total: { lb: 40, kg: 18.1 } });
    expect(jsonOf(["reverse", "dumbbell.single", "--end-a", "5,5,5", "--end-b", "5,5,5"])).toMatchObject({ pair: false });
    expect(runWith(["reverse", "dumbbell.single", "--end-a", "5,5,5,2.5", "--end-b", "5,5,5,5"]).stdout).toBe(
      [
        "Dumbbell single  total 47.5 lb (21.5 kg)  uneven",
        "",
        "  end A: 5 5 5 2.5",
        "  end B: 5 5 5 5 (heavier)",
        "  Standard locking screw on each end",
        "",
      ].join("\n"),
    );
  });

  it("reads weight:id to name a plate", () => {
    const response = jsonOf(["reverse", "barbell", "--side", "2x22.5:ql-22.5,1.25:ql-micro"]);
    expect(response.positions[0].ids).toEqual(["ql-22.5", "ql-22.5", "ql-micro"]);
  });

  it("prints each rule the loading breaks, and still prints the total", () => {
    const result = runWith(["reverse", "dumbbell.single", "--end-a", "5", "--no-uneven"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Uneven loading is off, and the ends differ by 5 lb.");
  });

  it("reads --stack for a stack, with the implement's note", () => {
    expect(runWith(["reverse", "leg", "--stack", "22.5,22.5,5"]).stdout).toBe(
      ["Leg attachment  total 50 lb (22.7 kg)", "", "  stack: 22.5 22.5 5", "", "Plate weight only. The lever changes the resistance you feel.", ""].join("\n"),
    );
  });

  it("reads a missing position as empty", () => {
    expect(runWith(["reverse", "barbell"]).stdout).toContain("Straight bar  total 18 lb (8.2 kg)");
  });

  it.each([
    [["reverse"], "Name an implement, such as reverse barbell"],
    [["reverse", "rowing"], 'Unknown implement "rowing"'],
    [["reverse", "barbell", "vest"], "reverse takes one implement"],
    [["reverse", "barbell=175"], "reverse takes an implement id, not a target"],
    [["reverse", "barbell", "--stack", "5"], "--stack is for a stack. The straight bar is a bar: use --side."],
    [["reverse", "dumbbell", "--side", "5"], "--side is for a bar. The dumbbell is a handle: use --end-a and --end-b."],
    [["reverse", "vest", "--end-a", "5"], "--end-a is for a handle. The weighted vest is a vest: use --front and --back."],
    [["reverse", "kettlebell", "--blocks", "5"], 'Unknown option "--blocks"'],
    [["reverse", "barbell", "--side", "22.5,heavy"], '"heavy" is not a plate'],
    [["reverse", "barbell", "--side", "0x5"], '"0x5" is not a plate'],
    [["reverse", "barbell", "--side"], "--side takes a list of plates"],
    [["reverse", "barbell", "--side", "10"], "The straight bar takes no 10 lb plate"],
    [["reverse", "barbell", "--side", "5:ql-6"], 'The straight bar takes no plate "ql-6"'],
    [["reverse", "barbell", "--from", "100"], "--from works with list and load only"],
    [["inventory", "--side", "5"], "--side is for the reverse command"],
  ])("exits 1 with the reason on standard error for %j", (args, reason) => {
    const result = runWith(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(reason);
  });
});

describe("plate-pool list", () => {
  it("prints the same JSON as the library's result", () => {
    expect(jsonOf(["list", "barbell", "--from", "100", "--to", "200"])).toEqual(list(inventory, { implement: "barbell", from: "100", to: "200" }));
  });

  it("reads a handle as a pair and <id>.single as one", () => {
    expect(jsonOf(["list", "dumbbell", "--from", "10", "--to", "15"])).toEqual(list(inventory, { implement: "dumbbell", from: "10", to: "15" }));
    expect(jsonOf(["list", "dumbbell.single", "--from", "10", "--to", "60"])).toEqual(
      list(inventory, { implement: "dumbbell", pair: false, from: "10", to: "60" }),
    );
  });

  it("changes the list with .hardware and --no-uneven the way they change Load", () => {
    expect(jsonOf(["list", "barbell", "barbell.hardware=collar-spinlock", "--from", "18", "--to", "20.5"])).toEqual(
      list(inventory, { implement: "barbell", hardware: "collar-spinlock", from: "18", to: "20.5" }),
    );
    expect(jsonOf(["list", "dumbbell.single", "--from=10", "--to=15", "--no-uneven"])).toEqual(
      list(inventory, { implement: "dumbbell", pair: false, uneven: false, from: "10", to: "15" }),
    );
  });

  it("gives rows smallest and no screw", () => {
    const { rows } = jsonOf(["list", "kettlebell"]);
    expect(rows[0].total.lb).toBe(22.5);
    expect(rows.at(-1).total.lb).toBe(80);
    expect(Object.keys(rows[0])).toEqual(["total", "loading", "uneven", "smallest"]);
  });

  it("prints one line per weight with a one-line plate layout per position", () => {
    expect(runWith(["list", "barbell", "--from", "170", "--to", "176"]).stdout).toBe(
      [
        "Straight bar  3 weights from 170 lb to 176 lb",
        "",
        "  170.5 lb (77.3 kg)  smallest",
        '      each side: 22.5 22.5 5 5 5 5 5 5 1.25 | Mirafit 1" clamp collar',
        "  173 lb (78.5 kg)",
        '      each side: 22.5 22.5 5 5 5 5 5 5 2.5 | Mirafit 1" clamp collar',
        "  175.5 lb (79.6 kg)  smallest",
        '      each side: 22.5 22.5 5 5 5 5 5 5 2.5 1.25 | Mirafit 1" clamp collar',
        "",
      ].join("\n"),
    );
  });

  it("says so when no weight falls in the range", () => {
    expect(runWith(["list", "barbell", "--from", "19", "--to", "20"]).stdout).toBe("Straight bar  no achievable weight from 19 lb to 20 lb\n");
  });

  it.each([
    [["list"], "Name an implement, such as list barbell"],
    [["list", "barbell", "kettlebell"], "list takes one implement"],
    [["list", "rowing"], 'Unknown implement "rowing"'],
    [["list", "barbell=175"], "list takes an implement id, not a target"],
    [["list", "barbell", "--from"], "--from takes a weight"],
    [["list", "barbell", "--to", "heavy"], '"heavy" is not a weight'],
    [["list", "barbell", "--from", "200", "--to", "100"], "Its start must not be above its end"],
  ])("exits 1 with the reason on standard error for %j", (args, reason) => {
    const result = runWith(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(reason);
  });
});

describe("plate-pool inventory", () => {
  it("prints the file as read with --json", () => {
    const result = runWith(["inventory", "--json"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(inventoryText);
  });

  it("adds nothing to the file with --json, not even a final newline", () => {
    const unterminated = inventoryText.trimEnd();
    expect(runWith(["inventory", "--json", "--inventory", writeInventory(unterminated)], {}).stdout).toBe(unterminated);
  });

  it("prints the kit's name and length unit, then its plates, hardware and implements", () => {
    const result = runWith(["inventory"]);
    expect(result.code).toBe(0);
    const lines = result.stdout.split("\n");
    expect(lines.slice(0, 3)).toEqual(["Home gym", "Lengths in in", ""]);
    expect(lines).toContain("Plates");
    expect(lines).toContain("Locking hardware");
    expect(lines).toContain("Implements");
    expect(result.stdout).toContain("  5 × 22.5 lb  Ironmaster Quick-Lock, quick-lock bore\n");
    expect(result.stdout).toContain("  4 × 1.25 lb  Micro, Ironmaster Quick-Lock, quick-lock bore\n");
    expect(result.stdout).toContain("  30 × 1 kg    Mirafit vest block, block bore, count unverified\n");
    expect(result.stdout).toContain("  4 × Standard locking screw  screw, 2.5 lb each, capacity 3.25 in\n");
    expect(result.stdout).toContain("  2 × Ironmaster spin-lock collar  collar, 1 lb each, measured\n");
    expect(result.stdout).toContain(
      '  barbell  Straight bar × 1: bar, two sides, base 18 lb, hardware collar-clamp, collar-spinlock or none, position length 11.5 in, plates at most 210 lb, at most 1 × ql-micro per position\n',
    );
    expect(result.stdout).toContain("  vest  Weighted vest × 1: vest, front and back, base 0 kg unverified, plates at most 30 kg\n");
  });

  it("marks a measured weight", () => {
    const file = structuredClone(inventoryFile);
    file.implements[0].base = { listed: 18, measured: 20, status: "owner" };
    expect(runWith(["inventory", "--inventory", writeInventory(file)]).stdout).toContain("base 20 lb measured,");
  });

  it("takes no arguments", () => {
    expect(runWith(["inventory", "barbell"]).stderr).toContain("inventory takes no arguments.");
  });
});

describe("plate-pool achievable (spec 17.8)", () => {
  const document = () => {
    const result = runWith(["achievable", "--inventory", inventoryPath], {});
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
    return JSON.parse(result.stdout);
  };

  it("writes the header: format, package version, the file's SHA-256 and the kit's name (spec 17.11 example 23)", () => {
    const written = document();
    expect(Object.keys(written)).toEqual(["format", "plate_pool", "inventory_sha256", "name", "tables"]);
    expect(written.format).toBe(1);
    expect(written.plate_pool).toBe(packageJson.version);
    expect(written.inventory_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(written.inventory_sha256).toBe(createHash("sha256").update(readFileSync(inventoryPath)).digest("hex"));
    expect(written.name).toBe("Home gym");
  });

  it("hashes the bytes as read, not the parsed inventory", () => {
    const spaced = writeInventory(`${inventoryText}\n\n`);
    const result = JSON.parse(runWith(["achievable", "--inventory", spaced], {}).stdout);
    expect(result.inventory_sha256).toBe(createHash("sha256").update(`${inventoryText}\n\n`).digest("hex"));
    expect(result.inventory_sha256).not.toBe(document().inventory_sha256);
  });

  it("writes 14 tables in file order, then options order, pair before single (spec 17.11 example 23)", () => {
    const { tables } = document();
    expect(tables.map(({ implement, hardware, pair }: AchievableTable) => [implement, hardware, pair])).toEqual([
      ["barbell", "collar-clamp", undefined],
      ["barbell", "collar-spinlock", undefined],
      ["barbell", "none", undefined],
      ["dumbbell", "screw-standard", true],
      ["dumbbell", "screw-standard", false],
      ["dumbbell", "screw-long", true],
      ["dumbbell", "screw-long", false],
      ["dumbbell", "none", true],
      ["dumbbell", "none", false],
      ["kettlebell", "screw-standard", undefined],
      ["kettlebell", "screw-long", undefined],
      ["kettlebell", "none", undefined],
      ["leg", undefined, undefined],
      ["vest", undefined, undefined],
    ]);
    expect(Object.keys(tables[12])).toEqual(["implement", "rows"]);
    expect(tables).toEqual(achievable(inventory));
  });

  it.each([
    ["the owner's file", inventoryPath, inventory],
    ["the Olympic kit", olympicPath, olympic],
  ])("gives rows that load exactly with their hardware and pair setting, for %s", (_, path, kit: Inventory) => {
    const { tables } = JSON.parse(runWith(["achievable", "--inventory", path], {}).stdout) as { tables: AchievableTable[] };
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      const unit = kit.implements.find((implement) => implement.id === table.implement)!.unit;
      const key = table.pair === undefined ? table.implement : `${table.implement}.${table.pair ? "pair" : "single"}`;
      const hardware = table.hardware === undefined ? [] : [`${table.implement}.hardware=${table.hardware}`];
      for (const row of table.rows) {
        const response = jsonOf(["load", `${key}=${row.total[unit]}${unit}`, ...hardware, "--inventory", path], {});
        expect(response.results[0].exact, `${key}=${row.total[unit]}${unit} ${hardware.join(" ")}`).toBe(true);
      }
    }
  }, 120_000);

  it.each([[["achievable", "barbell"]], [["achievable", "--from", "10"]]])("exits 1 for %j", (args) => {
    const result = runWith(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
  });
});
