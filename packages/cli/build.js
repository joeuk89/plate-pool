import { copyFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));

rmSync(path("dist"), { recursive: true, force: true });

await build({
  entryPoints: [path("src/bin.ts")],
  outfile: path("dist/bin.js"),
  tsconfig: path("tsconfig.json"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
});

copyFileSync(path("../../inventory/inventory.json"), path("dist/inventory.json"));
