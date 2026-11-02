import {
  type Changes,
  describeWeight,
  type Hardware,
  type Implement,
  type Inventory,
  type Leftover,
  type ListResponse,
  type ListRow,
  type Loading,
  type LoadResponse,
  type LoadResult,
  type Plate,
  type PositionChanges,
  type ReverseResult,
  type Unit,
  type Value,
} from "@plate-pool/core";

const positionLabels: Record<string, string> = {
  left: "left side",
  right: "right side",
  a: "end A",
  b: "end B",
  stack: "stack",
  front: "front",
  back: "back",
};

const kindPositions: Record<Implement["kind"], string> = {
  bar: "two sides",
  handle: "two ends",
  stack: "one stack",
  vest: "front and back",
};

export function loadText(response: LoadResponse, inventory: Inventory): string {
  const blocks = response.results.map((result) => resultText(result, inventory));
  if (response.results.length > 1) blocks.push(leftoverText(response.leftover, inventory));
  return blocks.join("\n");
}

function leftoverText(leftover: Leftover, inventory: Inventory): string {
  const plates = Object.entries(leftover.plates)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => {
      const plate = inventory.plates.find((item) => item.id === id);
      return `${count} × ${plate ? plateWeight(plate, inventory) : id}`;
    });
  const hardware = Object.entries(leftover.hardware)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => `${count} × ${hardwareName(id, inventory)}`);
  const listed = (items: string[]) => (items.length === 0 ? "none" : items.join(", "));
  return `Left over\n  plates: ${listed(plates)}\n  locking hardware: ${listed(hardware)}\n`;
}

