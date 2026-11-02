import { describe, expect, it } from "vitest";
import { load, reverse, type CurrentLoading, type LoadRequest, type TargetRequest } from "../src/index.js";
import { changed, byId, olympic, owner } from "./kits.js";

const side = (name: string, plates: number[], ids: string[]) => ({ name, plates, ids });
const quickLock: Record<number, string> = { 22.5: "ql-22.5", 5: "ql-5", 2.5: "ql-2.5", 1.25: "ql-micro" };
const ql = (plates: number[]) => plates.map((plate) => quickLock[plate]!);
const eachSide = (...plates: number[]) => [side("left", plates, ql(plates)), side("right", plates, ql(plates))];
const ends = (a: number[], b: number[] = a) => [side("a", a, ql(a)), side("b", b, ql(b))];
const stack = (...plates: number[]) => [side("stack", plates, ql(plates))];

function one(target: TargetRequest, extra: Partial<LoadRequest> = {}, inventory = owner) {
  return load(inventory, { targets: [target], ...extra }).results[0]!;
}

describe("worked examples 1 to 15 (spec section 7) on the owner's file", () => {
  it("1: barbell 175 lb is not exact; above, 175.5 lb, is recommended", () => {
    expect(one({ implement: "barbell", target: "175" })).toMatchObject({
      exact: false,
      recommended: "above",
      below: { total: { lb: 173 }, positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5) },
      above: { total: { lb: 175.5 }, positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25) },
    });
  });

  it("2: barbell 173 lb is exact", () => {
    expect(one({ implement: "barbell", target: "173" })).toMatchObject({
      exact: true,
      loading: { total: { lb: 173 }, hardware: [{ id: "collar-clamp", count: 2 }], positions: eachSide(22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5) },
    });
  });

  it("3: barbell 230 lb is refused over the 210 lb plate limit; heaviest allowed 228 lb", () => {
    const result = one({ implement: "barbell", target: "230" });
    expect(result).toMatchObject({
      refused: { limit: { lb: 210 } },
      recommended: "below",
      below: { total: { lb: 228 }, positions: eachSide(22.5, 22.5, ...Array<number>(12).fill(5)) },
    });
    expect(result.warnings).toEqual(["Refused: over the 210 lb plate limit. Heaviest allowed: 228 lb (103.4 kg)."]);
  });

  it("4: dumbbells 40 lb (pair) are exact, 3 × 5 per end, standard screws, 12 × 5 lb plates", () => {
    const response = load(owner, { targets: [{ implement: "dumbbell", target: "40" }] });
    expect(response.results[0]).toMatchObject({
      pair: true,
      exact: true,
      loading: { hardware: [{ id: "screw-standard", count: 2 }], positions: ends([5, 5, 5]) },
    });
    expect(response.leftover.plates["ql-5"]).toBe(12);
  });

  it("5: one dumbbell 12.5 lb is exact and uneven, 1 × 2.5 on one end", () => {
    expect(one({ implement: "dumbbell", target: "12.5", pair: false })).toMatchObject({
      exact: true,
      loading: { hardware: [{ id: "screw-standard", count: 2 }], positions: ends([2.5], []), uneven: true, heavier: "a" },
    });
  });

  it("6: one dumbbell 47.5 lb is exact and uneven, 4 × 5 against 3 × 5 + 1 × 2.5", () => {
    expect(one({ implement: "dumbbell", target: "47.5", pair: false })).toMatchObject({
      exact: true,
      loading: { positions: ends([5, 5, 5, 5], [5, 5, 5, 2.5]), uneven: true, heavier: "a" },
    });
  });

  it("7: dumbbells 120 lb (pair) are exact on long screws, using every 5 lb and 2.5 lb plate", () => {
    const response = load(owner, { targets: [{ implement: "dumbbell", target: "120" }] });
    expect(response.results[0]).toMatchObject({
      exact: true,
      loading: { hardware: [{ id: "screw-long", count: 2 }], positions: ends([22.5, 5, 5, 5, 5, 5, 5, 2.5]) },
    });
    expect(response.leftover.plates).toMatchObject({ "ql-5": 0, "ql-2.5": 0 });
  });

  it("8: kettlebell 80 lb is exact on a long screw", () => {
    expect(one({ implement: "kettlebell", target: "80" })).toMatchObject({
      exact: true,
      loading: { hardware: [{ id: "screw-long", count: 1 }], positions: stack(22.5, 5, 5, 5, 5, 5, 5, 2.5) },
    });
  });

  it("9: dumbbells 120 lb then kettlebell 40 lb recommends 47.5 lb, warning that the dumbbells use its plates", () => {
    const [pair, bell] = load(owner, {
      targets: [
        { implement: "dumbbell", target: "120" },
        { implement: "kettlebell", target: "40" },
      ],
    }).results;
    expect(pair).toMatchObject({ exact: true });
    expect(bell).toMatchObject({
      exact: false,
      recommended: "above",
      below: { total: { lb: 26.25 }, positions: stack(1.25) },
      above: { total: { lb: 47.5 }, positions: stack(22.5) },
    });
    expect(bell!.warnings).toEqual(["Not exact because the dumbbells use the 5 lb plates the kettlebell needs to reach 40 lb."]);
  });

  it("10: barbell 173 lb then dumbbells 40 lb leave 1 × 22.5, 2 × 2.5, 4 micro and 5 long screws", () => {
    const response = load(owner, {
      targets: [
        { implement: "barbell", target: "173" },
        { implement: "dumbbell", target: "40" },
      ],
    });
    expect(response.results.map((result) => result.exact)).toEqual([true, true]);
    expect(response.leftover).toEqual({
      plates: { "ql-22.5": 1, "ql-5": 0, "ql-2.5": 2, "ql-micro": 4 },
      hardware: { "screw-standard": 0, "screw-long": 5, "collar-spinlock": 2, "collar-clamp": 2 },
    });
  });

  it("11: barbell 88 lb gives up its fewest-plate loading so dumbbells 75 lb are exact", () => {
    const [bar, pair] = load(owner, {
      targets: [
        { implement: "barbell", target: "88" },
        { implement: "dumbbell", target: "75" },
      ],
    }).results;
    expect(bar).toMatchObject({ exact: true, loading: { positions: eachSide(5, 5, 5, 5, 5, 5, 5) } });
    expect(pair).toMatchObject({ exact: true, loading: { hardware: [{ id: "screw-standard", count: 2 }], positions: ends([22.5, 5, 5]) } });
  });

  it("12: leg attachment 50 lb is exact, 2 × 22.5, 1 × 5, with its note", () => {
    const result = one({ implement: "leg", target: "50" });
    expect(result).toMatchObject({ exact: true, loading: { hardware: [], positions: stack(22.5, 22.5, 5) } });
    expect(result.warnings).toEqual(["Plate weight only. The lever changes the resistance you feel."]);
  });

  it("13: vest 12 kg is 12 blocks, 6 front and 6 back", () => {
    const blocks = Array<number>(6).fill(1);
    const ids = Array<string>(6).fill("vest-block");
    expect(one({ implement: "vest", target: "12" })).toMatchObject({
      exact: true,
      loading: { total: { kg: 12 }, positions: [side("front", blocks, ids), side("back", blocks, ids)] },
    });
  });

  it("14: vest 30 lb is not exact; 14 kg is recommended over 13 kg", () => {
    expect(one({ implement: "vest", target: "30lb" })).toMatchObject({
      exact: false,
      target: { kg: 13.6 },
      recommended: "above",
      below: { total: { kg: 13 } },
      above: { total: { kg: 14 } },
    });
  });

  it("15: one dumbbell 7.5 lb is one standard screw on one end; with uneven off, below 5 lb and above 10 lb", () => {
    expect(one({ implement: "dumbbell", target: "7.5", pair: false })).toMatchObject({
      exact: true,
      loading: { hardware: [{ id: "screw-standard", count: 1 }], positions: ends([], []), uneven: true },
    });
    expect(one({ implement: "dumbbell", target: "7.5", pair: false }, { uneven: false })).toMatchObject({
      exact: false,
      below: { total: { lb: 5 }, hardware: [] },
      above: { total: { lb: 10 }, hardware: [{ id: "screw-standard", count: 2 }] },
    });
  });
});

