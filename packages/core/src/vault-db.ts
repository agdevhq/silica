import path from "node:path";
import Database from "better-sqlite3";
import fs from "fs-extra";
import {
  buildSearchTables,
  makeExcerpt,
  type SearchRecord,
} from "@silicajs/search";
import type { ContentAssetFile } from "./files.js";
import type {
  Graph,
  Manifest,
  ManifestEntry,
  PrerenderManifest,
  RenderCacheState,
  ResolvedSilicaConfig,
} from "./types.js";
import { normalizeAssetReference } from "./path.js";

export const VAULT_DATABASE_FILENAME = "vault.db";
export const VAULT_DATABASE_VERSION = "2";

export type VaultDbBuildInput = {
  config: ResolvedSilicaConfig;
  manifest: Manifest;
  graph: Graph;
  renderHashes: Record<string, string>;
  cacheState: RenderCacheState;
  prerender: PrerenderManifest;
  searchRecords: SearchRecord[];
  assets: Array<Pick<ContentAssetFile, "sourcePath" | "assetPath">>;
};

export type VaultDbNote = {
  slug: string;
  file: string;
  sourcePath: string;
  title: string;
  menuLabel: string;
  description?: string;
  generatedDescription?: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  created?: string;
  modified?: string;
  sortKey?: string;
  listed: boolean;
  contentHash: string;
  renderHash: string;
  prerender: boolean;
};

export async function writeVaultDatabase(
  projectRoot: string,
  input: VaultDbBuildInput,
): Promise<string> {
  const dataRoot = path.join(projectRoot, ".silica/next/data");
  await fs.ensureDir(dataRoot);

  const databasePath = path.join(dataRoot, VAULT_DATABASE_FILENAME);
  const temporaryPath = path.join(dataRoot, `${VAULT_DATABASE_FILENAME}.tmp`);
  await removeDatabaseFiles(temporaryPath);

  const db = new Database(temporaryPath);
  try {
    db.pragma("journal_mode = DELETE");
    db.pragma("foreign_keys = ON");
    db.pragma("synchronous = OFF");
    createVaultDatabaseSchema(db);
    populateVaultDatabase(db, input);
    db.exec("VACUUM");
  } finally {
    db.close();
  }

  await removeDatabaseFiles(databasePath);
  await fs.rename(temporaryPath, databasePath);
  await removeDatabaseSidecars(temporaryPath);
  return databasePath;
}

