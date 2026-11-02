import { list, RequestError, type Inventory, type ListRequest, type ListResponse, type ListRow, type Unit } from "@plate-pool/core";
import { useId, useMemo, useState } from "react";
import { hardwareList, positionRows, unverifiedList } from "./describe";
import { HardwareChoice, PairChoice, UnevenSwitch, type HardwareProps } from "./ImplementOptions";
import { hardwareOptions, hardwareTerm, kindOf, unitOf, useKit } from "./kit";
import { hardwareChoice } from "./settings";
import type { LoadChoice } from "./LoadScreen";
import { pairOf } from "./plan";

type Outcome = { response: ListResponse } | { error: string };

interface Options {
  hardware: Record<string, string>;
  uneven: boolean;
  pair: boolean;
}

function calculate(inventory: Inventory, implement: string, from: string, to: string, { hardware, uneven, pair }: Options): Outcome {
  const choice = hardware[implement];
  const request: ListRequest = {
    implement,
    ...(from.trim() === "" ? {} : { from }),
    ...(to.trim() === "" ? {} : { to }),
    ...pairOf(inventory, { implement, pair }),
    ...(kindOf(inventory, implement) === "handle" ? { uneven } : {}),
    ...(choice !== undefined ? { hardware: choice } : {}),
  };
  try {
    return { response: list(inventory, request) };
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message };
    throw error;
  }
}

interface Props extends HardwareProps {
  implement: string;
  uneven: boolean;
  onUnevenChange: (uneven: boolean) => void;
  pair: boolean;
  onPairChange: (pair: boolean) => void;
  onOpen: (choice: LoadChoice) => void;
}

export function ListScreen(props: Props) {
  const { implement, hardware, onHardwareChange, uneven, onUnevenChange, pair, onPairChange, onOpen } = props;
  const inventory = useKit();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const unit = unitOf(inventory, implement);
  const outcome = useMemo(
    () => calculate(inventory, implement, from, to, { hardware, uneven, pair }),
    [inventory, implement, from, to, hardware, uneven, pair],
  );

  return (
    <div className="list">
      <div className="request">
        <div className="range">
          <RangeField label="From" unit={unit} value={from} onChange={setFrom} />
          <RangeField label="To" unit={unit} value={to} onChange={setTo} />
        </div>
        <HardwareChoice implement={implement} hardware={hardware} onHardwareChange={onHardwareChange} />
        <PairChoice implement={implement} pair={pair} onChange={onPairChange} />
        <UnevenSwitch implement={implement} uneven={uneven} onChange={onUnevenChange} />
      </div>
      {"error" in outcome ? (
        <p className="error">{outcome.error}</p>
      ) : (
        <WeightTable
          response={outcome.response}
          unit={unit}
          showHardware={hardwareChoice(inventory, { hardware }, implement) === undefined && hardwareOptions(inventory, implement).length > 0}
          onOpen={(row) => onOpen({ target: String(row.total[unit]), pair })} />
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

interface TableProps {
  response: ListResponse;
  unit: Unit;
  /** Rows name their hardware when the library chooses it row by row. */
  showHardware: boolean;
  onOpen: (row: ListRow) => void;
}

function WeightTable({ response, unit, showHardware, onOpen }: TableProps) {
  const inventory = useKit();
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
                  <dl className="positions">
                    {positionRows(inventory, response.implement, row.loading).map(({ label, text, heavier }) => (
                      <div key={label}>
                        <dt>{`${label}${heavier ? " (heavier)" : ""}`}</dt>
                        <dd>{text}</dd>
                      </div>
                    ))}
                    {showHardware && (
                      <div>
                        <dt>{hardwareTerm(inventory, response.implement, response.pair === true)}</dt>
                        <dd>{hardwareList(row.loading, inventory)}</dd>
                      </div>
                    )}
                  </dl>
                </td>
                <td>
                  <div className="flags">
                    {flags(inventory, response.implement, row).map((flag) => (
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

function flags(inventory: Inventory, implement: string, row: ListRow): string[] {
  return [...(row.uneven ? ["Uneven"] : []), ...(row.smallest && kindOf(inventory, implement) !== "vest" ? ["Smallest"] : [])];
}
