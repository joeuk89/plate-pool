import type { Inventory } from "@plate-pool/core";
import { canBeUneven, canPair, hardwareNoun, hardwareOf, hardwareOptions, hasHardwareChoice, implementOf, NONE, useKit } from "./kit";
import { Segmented } from "./Segmented";
import { Switch } from "./Switch";

const AUTO = "auto";

export const pairOptions: { value: "pair" | "single"; label: string }[] = [
  { value: "pair", label: "Pair" },
  { value: "single", label: "Single" },
];

export function hardwareChoices(inventory: Inventory, implement: string): { value: string; label: string }[] {
  const options = hardwareOptions(inventory, implement).map((id) => ({
    value: id,
    label: id === NONE ? "None" : (hardwareOf(inventory, id)?.name ?? id),
  }));
  return implementOf(inventory, implement)?.hardware?.default === undefined ? [{ value: AUTO, label: "Auto" }, ...options] : options;
}

export interface HardwareProps {
  hardware: Record<string, string>;
  onHardwareChange: (implement: string, choice: string | undefined) => void;
}

export function HardwareChoice({ implement, hardware, onHardwareChange }: HardwareProps & { implement: string }) {
  const inventory = useKit();
  if (!hasHardwareChoice(inventory, implement)) return null;
  const value = hardware[implement] ?? implementOf(inventory, implement)?.hardware?.default ?? AUTO;
  return (
    <Segmented
      label={hardwareNoun(inventory, implement)}
      options={hardwareChoices(inventory, implement)}
      value={value}
      onChange={(choice) => onHardwareChange(implement, choice === AUTO ? undefined : choice)}
      className="hardware-choice"
    />
  );
}

export function PairChoice({ implement, pair, onChange }: { implement: string; pair: boolean; onChange: (pair: boolean) => void }) {
  const inventory = useKit();
  if (!canPair(inventory, implement)) return null;
  return (
    <Segmented label="Pair or single" options={pairOptions} value={pair ? "pair" : "single"} onChange={(value) => onChange(value === "pair")} />
  );
}

export function UnevenSwitch({ implement, uneven, onChange }: { implement: string; uneven: boolean; onChange: (uneven: boolean) => void }) {
  const inventory = useKit();
  if (!canBeUneven(inventory, implement)) return null;
  return <Switch label="Uneven loading" checked={uneven} onChange={onChange} />;
}
