import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@next/env",
    "@silicajs/core",
    "@silicajs/next",
    "better-sqlite3",
    "chokidar",
    "commander",
    "execa",
    "fs-extra",
  ],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
