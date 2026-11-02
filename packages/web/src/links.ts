import type { Inventory, Unit } from "@plate-pool/core";
import { canBeUneven, canPair, hardwareOptions, implementOf, kindOf, unitOf } from "./kit";
import { newCard, type Card } from "./plan";
import { hardwareChoice, type Settings } from "./settings";

export type View = "load" | "list" | "reverse";

const views: readonly string[] = ["load", "list", "reverse"];
const unevenValues: Record<string, boolean> = { "0": false, "1": true };

export interface Link {
  cards: Card[];
  settings: Partial<Settings>;
  view: View;
}

function cardFrom(inventory: Inventory, parameter: string, value: string): Card | undefined {
  const [id = "", suffix, ...rest] = parameter.split(".");
  if (rest.length > 0 || !implementOf(inventory, id)) return undefined;
  if (suffix !== undefined && (kindOf(inventory, id) !== "handle" || (suffix !== "single" && suffix !== "pair"))) return undefined;
  const pair = suffix === undefined ? canPair(inventory, id) : suffix === "pair";
  const card = newCard(inventory, id, pair);
  const withUnit = /^(.*?\d)\s*(lb|kg)$/i.exec(value.trim());
  if (withUnit) return { ...card, target: withUnit[1]!, unit: withUnit[2]!.toLowerCase() as Unit };
  return { ...card, target: value.trim(), unit: unitOf(inventory, id) };
}

export function readLink(inventory: Inventory, search: string): Link {
  const cards: Card[] = [];
  const hardware: Record<string, string> = {};
  const settings: Partial<Settings> = {};
  let view: View = "load";
  for (const [parameter, value] of new URLSearchParams(search)) {
    const card = cardFrom(inventory, parameter, value);
    if (card) cards.push(card);
    const hardwareFor = /^(.+)\.hardware$/.exec(parameter)?.[1];
    if (hardwareFor && hardwareOptions(inventory, hardwareFor).includes(value)) hardware[hardwareFor] = value;
    if (parameter === "view" && views.includes(value)) view = value as View;
    if (parameter === "uneven" && Object.hasOwn(unevenValues, value)) settings.uneven = unevenValues[value]!;
  }
  if (Object.keys(hardware).length > 0) settings.hardware = hardware;
  return { cards, settings, view };
}

function parameterOf(inventory: Inventory, card: Card): string {
  return canPair(inventory, card.implement) && !card.pair ? `${card.implement}.single` : card.implement;
}

function valueOf(card: Card): string {
  const target = card.target.trim();
  if (target === "" || /[a-z]/i.test(target)) return target;
  return `${target}${card.unit}`;
}

export function linkQuery(inventory: Inventory, { cards, settings, view }: { cards: Card[]; settings: Settings; view: View }): string {
  const parameters: [string, string][] = cards.map((card) => [parameterOf(inventory, card), valueOf(card)]);
  for (const implement of new Set(cards.map((card) => card.implement))) {
    const choice = hardwareChoice(inventory, settings, implement);
    if (choice !== undefined) parameters.push([`${implement}.hardware`, choice]);
  }
  if (cards.some((card) => canBeUneven(inventory, card.implement))) parameters.push(["uneven", settings.uneven ? "1" : "0"]);
  if (view !== "load") parameters.push(["view", view]);
  return parameters.map(([name, value]) => (value === "" ? name : `${name}=${encodeURIComponent(value)}`)).join("&");
}