export function createVaultDatabaseSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE vault_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE notes (
      slug TEXT PRIMARY KEY,
      file TEXT NOT NULL,
      source_path TEXT NOT NULL,
      title TEXT NOT NULL,
      menu_label TEXT NOT NULL,
      description TEXT,
      generated_description TEXT,
      frontmatter_json TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      search_excerpt TEXT NOT NULL DEFAULT '',
      created TEXT,
      modified TEXT,
      sort_key TEXT,
      listed INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      render_hash TEXT NOT NULL,
      prerender INTEGER NOT NULL
    );

    CREATE TABLE note_tags (
      slug TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (slug, tag),
      FOREIGN KEY (slug) REFERENCES notes(slug) ON DELETE CASCADE
    );

    CREATE TABLE links (
      source_slug TEXT NOT NULL,
      target_slug TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('link', 'embed')),
      PRIMARY KEY (source_slug, target_slug, kind)
    );

    CREATE TABLE broken_links (
      source_slug TEXT NOT NULL,
      target TEXT NOT NULL
    );

    CREATE TABLE slug_aliases (
      strategy_key TEXT NOT NULL,
      alias TEXT NOT NULL,
      slug TEXT NOT NULL,
      sort_key TEXT,
      PRIMARY KEY (strategy_key, alias, slug)
    );

    CREATE TABLE asset_aliases (
      strategy_key TEXT NOT NULL,
      alias TEXT NOT NULL,
      asset_path TEXT NOT NULL,
      sort_key TEXT,
      PRIMARY KEY (strategy_key, alias, asset_path)
    );

    CREATE INDEX notes_prerender_idx ON notes(prerender, slug);
    CREATE INDEX notes_listed_sort_idx ON notes(listed, sort_key, slug);
    CREATE INDEX links_target_idx ON links(target_slug, kind, source_slug);
    CREATE INDEX links_source_idx ON links(source_slug, kind, target_slug);
    CREATE INDEX note_tags_tag_idx ON note_tags(tag, slug);
    CREATE INDEX slug_aliases_lookup_idx
      ON slug_aliases(strategy_key, alias, sort_key, slug);
    CREATE INDEX asset_aliases_lookup_idx
      ON asset_aliases(strategy_key, alias, sort_key, asset_path);
  `);
}

export function populateVaultDatabase(
  db: Database.Database,
  input: VaultDbBuildInput,
): void {
  const prerenderSlugs = new Set(input.prerender.slugs);
  const searchBySlug = new Map(
    input.searchRecords.map((record) => [record.slug, record]),
  );

  const insertMetadata = db.prepare(`
    INSERT INTO vault_metadata (key, value) VALUES (?, ?)
  `);
  const insertNote = db.prepare(`
    INSERT INTO notes (
      slug,
      file,
      source_path,
      title,
      menu_label,
      description,
      generated_description,
      frontmatter_json,
      tags_json,
      search_excerpt,
      created,
      modified,
      sort_key,
      listed,
      content_hash,
      render_hash,
      prerender
    )
    VALUES (
      @slug,
      @file,
      @sourcePath,
      @title,
      @menuLabel,
      @description,
      @generatedDescription,
      @frontmatterJson,
      @tagsJson,
      @searchExcerpt,
      @created,
      @modified,
      @sortKey,
      @listed,
      @contentHash,
      @renderHash,
      @prerender
    )
  `);
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO note_tags (slug, tag) VALUES (?, ?)
  `);
  const insertLink = db.prepare(`
    INSERT OR IGNORE INTO links (source_slug, target_slug, kind)
    VALUES (?, ?, ?)
  `);
  const insertBrokenLink = db.prepare(`
    INSERT INTO broken_links (source_slug, target) VALUES (?, ?)
  `);
  const insertAlias = db.prepare(`
    INSERT OR IGNORE INTO slug_aliases (strategy_key, alias, slug, sort_key)
    VALUES (?, ?, ?, ?)
  `);
  const insertAssetAlias = db.prepare(`
    INSERT OR IGNORE INTO asset_aliases (
      strategy_key,
      alias,
      asset_path,
      sort_key
    )
    VALUES (?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    insertMetadata.run("version", VAULT_DATABASE_VERSION);
    insertMetadata.run("generatedAt", input.manifest.generatedAt);
    insertMetadata.run("contentDir", input.manifest.contentDir);
    insertMetadata.run("configJson", JSON.stringify(input.config));
    insertMetadata.run(
      "renderEnvironmentHash",
      input.cacheState.renderEnvironmentHash,
    );
    insertMetadata.run("configHash", input.cacheState.configHash);
    insertMetadata.run("navigationHash", input.cacheState.navigationHash);
    insertMetadata.run("tagIndexHash", input.cacheState.tagIndexHash);
    insertMetadata.run("rendererVersion", input.cacheState.rendererVersion);
    insertMetadata.run("cacheStateJson", JSON.stringify(input.cacheState));

    for (const entry of input.manifest.entries) {
      const searchRecord = searchBySlug.get(entry.slug);
      insertNote.run({
        slug: entry.slug,
        file: entry.file,
        sourcePath: entry.sourcePath,
        title: entry.title,
        menuLabel: entry.menuLabel,
        description: entry.description,
        generatedDescription: entry.generatedDescription,
        frontmatterJson: JSON.stringify(entry.frontmatter),
        tagsJson: JSON.stringify(entry.tags),
        searchExcerpt: searchRecord
          ? makeExcerpt(
              searchRecord.content,
              searchRecord.description ?? searchRecord.title,
            )
          : "",
        created: entry.created,
        modified: entry.modified,
        sortKey: entry.sortKey,
        listed: isListedEntry(entry) ? 1 : 0,
        contentHash: entry.contentHash,
        renderHash: input.renderHashes[entry.slug] ?? "missing",
        prerender: prerenderSlugs.has(entry.slug) ? 1 : 0,
      });

      for (const tag of entry.tags) {
        for (const hierarchyTag of tagHierarchy(tag)) {
          insertTag.run(entry.slug, hierarchyTag);
        }
      }
    }

    for (const [source, targets] of Object.entries(input.graph.links)) {
      for (const target of targets) {
        insertLink.run(source, target, "link");
      }
    }
    for (const entry of input.manifest.entries) {
      for (const target of entry.embeds) {
        insertLink.run(entry.slug, target, "embed");
      }
    }
    for (const brokenLink of input.graph.brokenLinks) {
      insertBrokenLink.run(brokenLink.source, brokenLink.target);
    }
    for (const entry of input.manifest.entries) {
      for (const [strategy, alias] of makeSlugAliases(entry.slug)) {
        insertAlias.run(
          strategy,
          alias,
          entry.slug,
          entry.sortKey ?? entry.slug,
        );
      }
    }
    for (const asset of input.assets) {
      for (const [strategy, alias] of makeAssetAliases(
        asset.sourcePath,
        input.config.ordering,
      )) {
        insertAssetAlias.run(strategy, alias, asset.assetPath, asset.assetPath);
      }
    }
  });

  insertAll();
  buildSearchTables(db, input.searchRecords);
}

function isListedEntry(entry: ManifestEntry): boolean {
  return entry.frontmatter.listed !== false;
}

function tagHierarchy(tag: string): string[] {
  const normalized = tag.trim().replace(/^#/, "").toLowerCase();
  const segments = normalized.split("/").filter(Boolean);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}

function makeSlugAliases(slug: string): Array<[string, string]> {
  const aliases = new Map<string, string>();
  const simplified = slug === "index" ? "" : slug.replace(/\/index$/, "");
  const basename = simplified.split("/").at(-1) ?? "";
  aliases.set(`absolute:${slug}`, slug);
  if (simplified) aliases.set(`absolute:${simplified}`, simplified);
  if (basename) aliases.set(`shortest:${basename}`, basename);
  return [...aliases.entries()].map(([key, alias]) => [
    key.split(":")[0] ?? "shortest",
    alias,
  ]);
}

function makeAssetAliases(
  sourcePath: string,
  ordering: ResolvedSilicaConfig["ordering"],
): Array<[string, string]> {
  const aliases = new Map<string, string>();
  const normalized = normalizeAssetReference(sourcePath, ordering);
  const basename = normalizeAssetReference(
    path.posix.basename(sourcePath),
    ordering,
  );
  if (normalized) aliases.set(`absolute:${normalized}`, normalized);
  if (basename) aliases.set(`shortest:${basename}`, basename);
  return [...aliases.entries()].map(([key, alias]) => [
    key.split(":")[0] ?? "shortest",
    alias,
  ]);
}

async function removeDatabaseFiles(databasePath: string): Promise<void> {
  await fs.remove(databasePath);
  await removeDatabaseSidecars(databasePath);
}

async function removeDatabaseSidecars(databasePath: string): Promise<void> {
  await Promise.all([
    fs.remove(`${databasePath}-wal`),
    fs.remove(`${databasePath}-shm`),
    fs.remove(`${databasePath}-journal`),
  ]);
}
