import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

const notices = readFileSync(new URL("../../packages/generator/THIRD_PARTY_NOTICES.md", import.meta.url), "utf8")
  + "\n\n" + readFileSync(new URL("../../packages/generator/licenses/halftheopposite-MIT.txt", import.meta.url), "utf8");

export default defineConfig({
  plugins: [react(), {
    name: "generator-license-notices",
    generateBundle() { this.emitFile({ type: "asset", fileName: "THIRD_PARTY_NOTICES.txt", source: notices }); },
  }],
  build: { outDir: "dist-generator", rollupOptions: { input: "generator.html" } },
});
