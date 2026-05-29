---
name: contributing
description: Branch naming, changeset authoring, and PR conventions for this monorepo. Use when creating branches, committing, writing changesets, opening PRs, or running pre-merge checks.
---

# Contributing

## Branch Naming

```
main (protected, always releasable)
 ├── feat/add-streaming-cache
 ├── fix/cli-entrypoints
 └── chore/update-deps
```

| Prefix      | Use                                        |
| ----------- | ------------------------------------------ |
| `feat/`     | New feature or capability                  |
| `fix/`      | Bug fix                                    |
| `chore/`    | Tooling, deps, CI, docs                    |
| `refactor/` | Code restructuring without behavior change |

No long-lived `develop` or `release/*` branches. Feature/fix branches are short-lived, branched from `main`, merged via PR.

## Changesets

Every PR **must** include a changeset. Changesets drive version bumps and changelog generation.

### Creating a changeset

Prefer the interactive CLI:

```bash
npm run changeset
```

This prompts for affected packages, bump type, and a summary, then writes a `.changeset/<random-name>.md` file.

### Changeset file format

If writing a changeset by hand, use this exact format:

```md
---
"@silicajs/cli": patch
---

Short description of the change for the changelog.
```

Rules:

- YAML frontmatter between `---` delimiters (required)
- Package names are **quoted** with single quotes
- Bump type is one of: `patch`, `minor`, `major`
- Body below the frontmatter is the changelog entry

### Pre-1.0 versioning

While packages are below `1.0.0`, use `minor` for breaking changes instead of `major`. Changesets does not auto-downgrade major bumps for pre-1.0 packages — a `major` on `0.x.y` will jump straight to `1.0.0`. Use `major` only when intentionally releasing `1.0.0`.

### Fixed version group

These packages share a single version number:

- `@silicajs/create`
- `create-silica`

Selecting either package in a changeset bumps both to the same version.

All other publishable packages are versioned independently. List only the packages that actually changed.

### Empty changesets

For changes that do not affect published packages (CI, internal tooling, docs, tests):

```bash
npx changeset --empty
```

Do **not** hand-write empty changeset files. CI runs `changeset status --since=main`, which only recognizes changesets created through the CLI (including `--empty`).

The release automation requires a changeset on every PR to function correctly.

### Dependabot PRs

Dependabot PRs get a changeset automatically in the **Require Changeset** workflow:

| Change                                                                                                        | Changeset                                                            |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Runtime dependency bump in a publishable package (`dependencies`, `peerDependencies`, `optionalDependencies`) | `patch` on each affected package, e.g. `Bump better-auth to 1.6.12.` |
| Dev dependencies, CI, lockfile-only, or other non-release changes                                             | `npx changeset --empty`                                              |

Publishable packages are those with `publishConfig.access: public` and not `private: true`.

## PR Conventions

### Pre-merge checklist

Before opening or updating a PR, verify:

1. Code changes are complete and tested
2. `npm run release:check` passes (build + lint + typecheck + test + scaffold version sync)
3. Changeset file is included
4. PR description explains **what** and **why**

### Typical flow

```bash
git checkout -b feat/my-feature main

# Make changes, commit as you go
git add . && git commit -m "implement feature X"

# Add changeset before opening PR
npm run changeset
git add .changeset/ && git commit -m "add changeset"

# Push and open PR
git push -u origin feat/my-feature
```

After review, merge to `main` (squash).

## Quick Reference

| Task                  | Command / Action                 |
| --------------------- | -------------------------------- |
| Start feature         | `git checkout -b feat/name main` |
| Add changeset         | `npm run changeset`              |
| Empty changeset       | `npx changeset --empty`          |
| Validate before merge | `npm run release:check`          |
