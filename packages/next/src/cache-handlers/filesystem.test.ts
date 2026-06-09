import path from "node:path";
import { ReadableStream } from "node:stream/web";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import {
  precompute,
  resolveConfig,
  type PrecomputeResult,
} from "@silicajs/core";
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

async function runPrecompute(root: string): Promise<PrecomputeResult> {
  return precompute({
    projectRoot: root,
    config: resolveConfig({ title: "Test" }, root),
  });
}

async function putCachedPage(
  handler: ReturnType<typeof createFilesystemCacheHandler>,
  result: PrecomputeResult,
  slug: string,
  content: string,
): Promise<void> {
  await handler.set(
    cacheKey(result, slug),
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
  result: PrecomputeResult,
  slug: string,
  expected: string,
): Promise<void> {
  const cached = await handler.get(cacheKey(result, slug), []);
  expect(cached, slug).toBeDefined();
  expect(await streamToString(cached!.value)).toBe(expected);
}

async function expectCacheMiss(
  handler: ReturnType<typeof createFilesystemCacheHandler>,
  result: PrecomputeResult,
  slug: string,
): Promise<void> {
  await expect(
    handler.get(cacheKey(result, slug), []),
  ).resolves.toBeUndefined();
}

function cacheKey(result: PrecomputeResult, slug: string): string {
  const entry = result.routeCacheKeys.entries[slug];
  expect(entry, slug).toBeDefined();
  return [
    "vault-content",
    result.cacheState.renderEnvironmentHash,
    slug,
    entry!.renderHash,
  ].join(":");
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
