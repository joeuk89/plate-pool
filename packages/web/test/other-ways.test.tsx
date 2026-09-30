import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Loading, LoadResult } from "@plate-pool/core";
import { App } from "../src/App";
import { OtherWays } from "../src/OtherWays";

afterEach(cleanup);

function typeTarget(value: string) {
  fireEvent.change(screen.getByLabelText("Target"), { target: { value } });
}

function text(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const otherWays = () => within(screen.getByRole("region", { name: "Result" })).queryByRole("group", { name: /Other ways to make this/ });

describe("Load screen: other ways to make this (spec 8.2)", () => {
  it("example 11: barbell 88 lb lists the other loadings in a collapsed list under the result", () => {
    render(<App />);
    typeTarget("88");
    const list = otherWays();
    expect(list).not.toBeNull();
    expect(list).toHaveProperty("open", false);
    expect(text(list!.querySelector("summary")!)).toBe("Other ways to make this (2)");

    const items = within(list!).getAllByRole("listitem");
    expect(items.map(text)).toEqual(["Each side 7 × 5", "Each side 6 × 5, 2 × 2.5"]);
  });

  it("opens when the owner taps it", () => {
    render(<App />);
    typeTarget("88");
    const list = otherWays()!;
    fireEvent.click(list.querySelector("summary")!);
    expect(list).toHaveProperty("open", true);
  });

  it("names each position for implements whose positions differ, and marks an uneven loading", () => {
    const loading = (positions: { name: string; plates: number[] }[], uneven = false): Loading => ({
      total: { lb: 47.5, kg: 21.5 },
      hardware: [{ id: "screw-standard", count: 2 }],
      positions,
      uneven,
      ...(uneven ? { heavier: "end-a" } : {}),
    });
    const result: LoadResult = {
      implement: "dumbbell",
      target: { lb: 47.5, kg: 21.5 },
      exact: true,
      loading: loading([{ name: "end-a", plates: [5, 5, 5, 5] }, { name: "end-b", plates: [5, 5, 5, 2.5] }], true),
      alternatives: [
        loading([{ name: "end-a", plates: [5, 5, 5, 2.5, 1.25] }, { name: "end-b", plates: [5, 5, 5, 2.5, 1.25] }]),
        loading([{ name: "end-a", plates: [22.5] }, { name: "end-b", plates: [5, 5, 2.5] }], true),
      ],
      warnings: [],
      unverified: [],
    };
    render(<OtherWays result={result} />);
    expect(screen.getAllByRole("listitem").map(text)).toEqual([
      "Each end 3 × 5, 1 × 2.5, 1 × 1.25",
      "End A heavier 1 × 22.5 End B 2 × 5, 1 × 2.5 Uneven",
    ]);
  });

  it("lists the other loadings of a pair of dumbbells", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Dumbbells" }));
    typeTarget("40");
    expect(within(otherWays()!).getAllByRole("listitem").map(text)).toEqual([
      "End A 3 × 5 End B 2 × 5, 2 × 2.5",
      "End A heavier 3 × 5, 1 × 1.25 End B 2 × 5, 1 × 2.5, 1 × 1.25 Uneven",
    ]);
  });

  it("lists the kettlebell's and the leg attachment's other stacks", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Kettlebell" }));
    typeTarget("50");
    expect(within(otherWays()!).getAllByRole("listitem").map(text)).toEqual([
      "Stack 5 × 5",
      "Stack 4 × 5, 2 × 2.5",
      "Stack 3 × 5, 4 × 2.5",
    ]);

    fireEvent.click(screen.getByRole("tab", { name: "Leg attachment" }));
    typeTarget("30");
    expect(text(otherWays()!.querySelector("summary")!)).toBe("Other ways to make this (4)");
  });

  it("shows nothing when no other loading reaches the target", () => {
    render(<App />);
    typeTarget("18");
    expect(otherWays()).toBeNull();
    typeTarget("175");
    expect(otherWays()).toBeNull();
  });
});