describe("worked examples 16 to 20 (spec 16.6, with 19 revised in 17.11)", () => {
  const from = (implement: string, target: string, current: CurrentLoading, pair?: boolean) =>
    one({ implement, target, current, ...(pair === undefined ? {} : { pair }) });
  const bar = (plates: number[]): CurrentLoading => ({ positions: [{ name: "left", plates }, { name: "right", plates }] });

  it("16: barbell 88 lb to 98 lb puts on 1 × 5 per side, 2 changes", () => {
    expect(from("barbell", "98", bar([5, 5, 5, 5, 5, 5, 5]))).toMatchObject({
      exact: true,
      loading: { positions: eachSide(5, 5, 5, 5, 5, 5, 5, 5), changes: { count: 2 } },
    });
  });

  it("17: barbell 68 lb to 113 lb puts on 1 × 22.5 per side outside the 5s, 2 changes", () => {
    expect(from("barbell", "113", bar([5, 5, 5, 5, 5]))).toMatchObject({
      exact: true,
      loading: { positions: eachSide(5, 5, 5, 5, 5, 22.5), changes: { count: 2 } },
    });
  });

  it("18: barbell 173 lb to 175 lb recommends 175.5 lb, 2 changes; 173 lb below is 0 changes", () => {
    expect(from("barbell", "175", bar([22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5]))).toMatchObject({
      exact: false,
      recommended: "above",
      below: { total: { lb: 173 }, changes: { count: 0 } },
      above: { total: { lb: 175.5 }, changes: { count: 2 } },
    });
  });

  it("19 (revised): dumbbells 70 lb to 80 lb keep standard screws and put on 1 × 5 per end outside the 2.5, 4 changes", () => {
    const current: CurrentLoading = {
      positions: [
        { name: "a", plates: [22.5, 5, 2.5] },
        { name: "b", plates: [22.5, 5, 2.5] },
      ],
      hardware: "screw-standard",
    };
    expect(from("dumbbell", "80", current)).toMatchObject({
      exact: true,
      pair: true,
      loading: {
        hardware: [{ id: "screw-standard", count: 2 }],
        positions: ends([22.5, 5, 2.5, 5]),
        changes: { count: 4, hardware: [] },
      },
    });
  });

  it("20: with no current loading there is no changes block", () => {
    expect(one({ implement: "barbell", target: "173" }).loading).not.toHaveProperty("changes");
  });
});

