import { reverse, type Inventory, type Loading, type Plate, type ReverseRequest, type ReverseResult } from "@plate-pool/core";
import { useState, type CSSProperties } from "react";
import { pinnedFrom, type PinnedLoading } from "./current";
import { unevenNote, unverifiedList } from "./describe";
import { HardwareChoice, PairChoice, type HardwareProps } from "./ImplementOptions";
import { acceptedPlates, canPair, implementOf, kindOf, lower, NONE, plateUnit, positionNames, unitOf, used, useKit } from "./kit";
import { Total, type LoadChoice } from "./LoadScreen";
import { Picture } from "./Picture";
import type { Editing } from "./picture-parts";
import { plateColour } from "./plate-colours";
import { Switch } from "./Switch";

type Positions = { name: string; plates: number[]; ids: string[] }[];

interface Row {
  label: string;
  phrase: string;
  positions: string[];
}

interface ReverseScreenProps extends HardwareProps {
  implement: string;
  uneven: boolean;
  onPin: (pinned: PinnedLoading, choice: LoadChoice) => void;
}

const positionWords: Record<string, { label: string; phrase: string }> = {
  a: { label: "End A", phrase: "end A" },
  b: { label: "End B", phrase: "end B" },
  stack: { label: "Stack", phrase: "the stack" },
  front: { label: "Front", phrase: "the front" },
  back: { label: "Back", phrase: "the back" },
};

const mirroredWords: Record<string, { label: string; phrase: string }> = {
  bar: { label: "Each side", phrase: "each side" },
  handle: { label: "Each end", phrase: "each end" },
};

function rowsFor(inventory: Inventory, implement: string, mirrored: boolean): Row[] {
  const names = positionNames(inventory, implement);
  const mirroredRow = mirroredWords[kindOf(inventory, implement) ?? ""];
  if (mirrored && mirroredRow) return [{ ...mirroredRow, positions: names }];
  return names.map((name) => ({ ...(positionWords[name] ?? { label: name, phrase: name }), positions: [name] }));
}

function addPlate(positions: Positions, plate: Plate, to: string[]): Positions {
  return positions.map((position) =>
    to.includes(position.name)
      ? { ...position, plates: [...position.plates, used(plate.weight)], ids: [...position.ids, plate.id] }
      : position,
  );
}

function removePlate(positions: Positions, position: string, index: number, mirrored: boolean): Positions {
  const id = positions.find(({ name }) => name === position)?.ids[index];
  const without = <T,>(items: T[]) => items.filter((_, i) => i !== index);
  return positions.map((each) =>
    each.name === position || (mirrored && each.ids[index] === id) ? { ...each, plates: without(each.plates), ids: without(each.ids) } : each,
  );
}

function clearPlates(positions: Positions): Positions {
  return positions.map((position) => ({ ...position, plates: [], ids: [] }));
}

