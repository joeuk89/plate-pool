import { useState } from "react";
import { LoadScreen } from "./LoadScreen";

const implementTabs = [
  { id: "barbell", label: "Barbell" },
  { id: "vest", label: "Vest" },
];

export function App() {
  const [implement, setImplement] = useState("barbell");
  return (
    <main className="app">
      <header className="masthead">
        <h1>plate-pool</h1>
      </header>
      <nav className="tabs" role="tablist" aria-label="Implements">
        {implementTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === implement}
            className="tab"
            onClick={() => setImplement(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <LoadScreen key={implement} implement={implement} />
    </main>
  );
}
