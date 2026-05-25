# npm name reservations (M-1)

Throwaway stub packages used to **claim the `silicajs` namespace** on npm before any real code is written. Each subdirectory is a minimal `package.json` (version `0.0.0`) + `README.md` that gets published once to reserve the name.

After M0 lands the real monorepo (with actual implementations under `packages/`), this directory should be deleted.

## Packages to publish

| Directory               | npm name                  |
| ----------------------- | ------------------------- |
| `silicajs/`             | `silicajs`                |
| `silicajs-core/`        | `@silicajs/core`          |
| `silicajs-next/`        | `@silicajs/next`          |
| `silicajs-cli/`         | `@silicajs/cli`           |
| `silicajs-auth/`        | `@silicajs/auth`          |
| `silicajs-search/`      | `@silicajs/search`        |
| `silicajs-theme-default/` | `@silicajs/theme-default` |
| `silicajs-create/`      | `@silicajs/create`        |
| `create-silica/`        | `create-silica`           |

## How to publish them all

```bash
cd tools/npm-stubs
for d in */; do
  (cd "$d" && npm publish)
done
```

The `publishConfig.access` field in each `package.json` already sets `public`, so scoped packages publish as public without needing `--access public` on the command line.

## After publishing

Verify each is live:

```bash
for pkg in silicajs @silicajs/core @silicajs/next @silicajs/cli \
           @silicajs/auth @silicajs/search @silicajs/theme-default \
           @silicajs/create create-silica; do
  npm view "$pkg" version || echo "MISSING: $pkg"
done
```

Then delete this whole directory — the real packages will live under `packages/` once M0 lands.
