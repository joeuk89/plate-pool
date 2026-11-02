import type { Hardware, HardwareKind, Implement, ImplementKind, Inventory, Plate, Unit, Value } from "@plate-pool/core";
import { createContext, useContext } from "react";

export const KitContext = createContext<Inventory | undefined>(undefined);

export function useKit(): Inventory {
  const inventory = useContext(KitContext);
  if (!inventory) throw new Error("No kit: render inside a KitContext provider.");
  return inventory;
}

export const NONE = "none";

const positionsByKind: Record<ImplementKind, string[]> = {
  bar: ["left", "right"],
  handle: ["a", "b"],
  stack: ["stack"],
  vest: ["front", "back"],
};

export function implementOf(inventory: Inventory, id: string): Implement | undefined {
  return inventory.implements.find((item) => item.id === id);
}

export function kindOf(inventory: Inventory, id: string): ImplementKind | undefined {
  return implementOf(inventory, id)?.kind;
}

export function unitOf(inventory: Inventory, id: string): Unit {
  return implementOf(inventory, id)?.unit ?? "lb";
}

export function positionNames(inventory: Inventory, id: string): string[] {
  const kind = kindOf(inventory, id);
  return kind ? positionsByKind[kind] : [];
}

export function canPair(inventory: Inventory, id: string): boolean {
  const implement = implementOf(inventory, id);
  return implement?.kind === "handle" && implement.count >= 2;
}

export function canBeUneven(inventory: Inventory, id: string): boolean {
  const implement = implementOf(inventory, id);
  return implement?.kind === "handle" && (implement.unevenAllowance ?? 0) > 0;
}

export function hardwareOf(inventory: Inventory, id: string | undefined): Hardware | undefined {
  return inventory.hardware.find((item) => item.id === id);
}

export function hardwareOptions(inventory: Inventory, id: string): string[] {
  const implement = implementOf(inventory, id);
  return implement?.kind === "vest" ? [] : (implement?.hardware?.options ?? []);
}

export function hasHardwareChoice(inventory: Inventory, id: string): boolean {
  return hardwareOptions(inventory, id).length > 1;
}

/** Screws and pins count as changes; collars never do. */
export function isCounted(hardware: Hardware | undefined): boolean {
  return hardware?.kind === "screw" || hardware?.kind === "pin";
}

const kindNouns: Record<HardwareKind, [string, string]> = {
  collar: ["Collar", "Collars"],
  screw: ["Screw", "Screws"],
  pin: ["Pin", "Pins"],
};

/** What the implement's hardware is called: "Collars" or "Screw", or "Hardware" when its options mix kinds. */
export function hardwareNoun(inventory: Inventory, id: string, plural = true): string {
  const kinds = new Set(hardwareOptions(inventory, id).flatMap((option) => hardwareOf(inventory, option)?.kind ?? []));
  const [kind] = kinds;
  if (kinds.size !== 1 || !kind) return "Hardware";
  return kindNouns[kind][plural ? 1 : 0];
}

/** "Collars", "Screws per dumbbell" on a pair, "Screw" on a stack that takes one. */
export function hardwareTerm(inventory: Inventory, id: string, pair: boolean): string {
  const pieces = (implementOf(inventory, id)?.hardware?.perPosition ?? 1) * positionNames(inventory, id).length;
  const noun = hardwareNoun(inventory, id, pieces > 1);
  return pair ? `${noun} per ${lower(implementOf(inventory, id)?.name ?? id)}` : noun;
}

export function used(value: Value): number {
  return value.measured ?? value.listed;
}

export function plateUnit(inventory: Inventory, plate: Plate): Unit {
  return inventory.plateTypes.find((type) => type.id === plate.type)?.unit ?? "lb";
}

/** The plates the implement accepts, heaviest first. */
export function acceptedPlates(inventory: Inventory, id: string): Plate[] {
  const accepts = implementOf(inventory, id)?.accepts ?? [];
  return inventory.plates.filter((plate) => accepts.includes(plate.type)).sort((a, b) => used(b.weight) - used(a.weight));
}

export function plateById(inventory: Inventory, id: string | undefined): Plate | undefined {
  return inventory.plates.find((plate) => plate.id === id);
}

export function lower(name: string): string {
  return name.toLowerCase();
}
