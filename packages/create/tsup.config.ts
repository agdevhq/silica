import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["@silicajs/cli"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
