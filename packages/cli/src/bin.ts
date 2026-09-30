#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { run } from "./main.js";

process.exitCode = run(process.argv.slice(2), {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  defaultInventoryPath: fileURLToPath(new URL("./inventory.json", import.meta.url)),
});
