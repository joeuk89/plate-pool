import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { run } from "../src/main.js";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const guide = readFileSync(`${repoRoot}docs/agent-guide.md`, "utf8");
const inventoryBytes = readFileSync(`${repoRoot}inventory/inventory.json`);
const inventory = JSON.parse(inventoryBytes.toString("utf8"));
const implementIds: string[] = inventory.implements.map((implement: { id: string }) => implement.id);
const snippet = /## Snippet for agent instructions\n[\s\S]*?```markdown\n([\s\S]+?)\n```/.exec(guide)?.[1] ?? "";

interface Example {
  args: string[];
  documented: any;
}

function examples(): Example[] {
  const pattern = /```sh\nnpx plate-pool (.+)\n```\n(?:(?!```)[\s\S])*```json\n([\s\S]*?)\n```/g;
  return [...guide.matchAll(pattern)].map(([, command, json]) => ({
    args: command!.split(" "),
    documented: JSON.parse(json!),
  }));
}

function argsOf(command: string): string[] {
  return command.replace(/\s*>\s*\S+$/, "").split(" ");
}

function runCli(args: string[]) {
  let stdout = "";
  let stderr = "";
  const withInventory = args.includes("--inventory") ? args : [...args, "--inventory", "inventory/inventory.json"];
  const resolved = withInventory.map((arg) => (arg === "inventory/inventory.json" ? `${repoRoot}inventory/inventory.json` : arg));
  const code = run(resolved, {
    stdout: (text) => (stdout += text),
    stderr: (text) => (stderr += text),
    variables: {},
  });
  return { code, stdout, stderr };
}

function firstOfEachList(file: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(file).map(([key, value]) => [key, Array.isArray(value) ? value.slice(0, 1) : value]));
}

function firstRowOfFirstTable(document: any) {
  const [first] = document.tables;
  return { ...document, tables: [{ ...first, rows: first.rows.slice(0, 1) }] };
}

function documentedAchievable() {
  return examples().find(({ args }) => args[0] === "achievable")!.documented;
}

function perLineLinks(text: string): URL[] {
  return [...text.matchAll(/https:\/\/joeuk89\.github\.io\/plate-pool\/\?[^\s`)<>]+/g)].map(([link]) => new URL(link));
}

function setUpLinkCommands(text: string): string[] {
  return [...text.matchAll(/(node -e '[^'\n]+' "\$PLATE_POOL_INVENTORY")/g)].map(([, command]) => command!);
}

describe("the agent guide", () => {
  it("shows one JSON example for each command, and one for load --from", () => {
    expect(examples().map(({ args }) => args[0])).toEqual(["load", "load", "list", "reverse", "inventory", "achievable"]);
    expect(examples()[1]!.args).toContain("--from");
  });

  it("documents ids, smallest and the changes block", () => {
    expect(guide).toMatch(/`ids`/);
    expect(guide).toMatch(/`smallest`/);
    expect(guide).toMatch(/`changes`[\s\S]*`keep`[\s\S]*`remove`[\s\S]*`add`/);
  });

  it("says an inventory is required", () => {
    expect(guide).toContain("--inventory <path>");
    expect(guide).toContain("PLATE_POOL_INVENTORY");
  });

  it.each(examples().map((example) => [example.args.join(" "), example] as const))("prints the documented JSON for %s", (_, example) => {
    if (example.args[0] !== "achievable") expect(example.args).toContain("--json");
    const { code, stdout, stderr } = runCli(example.args);
    expect(stderr).toBe("");
    expect(code).toBe(0);
    const output = JSON.parse(stdout);
    if (example.args[0] === "inventory") return expect(example.documented).toEqual(firstOfEachList(output));
    if (example.args[0] === "achievable") {
      expect(example.documented.inventory_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(output.inventory_sha256).toBe(createHash("sha256").update(inventoryBytes).digest("hex"));
      return expect(example.documented).toEqual({ ...firstRowOfFirstTable(output), inventory_sha256: example.documented.inventory_sha256 });
    }
    expect(example.documented).toEqual(output);
  });

  it("lists the achievable tables in the order the tool writes them", () => {
    const { stdout } = runCli(["achievable"]);
    const tables = JSON.parse(stdout).tables.map(({ implement, hardware, pair }: any) =>
      [implement, hardware, pair === undefined ? undefined : pair ? "pair" : "single"].filter(Boolean).join(" "),
    );
    const documented = [...guide.matchAll(/^\d+\. (`[^\n]+)$/gm)].map(([, line]) => line!.replaceAll("`", "").replace(/,/g, ""));
    expect(documented).toEqual(tables);
  });

  it.each([...guide.matchAll(/npx plate-pool ((?:load|list|reverse|inventory|achievable)[^`\n]*)/g)].map(([, command]) => command!))(
    "runs npx plate-pool %s as written",
    (command) => {
      const { code, stderr } = runCli(argsOf(command));
      expect(stderr).toBe("");
      expect(code).toBe(0);
    },
  );

  it.each(setUpLinkCommands(guide))("builds a set-up link that carries the file's bytes with %s", (command) => {
    const link = execFileSync("sh", ["-c", command], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, PLATE_POOL_INVENTORY: "inventory/inventory.json" },
    }).trim();
    const prefix = "https://joeuk89.github.io/plate-pool/#inventory=";
    expect(link.startsWith(prefix)).toBe(true);
    const payload = link.slice(prefix.length);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(inflateRawSync(Buffer.from(payload, "base64url")).equals(inventoryBytes)).toBe(true);
  });

  it("builds per-line links with a unit on every target and the documented kit hash", () => {
    const links = perLineLinks(guide);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.searchParams.get("kit")).toBe(documentedAchievable().inventory_sha256.slice(0, 8));
      for (const [parameter, value] of link.searchParams) {
        const [id, suffix] = parameter.split(".");
        if (["kit", "view", "uneven"].includes(parameter) || suffix === "hardware") continue;
        expect(implementIds).toContain(id);
        expect(value).toMatch(/^\d+(\.\d+)?(lb|kg)$/);
      }
    }
  });

  it("names no static JSON, no 18 lb rule and no retired parameter", () => {
    expect(guide).not.toContain("/api/");
    expect(guide).not.toMatch(/18 lb plus/);
    expect(guide).not.toMatch(/`dumbbells`|`collars`|--collars|--blocks/);
  });

  describe("snippet for another repo's agent instructions", () => {
    it("is there", () => {
      expect(snippet).not.toBe("");
    });

    it("gets the athlete's tables with achievable", () => {
      expect(snippet).toMatch(/npx plate-pool achievable/);
    });

    it("builds a set-up link and a per-line link", () => {
      expect(setUpLinkCommands(snippet)).toHaveLength(1);
      expect(snippet).toMatch(/https:\/\/joeuk89\.github\.io\/plate-pool\/\?/);
      expect(snippet).toMatch(/kit=/);
    });

    it("keeps the four rules that hold for every kit", () => {
      expect(snippet).toMatch(/target is a total/i);
      expect(snippet).toMatch(/share one plate pool/i);
      expect(snippet).toMatch(/order is its priority/i);
      expect(snippet).toMatch(/`warnings`/);
      expect(snippet).toMatch(/`unverified`/);
    });
  });

  it("holds no dates or prices", () => {
    expect(guide).not.toMatch(/\d{4}-\d{2}-\d{2}|[£$€]\s?\d/);
  });
});
