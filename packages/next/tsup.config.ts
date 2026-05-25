import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/theme.ts",
    "src/proxy.ts",
    "src/primitives/index.tsx",
    "src/routes/page.tsx",
    "src/routes/tags-page.tsx",
    "src/routes/layout.tsx",
    "src/routes/not-found.tsx",
    "src/routes/sign-in.tsx",
    "src/routes/not-allowed.tsx",
    "src/routes/api-auth.ts",
    "src/routes/api-search.ts",
    "src/routes/api-revalidate.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["next", "react", "react-dom", "react/jsx-runtime", "@silicajs/theme-default"],
});
