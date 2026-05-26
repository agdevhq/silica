# @silicajs/next

Next.js runtime adapter for Silica.

Exports generated route implementations, server data loaders, theme types, proxy auth helpers, and templates used by `@silicajs/cli` to materialize `.silica/next/`.

Generated route files are intentionally tiny re-exports so upgrading Silica is just a package bump plus a rerun of `silica dev` or `silica build`.