function resultText(result: LoadResult, inventory: Inventory): string {
  const implement = implementOf(result.implement, inventory);
  const unit = implement.unit;
  const status = result.exact ? "exact" : result.refused ? "refused" : result.below || result.above ? "no exact loading" : "no loading";
  const each = result.pair ? " each" : "";
  const lines = [`${heading(implement, result.pair)}  target ${describeWeight(result.target, unit)}${each}  ${status}`, ""];

  const option = (label: string, loading: Loading, recommended: boolean) => {
    lines.push(`${recommended ? "*" : " "} ${label}  ${describeWeight(loading.total, unit)}${loading.uneven ? "  uneven" : ""}`);
    const indent = " ".repeat(label.length + 4);
    for (const line of positionLines(implement, loading, inventory)) lines.push(`${indent}${line}`);
    if (loading.changes) lines.push(`${indent}${changesLine(implement, loading.changes, result.pair === true, inventory)}`);
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
  const implement = implementOf(result.implement, inventory);
  const each = result.pair ? " each" : "";
  const lines = [
    `${heading(implement, result.pair)}  total ${describeWeight(result.total, implement.unit)}${each}${result.uneven ? "  uneven" : ""}`,
    "",
    ...positionLines(implement, result, inventory).map((line) => `  ${line}`),
  ];
  const notes = [...result.warnings, ...result.notes];
  if (result.unverified.length > 0) notes.push(`Unverified: ${unverifiedLabels(result.unverified, inventory).join(", ")}`);
  if (notes.length > 0) lines.push("", ...notes);
  return `${lines.join("\n")}\n`;
}

export function listText(response: ListResponse, inventory: Inventory, range: { from?: string; to?: string }): string {
  const implement = implementOf(response.implement, inventory);
  const unit = implement.unit;
  const { rows } = response;
  const bound = (text: string | undefined, row: ListRow | undefined) => {
    if (text === undefined) return row ? `${row.total[unit]} ${unit}` : "";
    const match = /^\s*([\d.]+)\s*(lb|kg)?\s*$/i.exec(text);
    return match ? `${Number(match[1])} ${match[2]?.toLowerCase() ?? unit}` : text;
  };
  const span = `from ${bound(range.from, rows[0])} to ${bound(range.to, rows.at(-1))}`;
  const title = heading(implement, response.pair);
  if (rows.length === 0) return `${title}  no achievable weight ${span}\n`;

  const lines = [`${title}  ${rows.length} ${rows.length === 1 ? "weight" : "weights"} ${span}`, ""];
  for (const row of rows) {
    const flags = [row.uneven ? "uneven" : "", row.smallest ? "smallest" : ""].filter((flag) => flag !== "");
    lines.push(`  ${[describeWeight(row.total, unit), ...flags].join("  ")}`);
    for (const line of positionLines(implement, row.loading, inventory)) lines.push(`      ${line}`);
  }

  const notes = [...response.warnings];
  if (response.unverified.length > 0) notes.push(`Unverified: ${unverifiedLabels(response.unverified, inventory).join(", ")}`);
  if (notes.length > 0) lines.push("", ...notes);
  return `${lines.join("\n")}\n`;
}

function implementOf(id: string, inventory: Inventory): Implement {
  return inventory.implements.find((implement) => implement.id === id)!;
}

function heading(implement: Implement, pair: boolean | undefined): string {
  if (implement.kind !== "handle") return implement.name;
  return `${implement.name} ${pair === false ? "single" : "pair"}`;
}

function hardwareName(id: string, inventory: Inventory): string {
  return inventory.hardware.find((item) => item.id === id)?.name ?? id;
}

/** What holds the plates on, per position; undefined when the implement takes no hardware. */
function hardwareText(implement: Implement, loading: Loading, inventory: Inventory): string | undefined {
  if (implement.kind === "vest" || !implement.hardware) return undefined;
  if (loading.hardware.length === 0) return "no hardware";
  return loading.hardware
    .map(({ id, count }) => {
      const pieces = Math.min(implement.hardware!.perPosition, count);
      return `${pieces > 1 ? `${pieces} × ` : ""}${hardwareName(id, inventory)}`;
    })
    .join(", ");
}

function positionLines(implement: Implement, loading: Loading, inventory: Inventory): string[] {
  const hardware = hardwareText(implement, loading, inventory);
  const withHardware = (line: string) => (hardware === undefined ? line : `${line} | ${hardware}`);
  const plates = (list: number[]) => (list.length === 0 ? "no plates" : list.join(" "));
  const [first] = loading.positions;
  const alike = !loading.uneven && loading.positions.every((position) => position.plates.join() === first?.plates.join());

  if (implement.kind === "bar" && first && alike) return [withHardware(`each side: ${plates(first.plates)}`)];
  if (implement.kind === "handle" && first && alike) return [withHardware(`each end: ${plates(first.plates)}`)];
  if (implement.kind === "stack" && first) return [withHardware(`${positionLabels.stack}: ${plates(first.plates)}`)];
  const lines = loading.positions.map((position) => {
    const heavier = position.name === loading.heavier ? " (heavier)" : "";
    return `${positionLabels[position.name] ?? position.name}: ${plates(position.plates)}${heavier}`;
  });
  if (hardware === undefined) return lines;
  const pieces = loading.hardware.reduce((sum, { count }) => sum + count, 0);
  const oneEnd = pieces > 0 && pieces < loading.positions.length * (implement.hardware?.perPosition ?? 1);
  const where = pieces === 0 ? "" : oneEnd ? ` on ${positionLabels[loading.heavier ?? ""] ?? loading.heavier} only` : " on each end";
  return [...lines, `${hardware}${where}`];
}

function changesLine(implement: Implement, changes: Changes, pair: boolean, inventory: Inventory): string {
  const work = ({ remove, add }: PositionChanges) => {
    const steps = [...(remove.length > 0 ? [`take off ${remove.join(", ")}`] : []), ...(add.length > 0 ? [`put on ${add.join(", ")}`] : [])];
    return steps.length === 0 ? "unchanged" : steps.join(" · ");
  };
  const [first] = changes.positions;
  const alike = first !== undefined && changes.positions.every((position) => work(position) === work(first));
  const each = { bar: "Each side", handle: "Each end" }[implement.kind as string];
  const sentences =
    alike && each
      ? [`${each}: ${work(first)}.`]
      : changes.positions.map((position) => `${capitalised(positionLabels[position.name] ?? position.name)}: ${work(position)}.`);
  const hardware = changes.hardware.map(({ from, to, count }) => {
    const name = (id: string) => hardwareName(id, inventory);
    const where = pair ? ` on each ${implement.name.toLowerCase()}` : "";
    if (from && to) return `Swap ${count} × ${name(from)} for ${name(to)}${where}.`;
    return to ? `Add ${count} × ${name(to)}${where}.` : `Remove ${count} × ${name(from!)}${where}.`;
  });
  return [`${changes.count} ${changes.count === 1 ? "change" : "changes"}.`, ...sentences, ...hardware].join(" ");
}

function capitalised(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function unverifiedLabels(keys: string[], inventory: Inventory): string[] {
  const label = (key: string) => {
    const dot = key.lastIndexOf(".");
    const [id, field] = [key.slice(0, dot), key.slice(dot + 1)];
    const implement = inventory.implements.find((item) => item.id === id);
    if (implement && field === "base") return `${implement.name.toLowerCase()} base weight`;
    if (implement && field === "positionLength") return `${implement.name.toLowerCase()} position length`;
    const hardware = inventory.hardware.find((item) => item.id === id);
    if (hardware && field === "minStack") return `shortest stack on a ${hardware.name.toLowerCase()}`;
    if (hardware) return `${hardware.name.toLowerCase()} weight`;
    const plate = inventory.plates.find((item) => item.id === id);
    if (plate && field === "count") return `${plateName(plate, inventory)} plate count`;
    return plate ? `${plateName(plate, inventory)} plate weight` : key;
  };
  return [...new Set(keys.map(label))];
}

export function inventoryText(inventory: Inventory): string {
  const plateRows = inventory.plates.map((plate) => {
    const type = inventory.plateTypes.find((each) => each.id === plate.type);
    const detail = [
      ...(plate.name ? [plate.name] : []),
      ...(type ? [type.name, `${type.bore} bore`] : [plate.type]),
      ...marks(plate.weight),
      ...(plate.countStatus === "unverified" ? ["count unverified"] : []),
    ];
    return [`${plate.count} × ${plateWeight(plate, inventory)}`, detail.join(", ")] as const;
  });
  const width = Math.max(0, ...plateRows.map(([amount]) => amount.length));
  const length = (value: number) => `${value} ${inventory.lengthUnit}`;

  const lines = [
    inventory.name,
    `Lengths in ${inventory.lengthUnit}`,
    "",
    "Plates",
    ...plateRows.map(([amount, detail]) => `  ${amount.padEnd(width)}  ${detail}`),
    "",
    "Locking hardware",
    ...inventory.hardware.map((item) => `  ${item.count} × ${item.name}  ${hardwareDetail(item, length).join(", ")}`),
    "",
    "Implements",
    ...inventory.implements.map((implement) => `  ${implement.id}  ${implement.name} × ${implement.count}: ${implementDetail(implement, length).join(", ")}`),
  ];
  return `${lines.join("\n")}\n`;
}

function hardwareDetail(item: Hardware, length: (value: number) => string): string[] {
  return [
    item.kind,
    `${valueOf(item.weight)} ${item.unit} each`,
    ...marks(item.weight, "weight "),
    ...(item.capacity === undefined ? [] : [`capacity ${length(item.capacity)}`]),
    ...(item.minStack === undefined ? [] : [`shortest stack ${length(valueOf(item.minStack))}${item.minStack.status === "unverified" ? " unverified" : ""}`]),
    ...(item.width === undefined ? [] : [`width ${length(item.width)}`]),
  ];
}

function implementDetail(implement: Implement, length: (value: number) => string): string[] {
  const { unit } = implement;
  const hardware = implement.kind === "vest" ? undefined : implement.hardware;
  return [
    implement.kind,
    kindPositions[implement.kind],
    [`base ${valueOf(implement.base)} ${unit}`, ...marks(implement.base)].join(" "),
    ...(implement.baseIncludesHardware ? ["base includes hardware"] : []),
    ...(hardware ? [`hardware ${hardware.options.join(", ").replace(/, ([^,]*)$/, " or $1")}`] : []),
    ...(implement.positionLength ? [`position length ${length(valueOf(implement.positionLength))}`] : []),
    ...(implement.unevenAllowance === undefined
      ? []
      : [
          `ends differ by at most ${implement.unevenAllowance} ${unit}${
            implement.unevenAllowanceRelaxed === undefined ? "" : ` (${implement.unevenAllowanceRelaxed} ${unit} relaxed)`
          }`,
        ]),
    ...(implement.maxPlateDiameter === undefined ? [] : [`plates at most ${length(implement.maxPlateDiameter)} across`]),
    ...(implement.maxPlateWeight === undefined ? [] : [`plates at most ${implement.maxPlateWeight} ${unit}`]),
    ...(implement.maxTotal === undefined ? [] : [`at most ${implement.maxTotal} ${unit} in all`]),
    ...Object.entries(implement.maxPerPosition ?? {}).map(([plate, count]) => `at most ${count} × ${plate} per position`),
  ];
}

function plateName(plate: Plate, inventory: Inventory): string {
  return plate.name ? plate.name.toLowerCase() : plateWeight(plate, inventory);
}

function plateWeight(plate: Plate, inventory: Inventory): string {
  const unit: Unit = inventory.plateTypes.find((type) => type.id === plate.type)?.unit ?? "lb";
  return `${valueOf(plate.weight)} ${unit}`;
}

function valueOf(value: Value): number {
  return value.measured ?? value.listed;
}

function marks(value: Value, prefix = ""): string[] {
  if (value.measured !== undefined) return ["measured"];
  return value.status === "unverified" ? [`${prefix}unverified`] : [];
}
