import { useId, useState } from "react";
import { LoadScreen } from "./LoadScreen";

const implementTabs = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbells" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "leg", label: "Leg attachment" },
  { id: "vest", label: "Vest" },
];

export function App() {
  const [selected, setSelected] = useState("barbell");
  const tabIds = useId();
  const tabId = (implement: string) => `${tabIds}-${implement}`;

  return (
    <main className="app">
      <header className="masthead">
        <h1>plate-pool</h1>
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
            onClick={() => setSelected(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div role="tabpanel" aria-labelledby={tabId(selected)}>
        <LoadScreen key={selected} implement={selected} />
      </div>
    </main>
  );
}
