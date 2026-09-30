import { describeWeight, load, RequestError, type CollarChoice, type Loading, type LoadResult, type Unit } from "@plate-pool/core";
import { useId, useState } from "react";
import { Segmented } from "./Segmented";
import { hardwareList, kilograms, plateList, pounds, unverifiedList } from "./describe";
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

function calculate(target: string, unit: Unit, collars: CollarChoice): Outcome {
  if (target.trim() === "") return undefined;
  const withUnit = /[a-z]/i.test(target) ? target : `${target.trim()}${unit}`;
  try {
    const [result] = load(inventory, { targets: [{ implement: "barbell", target: withUnit }], collars }).results;
    return result && { result };
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message.replace(withUnit, target.trim()) };
    throw error;
  }
}

export function LoadScreen() {
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState<Unit>("lb");
  const [collars, setCollars] = useState<CollarChoice>("clamp");
  const targetId = useId();

  const outcome = calculate(target, unit, collars);

  return (
    <div className="load">
      <label htmlFor={targetId}>Target</label>
      <input id={targetId} inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} />
      <Segmented label="Unit" options={unitOptions} value={unit} onChange={setUnit} />
      <Segmented label="Collars" options={collarOptions} value={collars} onChange={setCollars} />
      <section aria-label="Result">
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
    </>
  );
}

function Loadings({ result }: { result: LoadResult }) {
  if (result.loading) return <LoadingView heading="Exact" loading={result.loading} />;
  if (result.refused) {
    return (
      <>
        <p>{`Refused: over the ${pounds(result.refused.limit)} plate limit`}</p>
        {result.below && <LoadingView heading="Heaviest allowed" loading={result.below} />}
      </>
    );
  }
  return (
    <>
      <p>{`No exact loading for ${describeWeight(result.target, "lb")}`}</p>
      <div className="choices">
        {result.below && <LoadingView heading="Below" loading={result.below} recommended={result.recommended === "below"} />}
        {result.above && <LoadingView heading="Above" loading={result.above} recommended={result.recommended === "above"} />}
      </div>
    </>
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

function LoadingView({ heading, loading, recommended = false }: { heading: string; loading: Loading; recommended?: boolean }) {
  const [side] = loading.positions;
  const headingId = useId();
  return (
    <article aria-labelledby={headingId} className={recommended ? "loading recommended" : "loading"}>
      <h2 id={headingId}>
        {heading}
        {recommended && <span className="badge">Recommended</span>}
      </h2>
      <p>
        <span>{pounds(loading.total)}</span> <span>{kilograms(loading.total)}</span>
      </p>
      <dl>
        <dt>Each side</dt>
        <dd>{plateList(side?.plates ?? [])}</dd>
        <dt>Collars</dt>
        <dd>{hardwareList(loading, inventory)}</dd>
      </dl>
    </article>
  );
}
