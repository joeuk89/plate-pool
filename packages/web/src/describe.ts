import type { Inventory, Loading } from "@plate-pool/core";

export function plateList(plates: number[]): string {
  if (plates.length === 0) return "No plates";
  const groups: { weight: number; count: number }[] = [];
  for (const weight of plates) {
    const last = groups.at(-1);
    if (last?.weight === weight) last.count++;
    else groups.push({ weight, count: 1 });
  }
  return groups.map(({ weight, count }) => `${count}\u00a0×\u00a0${weight}`).join(", ");
}

export function blockList(plates: number[]): string {
  if (plates.length === 0) return "No blocks";
  return plates.length === 1 ? "1 block" : `${plates.length} blocks`;
}

const endLetters: Record<string, string> = {
  "end-a": "A",
  "end-b": "B",
};

export function endLabel(position: string): string {
  const letter = endLetters[position];
  return letter ? `End ${letter}` : position;
}

export function unevenNote(label: string, loading: Loading): string {
  const heavier = loading.positions.find((position) => position.name === loading.heavier);
  const lighter = loading.positions.find((position) => position.name !== loading.heavier);
  const weight = (plates: number[] = []) => plates.reduce((sum, plate) => sum + plate, 0);
  const difference = Math.round((weight(heavier?.plates) - weight(lighter?.plates)) * 1000) / 1000;
  const inSentence = (name = "") => endLabel(name).replace(/^End /, "end ");
  return `${label}: ${inSentence(heavier?.name)} is ${difference} lb heavier than ${inSentence(lighter?.name)}.`;
}

export function hardwareList(loading: Loading, inventory: Inventory): string {
  if (loading.hardware.length === 0) return "None";
  return loading.hardware
    .map(({ id, count }) => `${count}\u00a0×\u00a0${inventory.hardware.find((item) => item.id === id)?.name ?? id}`)
    .join(", ");
}

export function unverifiedList(keys: string[], inventory: Inventory): string {
  const label = (key: string) => {
    const id = key.slice(0, key.lastIndexOf("."));
    const field = key.slice(key.lastIndexOf(".") + 1);
    if (field === "base") {
      if (id === "barbell") return "bar weight";
      return id === "vest" ? "empty vest weight" : `${inventory.implements.find((item) => item.id === id)?.name.toLowerCase() ?? id} weight`;
    }
    const hardware = inventory.hardware.find((item) => item.id === id);
    if (hardware && field === "minStackIn") return `shortest stack on a ${hardware.name.toLowerCase()}`;
    if (hardware) return hardware.kind === "collar" ? "collar weight" : `${hardware.name.toLowerCase()} weight`;
    const plate = inventory.plates.find((item) => item.id === id);
    if (plate && field === "count") return `${plate.name.toLowerCase()} count`;
    return plate ? `${plate.name} plate weight` : key;
  };
  return [...new Set(keys.map(label))].join(", ");
}
