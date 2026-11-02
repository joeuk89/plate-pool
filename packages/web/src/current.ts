import { reverse, type CurrentLoading, type Inventory, type Loading, type ReverseResult } from "@plate-pool/core";
import { useState } from "react";
import { plateList, vestList } from "./describe";
import { canPair, hardwareOf, implementOf, isCounted, kindOf, positionNames } from "./kit";

export interface PinnedLoading extends CurrentLoading {
  /** Handles the gym has two or more of: whether the loading is on a pair or on a single. */
  pair?: boolean;
}

export type CurrentLoadings = Partial<Record<string, PinnedLoading>>;

const storageKey = "plate-pool:current";

/** A current loading keeps the screws and pins it was pinned with, since swapping them counts as changes; collars follow the hardware choice. */
export function pinnedFrom(
  inventory: Inventory,
  implement: string,
  loading: Pick<Loading, "positions" | "hardware" | "heavier">,
  pair: boolean,
): PinnedLoading {
  const positions = loading.positions.map(({ name, plates }) => ({ name, plates: [...plates] }));
  const pairing = canPair(inventory, implement) ? { pair } : {};
  const options = implementOf(inventory, implement)?.hardware?.options ?? [];
  if (kindOf(inventory, implement) === "vest" || !options.some((id) => isCounted(hardwareOf(inventory, id)))) {
    return { positions, ...pairing };
  }
  const counted = loading.hardware.find(({ id }) => isCounted(hardwareOf(inventory, id)));
  const oneEnd = kindOf(inventory, implement) === "handle" && counted !== undefined && counted.count === 1 && loading.heavier !== undefined;
  return {
    positions,
    hardware: counted?.id ?? "none",
    ...(oneEnd ? { hardwareOn: loading.heavier! } : {}),
    ...pairing,
  };
}

export function currentLoading({ pair: _, ...current }: PinnedLoading): CurrentLoading {
  return current;
}

export function reverseOf(inventory: Inventory, implement: string, pinned: PinnedLoading, hardware: Record<string, string>): ReverseResult {
  const choice = hardware[implement];
  return reverse(inventory, {
    implement,
    ...(choice !== undefined ? { hardware: choice } : {}),
    ...currentLoading(pinned),
    ...(canPair(inventory, implement) ? { pair: pinned.pair !== false } : {}),
  });
}

export function stripPlates(inventory: Inventory, implement: string, positions: PinnedLoading["positions"]): string {
  const [first, second] = positions;
  const plates = (position = first) => plateList(position?.plates ?? []);
  switch (kindOf(inventory, implement)) {
    case "vest": {
      const list = (position = first) => vestList(inventory, implement, position?.plates ?? []);
      return `front ${list(first)}, back ${list(second)}`.replace(/No (blocks|plates)/g, "no $1");
    }
    case "stack":
      return `stack ${plates()}`;
    case "bar":
      return `each side ${plates()}`;
    default:
      return first && second && first.plates.join() === second.plates.join()
        ? `each end ${plates()}`
        : `end A ${plates(first)}, end B ${plates(second)}`;
  }
}

function isPinned(inventory: Inventory, implement: string, value: unknown): value is PinnedLoading {
  if (typeof value !== "object" || value === null) return false;
  const { positions } = value as { positions?: unknown };
  const names = positionNames(inventory, implement);
  if (names.length === 0 || !Array.isArray(positions) || positions.length !== names.length) return false;
  const valid = positions.every(
    (position: unknown, index) =>
      typeof position === "object" &&
      position !== null &&
      (position as { name?: unknown }).name === names[index] &&
      Array.isArray((position as { plates?: unknown }).plates) &&
      (position as { plates: unknown[] }).plates.every((plate) => typeof plate === "number"),
  );
  if (!valid) return false;
  try {
    reverseOf(inventory, implement, value as PinnedLoading, {});
    return true;
  } catch {
    return false;
  }
}

function readCurrent(inventory: Inventory): CurrentLoadings {
  let stored: unknown;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
  } catch {
    return {};
  }
  if (typeof stored !== "object" || stored === null) return {};
  return Object.fromEntries(Object.entries(stored).filter(([implement, value]) => isPinned(inventory, implement, value)));
}

function writeCurrent(current: CurrentLoadings): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(current));
  } catch {
    // Storage is blocked or full: the current loading lasts until the page closes.
  }
}

export function forgetCurrentLoadings(): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Storage is blocked: nothing was stored.
  }
}

export function useCurrentLoadings(inventory: Inventory): [CurrentLoadings, (implement: string, pinned: PinnedLoading | undefined) => void] {
  const [current, setCurrent] = useState(() => readCurrent(inventory));
  const update = (implement: string, pinned: PinnedLoading | undefined) => {
    const { [implement]: _, ...rest } = current;
    const next = pinned ? { ...rest, [implement]: pinned } : rest;
    writeCurrent(next);
    setCurrent(next);
  };
  return [current, update];
}

