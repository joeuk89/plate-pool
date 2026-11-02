import type { Loading, LoadResult } from "@plate-pool/core";
import { countText } from "./changes-text";
import { positionRows } from "./describe";
import { canPair, implementOf, lower, useKit } from "./kit";
import { LoadedButton } from "./LoadedButton";

interface Props {
  result: LoadResult;
  onPin?: (loading: Loading) => void;
}

export function OtherWays({ result, onPin }: Props) {
  const inventory = useKit();
  if (result.alternatives.length === 0) return null;
  const pair = canPair(inventory, result.implement) && result.pair !== false;
  const perPair = pair ? lower(implementOf(inventory, result.implement)?.name ?? result.implement) : undefined;
  return (
    <details className="other-ways" aria-label="Other ways to make this">
      <summary>{`Other ways to make this (${result.alternatives.length})`}</summary>
      <ul>
        {result.alternatives.map((loading) => (
          <li key={JSON.stringify(loading.positions)}>
            {loading.changes && <p className="changes-count">{countText(loading.changes.count, perPair)}</p>}
            <dl className="details">
              {positionRows(inventory, result.implement, loading).map(({ label, text, heavier }) => (
                <div key={label}>
                  <dt>
                    {label}
                    {heavier && <span className="heavier"> heavier</span>}
                  </dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            {loading.uneven && <p className="uneven">Uneven</p>}
            {onPin && <LoadedButton loading={loading} onPin={onPin} />}
          </li>
        ))}
      </ul>
    </details>
  );
}
