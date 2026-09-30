import { LoadScreen } from "./LoadScreen";

export function App() {
  return (
    <main className="app">
      <header className="masthead">
        <h1>plate-pool</h1>
      </header>
      <nav className="tabs" role="tablist" aria-label="Implements">
        <button type="button" role="tab" aria-selected="true" className="tab">
          Barbell
        </button>
      </nav>
      <LoadScreen />
    </main>
  );
}
