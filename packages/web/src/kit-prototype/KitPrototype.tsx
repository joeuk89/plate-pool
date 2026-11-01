// PROTOTYPE, throwaway. Three variants of the kit flow (empty state, set-up link arrival,
// paste or choose a file, stored kit, hash mismatch) on the existing route, switchable via
// ?variant=A|B|C and a scenario bar. Answers plate-pool issue #59. Never ships.
import { useEffect, useState, type ReactNode } from "react";
import { App } from "../App";
import "./kit-prototype.css";

type Scenario = "empty" | "setup-link" | "paste" | "stored" | "mismatch";
type Variant = "A" | "B" | "C";

interface Kit {
  name: string;
  hash: string;
  summary: string;
}

const homeGym: Kit = { name: "Home gym", hash: "3f9a1c7e", summary: "5 implements · 4 plate weights · 4 kinds of hardware" };
const scenarios: { id: Scenario; label: string }[] = [
  { id: "empty", label: "Empty" },
  { id: "setup-link", label: "Set-up link" },
  { id: "paste", label: "Paste" },
  { id: "stored", label: "Stored" },
  { id: "mismatch", label: "Mismatch" },
];
const variants: { id: Variant; name: string }[] = [
  { id: "A", name: "Gate page" },
  { id: "B", name: "Kit view" },
  { id: "C", name: "Kit strip" },
];
const coachUrl = "https://github.com/joeuk89/strength-coach";

/** Stub of the format 1 reader: enough to show what an error looks like. */
function checkPaste(text: string): { kit: Kit } | { error: string } {
  if (text.trim() === "") return { error: "Nothing pasted yet." };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "This is not a JSON file. Paste the whole inventory file, from the first { to the last }." };
  }
  if (typeof data !== "object" || data === null) return { error: "The file must be a JSON object." };
  const file = data as Record<string, unknown>;
  if (!("format" in file)) return { error: "The file has no format field, so it is not a plate-pool inventory." };
  if (file.format !== 1) return { error: `This app reads inventory format 1. The file says format ${String(file.format)}.` };
  if (typeof file.name !== "string" || file.name === "") return { error: "name is missing at the top of the file (/name)." };
  const implementCount = Array.isArray(file.implements) ? file.implements.length : 0;
  const plates = Array.isArray(file.plates) ? file.plates.length : 0;
  return { kit: { name: file.name, hash: "7b2d90e1", summary: `${implementCount} implements · ${plates} plate entries` } };
}

interface Flow {
  kit: Kit | null;
  arriving: Kit | null;
  arrivedHash: string | null;
  targets: string | null;
  install: (kit: Kit) => void;
  replace: () => void;
}

function useFlow(scenario: Scenario): Flow {
  const [kit, setKit] = useState<Kit | null>(null);
  const [arriving, setArriving] = useState<Kit | null>(null);
  const [arrivedHash, setArrivedHash] = useState<string | null>(null);
  const [targets, setTargets] = useState<string | null>(null);
  useEffect(() => {
    setKit(scenario === "stored" || scenario === "mismatch" ? homeGym : null);
    setArriving(scenario === "setup-link" ? homeGym : null);
    setArrivedHash(scenario === "mismatch" ? "a1b2c3d4" : null);
    setTargets(scenario === "mismatch" || scenario === "setup-link" ? "barbell=175 lb" : null);
  }, [scenario]);
  return {
    kit,
    arriving,
    arrivedHash,
    targets,
    install: (next) => {
      setKit(next);
      setArriving(null);
      setArrivedHash(null);
    },
    replace: () => {
      setKit(null);
      setArrivedHash(null);
      setTargets(null);
    },
  };
}

function CoachPointer() {
  return (
    <p className="kp-pointer">
      No file yet? An inventory describes your plates, hardware and bars. Write one with{" "}
      <a href={coachUrl}>strength-coach</a>, which also makes your set-up link.
    </p>
  );
}

