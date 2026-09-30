import type { CollarChoice } from "@plate-pool/core";
import { useState } from "react";
import { inventory } from "./inventory";

export interface Settings {
  implement: string;
  collars: CollarChoice;
  uneven: boolean;
}

const storageKey = "plate-pool:settings";
export const collarChoices: readonly CollarChoice[] = ["clamp", "spinlock", "none"];
const defaults: Settings = { implement: "barbell", collars: "clamp", uneven: true };

function readSettings(): Settings {
  let stored: Partial<Record<keyof Settings, unknown>>;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}") ?? {};
  } catch {
    return defaults;
  }
  const { implement, collars, uneven } = stored;
  return {
    implement: inventory.implements.some((item) => item.id === implement) ? (implement as string) : defaults.implement,
    collars: collarChoices.includes(collars as CollarChoice) ? (collars as CollarChoice) : defaults.collars,
    uneven: typeof uneven === "boolean" ? uneven : defaults.uneven,
  };
}

function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Storage is blocked or full: the app carries on with the settings it holds in memory.
  }
}

export function useSettings(overrides: Partial<Settings> = {}): [Settings, (change: Partial<Settings>) => void] {
  const [settings, setSettings] = useState(() => ({ ...readSettings(), ...overrides }));
  const update = (change: Partial<Settings>) => {
    writeSettings({ ...readSettings(), ...change });
    setSettings({ ...settings, ...change });
  };
  return [settings, update];
}
