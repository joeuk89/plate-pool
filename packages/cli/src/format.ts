import type { Display, Inventory, Loading, LoadResponse, LoadResult, Unit, Value } from "@plate-pool/core";

const implementLabels: Record<string, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  kettlebell: "Kettlebell",
  leg: "Leg attachment",
  vest: "Vest",
};

const hardwareLabels: Record<string, string> = {
  "collar-clamp": "clamp collar",
  "collar-spinlock": "spin-lock collar",
};

export function loadText(response: LoadResponse, inventory: Inventory): string {
  return response.results.map((result) => resultText(result, inventory)).join("\n");
}

function resultText(result: LoadResult, inventory: Inventory): string {
  const unit = inventory.implements.find((implement) => implement.id === result.implement)?.unit ?? "lb";
  const status = result.exact ? "exact" : result.refused ? "refused" : result.below || result.above ? "no exact loading" : "no loading";
  const lines = [`${implementLabels[result.implement] ?? result.implement}  target ${weight(result.target, unit)}  ${status}`, ""];

  const option = (label: string, loading: Loading, recommended: boolean) => {
    lines.push(`${recommended ? "*" : " "} ${label}  ${weight(loading.total, unit)}`);
    const indent = " ".repeat(label.length + 4);
    for (const line of positionLines(result.implement, loading)) lines.push(`${indent}${line}`);
  };
  if (result.loading) option("exact", result.loading, false);
  if (result.below) option("below", result.below, result.recommended === "below");
  if (result.above) option("above", result.above, result.recommended === "above");

  const notes = [...result.warnings];
  if (result.unverified.length > 0) notes.push(`Unverified: ${unverifiedLabels(result.unverified, inventory).join(", ")}`);
  if (notes.length > 0) {
    if (lines.at(-1) !== "") lines.push("");
    lines.push(...notes);
  }
  return `${lines.join("\n")}\n`;
}

function positionLines(implement: string, loading: Loading): string[] {
  const hardware =
    loading.hardware.length === 0
      ? "no collars"
      : loading.hardware.map((item) => hardwareLabels[item.id] ?? item.id).join(", ");
  const [first] = loading.positions;
  const plates = (list: number[]) => (list.length === 0 ? "no plates" : list.join(" "));
  if (implement === "barbell" && first) return [`each side: ${plates(first.plates)} | ${hardware}`];
  return [...loading.positions.map((position) => `${position.name}: ${plates(position.plates)}`), hardware];
}

function unverifiedLabels(keys: string[], inventory: Inventory): string[] {
  const label = (key: string) => {
    const [id, field] = [key.slice(0, key.lastIndexOf(".")), key.slice(key.lastIndexOf(".") + 1)];
    if (field === "base") return id === "barbell" ? "bar weight" : `${(implementLabels[id] ?? id).toLowerCase()} weight`;
    const hardware = inventory.hardware.find((item) => item.id === id);
    if (hardware?.kind === "collar") return "collar weight";
    if (hardware) return `${hardware.name.toLowerCase()} weight`;
    const plate = inventory.plates.find((item) => item.id === id);
    return plate ? `${plate.name} plate weight` : key;
  };
  return [...new Set(keys.map(label))];
}

function weight(value: Display, unit: Unit): string {
  const other: Unit = unit === "lb" ? "kg" : "lb";
  return `${value[unit]} ${unit} (${value[other]} ${other})`;
}

export function inventoryText(inventory: Inventory): string {
  const unitOf = (type: string) => inventory.plateTypes.find((plateType) => plateType.id === type)?.unit ?? "lb";
  const rows: [string, string[][]][] = [
    [
      "Plates",
      inventory.plates.map((plate) => [
        plate.name,
        `× ${plate.count}`,
        [`${amount(plate.weight, unitOf(plate.type))} each`, ...marks(plate.weight), ...(plate.countStatus === "unverified" ? ["count unverified"] : [])].join(", "),
      ]),
    ],
    [
      "Locking hardware",
      inventory.hardware.map((item) => [
        item.name,
        `× ${item.count}`,
        [`${amount(item.weight, item.unit)} each`, ...marks(item.weight, "weight ")].join(", "),
      ]),
    ],
    [
      "Implements",
      inventory.implements.map((implement) => [
        implement.name,
        `× ${implement.count}`,
        [`base ${amount(implement.base, implement.unit)}`, ...marks(implement.base)].join(", "),
      ]),
    ],
  ];

  const nameWidth = Math.max(...rows.flatMap(([, list]) => list.map(([name]) => name!.length)));
  const countWidth = Math.max(...rows.flatMap(([, list]) => list.map(([, count]) => count!.length)));
  return rows
    .map(
      ([heading, list]) =>
        `${heading}\n${list.map(([name, count, detail]) => `  ${name!.padEnd(nameWidth)}  ${count!.padEnd(countWidth)}  ${detail}\n`).join("")}`,
    )
    .join("\n");
}

function amount(value: Value, unit: Unit): string {
  return `${value.measured ?? value.listed} ${unit}`;
}

function marks(value: Value, prefix = ""): string[] {
  if (value.measured !== undefined) return ["measured"];
  return value.status === "unverified" ? [`${prefix}unverified`] : [];
}
