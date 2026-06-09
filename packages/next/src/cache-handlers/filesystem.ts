import crypto from "node:crypto";
import path from "node:path";
import { ReadableStream } from "node:stream/web";
import fs from "fs-extra";

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

  return {
    async get(
      cacheKey: string,
      softTags: string[] = [],
    ): Promise<CacheEntry | undefined> {
      await ensureCacheRoot(entriesRoot);
      await refreshTags();
      const stored = await readStoredEntry(getEntryPath(entriesRoot, cacheKey));
      if (!stored) return undefined;
      const now = Date.now();
      if (
        Number.isFinite(stored.expire) &&
        stored.expire > 0 &&
        stored.timestamp + stored.expire * 1000 <= now
      ) {
        return undefined;
      }
      const expiration = getExpirationFromState([
        ...(stored.tags ?? []),
        ...softTags,
      ]);
      if (expiration > stored.timestamp) return undefined;
      return {
        ...stored,
        value: streamFromBuffer(Buffer.from(stored.value, "base64")),
      };
    },

    async set(
      cacheKey: string,
      pendingEntry: Promise<CacheEntry>,
    ): Promise<void> {
      await ensureCacheRoot(entriesRoot);
      const entry = await pendingEntry;
      const [storedStream, returnedStream] = entry.value.tee();
      entry.value = returnedStream;
      const stored: StoredCacheEntry = {
        ...entry,
        value: (await bufferFromStream(storedStream)).toString("base64"),
      };
      const destination = getEntryPath(entriesRoot, cacheKey);
      await fs.ensureDir(path.dirname(destination));
      await writeJsonAtomic(destination, stored);
    },

    async refreshTags(): Promise<void> {
      await refreshTags();
    },

    async getExpiration(tags: string[]): Promise<number> {
      await refreshTags();
      return getExpirationFromState(tags);
    },

    async updateTags(
      tags: string[],
      durations?: { expire?: number },
    ): Promise<void> {
      await ensureCacheRoot(entriesRoot);
      await refreshTags();
      const now = Date.now();
      const uniqueTags = [...new Set(tags)];
      tagState ??= { version: 1, tags: {} };
      for (const tag of uniqueTags) {
        tagState.tags[tag] = now;
      }
      await writeJsonAtomic(tagsPath, tagState);
      if (durations?.expire === 0) {
        await deleteEntriesWithTags(entriesRoot, uniqueTags);
      }
    },
  };

  async function refreshTags(): Promise<void> {
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
  const projectRoot = process.env.SILICA_PROJECT_ROOT ?? process.cwd();
  const configPath = path.join(projectRoot, ".silica/config.json");
  const config = fs.readJsonSync(configPath, { throws: false }) as {
    render?: { cache?: { directory?: string } };
  } | null;
  const configured = config?.render?.cache?.directory;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(projectRoot, configured);
  }
  return path.join(projectRoot, ".silica/cache/next");
}

function getEntryPath(entriesRoot: string, cacheKey: string): string {
  const digest = crypto.createHash("sha256").update(cacheKey).digest("hex");
  return path.join(entriesRoot, digest.slice(0, 2), `${digest}.json`);
}

async function readStoredEntry(
  filePath: string,
): Promise<StoredCacheEntry | undefined> {
  return fs.readJson(filePath).catch(() => undefined) as Promise<
    StoredCacheEntry | undefined
  >;
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
