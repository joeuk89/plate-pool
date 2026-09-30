import { load, RequestError, type CollarChoice, type Leftover, type LoadResult, type TargetRequest, type Unit } from "@plate-pool/core";
import { inventory } from "./inventory";

export type DumbbellChoice = "pair" | "one";

export interface Card {
  id: number;
  implement: string;
  target: string;
  unit: Unit;
  dumbbells: DumbbellChoice;
}

export type Outcome = { result: LoadResult } | { error: string } | undefined;

export interface Plan {
  outcomes: Outcome[];
  leftover?: Leftover;
}

interface Options {
  collars: CollarChoice;
  uneven: boolean;
}

export function unitOf(implement: string): Unit {
  return inventory.implements.find((item) => item.id === implement)?.unit ?? "lb";
}

export function targetWithUnit(target: string, unit: Unit): string {
  return /[a-z]/i.test(target) ? target : `${target.trim()}${unit}`;
}

let nextId = 0;

export function newCard(implement: string, dumbbells: DumbbellChoice = "pair"): Card {
  return { id: nextId++, implement, target: "", unit: unitOf(implement), dumbbells };
}

export function cardLabel(card: Pick<Card, "implement" | "dumbbells">): string {
  if (card.implement === "dumbbell") return card.dumbbells === "pair" ? "Dumbbells" : "One dumbbell";
  if (card.implement === "leg") return "Leg attachment";
  return card.implement.charAt(0).toUpperCase() + card.implement.slice(1);
}

function copiesOf(card: Pick<Card, "implement" | "dumbbells">): number {
  return card.implement === "dumbbell" && card.dumbbells === "pair" ? 2 : 1;
}

export function freeCount(cards: Card[], implement: string): number {
  const held = cards.filter((card) => card.implement === implement).reduce((sum, card) => sum + copiesOf(card), 0);
  return (inventory.implements.find((item) => item.id === implement)?.count ?? 0) - held;
}

function targetOf(card: Card): TargetRequest {
  const target = targetWithUnit(card.target, card.unit);
  return card.implement === "dumbbell" ? { implement: card.implement, target, pair: card.dumbbells === "pair" } : { implement: card.implement, target };
}

function errorOf(error: unknown, card: Card): { error: string } {
  if (error instanceof RequestError) return { error: error.message.replace(targetWithUnit(card.target, card.unit), card.target.trim()) };
  throw error;
}

export function plan(cards: Card[], { collars, uneven }: Options): Plan {
  const outcomes: Outcome[] = cards.map(() => undefined);
  const requested: number[] = [];
  cards.forEach((card, index) => {
    if (card.target.trim() === "") return;
    try {
      load(inventory, { targets: [targetOf(card)], collars, uneven });
      requested.push(index);
    } catch (error) {
      outcomes[index] = errorOf(error, card);
    }
  });
  if (requested.length === 0) return { outcomes };

  const loadAll = (indexes: number[]) => load(inventory, { targets: indexes.map((index) => targetOf(cards[index]!)), collars, uneven });
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
