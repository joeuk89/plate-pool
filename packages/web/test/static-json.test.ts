// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { list, readInventory, type CollarChoice, type ListResponse } from "@plate-pool/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, type Deployment } from "./build-app";

const inventoryFile = new URL("../../../inventory/inventory.json", import.meta.url);

let deployment: Deployment;

function deployed(file: string): string {
  return readFileSync(join(deployment.outDir, file), "utf8");
}

beforeAll(async () => {
  deployment = await buildApp();
}, 60_000);

afterAll(() => deployment.remove());

describe("static JSON (spec 10)", () => {
  it("publishes the inventory file as deployed at api/inventory.json", () => {
    expect(deployed("api/inventory.json")).toBe(readFileSync(inventoryFile, "utf8"));
  });

  it("publishes one table per implement, per barbell collar choice, and per dumbbell pair or single", () => {
    const tables: Table[] = achievable().tables;
    expect(tables.map(({ implement, collars, pair }) => ({ implement, collars, pair }))).toEqual([
      { implement: "barbell", collars: "clamp", pair: undefined },
      { implement: "barbell", collars: "spinlock", pair: undefined },
      { implement: "barbell", collars: "none", pair: undefined },
      { implement: "dumbbell", collars: undefined, pair: true },
      { implement: "dumbbell", collars: undefined, pair: false },
      { implement: "kettlebell", collars: undefined, pair: undefined },
      { implement: "leg", collars: undefined, pair: undefined },
      { implement: "vest", collars: undefined, pair: undefined },
    ]);
  });

  it("holds the library's List result over each implement's full range, with the whole plate pool free", () => {
    const inventory = readInventory(JSON.parse(readFileSync(inventoryFile, "utf8")));
    for (const { collars, ...table } of achievable().tables) {
      const request = { implement: table.implement, ...(table.pair === undefined ? {} : { pair: table.pair }), ...(collars ? { collars } : {}) };
      expect(table, JSON.stringify(request)).toEqual(list(inventory, request));
    }
  });

  it("runs each table from the lightest to the heaviest achievable total", () => {
    const ends = achievable().tables.map(({ rows }) => [rows[0]!.total, rows.at(-1)!.total]);
    expect(ends).toEqual([
      [{ lb: 18, kg: 8.2 }, { lb: 228, kg: 103.4 }],
      [{ lb: 18, kg: 8.2 }, { lb: 228, kg: 103.4 }],
      [{ lb: 18, kg: 8.2 }, { lb: 228, kg: 103.4 }],
      [{ lb: 5, kg: 2.3 }, { lb: 120, kg: 54.4 }],
      [{ lb: 5, kg: 2.3 }, { lb: 120, kg: 54.4 }],
      [{ lb: 22.5, kg: 10.2 }, { lb: 80, kg: 36.3 }],
      [{ lb: 1.25, kg: 0.6 }, { lb: 100, kg: 45.4 }],
      [{ kg: 1, lb: 2.2 }, { kg: 30, lb: 66.14 }],
    ]);
  });

  it("lists the exact totals from the worked examples and leaves out the ones no loading reaches (spec 7)", () => {
    const [clamp, , , pair, single, kettlebell, leg, vest] = achievable().tables.map(({ rows }) => rows.map(({ total }) => total.lb));
    expect(clamp).toEqual(expect.arrayContaining([173, 175.5, 88]));
    expect(clamp).not.toContain(175);
    expect(pair).toEqual(expect.arrayContaining([40, 75, 120]));
    expect(single).toEqual(expect.arrayContaining([12.5, 47.5]));
    expect(kettlebell).toEqual(expect.arrayContaining([26.25, 40, 47.5, 80]));
    expect(leg).toContain(50);
    expect(vest).toHaveLength(30);
  });

  it("names the unverified values each table uses (spec 13)", () => {
    const [clamp, spinlock, none] = achievable().tables;
    expect(clamp!.unverified).toEqual(expect.arrayContaining(["barbell.base", "collar-clamp.weight"]));
    expect(spinlock!.unverified).toEqual(expect.arrayContaining(["barbell.base", "collar-spinlock.weight"]));
    expect(none!.unverified).toEqual(["barbell.base"]);
  });
});

type Table = ListResponse & { collars?: CollarChoice };

function achievable(): { tables: Table[] } {
  return JSON.parse(deployed("api/achievable.json"));
}
