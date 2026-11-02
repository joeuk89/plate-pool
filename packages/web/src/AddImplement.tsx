import { useState } from "react";
import { canPair, useKit } from "./kit";
import { cardLabel, freeCount, type Card } from "./plan";

interface Props {
  cards: Card[];
  onAdd: (implement: string, pair: boolean) => void;
}

export function AddImplement({ cards, onAdd }: Props) {
  const inventory = useKit();
  const [choosing, setChoosing] = useState(false);
  const choices = inventory.implements.flatMap(({ id }) => {
    const free = freeCount(inventory, cards, id);
    if (free <= 0) return [];
    const pair = canPair(inventory, id) && free >= 2;
    return [{ id, pair, label: cardLabel(inventory, { implement: id, pair }) }];
  });
  if (choices.length === 0) return null;

  if (!choosing) {
    return (
      <button type="button" className="add" onClick={() => setChoosing(true)}>
        <span aria-hidden="true">+</span> Add implement
      </button>
    );
  }
  return (
    <div role="group" aria-label="Implement to add" className="add-choices">
      {choices.map(({ id, pair, label }) => (
        <button
          key={id}
          type="button"
          className="add-choice"
          onClick={() => {
            onAdd(id, pair);
            setChoosing(false);
          }}
        >
          {label}
        </button>
      ))}
      <button type="button" className="add-cancel" onClick={() => setChoosing(false)}>
        Cancel
      </button>
    </div>
  );
}
