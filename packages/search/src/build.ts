import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { makeExcerpt } from "./excerpt.js";
import type { SearchDatabaseMetadata, SearchRecord } from "./types.js";

export const SEARCH_DATABASE_FILENAME = "search.db";

export async function buildSearchDatabase(
  records: SearchRecord[],
  databasePath: string,
): Promise<SearchDatabaseMetadata> {
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  await removeDatabaseFiles(databasePath);

  const db = new Database(databasePath);
  try {
    db.pragma("journal_mode = DELETE");
    db.pragma("synchronous = OFF");
    createStandaloneNotesSchema(db);
    const builtAt = buildSearchTables(db, records);
    db.exec("VACUUM");

    return {
      version: 1,
      databasePath,
      recordCount: records.length,
      builtAt,
    };
  } finally {
    db.close();
  }
}

export function buildSearchTables(
  db: Database.Database,
  records: SearchRecord[],
): string {
  db.exec(`
    DROP TABLE IF EXISTS search_index;
    CREATE VIRTUAL TABLE search_index USING fts5(
      title,
      content,
      tags,
      tokenize='porter unicode61',
      prefix='3'
    );
  `);

  const builtAt = new Date().toISOString();
  const upsertMetadata = db.prepare(`
    INSERT INTO vault_metadata (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
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
      NULL,
      '{}',
      @tagsJson,
      @excerpt,
      1,
      @contentHash,
      @renderHash,
      1
    )
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      menu_label = excluded.menu_label,
      description = excluded.description,
      tags_json = excluded.tags_json,
      search_excerpt = excluded.search_excerpt
  `);
  const selectNoteRowid = db.prepare(
    "SELECT rowid AS rowid FROM notes WHERE slug = ?",
  );
  const insertSearch = db.prepare(`
    INSERT INTO search_index (rowid, title, content, tags)
    VALUES (?, ?, ?, ?)
  `);
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO note_tags (slug, tag)
    VALUES (?, ?)
  `);

  const insertRecords = db.transaction((items: SearchRecord[]) => {
    for (const record of items) {
      const tags = record.tags.map(normalizeTag).filter(Boolean);
      const excerpt = makeExcerpt(
        record.content,
        record.description ?? record.title,
      );
      insertNote.run({
        slug: record.slug,
        file: "",
        sourcePath: "",
        title: record.title,
        menuLabel: record.title,
        description: record.description,
        tagsJson: JSON.stringify(record.tags),
        excerpt,
        contentHash: record.id,
        renderHash: record.id,
      });
      const row = selectNoteRowid.get(record.slug) as { rowid: number };
      insertSearch.run(row.rowid, record.title, record.content, tags.join(" "));
      for (const tag of tags) {
        for (const hierarchyTag of tagHierarchy(tag)) {
          insertTag.run(record.slug, hierarchyTag);
        }
      }
    }

    upsertMetadata.run("searchVersion", "1");
    upsertMetadata.run("searchBuiltAt", builtAt);
    upsertMetadata.run("searchRecordCount", String(items.length));
  });
  insertRecords(records);

  db.prepare("INSERT INTO search_index(search_index) VALUES(?)").run(
    "optimize",
  );
  return builtAt;
}

async function removeDatabaseFiles(databasePath: string): Promise<void> {
  await Promise.all(
    ["", "-journal", "-shm", "-wal"].map((suffix) =>
      fs.rm(`${databasePath}${suffix}`, { force: true }),
    ),
  );
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, "").toLowerCase();
}

function tagHierarchy(tag: string): string[] {
  const segments = tag.split("/").filter(Boolean);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}

function createStandaloneNotesSchema(db: Database.Database): void {
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

    CREATE INDEX note_tags_tag_idx ON note_tags(tag, slug);
  `);
}
