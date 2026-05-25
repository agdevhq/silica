import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["@silicajs/core", "@silicajs/next", "chokidar", "commander", "execa", "fs-extra"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
