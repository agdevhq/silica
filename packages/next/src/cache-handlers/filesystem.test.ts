import crypto from "node:crypto";
import path from "node:path";
import { ReadableStream } from "node:stream/web";
import Database from "better-sqlite3";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { precompute, resolveConfig } from "@silicajs/core";
import { createFilesystemCacheHandler, type CacheEntry } from "./filesystem.js";

describe("filesystem cache handler", () => {
  it("persists cache entries and invalidates them by tag", async () => {
    const root = path.join(process.cwd(), ".tmp-filesystem-cache-handler");
    await fs.emptyDir(root);
    const handler = createFilesystemCacheHandler({ root });
    const entry: CacheEntry = {
      value: streamFromString("cached content"),
      tags: ["page:index"],
      stale: 300,
      timestamp: Date.now(),
      expire: 60,
      revalidate: 60,
    };

    await handler.set("cache-key", Promise.resolve(entry));

    const cached = await handler.get("cache-key", []);
    expect(cached?.tags).toEqual(["page:index"]);
    expect(await streamToString(cached!.value)).toBe("cached content");

    await handler.updateTags(["page:index"], { expire: 0 });
    await expect(handler.get("cache-key", [])).resolves.toBeUndefined();

    await fs.remove(root);
  });

  it("uses the generated app data directory for unmanaged runtime cache writes", async () => {
    const root = path.join(
      process.cwd(),
      `.tmp-unmanaged-runtime-cache-${crypto.randomUUID()}`,
    );
    const nextRoot = path.join(root, ".silica/next");
    const previousCacheDir = process.env.SILICA_CACHE_DIR;
    const previousProjectRoot = process.env.SILICA_PROJECT_ROOT;
    const previousCwd = process.cwd();
    const cacheRoot = path.join(nextRoot, "data/cache/next");

    delete process.env.SILICA_CACHE_DIR;
    delete process.env.SILICA_PROJECT_ROOT;
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });
    await fs.ensureDir(nextRoot);
    await fs.remove(cacheRoot);

    try {
      process.chdir(nextRoot);
      const handler = createFilesystemCacheHandler();
      await handler.set(
        "unmanaged-runtime-cache-key",
        Promise.resolve({
          value: streamFromString("cached from unmanaged runtime"),
          tags: ["page:index"],
          stale: 300,
          timestamp: Date.now(),
          expire: 60,
          revalidate: 60,
        }),
      );

      expect(await fs.pathExists(path.join(cacheRoot, "entries"))).toBe(true);
    } finally {
      process.chdir(previousCwd);
      if (previousCacheDir === undefined) {
        delete process.env.SILICA_CACHE_DIR;
      } else {
        process.env.SILICA_CACHE_DIR = previousCacheDir;
      }
      if (previousProjectRoot === undefined) {
        delete process.env.SILICA_PROJECT_ROOT;
      } else {
        process.env.SILICA_PROJECT_ROOT = previousProjectRoot;
      }
      await fs.remove(cacheRoot);
      await fs.remove(root);
    }
  });

  it("reads cache config from the app data directory when cwd is the generated app", async () => {
    const root = path.join(
      process.cwd(),
      `.tmp-generated-runtime-cache-${crypto.randomUUID()}`,
    );
    const nextRoot = path.join(root, ".silica/next");
    const cacheRoot = path.join(nextRoot, ".cache/next");
    const previousCwd = process.cwd();
    const previousCacheDir = process.env.SILICA_CACHE_DIR;
    const previousProjectRoot = process.env.SILICA_PROJECT_ROOT;

    delete process.env.SILICA_CACHE_DIR;
    delete process.env.SILICA_PROJECT_ROOT;
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await precompute({
      projectRoot: root,
      config: resolveConfig(
        {
          title: "Test",
          render: { cache: { directory: ".cache/next" } },
        },
        root,
      ),
    });
    await fs.ensureDir(nextRoot);

    try {
      process.chdir(nextRoot);
      const handler = createFilesystemCacheHandler();
      await handler.set(
        "generated-runtime-cache-key",
        Promise.resolve({
          value: streamFromString("cached from generated runtime"),
          tags: ["page:index"],
          stale: 300,
          timestamp: Date.now(),
          expire: 60,
          revalidate: 60,
        }),
      );

      expect(await fs.pathExists(path.join(cacheRoot, "entries"))).toBe(true);
    } finally {
      process.chdir(previousCwd);
      if (previousCacheDir === undefined) {
        delete process.env.SILICA_CACHE_DIR;
      } else {
        process.env.SILICA_CACHE_DIR = previousCacheDir;
      }
      if (previousProjectRoot === undefined) {
        delete process.env.SILICA_PROJECT_ROOT;
      } else {
        process.env.SILICA_PROJECT_ROOT = previousProjectRoot;
      }
      await fs.remove(root);
    }
  });

  it("reuses cross-build cache entries for unchanged render inputs", async () => {
    const root = path.join(process.cwd(), ".tmp-cross-build-render-cache");
    const cacheRoot = path.join(root, ".cache");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/target.md"), "# Target");
    await fs.writeFile(path.join(root, "content/stable.md"), "# Stable");
    await fs.writeFile(
      path.join(root, "content/source.md"),
      "---\ntitle: Source\n---\n[[target]]\n\nOriginal body.",
    );

    const handler = createFilesystemCacheHandler({ root: cacheRoot });
    const first = await runPrecompute(root);
    await putCachedPage(handler, first, "target", "target-v1");
    await putCachedPage(handler, first, "source", "source-v1");
    await putCachedPage(handler, first, "stable", "stable-v1");

    const unchanged = await runPrecompute(root);
    await expectCachedPage(handler, unchanged, "target", "target-v1");
    await expectCachedPage(handler, unchanged, "source", "source-v1");
    await expectCachedPage(handler, unchanged, "stable", "stable-v1");

    await fs.writeFile(
      path.join(root, "content/source.md"),
      "---\ntitle: Source\n---\n[[target]]\n\nBody-only backlink source edit.",
    );
    const backlinkSourceBodyChange = await runPrecompute(root);
    await expectCachedPage(
      handler,
      backlinkSourceBodyChange,
      "target",
      "target-v1",
    );
    await expectCachedPage(
      handler,
      backlinkSourceBodyChange,
      "stable",
      "stable-v1",
    );
    await expectCacheMiss(handler, backlinkSourceBodyChange, "source");

    await fs.writeFile(
      path.join(root, "content/source.md"),
      "---\ntitle: Source Renamed\n---\n[[target]]\n\nBody-only backlink source edit.",
    );
    const backlinkSourceTitleChange = await runPrecompute(root);
    await expectCacheMiss(handler, backlinkSourceTitleChange, "target");
    await expectCachedPage(
      handler,
      backlinkSourceTitleChange,
      "stable",
      "stable-v1",
    );

    await fs.writeFile(
      path.join(root, "content/other.md"),
      "---\ntitle: Other\n---\n[[target]]",
    );
    const newBacklink = await runPrecompute(root);
    await expectCacheMiss(handler, newBacklink, "target");
    await expectCachedPage(handler, newBacklink, "stable", "stable-v1");

    await fs.remove(root);
  });
});

