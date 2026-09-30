import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App";

afterEach(cleanup);

function typeTarget(value: string) {
  fireEvent.change(screen.getByLabelText("Target"), { target: { value } });
}

function pictureIn(name: RegExp) {
  const article = within(screen.getByRole("region", { name: "Result" })).getByRole("article", { name });
  return within(article).getByRole("img");
}

describe("barbell picture on the Load screen: worked examples (spec section 7)", () => {
  it("example 2: 173 lb draws one side of the bar, inside to outside, with the clamp collar", () => {
    render(<App />);
    typeTarget("173");
    const picture = pictureIn(/Exact/);
    expect(picture.tagName.toLowerCase()).toBe("svg");
    expect(picture.getAttribute("aria-label")).toBe(
      'Each side, inside to outside: 22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, then the Mirafit 1" clamp collar',
    );
  });

  it("example 2: labels each plate with its weight and names the collar in the picture", () => {
    render(<App />);
    typeTarget("173");
    const labels = [...pictureIn(/Exact/).querySelectorAll("text")].map((text) => text.textContent);
    expect(labels).toEqual(["22.5", "22.5", "5", "5", "5", "5", "5", "5", "2.5", "Clamp collar"]);
  });

  it("example 1: 175 lb draws a picture for the loading below and for the loading above", () => {
    render(<App />);
    typeTarget("175");
    expect(pictureIn(/Below/).getAttribute("aria-label")).toBe(
      'Each side, inside to outside: 22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, then the Mirafit 1" clamp collar',
    );
    expect(pictureIn(/Above/).getAttribute("aria-label")).toBe(
      'Each side, inside to outside: 22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25, then the Mirafit 1" clamp collar',
    );
  });

  it("example 3: 230 lb draws the heaviest allowed loading", () => {
    render(<App />);
    typeTarget("230");
    expect(pictureIn(/Heaviest allowed/).getAttribute("aria-label")).toBe(
      'Each side, inside to outside: 22.5, 22.5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, then the Mirafit 1" clamp collar',
    );
  });
});

describe("barbell picture on the Load screen: collars", () => {
  it("draws and names no collar when the collar choice is none", () => {
    render(<App />);
    typeTarget("173");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Collars" })).getByRole("radio", { name: "None" }));
    const picture = pictureIn(/Exact/);
    expect(picture.getAttribute("aria-label")).toBe("Each side, inside to outside: 22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5");
    expect(picture.textContent).not.toContain("collar");
  });
});

describe("barbell picture on the Load screen: other implements", () => {
  it.each([
    ["Vest", "12"],
    ["Kettlebell", "80"],
    ["Dumbbells", "40"],
  ])("draws its own picture, not the barbell picture, for the %s", (tab, target) => {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: tab }));
    typeTarget(target);
    const result = screen.getByRole("region", { name: "Result" });
    const picture = within(within(result).getByRole("article", { name: /Exact/ })).getByRole("img");
    expect(picture.getAttribute("aria-label")).not.toMatch(/^Each side/);
    expect(picture.textContent).not.toContain("collar");
  });
});
