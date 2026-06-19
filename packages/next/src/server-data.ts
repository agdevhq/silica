import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import type { LoadedSearchIndex } from "@silicajs/search";
import {
  resolveDataRoot,
  resolveProjectRoot,
  resolveVaultDatabasePath,
} from "./runtime-paths.js";
import { logSilicaTiming, timeSilica } from "./server-timing.js";
import type {
  Navigation,
  ManifestEntry,
  RenderCacheState,
  ResolvedSilicaConfig,
} from "@silicajs/core/runtime";
import {
  asFullSlug,
  normalizeAssetReference,
  normalizeSlug,
  resolveRelativeAsset,
  resolveRelative,
  slugToHref,
} from "@silicajs/core/runtime";

export type LoadedVaultDb = {
  databasePath: string;
  generatedAt: string;
  renderEnvironmentHash: string;
  config: ResolvedSilicaConfig;
  cacheState: RenderCacheState;
  mtimeMs: number;
  db: Database.Database;
  close(): void;
};

export type VaultPageData = {
  cacheState: RenderCacheState;
  config: ResolvedSilicaConfig;
  entry: ManifestEntry;
};

type MetadataRows = {
  generatedAt: string;
  renderEnvironmentHash: string;
  config: ResolvedSilicaConfig;
  cacheState: RenderCacheState;
};

type NoteRow = {
  slug: string;
  file: string;
  source_path: string;
  title: string;
  menu_label: string;
  description: string | null;
  generated_description: string | null;
  frontmatter_json: string;
  tags_json: string;
  created: string | null;
  modified: string | null;
  sort_key: string | null;
  listed: 0 | 1;
  content_hash: string;
  render_hash: string;
  prerender: 0 | 1;
};

type NavigationRow = {
  slug: string;
  title: string;
  sort_key: string | null;
};

type BacklinkRow = {
  slug: string;
  title: string;
};

let loadedVaultDb: LoadedVaultDb | undefined;

export function getProjectRoot(): string {
  return resolveProjectRoot();
}

export function getSilicaRoot(): string {
  return resolveDataRoot();
}

export function getVaultDatabasePath(): string {
  return resolveVaultDatabasePath();
}

export function loadVaultDb(): LoadedVaultDb {
  const databasePath = getVaultDatabasePath();
  const stat = timeSilica("vault-db.stat", { databasePath }, () =>
    fs.statSync(databasePath),
  );
  if (
    loadedVaultDb?.databasePath === databasePath &&
    loadedVaultDb.mtimeMs === stat.mtimeMs
  ) {
    logSilicaTiming("vault-db.reuse", {
      databasePath,
      mtimeMs: stat.mtimeMs,
    });
    return loadedVaultDb;
  }

  if (loadedVaultDb) {
    logSilicaTiming("vault-db.close-stale", {
      previousDatabasePath: loadedVaultDb.databasePath,
      databasePath,
    });
    loadedVaultDb.close();
  }

  const db = timeSilica(
    "vault-db.open",
    { databasePath },
    () =>
      new Database(databasePath, {
        fileMustExist: true,
        readonly: true,
      }),
  );
  timeSilica("vault-db.pragma", { databasePath }, () =>
    db.pragma("query_only = ON"),
  );
  const metadata = timeSilica("vault-db.metadata", { databasePath }, () =>
    readMetadata(db),
  );
  loadedVaultDb = {
    databasePath,
    generatedAt: metadata.generatedAt,
    renderEnvironmentHash: metadata.renderEnvironmentHash,
    config: metadata.config,
    cacheState: metadata.cacheState,
    mtimeMs: stat.mtimeMs,
    db,
    close: () => {
      db.close();
      if (loadedVaultDb?.db === db) loadedVaultDb = undefined;
    },
  };
  logSilicaTiming("vault-db.loaded", {
    databasePath,
    generatedAt: metadata.generatedAt,
    renderEnvironmentHash: metadata.renderEnvironmentHash,
    mtimeMs: stat.mtimeMs,
  });
  return loadedVaultDb;
}

export function getPage(slug: string): ManifestEntry | undefined {
  const row = timeSilica("db.query.page", { slug }, () =>
    loadVaultDb().db.prepare("SELECT * FROM notes WHERE slug = ?").get(slug),
  ) as NoteRow | undefined;
  return row ? noteRowToEntry(row) : undefined;
}

