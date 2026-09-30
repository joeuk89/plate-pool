import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, type Plugin } from "vite";

const webRoot = fileURLToPath(new URL("..", import.meta.url));

export type Deployment = { outDir: string; remove: () => void };

export async function buildApp(options: { title?: string } = {}): Promise<Deployment> {
  const outDir = mkdtempSync(join(tmpdir(), "plate-pool-web-"));
  const plugins: Plugin[] = [];
  if (options.title) {
    const title = options.title;
    plugins.push({ name: "test:title", transformIndexHtml: (html) => html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`) });
  }
  await build({ root: webRoot, logLevel: "silent", plugins, build: { outDir, emptyOutDir: true } });
  return { outDir, remove: () => rmSync(outDir, { recursive: true, force: true }) };
}
