---
title: Installation
description: Create a new Silica vault and run it locally.
---

Silica keeps your repository focused on content. You write Markdown; Silica builds and serves the website.

1. Scaffold a project.
2. Add Markdown files under `content/`.
3. Run `npm run dev` and open `http://localhost:3000`.
4. Edit content — the site rebuilds automatically as you save.

## Create a new vault

```bash
npx create-silica my-vault
cd my-vault
npm install
npm run dev
```

This gives you a ready-to-edit vault:

- `content/index.md` — your home page
- `content/notes/getting-started.md` — a starter note
- `silica.config.ts` — site settings
- `package.json` with `dev`, `build`, and `start` scripts
- `.env.example`, a `Dockerfile`, and a GitHub Actions workflow for deployment

From there, the only folders you touch are `content/` (your pages) and `public/` (static files like a favicon).

## Add Silica to an existing folder of notes

If you already have a vault, point Silica at it by creating a `silica.config.ts` next to your `content/` folder and adding the `silica` commands to `package.json`. See [[getting-started/project-structure|Project structure]] for the expected layout.

> [!note] Editing in Obsidian
> Because Silica reads standard Obsidian-flavored Markdown, you can keep editing your vault in Obsidian and let Silica publish it.
