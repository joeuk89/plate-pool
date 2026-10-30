import type { CollarChoice } from "@plate-pool/core";
import { reverseOf, stripPlace, stripPlates, type PinnedLoading } from "./current";
import { unitOf } from "./plan";

interface Props {
  implement: string;
  pinned: PinnedLoading;
  collars: CollarChoice;
  onUnload: () => void;
}

export function CurrentStrip({ implement, pinned, collars, onUnload }: Props) {
  const unit = unitOf(implement);
  const { total } = reverseOf(implement, pinned, collars);
  return (
    <section aria-label="Current loading" className="strip">
      <p className="strip-text">
        <span className="strip-place">{stripPlace(implement, pinned)}</span>
        <span aria-hidden="true"> · </span>
        <span className="strip-total">{`${total[unit]} ${unit}`}</span>
        <span aria-hidden="true"> · </span>
        <span className="strip-plates">{stripPlates(implement, pinned.positions)}</span>
      </p>
      <button type="button" className="unload" onClick={onUnload}>
        Unload
      </button>
    </section>
  );
}
