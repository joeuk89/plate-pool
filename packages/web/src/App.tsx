import { useEffect, useState } from "react";
import { Calculator } from "./Calculator";
import { kitFromSetupLink, setupPayload, shortHash, type KitFile } from "./kit-file";
import { ConfirmCard, EmptyKitScreen, KitPage, OpeningLink } from "./KitScreen";
import { readStoredKit, storeKit } from "./stored-kit";

type Arrival = { state: "opening" } | { state: "ready"; kit: KitFile } | { state: "failed"; errors: string[] };

function replaceUrl(url: URL): void {
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function dropFragment(): void {
  const url = new URL(window.location.href);
  url.hash = "";
  replaceUrl(url);
}

function dropParameter(name: string): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  replaceUrl(url);
}

export function App() {
  const [kit, setKit] = useState(readStoredKit);
  const [arrival, setArrival] = useState<Arrival | undefined>(() =>
    setupPayload(window.location.hash) === undefined ? undefined : { state: "opening" },
  );
  const [kitPage, setKitPage] = useState(false);

  useEffect(() => {
    const payload = setupPayload(window.location.hash);
    if (payload === undefined) return;
    let open = true;
    void kitFromSetupLink(payload).then((read) => {
      if (!open) return;
      if ("errors" in read) return setArrival({ state: "failed", errors: read.errors });
      if (read.kit.sha256 === kit?.sha256) {
        dropFragment();
        return setArrival(undefined);
      }
      setArrival({ state: "ready", kit: read.kit });
    });
    return () => {
      open = false;
    };
  }, []);

  const install = (next: KitFile) => {
    const replacing = kit !== undefined;
    storeKit(next, { replacing });
    dropFragment();
    // A replaced kit's hash no longer describes the targets, so the new kit must not see them as a mismatch.
    if (replacing) dropParameter("kit");
    setKit(next);
    setArrival(undefined);
    setKitPage(false);
  };
  const failed = arrival?.state === "failed" ? arrival.errors : [];

  if (arrival?.state === "opening") return <OpeningLink />;
  if (arrival?.state === "ready") {
    return (
      <ConfirmCard
        arriving={arrival.kit}
        {...(kit ? { stored: kit } : {})}
        onUse={() => {
          dropParameter("view");
          install(arrival.kit);
        }}
        onKeep={() => {
          dropFragment();
          setArrival(undefined);
        }}
      />
    );
  }
  if (!kit) return <EmptyKitScreen errors={failed} onKit={install} />;
  if (kitPage || failed.length > 0) {
    return (
      <KitPage
        kit={kit}
        errors={failed}
        onKit={install}
        onDone={() => {
          if (failed.length > 0) dropFragment();
          setArrival(undefined);
          setKitPage(false);
        }}
      />
    );
  }
  return (
    <Calculator
      key={kit.sha256}
      inventory={kit.inventory}
      kit={{ name: kit.inventory.name, hash: shortHash(kit), onOpen: () => setKitPage(true) }}
    />
  );
}
