import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ResolvedConfig } from "vite";

const workerFile = "sw.js";

function filesUnder(root: string, dir = root): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(root, path) : [relative(root, path).split(sep).join("/")];
  });
}

function precacheOf(contents: Map<string, string | Uint8Array>): { version: string; files: string[] } {
  const files = [...contents.keys()].sort();
  const hash = createHash("sha256");
  for (const file of files) hash.update(file).update("\0").update(contents.get(file)!).update("\0");
  return { version: hash.digest("hex").slice(0, 16), files };
}

export function serviceWorker(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "plate-pool:service-worker",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    buildStart() {
      this.emitFile({ type: "chunk", id: fileURLToPath(new URL("worker.ts", import.meta.url)), fileName: workerFile });
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const worker = bundle[workerFile];
        if (worker?.type !== "chunk") throw new Error(`The build has no ${workerFile} chunk`);

        const contents = new Map<string, string | Uint8Array>();
        for (const [file, output] of Object.entries(bundle)) {
          if (file !== workerFile) contents.set(file, output.type === "chunk" ? output.code : output.source);
        }
        if (config.build.copyPublicDir && existsSync(config.publicDir)) {
          for (const file of filesUnder(config.publicDir)) contents.set(file, readFileSync(join(config.publicDir, file)));
        }

        worker.code = worker.code.replaceAll(/\b__PRECACHE__\b/g, `(${JSON.stringify(precacheOf(contents))})`);
      },
    },
  };
}
