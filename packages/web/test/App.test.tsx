import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("web app", () => {
  it("renders the app name", () => {
    expect(renderToString(<App />)).toContain("plate-pool");
  });
});
