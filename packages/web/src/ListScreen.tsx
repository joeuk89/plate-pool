import { list, RequestError, type CollarChoice, type ListRequest, type ListResponse, type ListRow, type Unit } from "@plate-pool/core";
import { useId, useMemo, useState } from "react";
import { collarOptions, dumbbellOptions, unitOf, type DumbbellChoice, type LoadChoice } from "./LoadScreen";
import { Segmented } from "./Segmented";
import { Switch } from "./Switch";
import { blockList, endLabel, plateList, unverifiedList } from "./describe";
import { inventory } from "./inventory";

const screwLabels: Record<string, string> = {
  "screw-standard": "Standard screw",
  "screw-long": "Long screw",
};

type Outcome = { response: ListResponse } | { error: string };

interface Options {
  collars: CollarChoice;
  uneven: boolean;
  dumbbells: DumbbellChoice;
}

function calculate(implement: string, from: string, to: string, { collars, uneven, dumbbells }: Options): Outcome {
  const request: ListRequest = {
    implement,
    ...(from.trim() === "" ? {} : { from }),
    ...(to.trim() === "" ? {} : { to }),
    ...(implement === "dumbbell" ? { pair: dumbbells === "pair", uneven } : { collars }),
  };
  try {
    return { response: list(inventory, request) };
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message };
    throw error;
  }
}

interface Props {
  implement: string;
  collars: CollarChoice;
  onCollarsChange: (collars: CollarChoice) => void;
  uneven: boolean;
  onUnevenChange: (uneven: boolean) => void;
  onOpen: (choice: LoadChoice) => void;
}

export function ListScreen({ implement, collars, onCollarsChange, uneven, onUnevenChange, onOpen }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dumbbells, setDumbbells] = useState<DumbbellChoice>("pair");
  const unit = unitOf(implement);
  const outcome = useMemo(
    () => calculate(implement, from, to, { collars, uneven, dumbbells }),
    [implement, from, to, collars, uneven, dumbbells],
  );

  return (
    <div className="list">
      <div className="request">
        <div className="range">
          <RangeField label="From" unit={unit} value={from} onChange={setFrom} />
          <RangeField label="To" unit={unit} value={to} onChange={setTo} />
        </div>
        {implement === "barbell" && <Segmented label="Collars" options={collarOptions} value={collars} onChange={onCollarsChange} />}
        {implement === "dumbbell" && (
          <>
            <Segmented label="Dumbbells" options={dumbbellOptions} value={dumbbells} onChange={setDumbbells} />
            <Switch label="Uneven loading" checked={uneven} onChange={onUnevenChange} />
          </>
        )}
      </div>
      {"error" in outcome ? (
        <p className="error">{outcome.error}</p>
      ) : (
        <WeightTable
          response={outcome.response}
          unit={unit}
          onOpen={(row) => onOpen({ target: String(row.total[unit]), dumbbells })}
        />
      )}
    </div>
  );
}

function RangeField({ label, unit, value, onChange }: { label: string; unit: Unit; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="range-field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="range-input">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="Any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span aria-hidden="true">{unit}</span>
      </div>
    </div>
  );
}

function WeightTable({ response, unit, onOpen }: { response: ListResponse; unit: Unit; onOpen: (row: ListRow) => void }) {
  const other: Unit = unit === "lb" ? "kg" : "lb";
  const notes = [...response.warnings];
  if (response.unverified.length > 0) notes.push(`Unverified: ${unverifiedList(response.unverified, inventory)}`);

  return (
    <section aria-label="Achievable weights" className="weights">
      {response.rows.length === 0 ? (
        <p className="status">No achievable weight in this range</p>
      ) : (
        <table className="weight-table">
          <thead>
            <tr>
              <th scope="col">{unit}</th>
              <th scope="col">{other}</th>
              <th scope="col">Plates</th>
              <th scope="col">Flags</th>
            </tr>
          </thead>
          <tbody>
            {response.rows.map((row) => (
              <tr key={row.total[unit]} onClick={() => onOpen(row)}>
                <td className="weight">
                  <button type="button" aria-label={`Open ${row.total[unit]} ${unit} in Load`}>
                    {row.total[unit]}
                  </button>
                </td>
                <td className="weight other">{row.total[other]}</td>
                <td>
                  <Positions implement={response.implement} row={row} />
                </td>
                <td>
                  <div className="flags">
                    {flags(response.implement, row).map((flag) => (
                      <span key={flag}>{flag}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {notes.length > 0 && (
        <ul aria-label="Notes" className="notes">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Positions({ implement, row }: { implement: string; row: ListRow }) {
  const { loading } = row;
  const [first, second] = loading.positions;
  const entries: [term: string, description: string][] =
    implement === "vest"
      ? [
          ["Front", blockList(first?.plates ?? [])],
          ["Back", blockList(second?.plates ?? [])],
        ]
      : implement === "dumbbell" && loading.uneven
        ? loading.positions.map((position) => [
            `${endLabel(position.name)}${position.name === loading.heavier ? " (heavier)" : ""}`,
            plateList(position.plates),
          ])
        : [[positionLabel(implement), plateList(first?.plates ?? [])]];

  return (
    <dl className="positions">
      {entries.map(([term, description]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}

function positionLabel(implement: string): string {
  if (implement === "barbell") return "Each side";
  if (implement === "dumbbell") return "Each end";
  return "Stack";
}

function flags(implement: string, row: ListRow): string[] {
  const screw = row.screw && screwLabels[row.screw];
  return [
    ...(row.uneven ? ["Uneven"] : []),
    ...(row.micro ? ["Micro"] : []),
    ...(screw ? [implement === "dumbbell" ? `${screw}s` : screw] : []),
  ];
}
