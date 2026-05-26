import { cpSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/**/*.test.ts",
    "!src/**/*.test.tsx",
    "!src/template-files/**/*",
  ],
  format: ["esm"],
  bundle: false,
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@silicajs/auth",
    "@silicajs/core",
    "@silicajs/core/runtime",
    "@silicajs/search",
    "@silicajs/theme-default",
    "better-auth/next-js",
    "fs-extra",
    "next",
    "next/cache",
    "next/navigation",
    "next/server",
    "react",
    "react-dom",
    "react/jsx-runtime",
  ],
  onSuccess: async () => {
    cpSync("src/template-files", "dist/template-files", { recursive: true });
  },
});
