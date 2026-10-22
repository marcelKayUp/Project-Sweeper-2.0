import { defineConfig } from "vite";
export default defineConfig({ build: { outDir: "dist-terminals", rollupOptions: { input: "terminals.html" } } });
