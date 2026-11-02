import { useId, useState, type ReactNode } from "react";
import { kitFromBytes, kitFromText, kitSummary, shortHash, type KitFile, type KitRead } from "./kit-file";

const coachReadme = "https://github.com/joeuk89/strength-coach#readme";
const shownErrors = 3;
const replaceWarning = "Replacing the kit clears what is loaded on every implement and forgets the last implement you used.";

function KitScreen({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <main className={`app kit-screen${action ? "" : " gate"}`}>
      <header className="masthead">
        <h1>plate-pool</h1>
        {action}
      </header>
      {children}
    </main>
  );
}

function Card({ title, children, tone }: { title: string; children: ReactNode; tone?: "arrival" }) {
  const id = useId();
  return (
    <section className={`kit-card${tone ? ` kit-card-${tone}` : ""}`} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

export function Errors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  const more = errors.length - shownErrors;
  return (
    <div role="alert" className="kit-errors">
      <ul>
        {errors.slice(0, shownErrors).map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      {more > 0 && <p>And {more === 1 ? "1 more problem" : `${more} more problems`}.</p>}
    </div>
  );
}

function ImportPanel({ onKit }: { onKit: (kit: KitFile) => void }) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fieldId = useId();
  const fileId = useId();
  const settle = (read: KitRead, fileText?: string) => {
    setBusy(false);
    if ("kit" in read) return onKit(read.kit);
    setErrors(read.errors);
    if (fileText !== undefined) setText(fileText);
  };
  const readPasted = () => {
    if (text.trim() === "") return setErrors(["Paste the inventory file first, from its first { to its last }."]);
    setBusy(true);
    void kitFromText(text).then((read) => settle(read));
  };
  const readChosen = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const bytes = new Uint8Array(await file.arrayBuffer());
    settle(await kitFromBytes(bytes), new TextDecoder().decode(bytes));
  };
  return (
    <div className="import">
      <label htmlFor={fieldId}>Paste your inventory file</label>
      <textarea
        id={fieldId}
        rows={7}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={'{ "format": 1, "name": "My gym", … }'}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setErrors([]);
        }}
      />
      <Errors errors={errors} />
      <div className="import-actions">
        <button type="button" className="primary" disabled={busy} onClick={readPasted}>
          Use this file
        </button>
        <label className="secondary file-button">
          <input
            id={fileId}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            onChange={(event) => {
              void readChosen(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          Choose a file…
        </label>
      </div>
    </div>
  );
}

function CoachPointer() {
  return (
    <p className="pointer">
      No file yet? An inventory describes your plates, hardware and bars. Write one with <a href={coachReadme}>strength-coach</a>, which also
      makes your set-up link.
    </p>
  );
}

export function EmptyKitScreen({ errors, onKit }: { errors: string[]; onKit: (kit: KitFile) => void }) {
  return (
    <KitScreen>
      <Errors errors={errors} />
      <p className="lede">Works out which plates to put on. It needs to know your gym first.</p>
      <Card title="Open your set-up link">
        <p className="muted">If you have a set-up link, open it on this device and the kit installs itself. Nothing to paste.</p>
      </Card>
      <Card title="Or bring the file">
        <ImportPanel onKit={onKit} />
      </Card>
      <CoachPointer />
    </KitScreen>
  );
}

export function OpeningLink() {
  return (
    <KitScreen>
      <p className="lede" role="status">
        Opening the set-up link…
      </p>
    </KitScreen>
  );
}

export function ConfirmCard({ arriving, stored, onUse, onKeep }: { arriving: KitFile; stored?: KitFile; onUse: () => void; onKeep: () => void }) {
  const { name } = arriving.inventory;
  return (
    <KitScreen>
      <Card title="Set-up link opened" tone="arrival">
        <p className="kit-name">{name}</p>
        <p className="muted">{kitSummary(arriving.inventory)}</p>
        {stored && (
          <p className="kit-warning">
            It replaces {stored.inventory.name}. {replaceWarning}
          </p>
        )}
        <button type="button" className="primary wide" onClick={onUse}>
          Use {name} on this phone
        </button>
        {stored && (
          <button type="button" className="quiet" onClick={onKeep}>
            Keep {stored.inventory.name}
          </button>
        )}
      </Card>
    </KitScreen>
  );
}

export function KitPage({ kit, errors, onDone, onKit }: { kit: KitFile; errors: string[]; onDone: () => void; onKit: (kit: KitFile) => void }) {
  const [replacing, setReplacing] = useState(errors.length > 0);
  return (
    <KitScreen
      action={
        <button type="button" className="secondary" onClick={onDone}>
          Done
        </button>
      }
    >
      <Errors errors={errors} />
      <Card title="Kit on this device">
        <p className="kit-name">{kit.inventory.name}</p>
        <p className="muted">{kitSummary(kit.inventory)}</p>
        <p className="kit-hash">kit {shortHash(kit)}</p>
        {!replacing && (
          <button type="button" className="secondary danger" onClick={() => setReplacing(true)}>
            Replace kit
          </button>
        )}
      </Card>
      {replacing && (
        <Card title="Replace kit">
          <p className="kit-warning">{replaceWarning}</p>
          <ImportPanel onKit={onKit} />
        </Card>
      )}
    </KitScreen>
  );
}
