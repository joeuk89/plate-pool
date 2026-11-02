import { useEffect, useState } from "react";

type Outcome = { state: "idle" } | { state: "copied" } | { state: "manual"; url: string };

const copiedFor = 3000;

async function copy(url: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

async function shareUrl(url: string): Promise<Outcome> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ url });
      return { state: "idle" };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return { state: "idle" };
    }
  }
  return (await copy(url)) ? { state: "copied" } : { state: "manual", url };
}

export function ShareButton() {
  const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });
  useEffect(() => {
    if (outcome.state !== "copied") return;
    const timer = setTimeout(() => setOutcome({ state: "idle" }), copiedFor);
    return () => clearTimeout(timer);
  }, [outcome]);

  return (
    <div className="share">
      <button type="button" className="share-button" onClick={() => void shareUrl(window.location.href).then(setOutcome)}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="18" cy="5" r="2.75" />
          <circle cx="6" cy="12" r="2.75" />
          <circle cx="18" cy="19" r="2.75" />
          <path d="M8.4 10.6 15.6 6.4M8.4 13.4l7.2 4.2" />
        </svg>
        <span className="visually-hidden">Share</span>
      </button>
      <p role="status" className="share-status">
        {outcome.state === "copied" ? "Link copied" : ""}
      </p>
      {outcome.state === "manual" && (
        <div className="share-link">
          <label>
            <span>Link</span>
            <input type="text" readOnly autoFocus value={outcome.url} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <button type="button" onClick={() => setOutcome({ state: "idle" })}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
