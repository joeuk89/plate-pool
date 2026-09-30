import { describeWeight, load, RequestError, type CollarChoice, type Display, type Loading, type LoadResult, type Unit } from "@plate-pool/core";
import { useId, useState } from "react";
import { OtherWays } from "./OtherWays";
import { Segmented } from "./Segmented";
import { blockList, hardwareList, plateList, unverifiedList } from "./describe";
import { inventory } from "./inventory";

const collarOptions: { value: CollarChoice; label: string }[] = [
  { value: "clamp", label: "Clamp" },
  { value: "spinlock", label: "Spin-lock" },
  { value: "none", label: "None" },
];

const unitOptions: { value: Unit; label: string }[] = [
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
];

type Outcome = { result: LoadResult } | { error: string } | undefined;

function calculate(implement: string, target: string, unit: Unit, collars: CollarChoice): Outcome {
  if (target.trim() === "") return undefined;
  const withUnit = /[a-z]/i.test(target) ? target : `${target.trim()}${unit}`;
  try {
    const [result] = load(inventory, { targets: [{ implement, target: withUnit }], collars }).results;
    return result && { result };
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message.replace(withUnit, target.trim()) };
    throw error;
  }
}

function unitOf(implement: string): Unit {
  return inventory.implements.find((item) => item.id === implement)?.unit ?? "lb";
}

export function LoadScreen({ implement }: { implement: string }) {
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState<Unit>(unitOf(implement));
  const [collars, setCollars] = useState<CollarChoice>("clamp");
  const targetId = useId();

  const outcome = calculate(implement, target, unit, collars);

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
        {implement === "barbell" && <Segmented label="Collars" options={collarOptions} value={collars} onChange={setCollars} />}
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
        <LoadingView heading="Exact" loading={result.loading} unit={unit} />
      </div>
    );
  }
  if (result.refused) {
    return (
      <>
        <p className="status">{refusal(result)}</p>
        <div className="choices single">
          {result.below && <LoadingView heading="Heaviest allowed" loading={result.below} unit={unit} />}
        </div>
      </>
    );
  }
  return (
    <>
      <p className="status">{`No exact loading for ${describeWeight(result.target, unit)}`}</p>
      <div className={result.below && result.above ? "choices" : "choices single"}>
        {result.below && <LoadingView heading="Below" loading={result.below} unit={unit} recommended={result.recommended === "below"} />}
        {result.above && <LoadingView heading="Above" loading={result.above} unit={unit} recommended={result.recommended === "above"} />}
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
  loading: Loading;
  unit: Unit;
  recommended?: boolean;
}

function LoadingView({ heading, loading, unit, recommended = false }: LoadingViewProps) {
  const headingId = useId();
  return (
    <article aria-labelledby={headingId} className={recommended ? "loading recommended" : "loading"}>
      <header className="loading-head">
        <h2 id={headingId}>{heading}</h2>
        {recommended && <span className="badge">Recommended</span>}
      </header>
      <Total weight={loading.total} unit={unit} />
      <Details loading={loading} />
    </article>
  );
}

function Details({ loading }: { loading: Loading }) {
  const [side, back] = loading.positions;
  if (side?.name === "front") {
    return (
      <dl className="details">
        <div>
          <dt>Front</dt>
          <dd>{blockList(side.plates)}</dd>
        </div>
        <div>
          <dt>Back</dt>
          <dd>{blockList(back?.plates ?? [])}</dd>
        </div>
      </dl>
    );
  }
  return (
    <dl className="details">
      <div>
        <dt>Each side</dt>
        <dd>{plateList(side?.plates ?? [])}</dd>
      </div>
      <div>
        <dt>Collars</dt>
        <dd>{hardwareList(loading, inventory)}</dd>
      </div>
    </dl>
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
  const notes = [...warnings];
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
