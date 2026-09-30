import { useId } from "react";
import { LoadScreen } from "./LoadScreen";
import { useSettings } from "./settings";

const implementTabs = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbells" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "leg", label: "Leg attachment" },
  { id: "vest", label: "Vest" },
];

export function App() {
  const [settings, updateSettings] = useSettings();
  const selected = settings.implement;
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
            onClick={() => updateSettings({ implement: id })}
          >
            {label}
          </button>
        ))}
      </nav>
      <div role="tabpanel" aria-labelledby={tabId(selected)}>
        <LoadScreen
          key={selected}
          implement={selected}
          collars={settings.collars}
          onCollarsChange={(collars) => updateSettings({ collars })}
          uneven={settings.uneven}
          onUnevenChange={(uneven) => updateSettings({ uneven })}
        />
      </div>
    </main>
  );
}
