import { useState } from "react";
import { cardLabel, freeCount, type Card, type DumbbellChoice } from "./plan";
import { inventory } from "./inventory";

interface Props {
  cards: Card[];
  onAdd: (implement: string, dumbbells: DumbbellChoice) => void;
}

export function AddImplement({ cards, onAdd }: Props) {
  const [choosing, setChoosing] = useState(false);
  const choices = inventory.implements.flatMap(({ id }) => {
    const free = freeCount(cards, id);
    if (free <= 0) return [];
    const dumbbells: DumbbellChoice = id === "dumbbell" && free < 2 ? "one" : "pair";
    return [{ id, dumbbells, label: cardLabel({ implement: id, dumbbells }) }];
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
      {choices.map(({ id, dumbbells, label }) => (
        <button
          key={id}
          type="button"
          className="add-choice"
          onClick={() => {
            onAdd(id, dumbbells);
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