export function getPageBySourcePath(
  sourcePath: string,
): ManifestEntry | undefined {
  const row = timeSilica("db.query.page-by-source-path", { sourcePath }, () =>
    loadVaultDb()
      .db.prepare("SELECT * FROM notes WHERE source_path = ?")
      .get(normalizeDbSourcePath(sourcePath)),
  ) as NoteRow | undefined;
  return row ? noteRowToEntry(row) : undefined;
}

export function getPageRuntimeData(slug: string): VaultPageData | undefined {
  return timeSilica("server-data.page-runtime-data", { slug }, () => {
    const entry = getPage(slug);
    if (!entry) return undefined;
    return {
      entry,
      config: getConfig(),
      cacheState: getCacheState(),
    };
  });
}

export function getRenderKey(slug: string): {
  renderHash: string;
  renderEnvironmentHash: string;
} {
  const loaded = loadVaultDb();
  const row = timeSilica("db.query.render-key", { slug }, () =>
    loaded.db.prepare("SELECT render_hash FROM notes WHERE slug = ?").get(slug),
  ) as { render_hash: string } | undefined;
  return {
    renderHash: row?.render_hash ?? "missing",
    renderEnvironmentHash: loaded.renderEnvironmentHash,
  };
}

export function loadRenderEnvironmentHash(): string {
  return loadVaultDb().renderEnvironmentHash;
}

export function getPrerenderSlugs(): string[] {
  const slugs = timeSilica("db.query.prerender-slugs", {}, () =>
    loadVaultDb()
      .db.prepare(
        "SELECT slug FROM notes WHERE prerender = 1 ORDER BY COALESCE(sort_key, slug), slug",
      )
      .all()
      .map((row) => (row as { slug: string }).slug),
  );
  logSilicaTiming("db.prerender-slugs", { count: slugs.length });
  return slugs;
}

export function getAllSlugs(): string[] {
  return loadVaultDb()
    .db.prepare("SELECT slug FROM notes ORDER BY slug")
    .all()
    .map((row) => (row as { slug: string }).slug);
}

export function getNavigation(): Navigation {
  const entries = timeSilica("db.query.navigation", {}, () =>
    loadVaultDb()
      .db.prepare(
        `
      SELECT slug, menu_label AS title, sort_key
      FROM notes
      WHERE listed = 1
      ORDER BY COALESCE(sort_key, slug), slug
    `,
      )
      .all(),
  ) as NavigationRow[];
  logSilicaTiming("db.navigation", { count: entries.length });
  return {
    version: 1,
    entries: entries.map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      sortKey: entry.sort_key ?? undefined,
    })),
  };
}

export function getBacklinks(slug: string): BacklinkRow[] {
  const backlinks = timeSilica("db.query.backlinks", { slug }, () =>
    loadVaultDb()
      .db.prepare(
        `
      SELECT n.slug, n.title
      FROM links l
      JOIN notes n ON n.slug = l.source_slug
      WHERE l.target_slug = ?
        AND l.kind = 'link'
      ORDER BY n.title COLLATE NOCASE ASC, n.slug
    `,
      )
      .all(slug),
  ) as BacklinkRow[];
  logSilicaTiming("db.backlinks", { slug, count: backlinks.length });
  return backlinks;
}

export function getConfig(): ResolvedSilicaConfig {
  return loadVaultDb().config;
}

export function getCacheState(): RenderCacheState {
  return loadVaultDb().cacheState;
}

export function getTagSlugs(): string[] {
  return loadVaultDb()
    .db.prepare("SELECT DISTINCT tag FROM note_tags ORDER BY tag")
    .all()
    .map((row) => (row as { tag: string }).tag);
}

export function getEntriesForTag(tag: string): ManifestEntry[] {
  return loadVaultDb()
    .db.prepare(
      `
      SELECT n.*
      FROM notes n
      WHERE n.listed = 1
        AND EXISTS (
          SELECT 1
          FROM note_tags nt
          WHERE nt.slug = n.slug
            AND nt.tag = ?
        )
      ORDER BY n.title COLLATE NOCASE ASC, n.slug
    `,
    )
    .all(tag)
    .map((row) => noteRowToEntry(row as NoteRow));
}

