import type { Loading, LoadResult } from "@plate-pool/core";
import { endLabel, plateList } from "./describe";

const positionNouns: Record<string, string> = { barbell: "side", dumbbell: "end" };

export function OtherWays({ result }: { result: LoadResult }) {
  if (result.alternatives.length === 0) return null;
  return (
    <details className="other-ways" aria-label="Other ways to make this">
      <summary>{`Other ways to make this (${result.alternatives.length})`}</summary>
      <ul>
        {result.alternatives.map((loading) => (
          <li key={JSON.stringify(loading.positions)}>
            <dl className="details">
              {positionRows(result.implement, loading).map(({ label, plates, heavier }) => (
                <div key={label}>
                  <dt>
                    {label}
                    {heavier && <span className="heavier"> heavier</span>}
                  </dt>
                  <dd>{plateList(plates)}</dd>
                </div>
              ))}
            </dl>
            {loading.uneven && <p className="uneven">Uneven</p>}
          </li>
        ))}
      </ul>
    </details>
  );
}

function positionRows(implement: string, loading: Loading): { label: string; plates: number[]; heavier?: boolean }[] {
  const [first, ...rest] = loading.positions;
  const noun = positionNouns[implement];
  const mirrored = first && rest.length > 0 && rest.every((position) => position.plates.join() === first.plates.join());
  if (noun && first && mirrored) return [{ label: `Each ${noun}`, plates: first.plates }];
  return loading.positions.map(({ name, plates }) => ({ label: positionLabel(name), plates, heavier: name === loading.heavier }));
}

function positionLabel(name: string): string {
  const end = endLabel(name);
  if (end !== name) return end;
  const words = name.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
