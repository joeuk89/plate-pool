import {
  describeWeight,
  load,
  RequestError,
  type CollarChoice,
  type Display,
  type Loading,
  type LoadRequest,
  type LoadResult,
  type Unit,
} from "@plate-pool/core";
import { useId, useState } from "react";
import { BarbellPicture } from "./BarbellPicture";
import { OtherWays } from "./OtherWays";
import { Segmented } from "./Segmented";
import { Switch } from "./Switch";
import { blockList, endLabel, hardwareList, plateList, unevenNote, unverifiedList } from "./describe";
import { inventory } from "./inventory";

const collarOptions: { value: CollarChoice; label: string }[] = [
  { value: "clamp", label: "Clamp" },
  { value: "spinlock", label: "Spin-lock" },
  { value: "none", label: "None" },
];

type DumbbellChoice = "pair" | "one";

const dumbbellOptions: { value: DumbbellChoice; label: string }[] = [
  { value: "pair", label: "Pair" },
  { value: "one", label: "One" },
];

const unitOptions: { value: Unit; label: string }[] = [
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
];

type Outcome = { result: LoadResult } | { error: string } | undefined;

interface Options {
  collars: CollarChoice;
  uneven: boolean;
  dumbbells: DumbbellChoice;
}

function calculate(implement: string, target: string, unit: Unit, { collars, uneven, dumbbells }: Options): Outcome {
  if (target.trim() === "") return undefined;
  const withUnit = /[a-z]/i.test(target) ? target : `${target.trim()}${unit}`;
  const request: LoadRequest =
    implement === "dumbbell"
      ? { targets: [{ implement, target: withUnit, pair: dumbbells === "pair" }], uneven }
      : { targets: [{ implement, target: withUnit }], collars };
  try {
    const [result] = load(inventory, request).results;
    return result && { result };
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message.replace(withUnit, target.trim()) };
    throw error;
  }
}

function unitOf(implement: string): Unit {
  return inventory.implements.find((item) => item.id === implement)?.unit ?? "lb";
}

interface LoadScreenProps {
  implement: string;
  collars: CollarChoice;
  onCollarsChange: (collars: CollarChoice) => void;
  uneven: boolean;
  onUnevenChange: (uneven: boolean) => void;
}

export function LoadScreen({ implement, collars, onCollarsChange, uneven, onUnevenChange }: LoadScreenProps) {
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState<Unit>(unitOf(implement));
  const [dumbbells, setDumbbells] = useState<DumbbellChoice>("pair");
  const targetId = useId();

  const outcome = calculate(implement, target, unit, { collars, uneven, dumbbells });

  return (
    <div className="load">
      <div className="request">
        <label htmlFor={targetId} className="field-label">
          Target
        </label>
        <div className="target-row">
          <input
            id={targetId}
            className="target"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            placeholder="0"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <Segmented label="Unit" showLabel={false} options={unitOptions} value={unit} onChange={setUnit} className="unit" />
        </div>
        {implement === "barbell" && <Segmented label="Collars" options={collarOptions} value={collars} onChange={onCollarsChange} />}
        {implement === "dumbbell" && (
          <>
            <Segmented label="Dumbbells" options={dumbbellOptions} value={dumbbells} onChange={setDumbbells} />
            <Switch label="Uneven loading" checked={uneven} onChange={onUnevenChange} />
          </>
        )}
      </div>
      <section aria-label="Result" aria-live="polite" className="result">
        {outcome && "result" in outcome && <ResultView result={outcome.result} />}
        {outcome && "error" in outcome && <p className="error">{outcome.error}</p>}
      </section>
    </div>
  );
}

function ResultView({ result }: { result: LoadResult }) {
  return (
    <>
      <Loadings result={result} />
      <Notes result={result} />
      <OtherWays result={result} />
    </>
  );
}

function Loadings({ result }: { result: LoadResult }) {
  const unit = unitOf(result.implement);
  if (result.loading) {
    return (
      <div className="choices single">
        <LoadingView heading="Exact" result={result} loading={result.loading} unit={unit} />
      </div>
    );
  }
  if (result.refused) {
    return (
      <>
        <p className="status">{refusal(result)}</p>
        <div className="choices single">
          {result.below && <LoadingView heading="Heaviest allowed" result={result} loading={result.below} unit={unit} />}
        </div>
      </>
    );
  }
  const sideBySide = result.below && result.above ? [result.below, result.above] : undefined;
  const pair = sideBySide ? { sideBySide } : {};
  return (
    <>
      <p className="status">{`No exact loading for ${describeWeight(result.target, unit)}`}</p>
      <div className={sideBySide ? "choices" : "choices single"}>
        {result.below && (
          <LoadingView heading="Below" result={result} loading={result.below} unit={unit} recommended={result.recommended === "below"} {...pair} />
        )}
        {result.above && (
          <LoadingView heading="Above" result={result} loading={result.above} unit={unit} recommended={result.recommended === "above"} {...pair} />
        )}
      </div>
    </>
  );
}

