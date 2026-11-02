import { load, RequestError, type Inventory, type Leftover, type LoadResult, type TargetRequest, type Unit } from "@plate-pool/core";
import { currentLoading, type CurrentLoadings, type PinnedLoading } from "./current";
import { canPair, implementOf, kindOf, unitOf } from "./kit";

export interface Card {
  id: number;
  implement: string;
  target: string;
  unit: Unit;
  /** A handle the gym has two or more of loads as a pair, or as a single. */
  pair: boolean;
}

export type Outcome = { result: LoadResult } | { error: string } | undefined;

export interface Plan {
  outcomes: Outcome[];
  leftover?: Leftover;
}

interface Options {
  hardware: Record<string, string>;
  uneven: boolean;
  current?: CurrentLoadings;
}

export function targetWithUnit(target: string, unit: Unit): string {
  return /[a-z]/i.test(target) ? target : `${target.trim()}${unit}`;
}

let nextId = 0;

export function newCard(inventory: Inventory, implement: string, pair: boolean = canPair(inventory, implement)): Card {
  return { id: nextId++, implement, target: "", unit: unitOf(inventory, implement), pair };
}

/** The implement's name, with "pair" or "single" after a handle the gym has two or more of. */
export function cardLabel(inventory: Inventory, card: Pick<Card, "implement" | "pair">): string {
  const name = implementOf(inventory, card.implement)?.name ?? card.implement;
  if (!canPair(inventory, card.implement)) return name;
  return `${name} ${card.pair ? "pair" : "single"}`;
}

function copiesOf(inventory: Inventory, card: Pick<Card, "implement" | "pair">): number {
  return kindOf(inventory, card.implement) === "handle" && card.pair ? 2 : 1;
}

export function freeCount(inventory: Inventory, cards: Card[], implement: string): number {
  const held = cards.filter((card) => card.implement === implement).reduce((sum, card) => sum + copiesOf(inventory, card), 0);
  return (implementOf(inventory, implement)?.count ?? 0) - held;
}

/** The pair setting a request carries: always on a handle the gym has two or more of, and on one it has one of only when a pair is asked for. */
export function pairOf(inventory: Inventory, card: Pick<Card, "implement" | "pair">): { pair?: boolean } {
  if (kindOf(inventory, card.implement) !== "handle") return {};
  if (canPair(inventory, card.implement) || card.pair) return { pair: card.pair };
  return {};
}

function targetFor(inventory: Inventory, card: Card, pinned: PinnedLoading | undefined): TargetRequest {
  const target = targetWithUnit(card.target, card.unit);
  const current = pinned ? { current: currentLoading(pinned) } : {};
  return { implement: card.implement, target, ...pairOf(inventory, card), ...current };
}

/** The current loading each card starts from: an implement's current loading belongs to its first card, and a handle's only to a card for the same pair or single. */
export function pinnedFor(inventory: Inventory, cards: Card[], current: CurrentLoadings = {}): (PinnedLoading | undefined)[] {
  const claimed = new Set<string>();
  return cards.map((card) => {
    const pinned = current[card.implement];
    if (!pinned || claimed.has(card.implement)) return undefined;
    if (canPair(inventory, card.implement) && (pinned.pair !== false) !== card.pair) return undefined;
    claimed.add(card.implement);
    return pinned;
  });
}

function errorOf(error: unknown, card: Card): { error: string } {
  if (error instanceof RequestError) return { error: error.message.replace(targetWithUnit(card.target, card.unit), card.target.trim()) };
  throw error;
}

export function plan(inventory: Inventory, cards: Card[], { hardware, uneven, current }: Options): Plan {
  const pinned = pinnedFor(inventory, cards, current);
  const targetOf = (card: Card) => targetFor(inventory, card, pinned[cards.indexOf(card)]);
  const outcomes: Outcome[] = cards.map(() => undefined);
  const requested: number[] = [];
  cards.forEach((card, index) => {
    if (card.target.trim() === "") return;
    try {
      load(inventory, { targets: [targetOf(card)], hardware, uneven });
      requested.push(index);
    } catch (error) {
      outcomes[index] = errorOf(error, card);
    }
  });
  if (requested.length === 0) return { outcomes };

  const loadAll = (indexes: number[]) => load(inventory, { targets: indexes.map((index) => targetOf(cards[index]!)), hardware, uneven });
  let accepted = requested;
  let response;
  try {
    response = loadAll(accepted);
  } catch (error) {
    if (!(error instanceof RequestError)) throw error;
    accepted = [];
    for (const index of requested) {
      try {
        response = loadAll([...accepted, index]);
        accepted.push(index);
      } catch (inner) {
        outcomes[index] = errorOf(inner, cards[index]!);
      }
    }
  }
  if (!response || accepted.length === 0) return { outcomes };
  accepted.forEach((index, position) => {
    outcomes[index] = { result: response.results[position]! };
  });
  return { outcomes, leftover: response.leftover };
}
