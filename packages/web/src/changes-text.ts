import type { Inventory, Loading } from "@plate-pool/core";
import type { PinnedLoading } from "./current";
import { endLabel } from "./describe";

export interface ChangesText {
  count: string;
  lines: { label: string; text: string }[];
}

const mirroredLabels: Record<string, string> = { barbell: "Each side", dumbbell: "Each end" };
const positionLabels: Record<string, string> = { stack: "Stack", front: "Front", back: "Back" };

export function changesText(implement: string, loading: Loading, current: PinnedLoading, inventory: Inventory): ChangesText | undefined {
  const { changes } = loading;
  if (!changes) return undefined;
  const pair = implement === "dumbbell" && current.pair !== false;
  const nowScrews = screwsOf(
    current.screws,
    current.screwOn,
    current.positions.map(({ name }) => name),
  );
  const nextScrews = screwsOf(
    screwKindOf(loading, inventory),
    oneScrewEnd(loading),
    loading.positions.map(({ name }) => name),
  );
  const screwName = (kind: string) => `${kind} screw`;

  const perPosition = changes.positions.map(({ name, remove, add }, index) => {
    const parts: string[] = [];
    if (remove.length > 0) parts.push(`take off ${platesText(implement, remove)}`);
    if (add.length > 0) parts.push(`put on ${platesText(implement, add)}`);
    const from = nowScrews[index];
    const to = nextScrews[index];
    if (from && to && from !== to) parts.push(`swap ${screwName(from)} for ${screwName(to)}`);
    else if (from && !to) parts.push(`take off ${screwName(from)}`);
    else if (!from && to) parts.push(`put on ${screwName(to)}`);
    return { label: positionLabel(name), text: parts.length > 0 ? parts.join(" · ") : "unchanged" };
  });

  const mirrored = mirroredLabels[implement];
  const allSame = perPosition.every((line) => line.text === perPosition[0]?.text);
  const lines = mirrored && allSame && perPosition.length > 1 ? [{ label: mirrored, text: perPosition[0]!.text }] : perPosition;
  return { count: countText(changes.count, pair), lines: changes.count === 0 ? [] : lines };
}

export function countText(count: number, pair = false): string {
  if (count === 0) return "No changes";
  const total = `${count} ${count === 1 ? "change" : "changes"}`;
  return pair ? `${total}, ${count / 2} per dumbbell` : total;
}

function platesText(implement: string, plates: number[]): string {
  if (implement === "vest") return plates.length === 1 ? "1 block" : `${plates.length} blocks`;
  return plates.join(", ");
}

function positionLabel(name: string): string {
  const end = endLabel(name);
  return end !== name ? end : (positionLabels[name] ?? name);
}

function screwKindOf(loading: Loading, inventory: Inventory): string | undefined {
  for (const { id } of loading.hardware) {
    const item = inventory.hardware.find((hardware) => hardware.id === id);
    if (item?.kind === "screw") return id.replace(/^screw-/, "");
  }
  return undefined;
}

function oneScrewEnd(loading: Loading): string | undefined {
  const [screws] = loading.hardware;
  return screws && screws.count < loading.positions.length ? loading.heavier : undefined;
}

function screwsOf(kind: string | undefined, onlyOn: string | undefined, positions: string[]): (string | undefined)[] {
  if (!kind || kind === "none") return positions.map(() => undefined);
  return positions.map((name) => (onlyOn === undefined || onlyOn === name ? kind : undefined));
}