function ImportPanel({ onInstall, compact = false }: { onInstall: (kit: Kit) => void; compact?: boolean }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const result = checkPaste(text);
    if ("error" in result) setError(result.error);
    else onInstall(result.kit);
  };
  return (
    <div className={`kp-import ${compact ? "kp-import-compact" : ""}`}>
      <label className="kp-label" htmlFor="kp-paste">
        Paste your inventory file
      </label>
      <textarea
        id="kp-paste"
        className="kp-textarea"
        rows={compact ? 4 : 7}
        placeholder='{ "format": 1, "name": "Home gym", … }'
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
      />
      {error && (
        <p role="alert" className="kp-error">
          {error}
        </p>
      )}
      <div className="kp-import-actions">
        <button type="button" className="kp-primary" onClick={submit}>
          Use this file
        </button>
        <button type="button" className="loaded" onClick={() => setError("The file picker is not wired in this prototype; paste instead.")}>
          Choose a file…
        </button>
      </div>
    </div>
  );
}

function ReplaceWarning() {
  return <p className="kp-muted">Replacing the kit clears what is loaded on every implement and forgets the last implement you used.</p>;
}

/** The real app with its own masthead hidden so each variant can draw its own chrome. */
function HostedApp({ hideTabs = false }: { hideTabs?: boolean }) {
  return (
    <div className={`kp-host ${hideTabs ? "kp-host-no-tabs" : ""}`}>
      <App />
    </div>
  );
}

function MismatchNotice({ flow, style }: { flow: Flow; style: "banner" | "note" | "strip" }) {
  if (!flow.kit || !flow.arrivedHash || flow.arrivedHash === flow.kit.hash) return null;
  const text = "These targets were worked out for a different kit. Open your set-up link again if your gym has changed.";
  if (style === "note") return <p className="kp-note">{text}</p>;
  if (style === "strip")
    return (
      <div className="strip kp-strip-warn">
        <span className="strip-text">
          <span className="strip-place">Different kit</span> · {text}
        </span>
      </div>
    );
  return (
    <div role="status" className="kp-banner">
      {text}
    </div>
  );
}

