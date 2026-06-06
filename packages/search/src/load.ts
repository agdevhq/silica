import Database from "better-sqlite3";

export type LoadedSearchIndex = {
  databasePath: string;
  db: Database.Database;
  close: () => void;
};

const globalCache = globalThis as typeof globalThis & {
  __silicaSearchIndexes?: Map<string, LoadedSearchIndex>;
};

export async function loadSearchIndex(
  databasePath: string,
): Promise<LoadedSearchIndex> {
  const cache = (globalCache.__silicaSearchIndexes ??= new Map());
  const cached = cache.get(databasePath);
  if (cached) return cached;

  const db = new Database(databasePath, {
    fileMustExist: true,
    readonly: true,
  });
  db.pragma("query_only = ON");

  const loaded: LoadedSearchIndex = {
    databasePath,
    db,
    close: () => {
      db.close();
      cache.delete(databasePath);
    },
  };
  cache.set(databasePath, loaded);
  return loaded;
}