describe("worked examples 21 to 26 (spec 17.11)", () => {
  it("24: dumbbells 80 lb on the owner's file are exact on standard screws", () => {
    expect(one({ implement: "dumbbell", target: "80" })).toMatchObject({
      exact: true,
      pair: true,
      loading: { hardware: [{ id: "screw-standard", count: 2 }], positions: ends([22.5, 5, 5, 2.5]) },
    });
  });

  const olympicSide = (name: string, plates: number[]) => side(name, plates, plates.map(String));

  it("25: Olympic bar 95.5 kg is 20, 10, 5, 2.5 per side with a spring collar, lengths in mm", () => {
    const result = one({ implement: "bar", target: "95.5" }, {}, olympic);
    expect(result).toMatchObject({
      exact: true,
      target: { kg: 95.5 },
      loading: {
        total: { kg: 95.5 },
        hardware: [{ id: "collar", count: 2 }],
        positions: [olympicSide("left", [20, 10, 5, 2.5]), olympicSide("right", [20, 10, 5, 2.5])],
      },
    });

    const shortSleeve = changed(olympic, (copy) => {
      byId(copy.implements, "bar").positionLength = { listed: 199, status: "verified" };
    });
    expect(one({ implement: "bar", target: "95.5" }, {}, shortSleeve).exact).toBe(false);
    const fitsExactly = changed(olympic, (copy) => {
      byId(copy.implements, "bar").positionLength = { listed: 200, status: "verified" };
    });
    expect(one({ implement: "bar", target: "95.5" }, {}, fitsExactly).exact).toBe(true);
  });

  it("26: one Olympic dumbbell 22.5 kg is 10 per end; 25 kg is not exact, below 22.5, above 27.5", () => {
    expect(one({ implement: "dumbbell", target: "22.5", pair: false }, {}, olympic)).toMatchObject({
      exact: true,
      pair: false,
      loading: { hardware: [{ id: "collar", count: 2 }], positions: [olympicSide("a", [10]), olympicSide("b", [10])], uneven: false },
    });
    expect(one({ implement: "dumbbell", target: "25", pair: false }, {}, olympic)).toMatchObject({
      exact: false,
      below: { total: { kg: 22.5 } },
      above: { total: { kg: 27.5 }, positions: [olympicSide("a", [10, 2.5]), olympicSide("b", [10, 2.5])] },
    });
  });

  it("reverse of example 25's loading returns 95.5 kg", () => {
    const plates = [20, 10, 5, 2.5];
    const result = reverse(olympic, { implement: "bar", positions: [{ name: "left", plates }, { name: "right", plates }] });
    expect(result).toMatchObject({ total: { kg: 95.5 }, hardware: [{ id: "collar", count: 2 }], warnings: [] });
  });
});
