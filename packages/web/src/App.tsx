import { useId, useState } from "react";
import { ListScreen } from "./ListScreen";
import { LoadScreen, type LoadChoice } from "./LoadScreen";
import { newCard, type Card } from "./plan";
import { ReverseScreen } from "./ReverseScreen";
import { useSettings } from "./settings";

const implementTabs = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbells" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "leg", label: "Leg attachment" },
  { id: "vest", label: "Vest" },
];

type View = "load" | "list" | "reverse";

const views: { id: View; label: string }[] = [
  { id: "load", label: "Load" },
  { id: "list", label: "List" },
  { id: "reverse", label: "Reverse" },
];

export function App() {
  const [settings, updateSettings] = useSettings();
  const [cards, setCards] = useState<Card[]>(() => [newCard(settings.implement)]);
  const selected = cards[0]?.implement ?? settings.implement;
  const [view, setView] = useState<View>("load");
  const tabIds = useId();
  const tabId = (implement: string) => `${tabIds}-${implement}`;

  const changeCards = (next: Card[]) => {
    const [first] = next;
    if (!first) return;
    setCards(next);
    if (first.implement !== settings.implement) updateSettings({ implement: first.implement });
  };
  const selectImplement = (implement: string) => {
    if (implement !== selected) changeCards([newCard(implement), ...cards.slice(1)]);
  };
  const openInLoad = (choice: LoadChoice) => {
    changeCards([{ ...newCard(selected, choice.dumbbells), target: choice.target }, ...cards.slice(1)]);
    setView("load");
  };
  const sharedOptions = {
    collars: settings.collars,
    onCollarsChange: (collars: typeof settings.collars) => updateSettings({ collars }),
    uneven: settings.uneven,
    onUnevenChange: (uneven: boolean) => updateSettings({ uneven }),
  };

  return (
    <main className="app">
      <header className="masthead">
        <h1>plate-pool</h1>
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
      </header>
      <nav className="tabs" role="tablist" aria-label="Implements">
        {implementTabs.map(({ id, label }) => (
          <button
            key={id}
            id={tabId(id)}
            type="button"
            role="tab"
            aria-selected={id === selected}
            className="tab"
            onClick={() => selectImplement(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div role="tabpanel" aria-labelledby={tabId(selected)}>
        {view === "load" ? (
          <LoadScreen cards={cards} onCardsChange={changeCards} {...sharedOptions} />
        ) : view === "list" ? (
          <ListScreen key={selected} implement={selected} {...sharedOptions} onOpen={openInLoad} />
        ) : (
          <ReverseScreen key={selected} implement={selected} {...sharedOptions} />
        )}
      </div>
    </main>
  );
}
