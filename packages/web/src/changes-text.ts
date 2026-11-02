import type { Inventory, Loading } from "@plate-pool/core";
import type { PinnedLoading } from "./current";
import { mirroredLabel, positionLabel } from "./describe";
import { canPair, hardwareOf, isCounted, kindOf, lower } from "./kit";

export interface ChangesText {
  count: string;
  lines: { label: string; text: string }[];
}

export function changesText(implement: string, loading: Loading, current: PinnedLoading, inventory: Inventory): ChangesText | undefined {
  const { changes } = loading;
  if (!changes) return undefined;
  const pair = canPair(inventory, implement) && current.pair !== false;
  const counted = (id: string | undefined) => (isCounted(hardwareOf(inventory, id)) ? id : undefined);
  const nowPieces = piecesOf(
    counted(current.hardware),
    current.hardwareOn,
    current.positions.map(({ name }) => name),
  );
  const nextPieces = piecesOf(
    counted(loading.hardware.find(({ id }) => counted(id))?.id),
    oneEnd(loading),
    loading.positions.map(({ name }) => name),
  );
  const nameOf = (id: string) => lower(hardwareOf(inventory, id)?.name ?? id);
  const vest = kindOf(inventory, implement) === "vest";

  const perPosition = changes.positions.map(({ name, remove, add }, index) => {
    const parts: string[] = [];
    if (remove.length > 0) parts.push(`take off ${platesText(vest, remove)}`);
    if (add.length > 0) parts.push(`put on ${platesText(vest, add)}`);
    const from = nowPieces[index];
    const to = nextPieces[index];
    if (from && to && from !== to) parts.push(`swap ${nameOf(from)} for ${nameOf(to)}`);
    else if (from && !to) parts.push(`take off ${nameOf(from)}`);
    else if (!from && to) parts.push(`put on ${nameOf(to)}`);
    return { label: positionLabel(name), text: parts.length > 0 ? parts.join(" · ") : "unchanged" };
  });

  const mirrored = mirroredLabel(inventory, implement);
  const allSame = perPosition.every((line) => line.text === perPosition[0]?.text);
  const lines = mirrored && allSame && perPosition.length > 1 ? [{ label: mirrored, text: perPosition[0]!.text }] : perPosition;
  const name = pair ? lower(inventory.implements.find((item) => item.id === implement)?.name ?? implement) : undefined;
  return { count: countText(changes.count, name), lines: changes.count === 0 ? [] : lines };
}

/** With `perPair` set to the implement's name, a pair's count also reads per handle: "8 changes, 4 per dumbbell". */
export function countText(count: number, perPair?: string): string {
  if (count === 0) return "No changes";
  const total = `${count} ${count === 1 ? "change" : "changes"}`;
  return perPair ? `${total}, ${count / 2} per ${perPair}` : total;
}

function platesText(vest: boolean, plates: number[]): string {
  if (vest) return plates.length === 1 ? "1 block" : `${plates.length} blocks`;
  return plates.join(", ");
}

function oneEnd(loading: Loading): string | undefined {
  const [pieces] = loading.hardware;
  return pieces && pieces.count < loading.positions.length ? loading.heavier : undefined;
}

function piecesOf(id: string | undefined, onlyOn: string | undefined, positions: string[]): (string | undefined)[] {
  if (!id) return positions.map(() => undefined);
  return positions.map((name) => (onlyOn === undefined || onlyOn === name ? id : undefined));
}
