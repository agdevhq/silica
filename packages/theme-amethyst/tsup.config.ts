import { cpSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/**/*.test.ts",
    "!src/**/*.test.tsx",
    "!src/**/*.d.ts",
  ],
  format: ["esm"],
  bundle: false,
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@silicajs/components",
    "@silicajs/core",
    "@silicajs/core/runtime",
    "@silicajs/core/theme",
    "@silicajs/remark-obsidian",
    "@silicajs/ui",
    "react",
    "react-dom",
    "react/jsx-runtime",
  ],
  onSuccess: async () => {
    cpSync("src/styles.css", "dist/styles.css");
  },
});
