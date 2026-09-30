import type { Unit, Value } from "./inventory.js";
import { RequestError } from "./request-error.js";

export const KG_PER_LB = 0.45359237;

export interface Display {
  lb: number;
  kg: number;
}

export interface Quantity {
  amount: number;
  unit: Unit;
}

export function thousandths(amount: number): number {
  return Math.round(amount * 1000);
}

export function used(value: Value): number {
  return value.measured ?? value.listed;
}

export function convert(milli: number, from: Unit, to: Unit): number {
  if (from === to) return milli;
  return Math.round(from === "lb" ? milli * KG_PER_LB : milli / KG_PER_LB);
}

export function display(milli: number, unit: Unit): Display {
  const amount = milli / 1000;
  const lb = round(unit === "lb" ? amount : amount / KG_PER_LB, 2);
  const kg = round(unit === "kg" ? amount : amount * KG_PER_LB, 1);
  return unit === "kg" ? { kg, lb } : { lb, kg };
}

export function describeWeight(weight: Display, unit: Unit): string {
  const other: Unit = unit === "lb" ? "kg" : "lb";
  return `${weight[unit]} ${unit} (${weight[other]} ${other})`;
}

function round(amount: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(amount * factor) / factor;
}

const weightPattern = /^\s*(\d+(?:\.\d+)?|\.\d+)\s*(lb|kg)?\s*$/i;

export function parseWeight(text: string, defaultUnit: Unit): Quantity {
  const match = weightPattern.exec(text);
  const amount = Number(match?.[1]);
  if (!match || !(amount > 0)) {
    throw new RequestError(`"${text}" is not a weight. Use a positive number with an optional unit, such as 175, 175lb or 80kg.`);
  }
  const unit = (match[2]?.toLowerCase() as Unit | undefined) ?? defaultUnit;
  return { amount, unit };
}
