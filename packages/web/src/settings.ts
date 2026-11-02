import type { Inventory } from "@plate-pool/core";
import { useState } from "react";
import { hardwareOptions, implementOf } from "./kit";

export interface Settings {
  implement: string;
  /** A hardware choice per implement id: an id from its options, or "none". An implement with no entry uses the library's choice. */
  hardware: Record<string, string>;
  uneven: boolean;
}

const storageKey = "plate-pool:settings";

function defaultsFor(inventory: Inventory): Settings {
  return { implement: inventory.implements[0]?.id ?? "", hardware: {}, uneven: true };
}

function validHardware(inventory: Inventory, stored: unknown): Record<string, string> {
  if (typeof stored !== "object" || stored === null) return {};
  return Object.fromEntries(
    Object.entries(stored).filter(
      ([implement, choice]) => typeof choice === "string" && hardwareOptions(inventory, implement).includes(choice),
    ),
  );
}

export function readSettings(inventory: Inventory): Settings {
  const defaults = defaultsFor(inventory);
  let stored: Partial<Record<keyof Settings, unknown>>;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}") ?? {};
  } catch {
    return defaults;
  }
  const { implement, hardware, uneven } = stored;
  return {
    implement: inventory.implements.some((item) => item.id === implement) ? (implement as string) : defaults.implement,
    hardware: validHardware(inventory, hardware),
    uneven: typeof uneven === "boolean" ? uneven : defaults.uneven,
  };
}

function writeSettings(settings: Partial<Settings>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Storage is blocked or full: the app carries on with the settings it holds in memory.
  }
}

/** Forgets the last implement and every hardware choice, which belong to one kit, and keeps the uneven switch. */
export function forgetKitSettings(): void {
  let uneven: unknown;
  try {
    uneven = JSON.parse(localStorage.getItem(storageKey) ?? "{}")?.uneven;
  } catch {
    uneven = undefined;
  }
  writeSettings(typeof uneven === "boolean" ? { uneven } : {});
}

export interface SettingsChange {
  implement?: string;
  uneven?: boolean;
  /** One implement's hardware choice; `undefined` clears it back to the library's choice. */
  hardware?: { implement: string; choice: string | undefined };
}

function applied(settings: Settings, change: SettingsChange): Settings {
  const { hardware, ...rest } = change;
  const next = { ...settings, ...rest };
  if (!hardware) return next;
  const { [hardware.implement]: _, ...others } = settings.hardware;
  return { ...next, hardware: hardware.choice === undefined ? others : { ...others, [hardware.implement]: hardware.choice } };
}

export function useSettings(
  inventory: Inventory,
  overrides: Partial<Settings> = {},
): [Settings, (change: SettingsChange) => void] {
  const [settings, setSettings] = useState(() => {
    const stored = readSettings(inventory);
    return { ...stored, ...overrides, hardware: { ...stored.hardware, ...overrides.hardware } };
  });
  const update = (change: SettingsChange) => {
    writeSettings(applied(readSettings(inventory), change));
    setSettings(applied(settings, change));
  };
  return [settings, update];
}

export function hardwareChoice(inventory: Inventory, settings: Pick<Settings, "hardware">, implement: string): string | undefined {
  if (hardwareOptions(inventory, implement).length === 0) return undefined;
  return settings.hardware[implement] ?? implementOf(inventory, implement)?.hardware?.default;
}
