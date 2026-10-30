import { arrange, type Changes, type Resolved } from "./changes.js";
import type { Implement, Inventory } from "./inventory.js";
import type { Loading, LoadResult, Outcome } from "./load.js";
import { RequestError } from "./request-error.js";
import { convert, describeWeight, display, parseWeight, thousandths, used } from "./weight.js";

export function loadVest(inventory: Inventory, implement: Implement, targetText: string, current: Resolved | undefined): Outcome {
  const block = inventory.plates.find((plate) => implement.accepts.includes(plate.type));
  if (!block) throw new RequestError(`The plate pool holds no plates for the ${implement.name.toLowerCase()}.`);
  const blockUnit = inventory.plateTypes.find((type) => type.id === block.type)?.unit ?? implement.unit;

  const target = parseWeight(targetText, implement.unit);
  const targetMilli = convert(thousandths(target.amount), target.unit, implement.unit);
  const baseMilli = thousandths(used(implement.base));
  const blockMilli = convert(thousandths(used(block.weight)), blockUnit, implement.unit);

  const limitMilli = implement.maxPlateWeight === undefined ? Infinity : thousandths(implement.maxPlateWeight);
  const blockLimit = Math.floor(limitMilli / blockMilli);
  const maxBlocks = Math.min(block.count, blockLimit);

  const totalFor = (count: number) => baseMilli + count * blockMilli;
  const platesFor = (count: number) => {
    const front = Math.floor(count / 2);
    return [Array<number>(front).fill(used(block.weight)), Array<number>(count - front).fill(used(block.weight))];
  };
  const changesFor = (count: number): Changes | undefined =>
    current &&
    arrange(current, { positions: implement.positions, fresh: platesFor(count), screws: [], symmetric: false, copies: 1 }).changes;
  const changeCount = (count: number) => changesFor(count)?.count ?? 0;
  const toLoading = (count: number): Loading => {
    const changes = changesFor(count);
    return {
      total: display(totalFor(count), implement.unit),
      hardware: [],
      positions: implement.positions.map((name, i) => ({ name, plates: platesFor(count)[i]! })),
      uneven: false,
      ...(changes ? { changes } : {}),
    };
  };

  const exactCount = (targetMilli - baseMilli) / blockMilli;
  const exact = Number.isInteger(exactCount) && exactCount >= 0 && exactCount <= maxBlocks ? exactCount : undefined;
  const belowCount = exact === undefined ? Math.min(Math.ceil(exactCount) - 1, maxBlocks) : undefined;
  const aboveCount = exact === undefined ? Math.max(Math.floor(exactCount) + 1, 0) : undefined;
  const below = belowCount !== undefined && belowCount >= 0 ? belowCount : undefined;
  const above = aboveCount !== undefined && aboveCount <= maxBlocks ? aboveCount : undefined;
  const belowWins = (under: number, over: number) =>
    under !== over ? under < over : changeCount(below!) <= changeCount(above!);
  const recommended =
    exact ??
    (below !== undefined && (above === undefined || belowWins(targetMilli - totalFor(below), totalFor(above) - targetMilli))
      ? below
      : above);

  const warnings: string[] = [];
  const refused = targetMilli - baseMilli > limitMilli ? { limit: display(limitMilli, implement.unit) } : undefined;
  if (refused) {
    const heaviest = below !== undefined ? ` Heaviest allowed: ${describeWeight(toLoading(below).total, implement.unit)}.` : "";
    warnings.push(`Refused: over the ${blockLimit} block limit.${heaviest}`);
  }

  const unverified = [
    ...(implement.base.status === "unverified" ? [`${implement.id}.base`] : []),
    ...(block.weight.status === "unverified" ? [`${block.id}.weight`] : []),
    ...(block.countStatus === "unverified" ? [`${block.id}.count`] : []),
  ];

  const result: LoadResult = {
    implement: implement.id,
    target: display(targetMilli, implement.unit),
    exact: exact !== undefined,
    ...(refused ? { refused } : {}),
    ...(exact === undefined && recommended !== undefined
      ? { recommended: recommended === below ? ("below" as const) : ("above" as const) }
      : {}),
    ...(exact !== undefined ? { loading: toLoading(exact) } : {}),
    ...(below !== undefined ? { below: toLoading(below) } : {}),
    ...(above !== undefined ? { above: toLoading(above) } : {}),
    alternatives: [],
    warnings,
    unverified,
  };

  return {
    target: targetMilli,
    ...(recommended !== undefined ? { total: totalFor(recommended) } : {}),
    picks:
      recommended !== undefined
        ? [
            {
              plates: new Map([[block.id, recommended]]),
              hardware: new Map(),
              plateCount: recommended,
              uneven: 0,
              changes: changeCount(recommended),
            },
          ]
        : [],
    result: () => ({ ...result, warnings: [...result.warnings] }),
  };
}
