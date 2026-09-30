import {
  describeWeight,
  RequestError,
  step,
  type CollarChoice,
  type Display,
  type Loading,
  type LoadResult,
  type StepRequest,
  type Unit,
} from "@plate-pool/core";
import { useId, useMemo, useRef } from "react";
import { OtherWays } from "./OtherWays";
import { Picture } from "./Picture";
import { Segmented } from "./Segmented";
import { Switch } from "./Switch";
import { blockList, endLabel, hardwareList, plateList, unevenNote, unverifiedList } from "./describe";
import { inventory } from "./inventory";
import { AddImplement } from "./AddImplement";
import { LeftoverLine } from "./LeftoverLine";
import { cardLabel, newCard, plan, targetWithUnit, unitOf, type Card, type DumbbellChoice, type Outcome } from "./plan";
import { useReorder } from "./reorder";

export { unitOf, type DumbbellChoice } from "./plan";

export const collarOptions: { value: CollarChoice; label: string }[] = [
  { value: "clamp", label: "Clamp" },
  { value: "spinlock", label: "Spin-lock" },
  { value: "none", label: "None" },
];

export const dumbbellOptions: { value: DumbbellChoice; label: string }[] = [
  { value: "pair", label: "Pair" },
  { value: "one", label: "One" },
];

const unitOptions: { value: Unit; label: string }[] = [
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
];

export interface LoadChoice {
  target: string;
  dumbbells: DumbbellChoice;
}

interface Options {
  collars: CollarChoice;
  uneven: boolean;
  dumbbells: DumbbellChoice;
}

function nextWeight(
  implement: string,
  target: string,
  unit: Unit,
  { collars, uneven, dumbbells }: Options,
  direction: "up" | "down",
): Display | undefined {
  const request: StepRequest = {
    implement,
    ...(target.trim() === "" ? {} : { target: targetWithUnit(target, unit) }),
    ...(implement === "dumbbell" ? { pair: dumbbells === "pair", uneven } : { collars }),
  };
  try {
    return step(inventory, request, direction);
  } catch (error) {
    if (error instanceof RequestError) return undefined;
    throw error;
  }
}

interface LoadScreenProps {
  cards: Card[];
  onCardsChange: (cards: Card[]) => void;
  collars: CollarChoice;
  onCollarsChange: (collars: CollarChoice) => void;
  uneven: boolean;
  onUnevenChange: (uneven: boolean) => void;
}

export function LoadScreen({ cards, onCardsChange, collars, onCollarsChange, uneven, onUnevenChange }: LoadScreenProps) {
  const { outcomes, leftover } = useMemo(() => plan(cards, { collars, uneven }), [cards, collars, uneven]);
  const { reordering, listProps, itemProps, gripProps } = useReorder(cards, onCardsChange);
  const several = cards.length > 1;
  const update = (id: number, change: Partial<Card>) => onCardsChange(cards.map((card) => (card.id === id ? { ...card, ...change } : card)));
  const remove = (id: number) => onCardsChange(cards.filter((card) => card.id !== id));
  const added = useRef<number>(undefined);
  const add = (implement: string, dumbbells: DumbbellChoice) => {
    const card = newCard(implement, dumbbells);
    added.current = card.id;
    onCardsChange([...cards, card]);
  };

  return (
    <div className="load">
      <ol
        className={`cards${several ? " several" : ""}${reordering ? " reordering" : ""}`}
        aria-label="Implements in priority order"
        {...listProps}
      >
        {cards.map((card, index) => (
          <li key={card.id} className="card-slot" {...itemProps(card.id, index)}>
            <LoadCard
              card={card}
              priority={index + 1}
              several={several}
              outcome={outcomes[index]}
              collars={collars}
              onCollarsChange={onCollarsChange}
              uneven={uneven}
              onUnevenChange={onUnevenChange}
              onChange={(change) => update(card.id, change)}
              onRemove={() => remove(card.id)}
              grip={gripProps(card.id, index)}
              autoFocus={card.id === added.current}
            />
          </li>
        ))}
      </ol>
      <AddImplement cards={cards} onAdd={add} />
      {several && leftover && <LeftoverLine leftover={leftover} />}
    </div>
  );
}

