import { describe, expect, it } from "vitest";
import { run } from "../src/main.js";

function runWith(args: string[]) {
  const output = { stdout: "", stderr: "" };
  const code = run(args, {
    stdout: (text) => (output.stdout += text),
    stderr: (text) => (output.stderr += text),
  });
  return { code, ...output };
}

describe("plate-pool command-line tool", () => {
  it("exits 1 with the reason on standard error for an unknown command", () => {
    const result = runWith(["weigh"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown command "weigh"');
  });

  it("exits 1 with usage on standard error when no command is given", () => {
    const result = runWith([]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Usage: plate-pool <command>");
  });
});
