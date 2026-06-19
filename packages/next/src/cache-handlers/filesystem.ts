import crypto from "node:crypto";
import path from "node:path";
import { ReadableStream } from "node:stream/web";
import Database from "better-sqlite3";
import fs from "fs-extra";
import { tryResolveDataRoot } from "../runtime-paths.js";
import {
  logSilicaTiming,
  timeSilica,
  timeSilicaAsync,
} from "../server-timing.js";

export type CacheEntry = {
  value: ReadableStream<Uint8Array>;
  tags: string[];
  stale: number;
  timestamp: number;
  expire: number;
  revalidate: number;
};

type StoredCacheEntry = Omit<CacheEntry, "value"> & {
  value: string;
};

type TagState = {
  version: 1;
  tags: Record<string, number>;
};

export type FilesystemCacheHandlerOptions = {
  root?: string;
};

export function createFilesystemCacheHandler(
  options: FilesystemCacheHandlerOptions = {},
) {
  const root = options.root ?? resolveCacheRoot();
  const entriesRoot = path.join(root, "entries");
  const tagsPath = path.join(root, "tags.json");
  let tagState: TagState | undefined;
  logSilicaTiming("cache.filesystem.created", { root });

  return {
    async get(
      cacheKey: string,
      softTags: string[] = [],
    ): Promise<CacheEntry | undefined> {
      const cacheKeyHash = getCacheKeyDigest(cacheKey);
      await timeSilicaAsync("cache.filesystem.ensure-root", { root }, () =>
        ensureCacheRoot(entriesRoot),
      );
      await timeSilicaAsync("cache.filesystem.load-tags", { root }, () =>
        loadTagState(),
      );
      const stored = await timeSilicaAsync(
        "cache.filesystem.read-entry",
        { root, cacheKeyHash },
        () => readStoredEntry(getEntryPath(entriesRoot, cacheKey)),
      );
      if (!stored) {
        logSilicaTiming("cache.filesystem.miss", {
          root,
          cacheKeyHash,
          reason: "not-found",
          softTagCount: softTags.length,
        });
        return undefined;
      }
      const now = Date.now();
      if (
        Number.isFinite(stored.expire) &&
        stored.expire > 0 &&
        stored.timestamp + stored.expire * 1000 <= now
      ) {
        logSilicaTiming("cache.filesystem.miss", {
          root,
          cacheKeyHash,
          reason: "expired",
          tagCount: stored.tags?.length ?? 0,
          softTagCount: softTags.length,
        });
        return undefined;
      }
      const expiration = getExpirationFromState([
        ...(stored.tags ?? []),
        ...softTags,
      ]);
      if (expiration > stored.timestamp) {
        logSilicaTiming("cache.filesystem.miss", {
          root,
          cacheKeyHash,
          reason: "tag-expired",
          tagCount: stored.tags?.length ?? 0,
          softTagCount: softTags.length,
        });
        return undefined;
      }
      logSilicaTiming("cache.filesystem.hit", {
        root,
        cacheKeyHash,
        tagCount: stored.tags?.length ?? 0,
        softTagCount: softTags.length,
        valueBytes: Buffer.byteLength(stored.value, "base64"),
      });
      return {
        ...stored,
        value: streamFromBuffer(Buffer.from(stored.value, "base64")),
      };
    },

    async set(
      cacheKey: string,
      pendingEntry: Promise<CacheEntry>,
    ): Promise<void> {
      const cacheKeyHash = getCacheKeyDigest(cacheKey);
      await timeSilicaAsync("cache.filesystem.ensure-root", { root }, () =>
        ensureCacheRoot(entriesRoot),
      );
      const entry = await timeSilicaAsync(
        "cache.filesystem.await-entry",
        { root, cacheKeyHash },
        () => pendingEntry,
      );
      const [storedStream, returnedStream] = entry.value.tee();
      entry.value = returnedStream;
      const buffered = await timeSilicaAsync(
        "cache.filesystem.buffer-entry",
        { root, cacheKeyHash },
        () => bufferFromStream(storedStream),
      );
      const stored: StoredCacheEntry = {
        ...entry,
        value: buffered.toString("base64"),
      };
      const destination = getEntryPath(entriesRoot, cacheKey);
      await timeSilicaAsync(
        "cache.filesystem.ensure-entry-dir",
        { root, cacheKeyHash },
        () => fs.ensureDir(path.dirname(destination)),
      );
      await timeSilicaAsync(
        "cache.filesystem.write-entry",
        { root, cacheKeyHash, valueBytes: buffered.length },
        () => writeJsonAtomic(destination, stored),
      );
      logSilicaTiming("cache.filesystem.set", {
        root,
        cacheKeyHash,
        tagCount: entry.tags?.length ?? 0,
        valueBytes: buffered.length,
      });
    },

    async refreshTags(): Promise<void> {
      await timeSilicaAsync("cache.filesystem.refresh-tags", { root }, () =>
        loadTagState(),
      );
    },

    async getExpiration(tags: string[]): Promise<number> {
      await timeSilicaAsync("cache.filesystem.load-tags", { root }, () =>
        loadTagState(),
      );
      return timeSilica(
        "cache.filesystem.get-expiration",
        {
          root,
          tagCount: tags.length,
        },
        () => getExpirationFromState(tags),
      );
    },

    async updateTags(
      tags: string[],
      durations?: { expire?: number },
    ): Promise<void> {
      await timeSilicaAsync("cache.filesystem.ensure-root", { root }, () =>
        ensureCacheRoot(entriesRoot),
      );
      await timeSilicaAsync("cache.filesystem.load-tags", { root }, () =>
        loadTagState(),
      );
      const now = Date.now();
      const uniqueTags = [...new Set(tags)];
      tagState ??= { version: 1, tags: {} };
      for (const tag of uniqueTags) {
        tagState.tags[tag] = now;
      }
      await timeSilicaAsync(
        "cache.filesystem.write-tags",
        { root, tagCount: uniqueTags.length },
        () => writeJsonAtomic(tagsPath, tagState),
      );
      if (durations?.expire === 0) {
        await timeSilicaAsync(
          "cache.filesystem.delete-entries-with-tags",
          { root, tagCount: uniqueTags.length },
          () => deleteEntriesWithTags(entriesRoot, uniqueTags),
        );
      }
      logSilicaTiming("cache.filesystem.update-tags", {
        root,
        tagCount: uniqueTags.length,
        expire: durations?.expire,
      });
    },
  };

  async function loadTagState(): Promise<void> {
    tagState = ((await fs.readJson(tagsPath).catch(() => undefined)) ?? {
      version: 1,
      tags: {},
    }) as TagState;
  }

  function getExpirationFromState(tags: string[]): number {
    const state = tagState ?? { version: 1, tags: {} };
    return Math.max(0, ...tags.map((tag) => state.tags[tag] ?? 0));
  }
}

