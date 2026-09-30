import type { CollarChoice, Unit } from "@plate-pool/core";
import { newCard, unitOf, type Card, type DumbbellChoice } from "./plan";
import type { Settings } from "./settings";

const implementParameters: Record<string, { implement: string; dumbbells: DumbbellChoice }> = {
  barbell: { implement: "barbell", dumbbells: "pair" },
  dumbbells: { implement: "dumbbell", dumbbells: "pair" },
  dumbbell: { implement: "dumbbell", dumbbells: "one" },
  kettlebell: { implement: "kettlebell", dumbbells: "pair" },
  leg: { implement: "leg", dumbbells: "pair" },
  vest: { implement: "vest", dumbbells: "pair" },
};

export type View = "load" | "list" | "reverse";

const views: readonly string[] = ["load", "list", "reverse"];
const collarChoices: readonly string[] = ["clamp", "spinlock", "none"];
const unevenValues: Record<string, boolean> = { "0": false, "1": true };

export interface Link {
  cards: Card[];
  settings: Partial<Settings>;
  view: View;
}

function cardFrom(parameter: string, value: string): Card | undefined {
  const named = implementParameters[parameter];
  if (!named) return undefined;
  const card = newCard(named.implement, named.dumbbells);
  const withUnit = /^(.*?\d)\s*(lb|kg)$/i.exec(value.trim());
  if (withUnit) return { ...card, target: withUnit[1]!, unit: withUnit[2]!.toLowerCase() as Unit };
  return { ...card, target: value.trim(), unit: unitOf(named.implement) };
}

export function readLink(search: string): Link {
  const cards: Card[] = [];
  const settings: Partial<Settings> = {};
  let view: View = "load";
  for (const [parameter, value] of new URLSearchParams(search)) {
    const card = cardFrom(parameter, value);
    if (card) cards.push(card);
    if (parameter === "collars" && collarChoices.includes(value)) settings.collars = value as CollarChoice;
    if (parameter === "view" && views.includes(value)) view = value as View;
    if (parameter === "uneven" && Object.hasOwn(unevenValues, value)) settings.uneven = unevenValues[value]!;
  }
  return { cards, settings, view };
}

function parameterOf(card: Card): string {
  if (card.implement === "dumbbell") return card.dumbbells === "pair" ? "dumbbells" : "dumbbell";
  return card.implement;
}

function valueOf(card: Card): string {
  const target = card.target.trim();
  if (target === "" || /[a-z]/i.test(target) || card.unit === unitOf(card.implement)) return target;
  return `${target}${card.unit}`;
}

export function linkQuery({ cards, settings, view }: { cards: Card[]; settings: Settings; view: View }): string {
  const parameters: [string, string][] = cards.map((card) => [parameterOf(card), valueOf(card)]);
  if (cards.some((card) => card.implement === "barbell")) parameters.push(["collars", settings.collars]);
  if (cards.some((card) => card.implement === "dumbbell")) parameters.push(["uneven", settings.uneven ? "1" : "0"]);
  if (view !== "load") parameters.push(["view", view]);
  return parameters.map(([name, value]) => (value === "" ? name : `${name}=${encodeURIComponent(value)}`)).join("&");
}
