import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: path.join(projectRoot, "pages"),
  base: "/testproof/",
  plugins: [react()],
  css: {
    postcss: path.join(projectRoot, "postcss.config.mjs"),
  },
  build: {
    outDir: path.join(projectRoot, "dist-pages"),
    emptyOutDir: true,
  },
  server: {
    fs: { allow: [projectRoot] },
  },
});
