import {
  describeWeight,
  type Inventory,
  type ListResponse,
  type ListRow,
  type Loading,
  type LoadResponse,
  type LoadResult,
  type ReverseResult,
  type Unit,
  type Value,
} from "@plate-pool/core";

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
  "screw-standard": "standard screw",
  "screw-long": "long screw",
};

const positionLabels: Record<string, string> = {
  left: "left side",
  right: "right side",
  "end-a": "end A",
  "end-b": "end B",
};

export function loadText(response: LoadResponse, inventory: Inventory): string {
  return response.results.map((result) => resultText(result, inventory)).join("\n");
}

function resultText(result: LoadResult, inventory: Inventory): string {
  const unit = unitOf(result.implement, inventory);
  const status = result.exact ? "exact" : result.refused ? "refused" : result.below || result.above ? "no exact loading" : "no loading";
  const each = result.pair ? " each" : "";
  const lines = [`${resultLabel(result)}  target ${describeWeight(result.target, unit)}${each}  ${status}`, ""];

  const option = (label: string, loading: Loading, recommended: boolean) => {
    lines.push(`${recommended ? "*" : " "} ${label}  ${describeWeight(loading.total, unit)}${loading.uneven ? "  uneven" : ""}`);
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

export function reverseText(result: ReverseResult, inventory: Inventory): string {
  const unit = unitOf(result.implement, inventory);
  const each = result.pair ? " each" : "";
  const lines = [
    `${resultLabel(result)}  total ${describeWeight(result.total, unit)}${each}${result.uneven ? "  uneven" : ""}`,
    "",
    ...positionLines(result.implement, result).map((line) => `  ${line}`),
  ];
  const notes = [...result.warnings, ...result.notes];
  if (result.unverified.length > 0) notes.push(`Unverified: ${unverifiedLabels(result.unverified, inventory).join(", ")}`);
  if (notes.length > 0) lines.push("", ...notes);
  return `${lines.join("\n")}\n`;
}

function unitOf(implementId: string, inventory: Inventory): Unit {
  return inventory.implements.find((implement) => implement.id === implementId)?.unit ?? "lb";
}

function resultLabel(result: { implement: string; pair?: boolean }): string {
  if (result.implement === "dumbbell") return result.pair === false ? "One dumbbell" : "Dumbbells (pair)";
  return implementLabels[result.implement] ?? result.implement;
}

export function listText(response: ListResponse, inventory: Inventory, range: { from?: string; to?: string }): string {
  const unit = inventory.implements.find((implement) => implement.id === response.implement)?.unit ?? "lb";
  const { rows } = response;
  const bound = (text: string | undefined, row: ListRow | undefined) => {
    if (text === undefined) return row ? `${row.total[unit]} ${unit}` : "";
    const match = /^\s*([\d.]+)\s*(lb|kg)?\s*$/i.exec(text);
    return match ? `${Number(match[1])} ${match[2]?.toLowerCase() ?? unit}` : text;
  };
  const span = `from ${bound(range.from, rows[0])} to ${bound(range.to, rows.at(-1))}`;
  if (rows.length === 0) return `${resultLabel(response)}  no achievable weight ${span}\n`;

  const lines = [`${resultLabel(response)}  ${rows.length} ${rows.length === 1 ? "weight" : "weights"} ${span}`, ""];
  for (const row of rows) {
    const flags = [row.uneven ? "uneven" : "", row.micro ? "micro" : ""].filter((flag) => flag !== "");
    lines.push(`  ${[describeWeight(row.total, unit), ...flags].join("  ")}`);
    for (const line of positionLines(response.implement, row.loading)) lines.push(`      ${line}`);
  }

  const notes = [...response.warnings];
  if (response.unverified.length > 0) notes.push(`Unverified: ${unverifiedLabels(response.unverified, inventory).join(", ")}`);
  if (notes.length > 0) lines.push("", ...notes);
  return `${lines.join("\n")}\n`;
}

function positionLines(implement: string, loading: Loading): string[] {
  const hardware =
    loading.hardware.length === 0
      ? implement === "dumbbell"
        ? "no screws"
        : "no collars"
      : loading.hardware.map((item) => `${hardwareLabels[item.id] ?? item.id}${implement === "dumbbell" ? "s" : ""}`).join(", ");
  const [first] = loading.positions;
  const plates = (list: number[]) => (list.length === 0 ? "no plates" : list.join(" "));
  const alike = loading.positions.every((position) => position.plates.join() === first?.plates.join());
  if (implement === "barbell" && first && alike) return [`each side: ${plates(first.plates)} | ${hardware}`];
  if (implement === "vest") return loading.positions.map((position) => `${position.name}: ${blocks(position.plates.length)}`);
  if (implement === "kettlebell" && first) {
    const screw = loading.hardware.length === 0 ? "no screw" : hardware;
    return [`${first.name}: ${plates(first.plates)} | ${screw}`];
  }
  if (implement === "leg" && first) return [`${first.name}: ${plates(first.plates)}`];
  if (implement === "dumbbell" && first && alike) return [`each end: ${plates(first.plates)} | ${hardware}`];
  return [
    ...loading.positions.map((position) => {
      const heavier = position.name === loading.heavier ? " (heavier)" : "";
      return `${positionLabels[position.name] ?? position.name}: ${plates(position.plates)}${heavier}`;
    }),
    hardware,
  ];
}

function blocks(count: number): string {
  if (count === 0) return "no blocks";
  return count === 1 ? "1 block" : `${count} blocks`;
}

function unverifiedLabels(keys: string[], inventory: Inventory): string[] {
  const label = (key: string) => {
    const [id, field] = [key.slice(0, key.lastIndexOf(".")), key.slice(key.lastIndexOf(".") + 1)];
    if (field === "base") {
      if (id === "barbell") return "bar weight";
      return id === "vest" ? "empty vest weight" : `${(implementLabels[id] ?? id).toLowerCase()} weight`;
    }
    const hardware = inventory.hardware.find((item) => item.id === id);
    if (hardware && field === "minStackIn") return `shortest stack on a ${hardware.name.toLowerCase()}`;
    if (hardware?.kind === "collar") return "collar weight";
    if (hardware) return `${hardware.name.toLowerCase()} weight`;
    const plate = inventory.plates.find((item) => item.id === id);
    if (plate && field === "count") return `${plate.name.toLowerCase()} count`;
    return plate ? `${plate.name} plate weight` : key;
  };
  return [...new Set(keys.map(label))];
}

export function inventoryText(inventory: Inventory): string {
  const unitOf = (type: string) => inventory.plateTypes.find((plateType) => plateType.id === type)?.unit ?? "lb";
  const rows: [heading: string, items: [name: string, count: string, detail: string][]][] = [
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

  const nameWidth = Math.max(...rows.flatMap(([, list]) => list.map(([name]) => name.length)));
  const countWidth = Math.max(...rows.flatMap(([, list]) => list.map(([, count]) => count.length)));
  return rows
    .map(
      ([heading, list]) =>
        `${heading}\n${list.map(([name, count, detail]) => `  ${name.padEnd(nameWidth)}  ${count.padEnd(countWidth)}  ${detail}\n`).join("")}`,
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
