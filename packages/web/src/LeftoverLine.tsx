import type { Leftover } from "@plate-pool/core";
import { inventory } from "./inventory";

function listOrNone(items: string[]): string {
  return items.length === 0 ? "None" : items.join(", ");
}

export function LeftoverLine({ leftover }: { leftover: Leftover }) {
  const plates = inventory.plates.flatMap((plate) => {
    const count = leftover.plates[plate.id] ?? 0;
    if (count === 0) return [];
    if (plate.shape === "block") return [`${count} ${plate.name.toLowerCase()}${count === 1 ? "" : "s"}`];
    return [`${count} × ${plate.weight.measured ?? plate.weight.listed}`];
  });
  const hardware = inventory.hardware.flatMap((item) => {
    const count = leftover.hardware[item.id] ?? 0;
    return count > 0 ? [`${count} × ${item.name}`] : [];
  });

  return (
    <section aria-label="Left over" className="leftover">
      <h2>Left over</h2>
      <dl>
        <div>
          <dt>Plates</dt>
          <dd>{listOrNone(plates)}</dd>
        </div>
        <div>
          <dt>Locking hardware</dt>
          <dd>{listOrNone(hardware)}</dd>
        </div>
      </dl>
    </section>
  );
}