function refusal(result: LoadResult): string {
  const warning = result.warnings.find((item) => item.startsWith("Refused:")) ?? "Refused.";
  return warning.split(". ")[0]!.replace(/\.$/, "");
}

interface LoadingViewProps {
  heading: string;
  result: LoadResult;
  loading: Loading;
  unit: Unit;
  recommended?: boolean;
  sideBySide?: Loading[];
}

function LoadingView({ heading, result, loading, unit, recommended = false, sideBySide }: LoadingViewProps) {
  const headingId = useId();
  return (
    <article aria-labelledby={headingId} className={recommended ? "loading recommended" : "loading"}>
      <header className="loading-head">
        <h2 id={headingId}>{heading}</h2>
        {recommended && <span className="badge">Recommended</span>}
      </header>
      <Total weight={loading.total} unit={unit} />
      {result.implement === "barbell" && (
        <BarbellPicture loading={loading} inventory={inventory} {...(sideBySide ? { sideBySide } : {})} />
      )}
      <dl className="details">
        {result.implement === "dumbbell" ? (
          <DumbbellDetails pair={result.pair !== false} loading={loading} />
        ) : (
          details(result.implement, loading).map(([term, description]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{description}</dd>
            </div>
          ))
        )}
      </dl>
    </article>
  );
}

function details(implement: string, loading: Loading): [term: string, description: string][] {
  const [first, second] = loading.positions;
  const plates = plateList(first?.plates ?? []);
  const hardware = hardwareList(loading, inventory);
  switch (implement) {
    case "vest":
      return [
        ["Front", blockList(first?.plates ?? [])],
        ["Back", blockList(second?.plates ?? [])],
      ];
    case "kettlebell":
      return [
        ["Stack", plates],
        ["Locking screw", hardware],
      ];
    case "leg":
      return [["Stack", plates]];
    default:
      return [
        ["Each side", plates],
        ["Collars", hardware],
      ];
  }
}

function DumbbellDetails({ pair, loading }: { pair: boolean; loading: Loading }) {
  const [first] = loading.positions;
  return (
    <>
      {loading.uneven ? (
        loading.positions.map((position) => (
          <div key={position.name}>
            <dt>
              {endLabel(position.name)}
              {position.name === loading.heavier && <span className="heavier"> heavier</span>}
            </dt>
            <dd>{plateList(position.plates)}</dd>
          </div>
        ))
      ) : (
        <div>
          <dt>Each end</dt>
          <dd>{plateList(first?.plates ?? [])}</dd>
        </div>
      )}
      <div>
        <dt>{pair ? "Screws per dumbbell" : "Screws"}</dt>
        <dd>{hardwareList(loading, inventory)}</dd>
      </div>
    </>
  );
}

function Total({ weight, unit }: { weight: Display; unit: Unit }) {
  const [first, second]: [Unit, Unit] = unit === "kg" ? ["kg", "lb"] : ["lb", "kg"];
  return (
    <p className="total">
      <span className="primary">
        <span className="amount">{weight[first]}</span> {first}
      </span>{" "}
      <span className="secondary">
        {weight[second]} {second}
      </span>
    </p>
  );
}

function Notes({ result }: { result: LoadResult }) {
  const warnings = result.refused ? result.warnings.filter((warning) => !warning.startsWith("Refused:")) : result.warnings;
  const uneven = [
    { label: "Uneven", loading: result.loading },
    { label: "Below is uneven", loading: result.below },
    { label: "Above is uneven", loading: result.above },
  ].flatMap(({ label, loading }) => (loading?.uneven ? [unevenNote(label, loading)] : []));
  const notes = [...uneven, ...warnings];
  if (result.unverified.length > 0) notes.push(`Unverified: ${unverifiedList(result.unverified, inventory)}`);
  if (notes.length === 0) return null;
  return (
    <ul aria-label="Notes" className="notes">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}
