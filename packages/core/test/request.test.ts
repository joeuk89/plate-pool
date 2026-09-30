import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, RequestError, type Inventory, type Loading, type LoadResponse, type TargetRequest } from "../src/index.js";

const inventory: Inventory = JSON.parse(
  readFileSync(new URL("../../../inventory/inventory.json", import.meta.url), "utf8"),
);

function request(...targets: TargetRequest[]) {
  return load(inventory, { targets });
}

const barbell = (target: string): TargetRequest => ({ implement: "barbell", target });
const dumbbells = (target: string): TargetRequest => ({ implement: "dumbbell", target });
const dumbbell = (target: string): TargetRequest => ({ implement: "dumbbell", target, pair: false });
const kettlebell = (target: string): TargetRequest => ({ implement: "kettlebell", target });
const leg = (target: string): TargetRequest => ({ implement: "leg", target });
const vest = (target: string): TargetRequest => ({ implement: "vest", target });

const sides = (...plates: number[]) => [
  { name: "left", plates },
  { name: "right", plates },
];
const ends = (...plates: number[]) => [
  { name: "end-a", plates },
  { name: "end-b", plates },
];

describe("requests with several implements: worked examples (spec section 7)", () => {
  it("example 9: dumbbells 120 lb then kettlebell 40 lb recommends 47.5 lb and warns that the dumbbells use the plates it needs", () => {
    const [pair, bell] = request(dumbbells("120"), kettlebell("40")).results;
    expect(pair).toMatchObject({ exact: true, loading: { positions: ends(22.5, 5, 5, 5, 5, 5, 5, 2.5) } });
    expect(bell).toMatchObject({
      implement: "kettlebell",
      exact: false,
      below: { total: { lb: 26.25 }, positions: [{ name: "stack", plates: [1.25] }] },
      above: { total: { lb: 47.5 }, positions: [{ name: "stack", plates: [22.5] }] },
      recommended: "above",
    });
    expect(bell!.warnings).toEqual([
      "Not exact because the dumbbells use the 5 lb plates the kettlebell needs to reach 40 lb.",
    ]);
  });

  it("example 10: barbell 173 lb then dumbbells 40 lb are both exact and leave 1 × 22.5, 2 × 2.5, 4 micro and 5 long screws", () => {
    const response = request(barbell("173"), dumbbells("40"));
    const [bar, pair] = response.results;
    expect(bar).toMatchObject({ implement: "barbell", exact: true, loading: { positions: sides(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5) } });
    expect(pair).toMatchObject({
      implement: "dumbbell",
      exact: true,
      loading: { hardware: [{ id: "screw-standard", count: 2 }], positions: ends(5, 5, 5) },
    });
    expect(response.leftover).toEqual({
      plates: { "ql-22.5": 1, "ql-5": 0, "ql-2.5": 2, "ql-micro": 4 },
      hardware: { "screw-standard": 0, "screw-long": 5, "collar-spinlock": 2, "collar-clamp": 2 },
    });
  });

  it("example 11: barbell 88 lb gives up its fewest-plate loading so dumbbells 75 lb can be exact, 26 plates in total", () => {
    const response = request(barbell("88"), dumbbells("75"));
    const [bar, pair] = response.results;
    expect(bar).toMatchObject({ exact: true, loading: { positions: sides(5, 5, 5, 5, 5, 5, 5) } });
    expect(pair).toMatchObject({
      exact: true,
      loading: { hardware: [{ id: "screw-standard", count: 2 }], positions: ends(22.5, 5, 5) },
    });
    expect(platesUsed(response)).toBe(26);
  });
});

describe("requests with several implements: choosing the loading set (spec 6.3)", () => {
  it("serves the first implement first: kettlebell 40 lb then dumbbells 120 lb makes the kettlebell exact and the dumbbells miss", () => {
    const [bell, pair] = request(kettlebell("40"), dumbbells("120")).results;
    expect(bell).toMatchObject({ exact: true, loading: { total: { lb: 40 } } });
    expect(pair).toMatchObject({ exact: false, recommended: "below", below: { total: { lb: 115 } } });
    expect(pair!.warnings[0]).toMatch(/^Not exact because the kettlebell uses the .* the dumbbells need to reach 120 lb\.$/);
  });

  it("uses the fewest plates in total: barbell 68 lb gives up 1 × 22.5, 1 × 2.5 per side so dumbbells 55 lb need 4 plates, not 12", () => {
    const response = request(barbell("68"), dumbbells("55"));
    const [bar, pair] = response.results;
    expect(bar).toMatchObject({ exact: true, loading: { positions: sides(5, 5, 5, 5, 5) } });
    expect(pair).toMatchObject({ exact: true, loading: { positions: ends(22.5) } });
    expect(platesUsed(response)).toBe(14);
  });

  it("then the fewest uneven dumbbells: one dumbbell 102.5 lb gives up its fewest-plate loading so a second at 77.5 lb is even", () => {
    const response = request(dumbbell("102.5"), dumbbell("77.5"));
    const [first, second] = response.results;
    expect(first).toMatchObject({
      exact: true,
      loading: { uneven: true, positions: [{ name: "end-a", plates: [22.5, 5, 5, 5, 5, 5] }, { name: "end-b", plates: [22.5, 22.5] }] },
    });
    expect(second).toMatchObject({ exact: true, loading: { uneven: false, positions: ends(22.5, 5, 5, 1.25) } });
    expect(platesUsed(response)).toBe(16);
  });

  it("gives an implement that is exact on its own no warning", () => {
    const [, pair] = request(barbell("173"), dumbbells("40")).results;
    expect(pair!.warnings).toEqual([]);
  });

  it("keeps a single target's result the same as before", () => {
    const alone = load(inventory, { targets: [barbell("88")] });
    expect(alone.results[0]!.loading!.positions).toEqual(sides(22.5, 5, 5, 2.5));
  });
});

