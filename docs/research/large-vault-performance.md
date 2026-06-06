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
