// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, type Deployment } from "./build-app";

const inventoryFile = new URL("../../../inventory/inventory.json", import.meta.url);

let deployment: Deployment;

function deployed(file: string): string {
  return readFileSync(join(deployment.outDir, file), "utf8");
}

beforeAll(async () => {
  deployment = await buildApp();
}, 60_000);

afterAll(() => deployment.remove());

describe("static JSON (spec 10)", () => {
  it("publishes the inventory file as deployed at api/inventory.json", () => {
    expect(deployed("api/inventory.json")).toBe(readFileSync(inventoryFile, "utf8"));
  });
});
