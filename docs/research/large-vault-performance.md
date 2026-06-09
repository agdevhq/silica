# Large Vault Performance Diagnostics

Silica includes a generated large-vault fixture for performance diagnostics. The generated markdown files are intentionally ignored by git; only the generator and measurement scripts are tracked.

Use this when investigating build time, prerendered output size, RSC payload size, sidebar navigation scaling, search artifact size, or other large-site behavior.

```bash
npm run perf:large-vault:generate
npm run perf:large-vault:build
npm run perf:large-vault:measure
```

For browser testing:

```bash
npm run perf:large-vault:generate
PORT=3001 npm run perf:large-vault:dev
```

The fixture writes `docs/content-large/`, and the Silica docs config reads it when `SILICA_CONTENT_DIR=content-large` is set by the performance scripts.

## Build memory tuning

Large vaults can make Next.js static generation memory-bound because Silica uses Cache Components for generated pages. If memory grows during `Generating static pages`, tune the generated Next.js config through `silica.config.ts` instead of patching `.silica/next/next.config.ts` or `node_modules`.

```ts
import { defineConfig } from "@silicajs/core";

export default defineConfig({
  nextConfig: (base) => ({
    ...base,
    experimental: {
      ...(base.experimental as Record<string, unknown> | undefined),
      cpus: 1,
    },
    // Cache Components use `cacheHandlers` (plural), not `cacheHandler`.
    // cacheHandlers: {
    //   default: require.resolve("./cache-handlers/default.js"),
    // },
  }),
});
```

Lowering `experimental.cpus` reduces static-generation parallelism and peak memory. For Cache Components storage, configure `cacheHandlers.default` with a handler that implements Next.js's Cache Components cache handler interface.