function Notes({ implement, result }: { implement: string; result: ReverseResult }) {
  const inventory = useKit();
  const loading = loadingOf(result);
  const notes = [
    ...(loading.uneven ? [unevenNote("Uneven", implement, loading, inventory)] : []),
    ...result.notes,
    ...(result.unverified.length > 0 ? [`Unverified: ${unverifiedList(result.unverified, inventory)}`] : []),
  ];
  if (notes.length === 0) return null;
  return (
    <ul aria-label="Notes" className="notes">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

function loadingOf(result: ReverseResult): Loading {
  const { total, hardware, positions, uneven, heavier } = result;
  return { total, hardware, positions, uneven, ...(heavier ? { heavier } : {}) };
}

function plateText(plate: Plate, plates: Plate[]): string {
  const shared = plates.filter((each) => used(each.weight) === used(plate.weight)).length > 1;
  return shared && plate.name ? `${used(plate.weight)} ${plate.name}` : String(used(plate.weight));
}

export function ReverseScreen({ implement, hardware, onHardwareChange, uneven, onPin }: ReverseScreenProps) {
  const inventory = useKit();
  const [positions, setPositions] = useState<Positions>(() => positionNames(inventory, implement).map((name) => ({ name, plates: [], ids: [] })));
  const [mirrorEnds, setMirrorEnds] = useState(true);
  const [pair, setPair] = useState(() => canPair(inventory, implement));
  const unit = unitOf(inventory, implement);
  const kind = kindOf(inventory, implement);
  const mirrored = kind === "bar" || (kind === "handle" && mirrorEnds);
  const rows = rowsFor(inventory, implement, mirrored);
  const plates = acceptedPlates(inventory, implement);
  const choice = hardware[implement];
  const implementName = lower(implementOf(inventory, implement)?.name ?? implement);

  const empty = positions.every(({ plates: placed }) => placed.length === 0);
  const options = implementOf(inventory, implement)?.hardware;
  const bare = empty && choice === undefined && options !== undefined && options.default === undefined && options.options.includes(NONE);
  const request: ReverseRequest = {
    implement,
    positions,
    uneven,
    ...(canPair(inventory, implement) ? { pair } : {}),
    ...(choice !== undefined ? { hardware: choice } : bare && kind !== "vest" ? { hardware: NONE } : {}),
  };
  const result = reverse(inventory, request);

  const pin = () => onPin(pinnedFrom(inventory, implement, loadingOf(result), pair), { target: String(result.total[unit]), pair });
  const phraseFor = (position: string) => (mirrored ? rows[0]!.phrase : (positionWords[position]?.phrase ?? position));
  const editing: Editing = {
    remove: (position, index) => setPositions(removePlate(positions, position, index, mirrored)),
    removeLabel: (position, weight) => `Remove ${weight} ${unit} from ${phraseFor(position)}`,
  };
  const noun = kind === "vest" ? "block" : "plate";

  return (
    <div className="reverse">
      <section aria-label="Total" aria-live="polite" className="reverse-total">
        <p className="total-label">{canPair(inventory, implement) && pair ? `Total per ${implementName}` : "Total"}</p>
        <Total weight={result.total} unit={unit} />
        {result.warnings.length > 0 && (
          <ul aria-label="Warnings" className="warnings">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        <Notes implement={implement} result={result} />
      </section>
      <figure className="editable-picture">
        <Picture implement={implement} loading={loadingOf(result)} inventory={inventory} editing={editing} />
        <figcaption>{empty ? `Add ${noun}s with the buttons below.` : `Tap a ${noun} to remove it.`}</figcaption>
      </figure>
      <div className={`adders ${kind ?? ""}`}>
        {rows.map((row) => (
          <div key={row.label} role="group" aria-label={row.label} className="adder-row">
            <span className="adder-label" aria-hidden="true">
              {row.label}
            </span>
            <div className="plate-buttons">
              {plates.map((plate) => {
                const text = plateText(plate, plates);
                return (
                  <button
                    key={plate.id}
                    type="button"
                    aria-label={`Add ${text} ${plateUnit(inventory, plate)} to ${row.phrase}`}
                    className={`plate-button ${plate.shape}${plateColour(inventory, plate).outline ? " light" : ""}`}
                    style={plateStyle(inventory, plate)}
                    onClick={() => setPositions(addPlate(positions, plate, row.positions))}
                  >
                    <span className="plus" aria-hidden="true">
                      +
                    </span>
                    {text}
                    {plate.shape === "block" && <span className="unit-suffix">{plateUnit(inventory, plate)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="reverse-options">
        <HardwareChoice implement={implement} hardware={hardware} onHardwareChange={onHardwareChange} />
        <PairChoice implement={implement} pair={pair} onChange={setPair} />
        {kind === "handle" && <Switch label="Mirror ends" checked={mirrorEnds} onChange={setMirrorEnds} />}
        <div className="reverse-actions">
          <button type="button" className="clear" disabled={empty} onClick={() => setPositions(clearPlates(positions))}>
            Clear
          </button>
          <button type="button" className="loaded" onClick={pin}>
            Loaded
          </button>
        </div>
      </div>
    </div>
  );
}

function plateStyle(inventory: Inventory, plate: Plate): CSSProperties {
  const { fill, ink } = plateColour(inventory, plate);
  return { "--plate": fill, "--plate-ink": ink } as CSSProperties;
}

