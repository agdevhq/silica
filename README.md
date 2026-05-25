# Silica

Silica is a Next.js framework for publishing Obsidian vaults as polished, authenticated, server-rendered knowledge sites.

Write markdown in a `content/` folder, configure auth and theme in `silica.config.ts`, and run `silica dev`. Silica materializes the Next.js app under `.silica/` and handles wikilinks, backlinks, search, and Google OAuth — without turning your vault into a Next.js project.

## Status

Early bootstrap. The framework itself is not implemented yet.

| Area                            | Location                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Framework plan & milestones     | [`.cursor/plans/silica-framework-plan_ad281e20.plan.md`](.cursor/plans/silica-framework-plan_ad281e20.plan.md) |
| Quartz research (reference SSG) | [`docs/research/quartz.md`](docs/research/quartz.md)                                                           |
| npm namespace stubs (M-1)       | [`tools/npm-stubs/`](tools/npm-stubs/)                                                                         |

## Packages (planned)

`silicajs`, `@silicajs/core`, `@silicajs/next`, `@silicajs/cli`, `@silicajs/auth`, `@silicajs/search`, `@silicajs/theme-default`, `@silicajs/create`, `create-silica`
