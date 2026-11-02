import {
  describeWeight,
  RequestError,
  step,
  type Display,
  type Inventory,
  type Loading,
  type LoadResult,
  type StepRequest,
  type Unit,
} from "@plate-pool/core";
import { useId, useMemo, useRef } from "react";
import { AddImplement } from "./AddImplement";
import { changesText, type ChangesText } from "./changes-text";
import { CurrentStrip } from "./CurrentStrip";
import { pinnedFrom, type CurrentLoadings, type PinnedLoading } from "./current";
import { hardwareList, positionRows, unevenNote, unverifiedList } from "./describe";
import { HardwareChoice, PairChoice, UnevenSwitch, type HardwareProps } from "./ImplementOptions";
import { canPair, hardwareOptions, hardwareTerm, kindOf, unitOf, useKit } from "./kit";
import { LeftoverLine } from "./LeftoverLine";
import { LoadedButton } from "./LoadedButton";
import { OtherWays } from "./OtherWays";
import { Picture } from "./Picture";
import { cardLabel, newCard, pairOf, pinnedFor, plan, targetWithUnit, type Card, type Outcome } from "./plan";
import { useReorder } from "./reorder";
import { Segmented } from "./Segmented";

const unitOptions: { value: Unit; label: string }[] = [
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
];

export interface LoadChoice {
  target: string;
  pair: boolean;
}

interface Options {
  hardware: Record<string, string>;
  uneven: boolean;
  pair: boolean;
}

function nextWeight(
  inventory: Inventory,
  implement: string,
  target: string,
  unit: Unit,
  { hardware, uneven, pair }: Options,
  direction: "up" | "down",
): Display | undefined {
  const choice = hardware[implement];
  const request: StepRequest = {
    implement,
    ...(target.trim() === "" ? {} : { target: targetWithUnit(target, unit) }),
    ...pairOf(inventory, { implement, pair }),
    ...(kindOf(inventory, implement) === "handle" ? { uneven } : {}),
    ...(choice !== undefined ? { hardware: choice } : {}),
  };
  try {
    return step(inventory, request, direction);
  } catch (error) {
    if (error instanceof RequestError) return undefined;
    throw error;
  }
}

interface LoadScreenProps extends HardwareProps {
  cards: Card[];
  onCardsChange: (cards: Card[]) => void;
  uneven: boolean;
  onUnevenChange: (uneven: boolean) => void;
  current: CurrentLoadings;
  onPin: (implement: string, pinned: PinnedLoading | undefined) => void;
}

