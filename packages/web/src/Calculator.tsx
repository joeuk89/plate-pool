import type { Inventory } from "@plate-pool/core";
import { useEffect, useId, useState } from "react";
import { useCurrentLoadings, type PinnedLoading } from "./current";
import { KitContext } from "./kit";
import { linkQuery, readLink, type View } from "./links";
import { ListScreen } from "./ListScreen";
import { LoadScreen, type LoadChoice } from "./LoadScreen";
import { newCard, type Card } from "./plan";
import { moveItem } from "./reorder";
import { ReverseScreen } from "./ReverseScreen";
import { ShareButton } from "./ShareButton";
import { useSettings, type SettingsChange } from "./settings";

const views: { id: View; label: string }[] = [
  { id: "load", label: "Load" },
  { id: "list", label: "List" },
  { id: "reverse", label: "Reverse" },
];

export interface StoredKitName {
  name: string;
  /** The first 8 hex characters of the kit's SHA-256. */
  hash: string;
  onOpen: () => void;
}

interface CalculatorProps {
  inventory: Inventory;
  kit?: StoredKitName;
}

export function Calculator(props: CalculatorProps) {
  return (
    <KitContext.Provider value={props.inventory}>
      <Screens {...props} />
    </KitContext.Provider>
  );
}

function Screens({ inventory, kit }: CalculatorProps) {
  const [link] = useState(() => readLink(inventory, window.location.search));
  const [mismatch, setMismatch] = useState(() => kit !== undefined && link.kit !== undefined && link.kit !== kit.hash);
  const [settings, updateSettings] = useSettings(inventory, link.settings);
  const [cards, setCards] = useState<Card[]>(() => (link.cards.length > 0 ? link.cards : [newCard(inventory, settings.implement)]));
  const selected = cards[0]?.implement ?? settings.implement;
  const [view, setView] = useState<View>(link.view);
  const [current, pin] = useCurrentLoadings(inventory);
  useEffect(() => {
    const query = linkQuery(inventory, { cards, settings, view, kit: mismatch ? link.kit : kit?.hash });
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${query}${window.location.hash}`);
  }, [inventory, cards, settings, view, mismatch, link.kit, kit?.hash]);
  const tabIds = useId();
  const tabId = (implement: string) => `${tabIds}-${implement}`;

  const changeCards = (next: Card[]) => {
    const [first] = next;
    if (!first) return;
    setCards(next);
    setMismatch(false);
    if (first.implement !== settings.implement) updateSettings({ implement: first.implement });
  };
  const selectImplement = (implement: string) => {
    if (implement === selected) return;
    const held = cards.findIndex((card) => card.implement === implement);
    if (held > 0) changeCards(moveItem(cards, held, 0));
    else changeCards([newCard(inventory, implement), ...cards.slice(1)]);
  };
  const changePair = (pair: boolean) => changeCards([{ ...cards[0]!, pair }, ...cards.slice(1)]);
  const openInLoad = (choice: LoadChoice) => {
    changeCards([{ ...newCard(inventory, selected, choice.pair), target: choice.target }, ...cards.slice(1)]);
    setView("load");
  };
  const pinFromReverse = (pinned: PinnedLoading, choice: LoadChoice) => {
    pin(selected, pinned);
    openInLoad(choice);
  };
  const sharedOptions = {
    hardware: settings.hardware,
    onHardwareChange: (implement: string, choice: string | undefined) => updateSettings({ hardware: { implement, choice } } satisfies SettingsChange),
    uneven: settings.uneven,
    onUnevenChange: (uneven: boolean) => updateSettings({ uneven }),
  };

  return (
    <main className="app">
      <header className="masthead">
        <div className="brand">
          <h1>plate-pool</h1>
          {kit && (
            <button type="button" className="kit-chip" onClick={kit.onOpen}>
              {kit.name}
              <span aria-hidden="true"> ▾</span>
            </button>
          )}
        </div>
        <nav aria-label="Screens" className="views">
          {views.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="view"
              aria-current={id === view ? "page" : undefined}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <ShareButton />
      </header>
      {mismatch && (
        <p role="status" className="mismatch">
          These targets were worked out for a different kit. Open your set-up link again if your gym has changed.
        </p>
      )}
      <nav className="tabs" role="tablist" aria-label="Implements">
        {inventory.implements.map(({ id, name }) => (
          <button
            key={id}
            id={tabId(id)}
            type="button"
            role="tab"
            aria-selected={id === selected}
            className="tab"
            onClick={() => selectImplement(id)}
          >
            {name}
          </button>
        ))}
      </nav>
      <div role="tabpanel" aria-labelledby={tabId(selected)}>
        {view === "load" ? (
          <LoadScreen cards={cards} onCardsChange={changeCards} {...sharedOptions} current={current} onPin={pin} />
        ) : view === "list" ? (
          <ListScreen
            key={selected}
            implement={selected}
            {...sharedOptions}
            pair={cards[0]?.pair ?? true}
            onPairChange={changePair}
            onOpen={openInLoad}
          />
        ) : (
          <ReverseScreen key={selected} implement={selected} {...sharedOptions} onPin={pinFromReverse} />
        )}
      </div>
    </main>
  );
}
