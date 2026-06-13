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
    "@core-ai/core-ai",
    "@silicajs/components",
    "@silicajs/core",
    "@silicajs/core/runtime",
    "@silicajs/next",
    "@silicajs/next/server-data",
    "@silicajs/ui",
    "just-bash",
    "react",
    "react-dom",
    "react/jsx-runtime",
  ],
});