interface LoadCardProps {
  card: Card;
  priority: number;
  several: boolean;
  outcome: Outcome;
  collars: CollarChoice;
  onCollarsChange: (collars: CollarChoice) => void;
  uneven: boolean;
  onUnevenChange: (uneven: boolean) => void;
  onChange: (change: Partial<Card>) => void;
  onRemove: () => void;
  grip: ReturnType<ReturnType<typeof useReorder>["gripProps"]>;
  autoFocus: boolean;
}

function LoadCard(props: LoadCardProps) {
  const { card, priority, several, outcome, collars, onCollarsChange, uneven, onUnevenChange, onChange, onRemove, grip, autoFocus } = props;
  const { implement, target, unit, dumbbells } = card;
  const targetId = useId();
  const label = cardLabel(card);

  const options = { collars, uneven, dumbbells };
  const lighter = nextWeight(implement, target, unit, options, "down");
  const heavier = nextWeight(implement, target, unit, options, "up");
  const moveTo = (weight: Display) => {
    const own = unitOf(implement);
    onChange({ unit: own, target: String(weight[own]) });
  };

  return (
    <section className="card" aria-label={`${priority}. ${label}`}>
      {several && (
        <header className="card-head">
          <span className="priority" aria-hidden="true">
            {priority}
          </span>
          <h2 className="card-name">{label}</h2>
          <span className="card-summary" aria-hidden="true">
            {summary(card, outcome)}
          </span>
          <button type="button" className="grip" aria-label={`Move ${label}`} aria-keyshortcuts="ArrowUp ArrowDown" {...grip}>
            <svg viewBox="0 0 12 20" aria-hidden="true">
              {[4, 10, 16].flatMap((y) => [3, 9].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />))}
            </svg>
          </button>
          <button type="button" className="remove" aria-label={`Remove ${label}`} onClick={onRemove}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </header>
      )}
      <div className="card-body">
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
              autoFocus={autoFocus}
              value={target}
              onChange={(event) => onChange({ target: event.target.value })}
            />
            <Segmented
              label="Unit"
              showLabel={false}
              options={unitOptions}
              value={unit}
              onChange={(value) => onChange({ unit: value })}
              className="unit"
            />
          </div>
          <div className="steps">
            <button
              type="button"
              className="step"
              aria-label="Next lighter weight"
              disabled={!lighter}
              onClick={() => lighter && moveTo(lighter)}
            >
              −
            </button>
            <button
              type="button"
              className="step"
              aria-label="Next heavier weight"
              disabled={!heavier}
              onClick={() => heavier && moveTo(heavier)}
            >
              +
            </button>
          </div>
          {implement === "barbell" && <Segmented label="Collars" options={collarOptions} value={collars} onChange={onCollarsChange} />}
          {implement === "dumbbell" && (
            <>
              <Segmented
                label="Dumbbells"
                options={dumbbellOptions}
                value={dumbbells}
                onChange={(value) => onChange({ dumbbells: value })}
              />
              <Switch label="Uneven loading" checked={uneven} onChange={onUnevenChange} />
            </>
          )}
        </div>
        <section aria-label="Result" aria-live="polite" className="result">
          {outcome && "result" in outcome && <ResultView result={outcome.result} />}
          {outcome && "error" in outcome && <p className="error">{outcome.error}</p>}
        </section>
      </div>
    </section>
  );
}

function summary(card: Card, outcome: Outcome): string {
  const unit = unitOf(card.implement);
  if (!outcome) return "";
  if ("error" in outcome) return card.target.trim();
  const { result } = outcome;
  const loading = result.loading ?? (result.recommended ? result[result.recommended] : result.below);
  return loading ? `${loading.total[unit]} ${unit}` : "";
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
      <Picture implement={result.implement} loading={loading} inventory={inventory} {...(sideBySide ? { sideBySide } : {})} />
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

export function Total({ weight, unit }: { weight: Display; unit: Unit }) {
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