// ---------- Variant A: a gate page. Nothing of the app shows until a kit is on the device. ----------
function VariantA({ flow }: { flow: Flow }) {
  const [kitPage, setKitPage] = useState(false);
  if (flow.arriving) {
    return (
      <main className="app kp-gate">
        <h1 className="kp-title">plate-pool</h1>
        <section className="kp-card">
          <h2 className="kp-h2">Set-up link opened</h2>
          <p className="kp-kit-name">{flow.arriving.name}</p>
          <p className="kp-muted">{flow.arriving.summary}</p>
          {flow.targets && <p className="kp-muted">The link also asks for {flow.targets}; it opens once the kit is in.</p>}
          <button type="button" className="kp-primary kp-wide" onClick={() => flow.install(flow.arriving!)}>
            Use {flow.arriving.name} on this phone
          </button>
        </section>
      </main>
    );
  }
  if (!flow.kit) {
    return (
      <main className="app kp-gate">
        <h1 className="kp-title">plate-pool</h1>
        <p className="kp-lede">Works out which plates to put on. It needs to know your gym first.</p>
        <section className="kp-card">
          <h2 className="kp-h2">Open your set-up link</h2>
          <p className="kp-muted">If someone sent you a set-up link, open it and the kit installs itself. Nothing to paste.</p>
        </section>
        <section className="kp-card">
          <h2 className="kp-h2">Or bring the file</h2>
          <ImportPanel onInstall={flow.install} />
        </section>
        <CoachPointer />
      </main>
    );
  }
  if (kitPage) {
    return (
      <main className="app kp-gate">
        <header className="masthead">
          <h1>plate-pool</h1>
          <button type="button" className="loaded" onClick={() => setKitPage(false)}>
            Done
          </button>
        </header>
        <section className="kp-card">
          <h2 className="kp-h2">Kit on this phone</h2>
          <p className="kp-kit-name">{flow.kit.name}</p>
          <p className="kp-muted">
            {flow.kit.summary} · kit {flow.kit.hash}
          </p>
          <ReplaceWarning />
          <button
            type="button"
            className="kp-danger"
            onClick={() => {
              flow.replace();
              setKitPage(false);
            }}
          >
            Replace kit
          </button>
        </section>
      </main>
    );
  }
  return (
    <>
      <header className="masthead app kp-masthead">
        <div>
          <h1>plate-pool</h1>
          <button type="button" className="kp-kit-chip" onClick={() => setKitPage(true)}>
            {flow.kit.name} ▾
          </button>
        </div>
        <nav aria-label="Screens" className="views">
          {["Load", "List", "Reverse"].map((label) => (
            <button key={label} type="button" className="view" aria-current={label === "Load" ? "page" : undefined}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div className="app kp-tight">
        <MismatchNotice flow={flow} style="banner" />
      </div>
      <HostedApp />
    </>
  );
}

// ---------- Variant B: Kit is a fourth view beside Load, List and Reverse. The app chrome always shows. ----------
function VariantB({ flow }: { flow: Flow }) {
  const [view, setView] = useState<"app" | "kit">("app");
  useEffect(() => {
    if (flow.arriving || !flow.kit) setView("kit");
  }, [flow.arriving, flow.kit]);
  const Nav = ({ current }: { current: "app" | "kit" }) => (
    <nav aria-label="Screens" className="views">
      {["Load", "List", "Reverse"].map((label) => (
        <button key={label} type="button" className="view" aria-current={current === "app" && label === "Load" ? "page" : undefined} onClick={() => flow.kit && setView("app")}>
          {label}
        </button>
      ))}
      <button type="button" className="view" aria-current={current === "kit" ? "page" : undefined} onClick={() => setView("kit")}>
        Kit{!flow.kit && <span className="kp-dot" aria-label="needs attention" />}
      </button>
    </nav>
  );
  if (view === "kit" || !flow.kit) {
    return (
      <main className="app">
        <header className="masthead">
          <h1>plate-pool</h1>
          <Nav current="kit" />
        </header>
        {flow.arriving ? (
          <section className="kp-card">
            <h2 className="kp-h2">A set-up link opened</h2>
            <p className="kp-kit-name">{flow.arriving.name}</p>
            <p className="kp-muted">{flow.arriving.summary}</p>
            <button type="button" className="kp-primary kp-wide" onClick={() => { flow.install(flow.arriving!); setView("app"); }}>
              Use this kit
            </button>
            {flow.kit && <p className="kp-muted">It replaces {flow.kit.name}. <ReplaceWarning /></p>}
          </section>
        ) : flow.kit ? (
          <section className="kp-card">
            <h2 className="kp-h2">Kit</h2>
            <p className="kp-kit-name">{flow.kit.name}</p>
            <p className="kp-muted">
              {flow.kit.summary} · kit {flow.kit.hash}
            </p>
            <details className="kp-details">
              <summary>Replace kit</summary>
              <ReplaceWarning />
              <button type="button" className="kp-danger" onClick={flow.replace}>
                Replace kit
              </button>
            </details>
          </section>
        ) : (
          <>
            <section className="kp-card">
              <h2 className="kp-h2">No kit on this phone</h2>
              <p className="kp-muted">Open your set-up link, or paste the inventory file below.</p>
              <ImportPanel onInstall={(kit) => { flow.install(kit); setView("app"); }} compact />
            </section>
            <CoachPointer />
          </>
        )}
      </main>
    );
  }
  return (
    <>
      <header className="masthead app kp-masthead">
        <h1>plate-pool</h1>
        <Nav current="app" />
      </header>
      <div className="app kp-tight">
        <MismatchNotice flow={flow} style="note" />
      </div>
      <HostedApp />
    </>
  );
}

// ---------- Variant C: the kit is a strip under the tabs, and a set-up link installs with no tap. ----------
function VariantC({ flow }: { flow: Flow }) {
  const [justInstalled, setJustInstalled] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  useEffect(() => {
    if (flow.arriving) {
      const name = flow.arriving.name;
      flow.install(flow.arriving);
      setJustInstalled(name);
    }
  }, [flow.arriving]);
  const strip = flow.kit ? (
    <div className={`strip kp-strip ${justInstalled ? "kp-strip-fresh" : ""}`}>
      <span className="strip-text">
        <span className="strip-place">{justInstalled ? "Installed" : "Kit"}</span> · <span className="strip-total">{flow.kit.name}</span>
      </span>
      <button type="button" className="unload kp-unload" onClick={() => setReplacing((open) => !open)}>
        Replace
      </button>
    </div>
  ) : (
    <div className="strip kp-strip kp-strip-empty">
      <span className="strip-text">
        <span className="strip-place">No kit</span> · Open your set-up link or paste the file below
      </span>
    </div>
  );
  return (
    <>
      <header className="masthead app kp-masthead">
        <h1>plate-pool</h1>
        <nav aria-label="Screens" className="views">
          {["Load", "List", "Reverse"].map((label) => (
            <button key={label} type="button" className="view" aria-current={label === "Load" ? "page" : undefined} disabled={!flow.kit}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div className="app kp-tight">
        {strip}
        {replacing && flow.kit && (
          <section className="kp-card">
            <ReplaceWarning />
            <ImportPanel
              onInstall={(kit) => {
                flow.install(kit);
                setReplacing(false);
                setJustInstalled(kit.name);
              }}
              compact
            />
          </section>
        )}
        <MismatchNotice flow={flow} style="strip" />
      </div>
      {flow.kit ? (
        <HostedApp />
      ) : (
        <main className="app kp-tight">
          <nav className="tabs" aria-label="Implements">
            <span className="tab kp-tab-ghost">Your implements appear here</span>
          </nav>
          <ImportPanel onInstall={flow.install} />
          <CoachPointer />
        </main>
      )}
    </>
  );
}

function readVariant(): Variant {
  const value = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  return variants.some((variant) => variant.id === value) ? (value as Variant) : "A";
}

export function KitPrototype() {
  const [variant, setVariant] = useState<Variant>(readVariant);
  const [scenario, setScenario] = useState<Scenario>("empty");
  const flow = useFlow(scenario);
  const go = (step: number) => {
    const index = variants.findIndex((item) => item.id === variant);
    setVariant(variants[(index + step + variants.length) % variants.length]!.id);
  };
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", variant);
    window.history.replaceState(window.history.state, "", url);
  }, [variant]);
  // The hosted App rewrites the query on every change; keep ?variant= in it so a reload stays in the prototype.
  useEffect(() => {
    const original = window.history.replaceState.bind(window.history);
    window.history.replaceState = (state, unused, url) => {
      const next = new URL(url ?? window.location.href, window.location.href);
      if (!next.searchParams.has("variant")) next.searchParams.set("variant", readVariant());
      original(state, unused, next);
    };
    return () => {
      window.history.replaceState = original;
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const body: ReactNode =
    variant === "A" ? <VariantA key={scenario} flow={flow} /> : variant === "B" ? <VariantB key={scenario} flow={flow} /> : <VariantC key={scenario} flow={flow} />;
  return (
    <div className={`kp kp-${variant}`}>
      {body}
      <div className="kp-bar" role="toolbar" aria-label="Prototype switcher">
        <div className="kp-bar-row">
          <button type="button" onClick={() => go(-1)} aria-label="Previous variant">
            ←
          </button>
          <span>
            {variant} ({variants.find((item) => item.id === variant)!.name})
          </span>
          <button type="button" onClick={() => go(1)} aria-label="Next variant">
            →
          </button>
        </div>
        <div className="kp-bar-row kp-scenarios">
          {scenarios.map((item) => (
            <button key={item.id} type="button" aria-pressed={item.id === scenario} onClick={() => setScenario(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
