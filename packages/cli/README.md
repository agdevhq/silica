# @silicajs/cli

The `silica` command-line interface.

Commands:

- `silica create <dir>` — scaffold user-facing vault files only.
- `silica dev` — materialize `.silica/next`, precompute content, run `next dev`, and watch for content/config changes.
- `silica build` — materialize, precompute, and run `next build`.
- `silica start` — start the generated production app.

The CLI treats `.silica/next/` as a disposable build artifact.
