import { reverse, type CollarChoice, type CurrentLoading, type Loading, type ReverseResult, type ScrewChoice } from "@plate-pool/core";
import { useState } from "react";
import { blockList, plateList } from "./describe";
import { inventory } from "./inventory";

export interface PinnedLoading extends CurrentLoading {
  /** Dumbbells only: whether the loading is on a pair or on one dumbbell. */
  pair?: boolean;
}

export type CurrentLoadings = Partial<Record<string, PinnedLoading>>;

const storageKey = "plate-pool:current";
const screwKinds: Record<string, ScrewChoice> = { "screw-standard": "standard", "screw-long": "long" };

export function pinnedFrom(implement: string, loading: Pick<Loading, "positions" | "hardware" | "heavier">, pair: boolean): PinnedLoading {
  const positions = loading.positions.map(({ name, plates }) => ({ name, plates: [...plates] }));
  if (implement !== "dumbbell" && implement !== "kettlebell") return { positions };
  const screw = loading.hardware.find(({ id }) => screwKinds[id]);
  const oneScrew = implement === "dumbbell" && screw?.count === 1 && loading.heavier !== undefined;
  return {
    positions,
    screws: screw ? screwKinds[screw.id]! : "none",
    ...(oneScrew ? { screwOn: loading.heavier! } : {}),
    ...(implement === "dumbbell" ? { pair } : {}),
  };
}

export function currentLoading({ pair: _, ...current }: PinnedLoading): CurrentLoading {
  return current;
}

export function reverseOf(implement: string, pinned: PinnedLoading, collars: CollarChoice): ReverseResult {
  return reverse(inventory, {
    implement,
    ...currentLoading(pinned),
    ...(implement === "barbell" ? { collars } : {}),
    ...(implement === "dumbbell" ? { pair: pinned.pair !== false } : {}),
  });
}

const stripPlaces: Record<string, string> = {
  barbell: "On the bar",
  kettlebell: "On the kettlebell",
  leg: "On the attachment",
  vest: "In the vest",
};

export function stripPlace(implement: string, pinned: PinnedLoading): string {
  if (implement === "dumbbell") return pinned.pair === false ? "On the dumbbell" : "On the dumbbells";
  return stripPlaces[implement] ?? `On the ${implement}`;
}

export function stripPlates(implement: string, positions: PinnedLoading["positions"]): string {
  const [first, second] = positions;
  const plates = (position = first) => plateList(position?.plates ?? []);
  switch (implement) {
    case "vest":
      return `front ${blockList(first?.plates ?? [])}, back ${blockList(second?.plates ?? [])}`.toLowerCase();
    case "kettlebell":
    case "leg":
      return `stack ${plates()}`;
    case "barbell":
      return `each side ${plates()}`;
    default:
      return first && second && first.plates.join() === second.plates.join()
        ? `each end ${plates()}`
        : `end A ${plates(first)}, end B ${plates(second)}`;
  }
}

function isPinned(implement: string, value: unknown): value is PinnedLoading {
  if (typeof value !== "object" || value === null) return false;
  const { positions } = value as { positions?: unknown };
  const names = inventory.implements.find((item) => item.id === implement)?.positions;
  if (!names || !Array.isArray(positions) || positions.length !== names.length) return false;
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
    reverseOf(implement, value as PinnedLoading, "clamp");
    return true;
  } catch {
    return false;
  }
}

function readCurrent(): CurrentLoadings {
  let stored: unknown;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
  } catch {
    return {};
  }
  if (typeof stored !== "object" || stored === null) return {};
  return Object.fromEntries(Object.entries(stored).filter(([implement, value]) => isPinned(implement, value)));
}

function writeCurrent(current: CurrentLoadings): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(current));
  } catch {
    // Storage is blocked or full: the current loading lasts until the page closes.
  }
}

export function useCurrentLoadings(): [CurrentLoadings, (implement: string, pinned: PinnedLoading | undefined) => void] {
  const [current, setCurrent] = useState(readCurrent);
  const update = (implement: string, pinned: PinnedLoading | undefined) => {
    const { [implement]: _, ...rest } = current;
    const next = pinned ? { ...rest, [implement]: pinned } : rest;
    writeCurrent(next);
    setCurrent(next);
  };
  return [current, update];
}
