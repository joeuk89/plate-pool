import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { run } from "../src/main.js";

const guidePath = fileURLToPath(new URL("../../../docs/agent-guide.md", import.meta.url));
const inventoryPath = fileURLToPath(new URL("../../../inventory/inventory.json", import.meta.url));
const guide = readFileSync(guidePath, "utf8");

interface Example {
  args: string[];
  documented: unknown;
}

function examples(): Example[] {
  const pattern = /```sh\nnpx plate-pool (.+)\n```\n(?:(?!```)[\s\S])*```json\n([\s\S]*?)\n```/g;
  return [...guide.matchAll(pattern)].map(([, command, json]) => ({
    args: command!.split(" "),
    documented: JSON.parse(json!),
  }));
}

function runCli(args: string[]) {
  let stdout = "";
  let stderr = "";
  const code = run(args, {
    stdout: (text) => (stdout += text),
    stderr: (text) => (stderr += text),
    defaultInventoryPath: inventoryPath,
  });
  return { code, stdout, stderr };
}

function firstOfEachList(inventory: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(inventory).map(([key, value]) => [key, Array.isArray(value) ? value.slice(0, 1) : value]));
}

describe("the agent guide", () => {
  it("shows one JSON example for each command", () => {
    expect(examples().map(({ args }) => args[0])).toEqual(["load", "list", "reverse", "inventory"]);
  });

  it.each(examples().map((example) => [example.args.join(" "), example] as const))("prints the documented JSON for %s", (_, example) => {
    expect(example.args).toContain("--json");
    const { code, stdout, stderr } = runCli(example.args);
    expect(stderr).toBe("");
    expect(code).toBe(0);
    const output = JSON.parse(stdout);
    const expected = example.args[0] === "inventory" ? firstOfEachList(output) : output;
    expect(example.documented).toEqual(expected);
  });

  it.each([...guide.matchAll(/npx plate-pool ((?:load|list|reverse|inventory)[^`\n]*)/g)].map(([, command]) => command!))(
    "runs npx plate-pool %s as written",
    (command) => {
      const { code, stderr } = runCli(command.split(" "));
      expect(stderr).toBe("");
      expect(code).toBe(0);
    },
  );

  it("gives the static JSON URLs", () => {
    expect(guide).toContain("https://joeuk89.github.io/plate-pool/api/inventory.json");
    expect(guide).toContain("https://joeuk89.github.io/plate-pool/api/achievable.json");
  });

  it("holds a snippet to paste into another repo's agent instructions", () => {
    expect(guide).toMatch(/## Snippet for agent instructions\n[\s\S]*?```markdown\n[\s\S]+?\n```/);
  });

  it("holds no dates or prices", () => {
    expect(guide).not.toMatch(/\d{4}-\d{2}-\d{2}|[£$€]\s?\d/);
  });
});
