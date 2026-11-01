// PROTOTYPE, throwaway. Mounts instead of the app when ?variant= is in the URL (dev build only).
// Switch variant with the arrows or ← →, pick an implement scenario and a colour rule in the bar.
// Answers plate-pool issue #60. Never ships.
import { useEffect, useState } from "react";
import { ImplementPicture, variants, type Variant } from "./drawings";
import { colourRules, scenarios, type ColourRule } from "./kits";
import "./picture-prototype.css";

function readParam<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const value = new URLSearchParams(window.location.search).get(name);
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function PicturePrototype() {
  const [variant, setVariant] = useState<Variant>(() => readParam("variant", variants.map((v) => v.id), "A"));
  const [scenarioId, setScenarioId] = useState(() => readParam("scene", ["all", ...scenarios.map((s) => s.id)], scenarios[0]!.id));
  const [rule, setRule] = useState<ColourRule>(() => readParam("colours", colourRules.map((r) => r.id), "standards"));
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0]!;
  const gallery = scenarioId === "all";

  const go = (step: number) => {
    const index = variants.findIndex((item) => item.id === variant);
    setVariant(variants[(index + step + variants.length) % variants.length]!.id);
  };
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", variant);
    url.searchParams.set("scene", scenarioId);
    url.searchParams.set("colours", rule);
    window.history.replaceState(window.history.state, "", url);
  }, [variant, scenarioId, rule]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = variants.find((item) => item.id === variant)!;
  const colourRule = colourRules.find((item) => item.id === rule)!;

  return (
    <main className="app pp">
      <header className="masthead">
        <h1>plate-pool</h1>
        <nav aria-label="Screens" className="views">
          <button type="button" className="view" aria-current="page">
            Load
          </button>
          <button type="button" className="view">
            List
          </button>
          <button type="button" className="view">
            Reverse
          </button>
        </nav>
      </header>
      {gallery ? (
        <section className="pp-gallery" aria-label="Every implement">
          {scenarios.map((item) => (
            <figure key={item.id}>
              <ImplementPicture scenario={item} variant={variant} rule={rule} />
              <figcaption>
                {item.label} · <code>{item.picture}</code>
              </figcaption>
            </figure>
          ))}
        </section>
      ) : (
      <>
      <nav className="tabs" role="tablist" aria-label="Implements">
        <button type="button" role="tab" aria-selected="true" className="tab">
          {scenario.implementName}
        </button>
      </nav>
      <section className="card pp-card" aria-label={scenario.implementName}>
        <header className="card-head">
          <h2 className="card-name">{scenario.implementName}</h2>
          <span className="card-summary">{scenario.total}</span>
        </header>
        <div className="card-body">
          <section aria-label="Result" className="result">
            <p className="status">{scenario.total}</p>
            <ImplementPicture scenario={scenario} variant={variant} rule={rule} />
            <dl className="positions">
              {scenario.positions.map((position) => (
                <div key={position.name}>
                  <dt>{position.name}</dt>
                  <dd>{position.plates.length > 0 ? position.plates.join(", ") : "nothing"}</dd>
                </div>
              ))}
              {scenario.hardware && (
                <div>
                  <dt>Hardware</dt>
                  <dd>{scenario.hardware.name}</dd>
                </div>
              )}
            </dl>
            {scenario.note && <p className="pp-note">{scenario.note}</p>}
          </section>
        </div>
      </section>
      <aside className="pp-sheet" aria-label="What this picture is made from">
        <p>
          <strong>Data:</strong> kind <code>{scenario.kind}</code>, picture <code>{scenario.picture}</code>, {scenario.plates.length} plate weights, largest{" "}
          {Math.max(...scenario.plates.map((plate) => plate.diameter))} mm{scenario.maxPlateDiameter ? `, drawn to the implement's ${scenario.maxPlateDiameter} mm cap` : ""}. {scenario.source}.
        </p>
        <p>
          <strong>Variant {variant}, {current.name}:</strong> {current.detail}.
        </p>
        <p>
          <strong>Colours, {colourRule.label}:</strong> {colourRule.detail}
        </p>
      </aside>
      </>
      )}

      <div className="pp-bar" role="toolbar" aria-label="Prototype switcher">
        <div className="pp-bar-row">
          <button type="button" onClick={() => go(-1)} aria-label="Previous variant">
            ←
          </button>
          <span>
            {variant} ({current.name})
          </span>
          <button type="button" onClick={() => go(1)} aria-label="Next variant">
            →
          </button>
        </div>
        <div className="pp-bar-row">
          <label>
            Implement
            <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
              <option value="all">All, as a gallery</option>
              {(["bar", "handle", "stack", "vest"] as const).map((kind) => (
                <optgroup key={kind} label={kind}>
                  {scenarios
                    .filter((item) => item.kind === kind)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <div className="pp-bar-row pp-rules">
          {colourRules.map((item) => (
            <button key={item.id} type="button" aria-pressed={item.id === rule} onClick={() => setRule(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
