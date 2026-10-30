import type { Loading } from "@plate-pool/core";

export function LoadedButton({ loading, onPin }: { loading: Loading; onPin: (loading: Loading) => void }) {
  const isCurrent = loading.changes?.count === 0;
  return (
    <button type="button" className="loaded" disabled={isCurrent} onClick={() => onPin(loading)}>
      Loaded
    </button>
  );
}