export function getRelatedTagsForEntries(
  slugs: string[],
  tag: string,
): string[] {
  if (slugs.length === 0) return [];
  return loadVaultDb()
    .db.prepare(
      `
      SELECT nt.tag, COUNT(*) AS count
      FROM note_tags nt
      WHERE nt.slug IN (${slugs.map(() => "?").join(", ")})
        AND nt.tag != ?
      GROUP BY nt.tag
      ORDER BY count DESC, nt.tag ASC
      LIMIT 12
    `,
    )
    .all(...slugs, tag)
    .map((row) => (row as { tag: string }).tag);
}

export function resolveWikiLinkFromDb(
  currentSlug: string,
  target: string,
  strategy: "absolute" | "relative" | "shortest",
  ordering?: { numericPrefixes?: boolean },
): string | undefined {
  const [rawPath] = target.split("#");
  const slugOptions = ordering ?? getConfig().ordering;
  const normalizedTarget = normalizeSlug(rawPath ?? target, slugOptions);
  const db = loadVaultDb().db;

  if (strategy === "absolute") {
    return lookupAlias(db, "absolute", normalizedTarget);
  }

  if (strategy === "relative") {
    const relative = resolveRelative(
      asFullSlug(currentSlug),
      normalizedTarget,
      slugOptions,
    );
    const resolved = lookupAlias(db, "absolute", relative);
    if (resolved) return resolved;
  }

  return (
    lookupAlias(db, "absolute", normalizedTarget) ??
    lookupAlias(db, "absolute", `${normalizedTarget}/index`) ??
    lookupClosestAlias(
      db,
      currentSlug,
      normalizedTarget.split("/").at(-1) ?? "",
    )
  );
}

export function resolveAssetFromDb(
  currentSourcePath: string,
  target: string,
  strategy: "absolute" | "relative" | "shortest",
  ordering?: { numericPrefixes?: boolean },
): string | undefined {
  const assetOptions = ordering ?? getConfig().ordering;
  const normalizedTarget = normalizeAssetReference(target, assetOptions);
  if (!normalizedTarget) return undefined;
  const db = loadVaultDb().db;
  const isExplicitRelative = isExplicitRelativeAssetReference(target);

  if (isExplicitRelative || strategy === "relative") {
    const relative = resolveRelativeAsset(
      currentSourcePath,
      target,
      assetOptions,
    );
    const resolved = lookupAssetAlias(db, "absolute", relative);
    if (resolved || isExplicitRelative) return resolved;
  }

  if (strategy === "absolute") {
    return lookupAssetAlias(db, "absolute", normalizedTarget);
  }

  return (
    lookupAssetAlias(db, "absolute", normalizedTarget) ??
    lookupAssetAlias(db, "shortest", normalizedTarget.split("/").at(-1) ?? "")
  );
}

export function getBreadcrumbs(slug: string) {
  if (slug === "index" || !slug.includes("/")) return [];

  const breadcrumbs: Array<{ label: string; href?: string }> = [
    { label: "Home", href: "/" },
  ];
  const segments = slug.split("/").slice(0, -1);
  let acc = "";
  for (const segment of segments) {
    acc = acc ? `${acc}/${segment}` : segment;
    breadcrumbs.push({
      label: prettySegment(segment),
      href: breadcrumbSegmentHref(acc),
    });
  }
  return breadcrumbs;
}

export function loadSearchIndex(): LoadedSearchIndex {
  return timeSilica("server-data.load-search-index", {}, () => {
    const loaded = loadVaultDb();
    return {
      databasePath: loaded.databasePath,
      db: loaded.db,
      close: () => undefined,
    };
  });
}

export function normalizeRouteSlug(slug?: string[]): string {
  return slug?.length ? slug.join("/") : "index";
}

function readMetadata(db: Database.Database): MetadataRows {
  const rows = db
    .prepare("SELECT key, value FROM vault_metadata")
    .all() as Array<{ key: string; value: string }>;
  const metadata = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    generatedAt: metadata.generatedAt ?? "",
    renderEnvironmentHash: metadata.renderEnvironmentHash ?? "silica",
    config: parseConfigMetadata(metadata.configJson),
    cacheState: JSON.parse(metadata.cacheStateJson ?? "{}") as RenderCacheState,
  };
}

function parseConfigMetadata(value: string | undefined): ResolvedSilicaConfig {
  if (!value) throw new Error("vault.db is missing configJson metadata.");
  return JSON.parse(value) as ResolvedSilicaConfig;
}

