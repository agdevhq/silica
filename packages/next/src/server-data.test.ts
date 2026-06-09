import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { loadPageRuntimeData } from "./server-data.js";

describe("server data", () => {
  it("reloads runtime artifacts when precompute generatedAt changes", async () => {
    const root = path.join(process.cwd(), ".tmp-server-data-reload");
    const silicaRoot = path.join(root, ".silica");
    const previousProjectRoot = process.env.SILICA_PROJECT_ROOT;
    process.env.SILICA_PROJECT_ROOT = root;
    await fs.emptyDir(silicaRoot);

    await writeArtifacts(silicaRoot, {
      generatedAt: "one",
      title: "First",
    });
    const first = await loadPageRuntimeData();
    expect(first.manifest.bySlug.index?.title).toBe("First");

    await writeArtifacts(silicaRoot, {
      generatedAt: "two",
      title: "Second",
    });
    const second = await loadPageRuntimeData();
    expect(second.manifest.bySlug.index?.title).toBe("Second");

    if (previousProjectRoot === undefined) {
      delete process.env.SILICA_PROJECT_ROOT;
    } else {
      process.env.SILICA_PROJECT_ROOT = previousProjectRoot;
    }
    await fs.remove(root);
  });
});

async function writeArtifacts(
  silicaRoot: string,
  options: { generatedAt: string; title: string },
): Promise<void> {
  await fs.writeJson(path.join(silicaRoot, "cache-state.json"), {
    version: 1,
    renderEnvironmentHash: "environment",
    configHash: "config",
    siteMetadataHash: "site",
    rendererVersion: "test",
    generatedAt: options.generatedAt,
  });
  await fs.writeJson(path.join(silicaRoot, "manifest.json"), {
    version: 1,
    generatedAt: options.generatedAt,
    contentDir: "content",
    entries: [
      {
        slug: "index",
        title: options.title,
        menuLabel: options.title,
        tags: [],
        file: ".silica/content/index.md",
        relativeFile: "index.md",
        frontmatter: {},
        contentHash: options.title,
        embeds: [],
      },
    ],
  });
  await fs.writeJson(path.join(silicaRoot, "graph.json"), {
    version: 1,
    links: {},
    backlinks: {},
    brokenLinks: [],
  });
  await fs.writeJson(path.join(silicaRoot, "config.json"), {
    projectRoot: path.dirname(silicaRoot),
    title: "Test",
    description: "Test",
    contentDir: "content",
    theme: "default",
    wikilinks: { strategy: "shortest", strict: false },
    tags: { inline: true },
    ordering: { numericPrefixes: true },
    filters: { removeDrafts: true, explicitPublish: false },
    render: {
      prerender: { strategy: "all" },
      cache: { storage: "filesystem" },
    },
  });
}
