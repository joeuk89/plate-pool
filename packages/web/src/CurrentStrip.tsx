import { reverseOf, stripPlates, type PinnedLoading } from "./current";
import { implementOf, unitOf, useKit } from "./kit";

interface Props {
  implement: string;
  pinned: PinnedLoading;
  hardware: Record<string, string>;
  onUnload: () => void;
}

export function CurrentStrip({ implement, pinned, hardware, onUnload }: Props) {
  const inventory = useKit();
  const unit = unitOf(inventory, implement);
  const { total } = reverseOf(inventory, implement, pinned, hardware);
  return (
    <section aria-label="Current loading" className="strip">
      <p className="strip-text">
        <span className="strip-place">{implementOf(inventory, implement)?.name ?? implement}</span>
        <span aria-hidden="true"> · </span>
        <span className="strip-total">{`${total[unit]} ${unit}`}</span>
        <span aria-hidden="true"> · </span>
        <span className="strip-plates">{stripPlates(inventory, implement, pinned.positions)}</span>
      </p>
      <button type="button" className="unload" onClick={onUnload}>
        Unload
      </button>
    </section>
  );
}