async function ensureCacheRoot(entriesRoot: string): Promise<void> {
  await fs.ensureDir(entriesRoot);
}

function resolveCacheRoot(): string {
  if (process.env.SILICA_CACHE_DIR) return process.env.SILICA_CACHE_DIR;

  const dataRoot = tryResolveDataRoot();
  const appRoot = dataRoot ? path.dirname(dataRoot) : process.cwd();
  const config = dataRoot ? readConfigFromVaultDb(dataRoot) : undefined;
  const configured = config?.render?.cache?.directory;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(appRoot, configured);
  }
  return path.join(appRoot, "data/cache/next");
}

function readConfigFromVaultDb(dataRoot: string):
  | {
      render?: { cache?: { directory?: string } };
    }
  | undefined {
  const databasePath = path.join(dataRoot, "vault.db");
  if (!fs.existsSync(databasePath)) return;
  const db = new Database(databasePath, {
    fileMustExist: true,
    readonly: true,
  });
  try {
    db.pragma("query_only = ON");
    const row = db
      .prepare("SELECT value FROM vault_metadata WHERE key = 'configJson'")
      .get() as { value: string } | undefined;
    return row ? JSON.parse(row.value) : undefined;
  } finally {
    db.close();
  }
}

function getEntryPath(entriesRoot: string, cacheKey: string): string {
  const digest = getCacheKeyDigest(cacheKey);
  return path.join(entriesRoot, digest.slice(0, 2), `${digest}.json`);
}

function getCacheKeyDigest(cacheKey: string): string {
  return crypto.createHash("sha256").update(cacheKey).digest("hex");
}

async function readStoredEntry(
  filePath: string,
): Promise<StoredCacheEntry | undefined> {
  try {
    return (await fs.readJson(filePath)) as StoredCacheEntry;
  } catch {
    return undefined;
  }
}

async function writeJsonAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(temporary, value);
  await fs.rename(temporary, filePath);
}

async function deleteEntriesWithTags(
  entriesRoot: string,
  tags: string[],
): Promise<void> {
  if (!(await fs.pathExists(entriesRoot))) return;
  const wanted = new Set(tags);
  for (const filePath of await listJsonFiles(entriesRoot)) {
    const entry = await readStoredEntry(filePath);
    if (entry?.tags?.some((tag) => wanted.has(tag))) {
      await fs.remove(filePath);
    }
  }
}

async function listJsonFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(absolutePath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(absolutePath);
    }
  }
  return files;
}

async function bufferFromStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function streamFromBuffer(buffer: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    },
  });
}

export default createFilesystemCacheHandler();