export function LoadScreen(props: LoadScreenProps) {
  const { cards, onCardsChange, hardware, onHardwareChange, uneven, onUnevenChange, current, onPin } = props;
  const inventory = useKit();
  const { outcomes, leftover } = useMemo(
    () => plan(inventory, cards, { hardware, uneven, current }),
    [inventory, cards, hardware, uneven, current],
  );
  const pinned = pinnedFor(inventory, cards, current);
  const { reordering, listProps, itemProps, gripProps } = useReorder(cards, onCardsChange);
  const several = cards.length > 1;
  const update = (id: number, change: Partial<Card>) => onCardsChange(cards.map((card) => (card.id === id ? { ...card, ...change } : card)));
  const remove = (id: number) => onCardsChange(cards.filter((card) => card.id !== id));
  const added = useRef<number>(undefined);
  const add = (implement: string, pair: boolean) => {
    const card = newCard(inventory, implement, pair);
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
              hardware={hardware}
              onHardwareChange={onHardwareChange}
              uneven={uneven}
              onUnevenChange={onUnevenChange}
              pinned={pinned[index]}
              onPin={(next) => onPin(card.implement, next)}
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

interface LoadCardProps extends HardwareProps {
  card: Card;
  priority: number;
  several: boolean;
  outcome: Outcome;
  uneven: boolean;
  onUnevenChange: (uneven: boolean) => void;
  pinned: PinnedLoading | undefined;
  onPin: (pinned: PinnedLoading | undefined) => void;
  onChange: (change: Partial<Card>) => void;
  onRemove: () => void;
  grip: ReturnType<ReturnType<typeof useReorder>["gripProps"]>;
  autoFocus: boolean;
}

function LoadCard(props: LoadCardProps) {
  const {
    card,
    priority,
    several,
    outcome,
    hardware,
    onHardwareChange,
    uneven,
    onUnevenChange,
    pinned,
    onPin,
    onChange,
    onRemove,
    grip,
    autoFocus,
  } = props;
  const inventory = useKit();
  const { implement, target, unit, pair } = card;
  const targetId = useId();
  const label = cardLabel(inventory, card);

  const options = { hardware, uneven, pair };
  const lighter = nextWeight(inventory, implement, target, unit, options, "down");
  const heavier = nextWeight(inventory, implement, target, unit, options, "up");
  const moveTo = (weight: Display) => {
    const own = unitOf(inventory, implement);
    onChange({ unit: own, target: String(weight[own]) });
  };
  const pin = (loading: Loading) => {
    onPin(pinnedFrom(inventory, implement, loading, pair));
    moveTo(loading.total);
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
            {summary(inventory, card, outcome)}
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
          <HardwareChoice implement={implement} hardware={hardware} onHardwareChange={onHardwareChange} />
          <PairChoice implement={implement} pair={pair} onChange={(value) => onChange({ pair: value })} />
          <UnevenSwitch implement={implement} uneven={uneven} onChange={onUnevenChange} />
        </div>
        {pinned && <CurrentStrip implement={implement} pinned={pinned} hardware={hardware} onUnload={() => onPin(undefined)} />}
        <section aria-label="Result" aria-live="polite" className="result">
          {outcome && "result" in outcome && <ResultView result={outcome.result} pinned={pinned} onPin={pin} />}
          {outcome && "error" in outcome && <p className="error">{outcome.error}</p>}
        </section>
      </div>
    </section>
  );
}

function summary(inventory: Inventory, card: Card, outcome: Outcome): string {
  const unit = unitOf(inventory, card.implement);
  if (!outcome) return "";
  if ("error" in outcome) return card.target.trim();
  const { result } = outcome;
  const loading = result.loading ?? (result.recommended ? result[result.recommended] : result.below);
  return loading ? `${loading.total[unit]} ${unit}` : "";
}

interface Pinning {
  pinned: PinnedLoading | undefined;
  onPin: (loading: Loading) => void;
}

function ResultView({ result, ...pinning }: { result: LoadResult } & Pinning) {
  return (
    <>
      <Loadings result={result} {...pinning} />
      <Notes result={result} />
      <OtherWays result={result} onPin={pinning.onPin} />
    </>
  );
}

function Loadings({ result, ...pinning }: { result: LoadResult } & Pinning) {
  const inventory = useKit();
  const unit = unitOf(inventory, result.implement);
  if (result.loading) {
    return (
      <div className="choices single">
        <LoadingView heading="Exact" result={result} loading={result.loading} unit={unit} {...pinning} />
      </div>
    );
  }
  if (result.refused) {
    return (
      <>
        <p className="status">{refusal(result)}</p>
        <div className="choices single">
          {result.below && <LoadingView heading="Heaviest allowed" result={result} loading={result.below} unit={unit} {...pinning} />}
        </div>
      </>
    );
  }
  const sideBySide = result.below && result.above ? [result.below, result.above] : undefined;
  const pair = sideBySide ? { sideBySide } : {};
  return (
    <>
      <p className="status">{`No exact loading for ${describeWeight(result.target, unit)}`}</p>
      {!result.below && !result.above && (
        <p className="unloadable">{`This kit's plates and hardware cannot load the ${cardLabel(inventory, { implement: result.implement, pair: result.pair !== false }).toLowerCase()}.`}</p>
      )}
      <div className={sideBySide ? "choices" : "choices single"}>
        {result.below && (
          <LoadingView
            heading="Below"
            result={result}
            loading={result.below}
            unit={unit}
            recommended={result.recommended === "below"}
            {...pair}
            {...pinning}
          />
        )}
        {result.above && (
          <LoadingView
            heading="Above"
            result={result}
            loading={result.above}
            unit={unit}
            recommended={result.recommended === "above"}
            {...pair}
            {...pinning}
          />
        )}
      </div>
    </>
  );
}

function refusal(result: LoadResult): string {
  const warning = result.warnings.find((item) => item.startsWith("Refused:")) ?? "Refused.";
  return warning.split(". ")[0]!.replace(/\.$/, "");
}

interface LoadingViewProps extends Pinning {
  heading: string;
  result: LoadResult;
  loading: Loading;
  unit: Unit;
  recommended?: boolean;
  sideBySide?: Loading[];
}

function LoadingView({ heading, result, loading, unit, recommended = false, sideBySide, pinned, onPin }: LoadingViewProps) {
  const inventory = useKit();
  const headingId = useId();
  const changes = pinned && changesText(result.implement, loading, pinned, inventory);
  return (
    <article aria-labelledby={headingId} className={recommended ? "loading recommended" : "loading"}>
      <header className="loading-head">
        <h2 id={headingId}>{heading}</h2>
        {recommended && <span className="badge">Recommended</span>}
      </header>
      <Total weight={loading.total} unit={unit} />
      <Picture implement={result.implement} loading={loading} inventory={inventory} {...(sideBySide ? { sideBySide } : {})} />
      {changes ? <ChangesBlock changes={changes} /> : <PlateDetails result={result} loading={loading} />}
      <LoadedButton loading={loading} onPin={onPin} />
    </article>
  );
}

function ChangesBlock({ changes }: { changes: ChangesText }) {
  return (
    <div role="group" aria-label="Changes" className="changes">
      <p className="changes-count">{changes.count}</p>
      {changes.lines.length > 0 && (
        <dl className="details">
          {changes.lines.map(({ label, text }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function PlateDetails({ result, loading }: { result: LoadResult; loading: Loading }) {
  const inventory = useKit();
  const implement = result.implement;
  const rows = positionRows(inventory, implement, loading);
  const pair = canPair(inventory, implement) && result.pair !== false;
  return (
    <dl className="details">
      {rows.map(({ label, text, heavier }) => (
        <div key={label}>
          <dt>
            {label}
            {heavier && <span className="heavier"> heavier</span>}
          </dt>
          <dd>{text}</dd>
        </div>
      ))}
      {hardwareOptions(inventory, implement).length > 0 && (
        <div>
          <dt>{hardwareTerm(inventory, implement, pair)}</dt>
          <dd>{hardwareList(loading, inventory)}</dd>
        </div>
      )}
    </dl>
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
  const inventory = useKit();
  const warnings = result.refused ? result.warnings.filter((warning) => !warning.startsWith("Refused:")) : result.warnings;
  const uneven = [
    { label: "Uneven", loading: result.loading },
    { label: "Below is uneven", loading: result.below },
    { label: "Above is uneven", loading: result.above },
  ].flatMap(({ label, loading }) => (loading?.uneven ? [unevenNote(label, result.implement, loading, inventory)] : []));
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
