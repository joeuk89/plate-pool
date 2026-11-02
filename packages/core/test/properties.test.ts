import { describe, expect, it } from "vitest";
import { achievable, load, reverse, type Inventory, type Loading, type LoadResult, type ReverseRequest } from "../src/index.js";
import { olympic, owner } from "./kits.js";

const kits: [string, Inventory][] = [
  ["the owner's file", owner],
  ["the Olympic kit", olympic],
];

const listed = (value: { listed: number; measured?: number }) => value.measured ?? value.listed;

function loadingsOf(result: LoadResult): Loading[] {
  return [result.loading, result.below, result.above, ...result.alternatives].filter((loading) => loading !== undefined);
}

function targetsFor(kit: Inventory, implement: Inventory["implements"][number]): string[] {
  const step = implement.unit === "kg" ? 0.5 : 1.25;
  const top = implement.unit === "kg" ? 120 : 250;
  return Array.from({ length: Math.round(top / step) }, (_, i) => `${(i + 1) * step}${implement.unit}`);
}

function sweep(kit: Inventory): { result: LoadResult; loading: Loading; pair?: boolean }[] {
  return kit.implements.flatMap((implement) => {
    const pairs = implement.kind === "handle" && implement.count >= 2 ? [true, false] : [undefined];
    return pairs.flatMap((pair) =>
      targetsFor(kit, implement).flatMap((target) => {
        const [result] = load(kit, { targets: [{ implement: implement.id, target, ...(pair === undefined ? {} : { pair }) }] }).results;
        return loadingsOf(result!).map((loading) => ({ result: result!, loading, ...(pair === undefined ? {} : { pair }) }));
      }),
    );
  });
}

describe("achievable tables (spec 17.8, example 23)", () => {
  it("example 23: the owner's file gives 14 tables in file order, then options order, pair before single", () => {
    const tables = achievable(owner);
    expect(tables.map(({ implement, hardware, pair }) => [implement, hardware, pair])).toEqual([
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
    for (const table of tables) {
      expect(table, table.implement).not.toHaveProperty(table.hardware === undefined ? "hardware" : "missing");
      expect("pair" in table).toBe(table.implement === "dumbbell");
    }
  });

  it("gives a handle the gym has one of no pair or single tables", () => {
    const one = structuredClone(olympic);
    one.implements.find((implement) => implement.id === "dumbbell")!.count = 1;
    expect(achievable(one).filter((table) => table.implement === "dumbbell").map((table) => "pair" in table)).toEqual([false]);
  });

  it.each(kits)("every row of every table in %s, passed to Load with the table's hardware and pair, is exact", (_, kit) => {
    let rows = 0;
    for (const table of achievable(kit)) {
      const unit = kit.implements.find((implement) => implement.id === table.implement)!.unit;
      for (const row of table.rows) {
        const [result] = load(kit, {
          targets: [{ implement: table.implement, target: `${row.total[unit]}${unit}`, ...(table.pair === undefined ? {} : { pair: table.pair }) }],
          ...(table.hardware === undefined ? {} : { hardware: { [table.implement]: table.hardware } }),
        }).results;
        expect(result!.exact, `${table.implement} ${row.total[unit]}`).toBe(true);
        expect(result!.loading).toEqual(row.loading);
        rows++;
      }
    }
    expect(rows).toBeGreaterThan(20);
  });
});

describe.each(kits)("properties that hold for every kit (spec 17.11): %s", (_, kit) => {
  const loadings = sweep(kit);

  it("loads something for every implement", () => {
    expect(new Set(loadings.map(({ result }) => result.implement))).toEqual(new Set(kit.implements.map((implement) => implement.id)));
  });

  it("returns the same total from Reverse for every loading from Load, with no warnings", () => {
    for (const { result, loading, pair } of loadings) {
      const [item] = loading.hardware;
      const implement = kit.implements.find((each) => each.id === result.implement)!;
      const request: ReverseRequest = {
        implement: result.implement,
        ...(pair === undefined ? {} : { pair }),
        positions: loading.positions,
        ...(implement.kind === "vest" ? {} : { hardware: item?.id ?? "none" }),
        ...(implement.kind === "handle" && item && item.count < (implement.hardware?.perPosition ?? 1) * 2 ? { hardwareOn: loading.heavier! } : {}),
      };
      const reversed = reverse(kit, request);
      expect(reversed, JSON.stringify(loading)).toMatchObject({ total: loading.total, hardware: loading.hardware, warnings: [] });
    }
  });

  it("never exceeds the pool, a position length, a hardware capacity or a per-position cap", () => {
    const plateOf = (id: string) => kit.plates.find((plate) => plate.id === id)!;
    for (const { result, loading, pair } of loadings) {
      const implement = kit.implements.find((each) => each.id === result.implement)!;
      const copies = pair ? 2 : 1;
      const [held] = loading.hardware;
      const item = held && kit.hardware.find((each) => each.id === held.id)!;
      const used = new Map<string, number>();
      for (const position of loading.positions) {
        for (const id of position.ids) used.set(id, (used.get(id) ?? 0) + copies);
        const length = position.ids.reduce((sum, id) => sum + (plateOf(id).stackLength ? listed(plateOf(id).stackLength!) : 0), 0);
        const loaded = position.ids.length > 0;
        if (implement.positionLength) {
          expect(length + (item && loaded ? (item.width ?? 0) : 0), result.implement).toBeLessThanOrEqual(listed(implement.positionLength) + 1e-9);
        }
        if (item?.capacity !== undefined) expect(length, result.implement).toBeLessThanOrEqual(item.capacity + 1e-9);
        for (const [id, most] of Object.entries(implement.maxPerPosition ?? {})) {
          expect(position.ids.filter((each) => each === id).length, `${result.implement} ${id}`).toBeLessThanOrEqual(most);
        }
      }
      for (const [id, count] of used) expect(count, id).toBeLessThanOrEqual(plateOf(id).count);
      if (item) expect(held!.count * copies).toBeLessThanOrEqual(item.count);
    }
  });
});