async function runPrecompute(root: string): Promise<string> {
  await precompute({
    projectRoot: root,
    config: resolveConfig({ title: "Test" }, root),
  });
  return root;
}

async function putCachedPage(
  handler: ReturnType<typeof createFilesystemCacheHandler>,
  root: string,
  slug: string,
  content: string,
): Promise<void> {
  await handler.set(
    cacheKey(root, slug),
    Promise.resolve({
      value: streamFromString(content),
      tags: [`page:${slug}`],
      stale: 300,
      timestamp: Date.now(),
      expire: 60,
      revalidate: 60,
    }),
  );
}

async function expectCachedPage(
  handler: ReturnType<typeof createFilesystemCacheHandler>,
  root: string,
  slug: string,
  expected: string,
): Promise<void> {
  const cached = await handler.get(cacheKey(root, slug), []);
  expect(cached, slug).toBeDefined();
  expect(await streamToString(cached!.value)).toBe(expected);
}

async function expectCacheMiss(
  handler: ReturnType<typeof createFilesystemCacheHandler>,
  root: string,
  slug: string,
): Promise<void> {
  await expect(handler.get(cacheKey(root, slug), [])).resolves.toBeUndefined();
}

function cacheKey(root: string, slug: string): string {
  const db = new Database(path.join(root, ".silica/next/data/vault.db"), {
    fileMustExist: true,
    readonly: true,
  });
  try {
    db.pragma("query_only = ON");
    const note = db
      .prepare("SELECT render_hash FROM notes WHERE slug = ?")
      .get(slug) as { render_hash: string } | undefined;
    const metadata = db
      .prepare(
        "SELECT value FROM vault_metadata WHERE key = 'renderEnvironmentHash'",
      )
      .get() as { value: string } | undefined;
    expect(note, slug).toBeDefined();
    expect(metadata).toBeDefined();
    return ["vault-content", metadata!.value, slug, note!.render_hash].join(
      ":",
    );
  } finally {
    db.close();
  }
}

function streamFromString(value: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Buffer.from(value));
      controller.close();
    },
  });
}

async function streamToString(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
