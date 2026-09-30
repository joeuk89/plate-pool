import { reverse, type CollarChoice, type Loading, type ReverseRequest, type ReverseResult, type Unit } from "@plate-pool/core";
import { useState, type CSSProperties } from "react";
import { unevenNote, unverifiedList } from "./describe";
import { inventory } from "./inventory";
import { collarOptions, dumbbellOptions, Total, unitOf, type DumbbellChoice } from "./LoadScreen";
import { Picture } from "./Picture";
import type { Editing } from "./picture-parts";
import { plateColour } from "./plate-colours";
import { Segmented } from "./Segmented";
import { Switch } from "./Switch";

type Positions = { name: string; plates: number[] }[];

interface Row {
  label: string;
  phrase: string;
  positions: string[];
}

interface ReverseScreenProps {
  implement: string;
  collars: CollarChoice;
  onCollarsChange: (collars: CollarChoice) => void;
  uneven: boolean;
}

const positionWords: Record<string, { label: string; phrase: string }> = {
  "end-a": { label: "End A", phrase: "end A" },
  "end-b": { label: "End B", phrase: "end B" },
  stack: { label: "Stack", phrase: "the stack" },
  front: { label: "Front", phrase: "the front" },
  back: { label: "Back", phrase: "the back" },
};

const mirroredWords: Record<string, { label: string; phrase: string }> = {
  barbell: { label: "Each side", phrase: "each side" },
  dumbbell: { label: "Each end", phrase: "each end" },
};

function positionNames(implement: string): string[] {
  return inventory.implements.find((item) => item.id === implement)?.positions ?? [];
}

function plateWeights(implement: string): { weight: number; shape: string }[] {
  const accepts = inventory.implements.find((item) => item.id === implement)?.accepts ?? [];
  return inventory.plates
    .filter((plate) => accepts.includes(plate.type))
    .map((plate) => ({ weight: plate.weight.measured ?? plate.weight.listed, shape: plate.shape }))
    .sort((a, b) => b.weight - a.weight);
}

function rowsFor(implement: string, mirrored: boolean): Row[] {
  const names = positionNames(implement);
  const mirroredRow = mirroredWords[implement];
  if (mirrored && mirroredRow) return [{ ...mirroredRow, positions: names }];
  return names.map((name) => ({ ...(positionWords[name] ?? { label: name, phrase: name }), positions: [name] }));
}

function addPlate(positions: Positions, weight: number, to: string[]): Positions {
  return positions.map((position) => (to.includes(position.name) ? { ...position, plates: [...position.plates, weight] } : position));
}

/** Removes the plate at `index` on `position`, and, when mirrored, the plate in the same place on the other positions if it has the same weight. */
function removePlate(positions: Positions, position: string, index: number, mirrored: boolean): Positions {
  const weight = positions.find(({ name }) => name === position)?.plates[index];
  return positions.map((each) =>
    each.name === position || (mirrored && each.plates[index] === weight)
      ? { ...each, plates: each.plates.filter((_, i) => i !== index) }
      : each,
  );
}

function clearPlates(positions: Positions): Positions {
  return positions.map((position) => ({ ...position, plates: [] }));
}

function Notes({ result }: { result: ReverseResult }) {
  const loading = loadingOf(result);
  const notes = [
    ...(loading.uneven ? [unevenNote("Uneven", loading)] : []),
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

export function ReverseScreen({ implement, collars, onCollarsChange, uneven }: ReverseScreenProps) {
  const [positions, setPositions] = useState<Positions>(() => positionNames(implement).map((name) => ({ name, plates: [] })));
  const [mirrorEnds, setMirrorEnds] = useState(true);
  const [dumbbells, setDumbbells] = useState<DumbbellChoice>("pair");
  const unit = unitOf(implement);
  const mirrored = implement === "barbell" || (implement === "dumbbell" && mirrorEnds);
  const rows = rowsFor(implement, mirrored);

  const empty = positions.every(({ plates }) => plates.length === 0);
  const request: ReverseRequest = {
    implement,
    positions,
    collars,
    uneven,
    ...(implement === "dumbbell" ? { pair: dumbbells === "pair" } : {}),
    ...(empty ? { screws: "none" } : {}),
  };
  const result = reverse(inventory, request);

  const phraseFor = (position: string) => (mirrored ? rows[0]!.phrase : (positionWords[position]?.phrase ?? position));
  const editing: Editing = {
    remove: (position, index) => setPositions(removePlate(positions, position, index, mirrored)),
    removeLabel: (position, weight) => `Remove ${weight} ${unit} from ${phraseFor(position)}`,
  };

  return (
    <div className="reverse">
      <section aria-label="Total" aria-live="polite" className="reverse-total">
        <p className="total-label">{implement === "dumbbell" && dumbbells === "pair" ? "Total per dumbbell" : "Total"}</p>
        <Total weight={result.total} unit={unit} />
        {result.warnings.length > 0 && (
          <ul aria-label="Warnings" className="warnings">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        <Notes result={result} />
      </section>
      <figure className="editable-picture">
        <Picture implement={implement} loading={loadingOf(result)} inventory={inventory} editing={editing} />
        <figcaption>{empty ? `Add ${plateNoun(implement)}s with the buttons below.` : `Tap a ${plateNoun(implement)} to remove it.`}</figcaption>
      </figure>
      <div className={`adders ${implement}`}>
        {rows.map((row) => (
          <div key={row.label} role="group" aria-label={row.label} className="adder-row">
            <span className="adder-label" aria-hidden="true">
              {row.label}
            </span>
            <div className="plate-buttons">
              {plateWeights(implement).map(({ weight, shape }) => (
                <button
                  key={weight}
                  type="button"
                  aria-label={`Add ${weight} ${unit} to ${row.phrase}`}
                  className={`plate-button ${shape}`}
                  style={plateStyle(weight, unit)}
                  onClick={() => setPositions(addPlate(positions, weight, row.positions))}
                >
                  <span className="plus" aria-hidden="true">
                    +
                  </span>
                  {weight}
                  {shape === "block" && <span className="unit-suffix">{unit}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="reverse-options">
        {implement === "barbell" && <Segmented label="Collars" options={collarOptions} value={collars} onChange={onCollarsChange} />}
        {implement === "dumbbell" && (
          <>
            <Segmented label="Dumbbells" options={dumbbellOptions} value={dumbbells} onChange={setDumbbells} />
            <Switch label="Mirror ends" checked={mirrorEnds} onChange={setMirrorEnds} />
          </>
        )}
        <button type="button" className="clear" disabled={empty} onClick={() => setPositions(clearPlates(positions))}>
          Clear
        </button>
      </div>
    </div>
  );
}

function plateNoun(implement: string): string {
  return implement === "vest" ? "block" : "plate";
}

function plateStyle(weight: number, unit: Unit): CSSProperties {
  const { fill, ink } = plateColour(weight, unit);
  return { "--plate": fill, "--plate-ink": ink } as CSSProperties;
}
