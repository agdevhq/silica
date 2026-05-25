# Quartz Research

> Research notes on [Quartz v4](https://github.com/jackyzha0/quartz): how it's organized, how it builds a site from an Obsidian vault, and what its main building blocks do.

## 1. What Quartz is

Quartz is an open-source **static site generator** purpose-built for publishing [Obsidian](https://obsidian.md) vaults (and Obsidian-flavored markdown in general) as a fast, interlinked website. It is the de-facto OSS tool for "digital gardens".

- License: MIT. ~12k+ stars on GitHub.
- Language: TypeScript, runs on Node.js (22+). CLI: `npx quartz build`.
- Output: a static `public/` directory of pre-rendered HTML, CSS, JS, and assets.
- Hosting: GitHub Pages, Cloudflare Pages, Vercel, Netlify, or any static host. Most users deploy via GitHub Actions on every push to `main`/`v4`.
- Authoring model: write markdown in Obsidian; commit; CI builds and deploys. No CMS, no DB, no runtime server.

Quartz is a pure build-time tool: everything happens during `quartz build`, in the browser at runtime, or via third-party services. There is no application server, no auth layer, and no server-side search.

### What it's good at

- Wikilinks (`[[note]]`) and Obsidian-flavored markdown without conversion.
- Backlinks, graph view, file explorer sidebar, tags, folder pages — built-in.
- Client-side full-text search via FlexSearch.
- Fast incremental builds in dev mode.
- Customization through a plugin pipeline you can extend without forking core (the "upstream-safe customization pattern" — keep `quartz/` untouched, override via `quartz.config.ts` and a `quartz-custom/` folder).

## 2. Repository layout

A Quartz project is a single repo with two halves:

```
quartz/                       # the framework itself (don't edit)
  cli/                        # CLI: build, sync, serve
  components/                 # Preact components (Header, Footer, Explorer, Graph, etc.)
  i18n/                       # Translations
  plugins/
    transformers/             # parse/enrich pages
    filters/                  # drop pages from the build
    emitters/                 # write files to public/
  processors/                 # parse pipeline orchestrator
  static/                     # global assets (favicon, etc.)
  styles/                     # SCSS
  util/
    path.ts                   # the slug/path type system (critical)
  build.ts
  cfg.ts                      # type definitions for config
  worker.ts                   # parallel build worker

content/                      # YOUR vault: markdown files
  index.md                    # homepage
  notes/...
  attachments/...

quartz.config.ts              # plugins, theme, baseUrl, ignorePatterns
quartz.layout.ts              # which components go in which slots
.github/workflows/deploy.yml
public/                       # build output (gitignored)
```

The user's vault lives in `content/`. Either symlink it to the Obsidian vault, or treat the Quartz repo _as_ the vault. Quartz reads the same `.md` files Obsidian writes — no conversion step.

## 3. The build pipeline

Quartz's build is a three-stage pipeline over markdown files. The model is essentially `remark`/`rehype` (the unified.js ecosystem) with a layer of conventions on top.

```
content/*.md ─► [Transformers] ─► [Filters] ─► [Emitters] ─► public/*.html
```

Each stage is implemented as **plugins**. The three plugin shapes share a common type:

```ts
type QuartzPluginInstance =
  | QuartzTransformerPluginInstance
  | QuartzFilterPluginInstance
  | QuartzEmitterPluginInstance;
```

### 3.1 Transformers (parse + enrich)

A transformer receives every page's HAST tree and a `QuartzPluginData` object, then either rewrites the tree or attaches metadata. Hooks:

- `textTransform(content): string` — raw text → raw text, before markdown parsing
- `markdownPlugins(): RemarkPlugin[]` — operate on the markdown AST (mdast)
- `htmlPlugins(): RehypePlugin[]` — operate on the HTML AST (hast)
- `externalResources()` — declare CSS/JS the page needs at runtime

Default transformers (order matters):

| Plugin                           | Role                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `FrontMatter`                    | Parses YAML frontmatter into `fileData.frontmatter` (`title`, `tags`, `aliases`, `description`, `draft`, `date`, `permalink`, `cssclasses`). |
| `CreatedModifiedDate`            | Resolves `created`/`modified` dates from frontmatter or git history. Needs `fetch-depth: 0` in CI.                                           |
| `Latex`                          | KaTeX/MathJax.                                                                                                                               |
| `SyntaxHighlighting`             | Shiki.                                                                                                                                       |
| `ObsidianFlavoredMarkdown` (OFM) | Wikilinks, callouts, Mermaid, transclusions, YouTube/video embeds, comments (`%%`), highlights (`==`), tags, arrows, block references.       |
| `GFM`                            | GitHub-flavored markdown: tables, strikethrough, tasklists, autolinks.                                                                       |
| `CrawlLinks`                     | Rewrites all internal links to routed URLs, records the link graph onto `file.data.links`.                                                   |
| `Description`                    | Extracts/normalizes the page description.                                                                                                    |
| `TableOfContents`                | Extracts headings, attaches the ToC tree.                                                                                                    |

**Critical ordering rules**:

1. `ObsidianFlavoredMarkdown` must run **before** `CrawlLinks` — wikilinks must be normalized to standard markdown links before link resolution.
2. `ObsidianFlavoredMarkdown` must run **after** `SyntaxHighlighting` for callouts to render correctly.

### 3.2 Filters

Filters decide which pages even reach emitters. Defaults:

- `RemoveDrafts` — drops pages with `draft: true` in frontmatter.
- `ExplicitPublish` — opt-in publishing (only publish when `publish: true`).

Dropped pages are gone for everything downstream — the link graph, search index, sitemap, etc.

### 3.3 Emitters (write files)

An emitter reduces the filtered content graph into files in `public/`. Each emitter declares:

- `name`
- `emit(ctx, content, resources): AsyncGenerator<FilePath>` — full build
- `partialEmit(ctx, content, resources, changeEvents)` — optional, for incremental dev rebuilds
- `getQuartzComponents(ctx): QuartzComponent[]` — declares which page components this emitter renders

Default emitters:

| Plugin           | Output                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `ContentPage`    | One HTML file per markdown page.                                                                        |
| `FolderPage`     | Index page for each folder (including intermediate folders).                                            |
| `TagPage`        | Index page for each tag (`/tags/foo.html`).                                                             |
| `ContentIndex`   | `/sitemap.xml`, `/index.xml` (RSS), and a JSON `contentIndex` consumed by client-side Search and Graph. |
| `Assets`         | Copies non-markdown files from `content/` into `public/`.                                               |
| `Static`         | Copies `quartz/static/` into `public/`.                                                                 |
| `AliasRedirects` | Generates HTML meta-refresh redirect pages for `aliases` frontmatter.                                   |
| `CNAME`          | Writes `public/CNAME` from `baseUrl`.                                                                   |
| `NotFoundPage`   | `404.html`.                                                                                             |
| `CustomOgImages` | Optional, generates OG images per page.                                                                 |

## 4. Slug and path system

Quartz has a small but strict path-type system in `quartz/util/path.ts`. It's "nominal" — each type is a branded string — so the type system catches mismatches between, say, a file path and a URL.

```
FilePath        e.g. "content/notes/foo.md"      — real path with extension
   │
   │ slugifyFilePath()
   ▼
FullSlug        e.g. "notes/foo"                 — no leading/trailing slash, may end in "index"
   │
   │ simplifySlug()
   ▼
SimpleSlug      e.g. "notes/foo"                 — no /index, no extension; can have trailing /
   │
   │ pathToRoot() | resolveRelative(curSlug, target)
   ▼
RelativeURL     e.g. "../notes/foo"              — starts with . or ..; used in <a href>
```

Wikilink resolution boils down to **slug normalization + lookup in the set of all slugs**, with three strategies:

- `absolute` — path relative to the content root (Obsidian default).
- `relative` — path relative to the current file.
- `shortest` — by filename if unambiguous, else by absolute path.

Quartz exposes `ctx.allSlugs` to plugins during the HTML pass, so `[[Foo]]` → `transformLink("Foo", { strategy, allSlugs })` → resolved internal link or styled "broken link".

## 5. Navigation: how the explorer/sidebar is built

### 5.1 At build time

The `ContentIndex` emitter walks the filtered set of pages and serializes a JSON file (one entry per page: slug, title, description, links, tags, dates). The `Graph` and `Explorer` components fetch and consume this on the client.

For the explorer specifically, Quartz builds a **`FileTrieNode` tree** in the browser from the content index. Each node has properties like:

```
slug, title, displayName, file (or null for folders), children
```

There is no explicit "sitemap" in the user's vault — the tree is derived purely from file paths under `content/`. `content/notes/foo.md` becomes a node `foo` inside `notes`. Folders with an `index.md` become folder nodes whose page is that index.

### 5.2 The Explorer component

Source: `quartz/components/Explorer.tsx` (wrapper) and `quartz/components/ExplorerNode.tsx` (recursive renderer). The user's vault layout maps to the sidebar 1:1:

```
content/
  index.md
  poetry-folder/
    index.md
  essay-folder/
    index.md
    research-paper-file.md
  dinosaur-fossils-file.md
  other-folder/
    index.md
```

renders as:

```
📖 Poetry Folder
📑 Essay Folder
    ⚗️ Research Paper File
🦴 Dinosaur Fossils File
🔮 Other Folder
```

### 5.3 Configuration

Configured per page-layout in `quartz.layout.ts`:

```ts
Component.Explorer({
  title: "Explorer",
  folderClickBehavior: "collapse",        // "collapse" | "link"
  folderDefaultState: "collapsed",         // "collapsed" | "open"
  useSavedState: true,                     // persist open/closed in localStorage
  sortFn: (a, b) => /* folders first, then alpha */,
  filterFn: (node) => node.name !== "tags",
  mapFn: undefined,
  order: ["filter", "map", "sort"],
})
```

Sort/filter/map mutate the trie **in place** in the order given. This means a vault author has no special "navigation config" — the tree is the filesystem, customized via a layout-time JS function.

## 6. Layout system (component slots)

Each page is composed of `QuartzComponent`s placed into named slots:

```ts
interface FullPageLayout {
  head: QuartzComponent; // single
  header: QuartzComponent[]; // laid out horizontally
  beforeBody: QuartzComponent[]; // vertical
  pageBody: QuartzComponent; // single (usually <Content/>)
  afterBody: QuartzComponent[]; // vertical
  left: QuartzComponent[]; // left sidebar (responsive)
  right: QuartzComponent[]; // right sidebar (responsive)
  footer: QuartzComponent; // single
}
```

`quartz.layout.ts` exports:

- `sharedPageComponents: SharedLayout` — shared across all pages (typically `Head`, `Footer`).
- `defaultContentPageLayout: PageLayout` — for single-page (`ContentPage`) renders.
- `defaultListPageLayout: PageLayout` — for `FolderPage`/`TagPage`.

Default content page layout:

```
left:       PageTitle, Search, Darkmode, ReaderMode, Explorer
beforeBody: Breadcrumbs, ArticleTitle, ContentMeta, TagList
pageBody:   Content
right:      Graph, TableOfContents, Backlinks
```

Helpers: `Component.MobileOnly(...)`, `Component.DesktopOnly(...)`, `Component.ConditionalRender({ component, condition: page => ... })`, `Component.Flex({ components: [...] })`.

## 7. Obsidian-flavored markdown coverage

Supported by `ObsidianFlavoredMarkdown` (defaults all `true` except a couple):

- Wikilinks `[[Page]]`, `[[Page|alias]]`, `[[Page#heading]]`, `[[Page^block-id]]`
- Embeds/transclusions `![[Page]]`, `![[image.png]]`, `![[video.mp4]]`, YouTube via image syntax
- Callouts `> [!info] Title\n> body` — 12 types, collapsible, custom types via CSS
- Comments `%%hidden%%`
- Highlights `==marked==`
- Mermaid diagrams (loaded from CDN on demand, themed light/dark)
- Tags `#foo/bar`
- Block references `^block-id`
- Arrows (`-->` → `→` etc.)
- Checkboxes (off by default)
- Image width syntax `![[img.png|400]]` (in some forks)

Plus GFM (tables, strikethrough, tasklists, autolinks), Latex (KaTeX), Shiki syntax highlighting.

## 8. Search (client-side, FlexSearch)

- Library: [FlexSearch](https://github.com/nextapps-de/flexsearch) — extremely fast, dependency-free, has multi-field `Document` index, async API, Chinese/Korean/Japanese tokenization.
- Build: `ContentIndex` emitter produces a JSON blob with `{ slug, title, content (markdown stripped), tags }` per page.
- Runtime: `quartz/components/scripts/search.inline.ts` instantiates a `flexsearch.Document` with three fields: `title`, `content`, `tags`. Title matches are weighted above content matches.
- Modes: regular search (⌘/Ctrl+K) and tag search (⌘/Ctrl+Shift+K, or query starts with `#`).
- Features: highlight matching subterms in results, excerpt the most relevant ~30 words, keyboard navigation (arrow keys / Tab), top-N results (default 5).
- Performance claim: sub-10ms for ~500k-word vaults.

**Trade-off**: the entire search index ships to every visitor as a static JSON blob. Cheap for a small personal vault, expensive for a large corpus, and the index is the same for every user (no auth-aware filtering, no per-user ranking).

## 9. Backlinks and graph view

- `CrawlLinks` records, for every page, the set of outgoing slugs into `file.data.links`.
- The reverse map (incoming links per slug) is computed at build time and consumed by both the `Backlinks` component (right sidebar list of "linked from") and the `Graph` component.
- `Graph` renders a force-directed view using D3 + PIXI.js (WebGPU preferred). Two modes:
  - **Local graph**: nodes ≤ N hops from the current page (default 1).
  - **Global graph**: every page, configurable repel force, link distance, depth, etc.
- All graph rendering happens on the client from the `contentIndex` JSON.

## 10. Frontmatter conventions

The user-facing schema Quartz reads is small and well-defined:

```yaml
---
title: "Optional, otherwise filename"
description: "For meta + link previews"
permalink: "/custom/url" # stable URL even if file moves
aliases: ["other-name", "old-slug"] # redirect HTML pages emitted
tags: [foo, bar/baz]
draft: true # filtered out
publish: true # only used with ExplicitPublish filter
date: 2026-05-25 # YYYY-MM-DD
cssclasses: [foo-page]
---
```

This is essentially Obsidian's native frontmatter — no Quartz-specific keys required.

## 11. Authoring → publishing flow

The mainstream Quartz workflow:

1. Edit notes in Obsidian on a local vault.
2. `git add . && git commit -m "..." && git push origin main` (or use the Obsidian Git plugin).
3. GitHub Action runs `npm ci && npx quartz build` and uploads `public/` to Pages/Cloudflare/Vercel.
4. Live in ~60–90 seconds.

There is also `npx quartz sync` (a wrapper around git pull/push with safer defaults) and `npx quartz create` / `npx quartz update` for bootstrapping and framework updates.

Worth noting:

- **Build is full-rebuild by default** in CI. Local dev uses `partialEmit` for incremental rebuilds.
- **Git history is the source of created/modified dates** when frontmatter lacks them — hence `fetch-depth: 0`.

## 12. Plugin extensibility model

Quartz's "transformer / filter / emitter" pipeline is one of the cleaner SSG plugin APIs out there. Plugins are plain functions returning an object with hooks, so they:

- Compose cleanly (ordered arrays in `quartz.config.ts`).
- Don't need a registry, lifecycle, or DI.
- Hook into well-known steps (mdast, hast, emit, components).
- Can declare client-side resources (CSS/JS) declaratively, which the Head component injects.

## 13. References

- Quartz repository: <https://github.com/jackyzha0/quartz>
- Quartz docs: <https://quartz.jzhao.xyz/>
- Quartz layout source: `quartz.layout.ts` on `v4`
- Quartz path types: `quartz/util/path.ts`
- OFM transformer: `quartz/plugins/transformers/ofm.ts`
- Search runtime: `quartz/components/scripts/search.inline.ts`
- FlexSearch: <https://github.com/nextapps-de/flexsearch>
