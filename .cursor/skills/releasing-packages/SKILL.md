---
name: releasing-packages
description: How Silica packages are versioned and published from main via Changesets and GitHub Actions. Use when running release commands, troubleshooting publish issues, or working on release CI. For changeset authoring and PR prep, use the contributing skill instead.
---

# Releasing Packages

Releases happen from `main`, not from feature branches. Multiple changesets accumulate between releases.

## Automated release flow

On every push to `main`, the Release workflow (`.github/workflows/release.yml`):

1. Runs `npm run release:check`
2. If pending changesets exist → opens or updates the **Version Packages** PR (`changeset-release/main`)
3. If no pending changesets remain (Version Packages PR was merged) → runs `npm run release:publish`

Merge the Version Packages PR when ready to publish. npm trusted publishing uses OIDC — see the `npm-trusted-publishing` skill for setup.

## Release scripts

| Script                            | Command                                          | Purpose                                        |
| --------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| `npm run release:check`           | scaffold check + build + lint + typecheck + test | Validate repo before release                   |
| `npm run release:version`         | `changeset version` + `scaffold-versions:update` | Bump versions, update changelogs and scaffolds |
| `npm run release:publish`         | `changeset publish`                              | Publish changed packages to npm                |
| `npm run scaffold-versions:check` | sync scaffold package versions against published | CI guard for create template versions          |

## Manual commands (local debugging)

### Validate

```bash
npm run release:check
```

### Version (without opening a PR)

```bash
npm run release:version
```

Changesets reads pending `.changeset/*.md` files and:

- Bumps `version` in affected `package.json` files
- Updates internal dependency ranges where configured
- Generates/updates `CHANGELOG.md` per package
- Deletes consumed `.changeset/*.md` files

Then `scaffold-versions:update` syncs version pins in scaffold templates.

### Publish (after versions are bumped on main)

```bash
npm run release:publish
```

Requires npm authentication locally. In CI, OIDC trusted publishing replaces token auth.

## Key configuration

### `.changeset/config.json`

- `"fixed"` — `@silicajs/create` and `create-silica` share one version
- `"access": "public"` — scoped packages publish as public
- `"updateInternalDependencies": "patch"` — auto-bumps internal dep ranges on release

### Publishable packages

All packages under `packages/*` with `publishConfig` are publishable, except internal-only paths like `docs/`.

When adding a new publishable package:

1. Add `publishConfig`, `files`, `main`, `types`, and `exports` (follow existing packages).
2. If it should track `@silicajs/create` / `create-silica`, add it to the `"fixed"` array in `.changeset/config.json`.
3. Configure npm trusted publishing — see the `npm-trusted-publishing` skill.

## Version Packages PR notes

- CI and Require Changeset checks are skipped on `changeset-release/main`; Release posts the required status contexts after updating the PR.
- Do not hand-edit the Version Packages PR branch; let Changesets manage it.
- Feature PRs must still include a changeset (use `npx changeset --empty` when no package version should change).
