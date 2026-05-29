import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/**/*.test.ts",
    "!src/**/*.test.tsx",
  ],
  format: ["esm"],
  bundle: false,
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@silicajs/core",
    "@silicajs/core/runtime",
    "@silicajs/remark-obsidian",
    "@silicajs/ui",
    "react",
    "react-dom",
    "react/jsx-runtime",
  ],
});