describe("requests with several implements: the plate pool (spec 6.1 and 6.4)", () => {
  const requests: TargetRequest[][] = [
    [barbell("173"), dumbbells("40")],
    [dumbbells("120"), kettlebell("40")],
    [barbell("228"), dumbbells("120"), kettlebell("80"), leg("100")],
    [leg("100"), kettlebell("80"), barbell("150"), dumbbells("60")],
    [dumbbell("120"), dumbbell("120"), barbell("100"), kettlebell("50"), leg("50"), vest("30kg")],
    [kettlebell("57.5"), dumbbells("75"), barbell("68")],
  ];

  it.each(requests.map((targets) => [targets.map((target) => `${target.implement}=${target.target}`).join(" "), targets] as const))(
    "%s uses no more than the plate pool holds, and leftover is the pool minus the recommended loadings",
    (_, targets) => {
      const response = request(...targets);
      const used = new Map<string, number>();
      for (const [index, result] of response.results.entries()) {
        const loading = recommendedLoading(result);
        if (!loading) continue;
        const copies = targets[index]!.implement === "dumbbell" && targets[index]!.pair !== false ? 2 : 1;
        for (const position of loading.positions) {
          for (const weight of position.plates) {
            const plate = inventory.plates.find((item) => item.weight.listed === weight && targets[index]!.implement !== "vest" === (item.type === "quick-lock"))!;
            used.set(plate.id, (used.get(plate.id) ?? 0) + copies);
          }
        }
        for (const item of loading.hardware) used.set(item.id, (used.get(item.id) ?? 0) + item.count * copies);
      }
      for (const plate of inventory.plates) {
        expect(used.get(plate.id) ?? 0).toBeLessThanOrEqual(plate.count);
        if (plate.id in response.leftover.plates) expect(response.leftover.plates[plate.id]).toBe(plate.count - (used.get(plate.id) ?? 0));
      }
      for (const item of inventory.hardware) {
        expect(used.get(item.id) ?? 0).toBeLessThanOrEqual(item.count);
        expect(response.leftover.hardware[item.id]).toBe(item.count - (used.get(item.id) ?? 0));
      }
    },
  );

  it("lets a vest leave the Quick-Lock plates untouched", () => {
    const withVest = request(vest("30kg"), barbell("228"), dumbbells("40"));
    const without = request(barbell("228"), dumbbells("40"));
    expect(withVest.results.slice(1)).toEqual(without.results);
    expect(withVest.leftover.plates).toEqual({ ...without.leftover.plates, "vest-block": 0 });
    expect(withVest.results[0]).toMatchObject({ exact: true, loading: { total: { kg: 30 } } });
  });

  it("warns a later implement that ends further from its target because of plates used earlier", () => {
    const [, bar] = request(dumbbells("120"), barbell("175")).results;
    expect(bar).toMatchObject({ exact: false, recommended: "below" });
    expect(bar!.warnings[0]).toBe(
      "Further from 175 lb than it could be, because the dumbbells use the 22.5 lb plates, 5 lb plates and 2.5 lb plates the barbell needs to get closer.",
    );
  });

  it("refuses a request for more of an implement than the inventory holds", () => {
    expect(() => request(barbell("100"), barbell("120"))).toThrow(RequestError);
    expect(() => request(barbell("100"), barbell("120"))).toThrow("The request needs 2 × barbell. The inventory holds 1.");
    expect(() => request(dumbbells("40"), dumbbell("20"))).toThrow("The request needs 3 × dumbbell. The inventory holds 2.");
  });

  it("refuses a request with no targets", () => {
    expect(() => request()).toThrow("A request holds at least one target.");
  });
});

function recommendedLoading(result: LoadResponse["results"][number]): Loading | undefined {
  return result.loading ?? (result.recommended ? result[result.recommended] : undefined);
}

function platesUsed(response: LoadResponse): number {
  return Object.entries(response.leftover.plates).reduce(
    (sum, [id, left]) => sum + inventory.plates.find((plate) => plate.id === id)!.count - left,
    0,
  );
}