function lookupAlias(
  db: Database.Database,
  strategy: string,
  alias: string,
): string | undefined {
  const row = db
    .prepare(
      `
      SELECT slug
      FROM slug_aliases
      WHERE strategy_key = ?
        AND alias = ?
      ORDER BY sort_key, slug
      LIMIT 2
    `,
    )
    .all(strategy, alias) as Array<{ slug: string }>;
  return row.length === 1 ? row[0]?.slug : undefined;
}

function lookupClosestAlias(
  db: Database.Database,
  currentSlug: string,
  alias: string,
): string | undefined {
  const rows = db
    .prepare(
      `
      SELECT slug
      FROM slug_aliases
      WHERE strategy_key = 'shortest'
        AND alias = ?
      ORDER BY slug
    `,
    )
    .all(alias) as Array<{ slug: string }>;

  return closestWikiLinkCandidate(
    currentSlug,
    rows.map((row) => row.slug),
  );
}

function lookupAssetAlias(
  db: Database.Database,
  strategy: string,
  alias: string,
): string | undefined {
  const row = db
    .prepare(
      `
      SELECT asset_path
      FROM asset_aliases
      WHERE strategy_key = ?
        AND alias = ?
      ORDER BY sort_key, asset_path
      LIMIT 2
    `,
    )
    .all(strategy, alias) as Array<{ asset_path: string }>;
  return row.length === 1 ? row[0]?.asset_path : undefined;
}

function closestWikiLinkCandidate(
  currentSlug: string,
  candidates: readonly string[],
): string | undefined {
  if (candidates.length === 0) return undefined;

  const currentDirectory = normalizeSlug(currentSlug, {
    numericPrefixes: false,
  })
    .split("/")
    .slice(0, -1);
  const [bestCandidate] = [...candidates].sort((left, right) => {
    const leftScore = wikiLinkCandidateScore(currentDirectory, left);
    const rightScore = wikiLinkCandidateScore(currentDirectory, right);

    return (
      rightScore.sharedPrefixLength - leftScore.sharedPrefixLength ||
      leftScore.depth - rightScore.depth ||
      compareSlugs(left, right)
    );
  });

  return bestCandidate;
}

function wikiLinkCandidateScore(currentDirectory: string[], slug: string) {
  const simplified = slug === "index" ? "" : slug.replace(/\/index$/, "");
  const segments = simplified ? simplified.split("/") : [];

  return {
    sharedPrefixLength: sharedPrefixLength(
      currentDirectory,
      segments.slice(0, -1),
    ),
    depth: segments.length,
  };
}

function sharedPrefixLength(left: readonly string[], right: readonly string[]) {
  let length = 0;
  while (left[length] !== undefined && left[length] === right[length]) {
    length += 1;
  }
  return length;
}

function compareSlugs(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isExplicitRelativeAssetReference(value: string): boolean {
  const withoutSuffix = value.split(/[?#]/)[0] ?? "";
  const normalized = withoutSuffix
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return /^\.{1,2}\//.test(normalized);
}

function noteRowToEntry(row: NoteRow): ManifestEntry {
  return {
    slug: row.slug,
    title: row.title,
    menuLabel: row.menu_label,
    description: row.description ?? undefined,
    generatedDescription: row.generated_description ?? undefined,
    tags: parseJsonArray(row.tags_json),
    file: path.isAbsolute(row.file)
      ? row.file
      : path.join(getProjectRoot(), row.file),
    sourcePath: row.source_path,
    sortKey: row.sort_key ?? undefined,
    created: row.created ?? undefined,
    modified: row.modified ?? undefined,
    frontmatter: parseObject(row.frontmatter_json),
    contentHash: row.content_hash,
    embeds: getEmbeds(row.slug),
  };
}

function normalizeDbSourcePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^content\//, "");
}

function getEmbeds(slug: string): string[] {
  return loadVaultDb()
    .db.prepare(
      "SELECT target_slug FROM links WHERE source_slug = ? AND kind = 'embed' ORDER BY target_slug",
    )
    .all(slug)
    .map((row) => (row as { target_slug: string }).target_slug);
}

function breadcrumbSegmentHref(segmentPath: string): string | undefined {
  if (getPage(segmentPath)) return slugToHref(segmentPath);
  const indexSlug = `${segmentPath}/index`;
  if (getPage(indexSlug)) return slugToHref(indexSlug);
  return undefined;
}

function prettySegment(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseObject(value: string): Record<string, unknown> {
  return JSON.parse(value) as Record<string, unknown>;
}

function parseJsonArray(value: string): string[] {
  return JSON.parse(value) as string[];
}
