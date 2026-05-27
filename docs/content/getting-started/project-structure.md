---
title: Project structure
description: What you author versus what Silica generates at build time.
---

## Your repository

```txt
my-vault/
├── content/              # Markdown vault (you edit this)
│   ├── index.md          # Home page at /
│   ├── guides/
│   │   └── setup.md      # Page at /guides/setup
│   └── images/
│       └── diagram.svg
├── public/               # Static files copied to the site root
│   └── favicon.svg
├── silica.config.ts      # Site configuration
├── package.json
├── .env                  # Auth secrets (not committed)
└── .silica/              # Generated — gitignore this
```

## Generated artifacts (`.silica/`)

Silica creates and updates `.silica/` on every `dev` or `build`:

| Path                        | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `.silica/next/`             | Full Next.js app (routes, API, theme wiring) |
| `.silica/manifest.json`     | Page index with titles and frontmatter       |
| `.silica/graph.json`        | Link graph and backlinks                     |
| `.silica/search-index.json` | FlexSearch index for server-side search      |
| `.silica/config.json`       | Resolved config for the runtime              |
| `.silica/build-id.txt`      | Cache-busting token                          |

Treat `.silica/next/` as disposable. Never edit it by hand — changes are overwritten on the next materialize step.

## URL mapping

File paths under `content/` map to URL slugs:

| File                      | Slug           | URL             |
| ------------------------- | -------------- | --------------- |
| `content/index.md`        | `index`        | `/`             |
| `content/guides/setup.md` | `guides/setup` | `/guides/setup` |
| `content/guides/index.md` | `guides/index` | `/guides`       |

Folder names become path segments. Add `index.md` inside a folder only when that folder needs its own URL with sibling pages alongside it — not as an empty section wrapper.

## Static assets

- Files referenced from markdown (images, PDFs) live alongside content or in subfolders like `content/images/`.
- Files in `public/` are served from the site root (e.g. `public/favicon.svg` → `/favicon.svg`).
- Vault assets are copied to `/silica/*` during precompute.

See [[writing/assets|Assets]] for embedding and linking details.
