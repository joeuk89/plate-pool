import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { serviceWorker } from "./sw/plugin.ts";

export default defineConfig({
  base: "/plate-pool/",
  plugins: [react(), serviceWorker()],
  resolve: {
    alias: {
      "@plate-pool/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
  },
});
