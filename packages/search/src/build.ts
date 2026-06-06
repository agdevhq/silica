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
    db.exec(`
      CREATE TABLE metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE documents (
        rowid INTEGER PRIMARY KEY,
        id TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        tags_json TEXT NOT NULL,
        excerpt TEXT NOT NULL
      );

      CREATE TABLE document_tags (
        document_rowid INTEGER NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (document_rowid, tag),
        FOREIGN KEY (document_rowid) REFERENCES documents(rowid) ON DELETE CASCADE
      );

      CREATE INDEX document_tags_tag_idx ON document_tags(tag);

      CREATE VIRTUAL TABLE search_index USING fts5(
        title,
        content,
        tags,
        tokenize='porter unicode61',
        prefix='3'
      );
    `);

    const builtAt = new Date().toISOString();
    const insertMetadata = db.prepare(
      "INSERT INTO metadata (key, value) VALUES (?, ?)",
    );
    const insertDocument = db.prepare(`
      INSERT INTO documents (id, slug, title, description, tags_json, excerpt)
      VALUES (@id, @slug, @title, @description, @tagsJson, @excerpt)
    `);
    const insertSearch = db.prepare(`
      INSERT INTO search_index (rowid, title, content, tags)
      VALUES (?, ?, ?, ?)
    `);
    const insertTag = db.prepare(`
      INSERT OR IGNORE INTO document_tags (document_rowid, tag)
      VALUES (?, ?)
    `);

    const insertRecords = db.transaction((items: SearchRecord[]) => {
      for (const record of items) {
        const tags = record.tags.map(normalizeTag).filter(Boolean);
        const result = insertDocument.run({
          id: record.id,
          slug: record.slug,
          title: record.title,
          description: record.description,
          tagsJson: JSON.stringify(record.tags),
          excerpt: makeExcerpt(
            record.content,
            record.description ?? record.title,
          ),
        });
        const rowid = Number(result.lastInsertRowid);
        insertSearch.run(rowid, record.title, record.content, tags.join(" "));
        for (const tag of tags) {
          for (const hierarchyTag of tagHierarchy(tag)) {
            insertTag.run(rowid, hierarchyTag);
          }
        }
      }

      insertMetadata.run("version", "1");
      insertMetadata.run("builtAt", builtAt);
      insertMetadata.run("recordCount", String(items.length));
    });
    insertRecords(records);

    db.prepare("INSERT INTO search_index(search_index) VALUES(?)").run(
      "optimize",
    );
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
