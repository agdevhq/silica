import path from "node:path";
import Database from "better-sqlite3";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { getGitDates, precompute } from "./precompute.js";
import { resolveConfig } from "./config.js";

describe("precompute", () => {
  it("omits UI description without frontmatter but keeps a clean meta description", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-description");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(
      path.join(root, "content/index.md"),
      "# Home\n\nSee [[Notes/Auth|Auth]] and **bold** text.",
    );
    await fs.writeFile(
      path.join(root, "content/explicit.md"),
      '---\ndescription: "**Custom** summary with #topic"\n---\n# Explicit\n\nBody text.',
    );

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    const index = result.manifest.bySlug.index;
    const explicit = result.manifest.bySlug["explicit"];

    expect(index?.description).toBeUndefined();
    expect(index?.generatedDescription).toBe("See Auth and bold text.");
    expect(explicit?.description).toBe("Custom summary with topic");
    expect(explicit?.generatedDescription).toBeUndefined();

    await fs.remove(root);
  });

  it("uses menu_label for navigation labels without changing page title", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-menu-label");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(
      path.join(root, "content/index.md"),
      "---\ntitle: Authentication and Authorization\nmenu_label: Auth\n---\n# Authentication and Authorization",
    );

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    expect(result.manifest.entries[0]).toMatchObject({
      title: "Authentication and Authorization",
      menuLabel: "Auth",
    });

    await fs.remove(root);
  });

  it("uses file names for notes without frontmatter titles", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-filename-title");
    await fs.emptyDir(path.join(root, "content/Notes"));
    await fs.writeFile(
      path.join(root, "content/index.md"),
      "# Home Heading\n\nSee [[Notes/Source Note|Source]].",
    );
    await fs.writeFile(
      path.join(root, "content/Notes/Source Note.md"),
      [
        "---",
        "tags: [source]",
        "---",
        "# Heading That Should Not Become The Title",
        "",
        "This note links back to [[index|Home]].",
        "",
        "Long body text. ".repeat(500),
      ].join("\n"),
    );

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    const source = result.manifest.bySlug["notes/source-note"];
    expect(source?.title).toBe("Source Note");
    expect(source?.title).not.toContain("Long body text");
    expect(
      result.searchRecords.find((record) => record.slug === source?.slug)
        ?.title,
    ).toBe("Source Note");
    expect(result.graph.backlinks["notes/source-note"]).toEqual(["index"]);
    expect(result.manifest.bySlug.index?.title).toBe("Home");
    expect(readNavigationEntries(root)).toEqual([
      { slug: "index", title: "Home" },
      { slug: "notes/source-note", title: "Source Note" },
    ]);

    await fs.remove(root);
  });

  it("counts custom frontmatter wikilinks toward backlinks", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-frontmatter-links");
    await fs.emptyDir(path.join(root, "content/notes"));
    await fs.writeFile(
      path.join(root, "content/index.md"),
      [
        "---",
        'related: "[[Notes/Auth|Auth]]"',
        "reviewers:",
        '  - "[[Notes/Auth]]"',
        "---",
        "# Home",
      ].join("\n"),
    );
    await fs.writeFile(
      path.join(root, "content/notes/auth.md"),
      "---\ntitle: Auth\n---\n# Auth",
    );

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    expect(result.graph.links.index).toEqual(["notes/auth"]);
    expect(result.graph.backlinks["notes/auth"]).toEqual(["index"]);

    const db = new Database(path.join(root, ".silica/vault.db"), {
      readonly: true,
      fileMustExist: true,
    });
    try {
      expect(
        db
          .prepare(
            "SELECT source_slug, target_slug, kind FROM links ORDER BY source_slug, target_slug, kind",
          )
          .all(),
      ).toEqual([
        { source_slug: "index", target_slug: "notes/auth", kind: "link" },
      ]);
    } finally {
      db.close();
    }

    await fs.remove(root);
  });

  it("keeps backlink titles short for large notes without frontmatter titles", async () => {
    const root = path.join(
      process.cwd(),
      ".tmp-precompute-backlink-title-bloat",
    );
    await fs.emptyDir(path.join(root, "content/notes"));
    await fs.writeFile(
      path.join(root, "content/hub.md"),
      "---\ntitle: Hub\n---\n# Hub",
    );
    for (let index = 0; index < 12; index += 1) {
      const padded = String(index).padStart(2, "0");
      await fs.writeFile(
        path.join(root, `content/notes/Source ${padded}.md`),
        [
          "---",
          "type: synthetic",
          "---",
          `# Heading ${padded} That Should Not Become The Title`,
          "",
          "[[hub|Hub]]",
          "",
          `Body marker ${padded}. `.repeat(1_000),
        ].join("\n"),
      );
    }

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });
    const backlinkTitles = (result.graph.backlinks.hub ?? []).map(
      (source) => result.manifest.bySlug[source]?.title ?? source,
    );
    const serializedBacklinks = JSON.stringify(backlinkTitles);

    expect(backlinkTitles).toHaveLength(12);
    expect(backlinkTitles).toContain("Source 00");
    expect(serializedBacklinks).not.toContain("Body marker");
    expect(serializedBacklinks.length).toBeLessThan(500);
    expect(
      Math.max(...result.manifest.entries.map((entry) => entry.title.length)),
    ).toBeLessThan(20);

    await fs.remove(root);
  });

  it("uses numeric prefixes for ordering while keeping slugs clean", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-numeric-prefixes");
    await fs.emptyDir(path.join(root, "content/02_Guides"));
    await fs.writeFile(path.join(root, "content/01_Home.md"), "");
    await fs.writeFile(path.join(root, "content/02_Guides/02_Advanced.md"), "");
    await fs.writeFile(path.join(root, "content/02_Guides/01_Setup.md"), "");
    await fs.writeFile(path.join(root, "content/03_Reference.md"), "");

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    expect(result.manifest.allSlugs).toEqual([
      "home",
      "guides/setup",
      "guides/advanced",
      "reference",
    ]);
    expect(result.manifest.entries.map((entry) => entry.title)).toEqual([
      "Home",
      "Setup",
      "Advanced",
      "Reference",
    ]);
    expect(result.manifest.entries.map((entry) => entry.sourcePath)).toEqual([
      "01_Home.md",
      "02_Guides/01_Setup.md",
      "02_Guides/02_Advanced.md",
      "03_Reference.md",
    ]);

    await fs.remove(root);
  });

  it("can keep numeric prefixes in slugs when disabled", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-prefixes-disabled");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/01_Home.md"), "Home body");

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig(
        { title: "Test", ordering: { numericPrefixes: false } },
        root,
      ),
    });

    expect(result.manifest.allSlugs).toEqual(["01_home"]);
    expect(result.manifest.entries[0]?.title).toBe("01_Home");

    await fs.remove(root);
  });

  it("emits vault.db metadata, search, and copies assets", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(
      path.join(root, "content/index.md"),
      "---\ntitle: Home\ntags: [start]\n---\n# Home\nSee [[Notes/Auth|Auth]] and ![[image.png]].",
    );
    await fs.ensureDir(path.join(root, "content/notes"));
    await fs.writeFile(
      path.join(root, "content/notes/auth.md"),
      "---\ntitle: Auth\n---\n# Auth\nOAuth notes.",
    );
    await fs.writeFile(
      path.join(root, "content/notes/embed-helper.md"),
      "---\nlisted: false\n---\n# Embed Helper\nOnly for embeds.",
    );
    await fs.writeFile(
      path.join(root, "content/draft.md"),
      "---\ndraft: true\n---\n# Draft",
    );
    await fs.writeFile(path.join(root, "content/image.png"), "fake");

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    expect(result.manifest.allSlugs).toEqual([
      "index",
      "notes/auth",
      "notes/embed-helper",
    ]);
    expect(result.graph.backlinks["notes/auth"]).toEqual(["index"]);
    expect(result.searchRecords.map((record) => record.slug)).toEqual([
      "index",
      "notes/auth",
    ]);
    expect(await fs.pathExists(path.join(root, ".silica/vault.db"))).toBe(true);
    expect(await fs.pathExists(path.join(root, ".silica/search.db"))).toBe(
      false,
    );
    expect(readNavigationEntries(root)).toEqual([
      { slug: "index", title: "Home" },
      { slug: "notes/auth", title: "Auth" },
    ]);
    expect(
      await fs.pathExists(
        path.join(root, ".silica/next/public/silica/image.png"),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(root, ".silica/content/index.md")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(root, ".silica/cache-state.json")),
    ).toBe(false);
    expect(
      await fs.pathExists(path.join(root, ".silica/route-cache-keys.json")),
    ).toBe(false);
    expect(await fs.pathExists(path.join(root, ".silica/prerender.json"))).toBe(
      false,
    );
    expect(await fs.pathExists(path.join(root, ".silica/build-id.txt"))).toBe(
      false,
    );
    expect(result.cacheState.renderEnvironmentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manifest.bySlug.index?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(readRenderHash(root, "index")).toMatch(/^[a-f0-9]{64}$/);
    expect(readSearchRowCount(root)).toBe(2);
    expect(
      await fs.pathExists(path.join(root, ".silica/content/draft.md")),
    ).toBe(false);
    expect(
      result.manifest.entries.every((entry) => !path.isAbsolute(entry.file)),
    ).toBe(true);
    expect(
      await fs.readFile(
        path.join(root, ".silica/next/public/sitemap.xml"),
        "utf8",
      ),
    ).not.toContain("notes/embed-helper");

    await fs.remove(root);
  });

  it("copies assets to slugified asset paths", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-assets");
    await fs.emptyDir(path.join(root, "content/01 Notes"));
    await fs.writeFile(
      path.join(root, "content/01 Notes/02 Page.md"),
      "![[Local Image.PNG]]",
    );
    await fs.writeFile(
      path.join(root, "content/01 Notes/Local Image.PNG"),
      "fake",
    );

    await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    expect(
      await fs.pathExists(
        path.join(root, ".silica/next/public/silica/notes/local-image.png"),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(root, ".silica/next/public/silica/01 Notes/Local Image.PNG"),
      ),
    ).toBe(false);

    await fs.remove(root);
  });

  it("rejects colliding asset paths", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-asset-collision");
    await fs.emptyDir(path.join(root, "content/Notes"));
    await fs.emptyDir(path.join(root, "content/notes"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await fs.writeFile(path.join(root, "content/Notes/My Photo.png"), "a");
    await fs.writeFile(path.join(root, "content/notes/my-photo.png"), "b");

    await expect(
      precompute({
        projectRoot: root,
        config: resolveConfig({ title: "Test" }, root),
      }),
    ).rejects.toThrow("Asset path collision");

    await fs.remove(root);
  });

  it("does not follow symlinks while scanning content", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-symlink");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await fs.writeFile(path.join(root, "secret.md"), "# Secret");
    await fs.writeFile(path.join(root, "secret.txt"), "secret");
    await fs.symlink("../secret.md", path.join(root, "content/linked.md"));
    await fs.symlink("../secret.txt", path.join(root, "content/linked.txt"));

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    expect(result.manifest.allSlugs).toEqual(["index"]);
    expect(
      await fs.pathExists(
        path.join(root, ".silica/next/public/silica/linked.txt"),
      ),
    ).toBe(false);

    await fs.remove(root);
  });

  it("can disable inline body tags", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-inline-tags");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(
      path.join(root, "content/index.md"),
      "---\ntags: [frontmatter]\n---\n# Home\nDiscuss #body-tag.",
    );

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test", tags: { inline: false } }, root),
    });

    expect(result.manifest.entries[0]?.tags).toEqual(["frontmatter"]);

    await fs.remove(root);
  });

  it("selects prerender slugs by depth with include and exclude overrides", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-prerender-depth");
    await fs.emptyDir(path.join(root, "content/a/b"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await fs.writeFile(path.join(root, "content/a.md"), "# A");
    await fs.writeFile(path.join(root, "content/a/b.md"), "# B");
    await fs.writeFile(path.join(root, "content/a/b/c.md"), "# C");

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig(
        {
          title: "Test",
          render: {
            prerender: {
              depth: 2,
              include: ["a/b/c"],
              exclude: ["a"],
            },
          },
        },
        root,
      ),
    });

    expect(result.prerender.slugs).toEqual(["a/b", "a/b/c", "index"]);
    expect(readPrerenderSlugs(root)).toEqual(result.prerender.slugs);

    await fs.remove(root);
  });

  it("selects section pages at depth 1 for typical docs vault layout", async () => {
    const root = path.join(
      process.cwd(),
      ".tmp-precompute-prerender-docs-depth",
    );
    await fs.emptyDir(path.join(root, "content/getting-started/deep"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await fs.writeFile(
      path.join(root, "content/getting-started/installation.md"),
      "# Installation",
    );
    await fs.writeFile(
      path.join(root, "content/getting-started/deep/nested.md"),
      "# Nested",
    );

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig(
        {
          title: "Test",
          render: {
            prerender: {
              depth: 1,
            },
          },
        },
        root,
      ),
    });

    expect(result.prerender.slugs).toEqual([
      "getting-started/installation",
      "index",
    ]);

    await fs.remove(root);
  });

  it("uses custom prerender scores with limit and explicit includes", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-prerender-custom");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await fs.writeFile(path.join(root, "content/hot-one.md"), "# Hot One");
    await fs.writeFile(path.join(root, "content/hot-two.md"), "# Hot Two");
    await fs.writeFile(path.join(root, "content/pinned.md"), "# Pinned");

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig(
        {
          title: "Test",
          render: {
            prerender: {
              strategy: "custom",
              limit: 1,
              include: ["pinned"],
              select: (entry) =>
                entry.slug === "hot-one"
                  ? 10
                  : entry.slug === "hot-two"
                    ? 20
                    : false,
            },
          },
        },
        root,
      ),
    });

    expect(result.prerender.slugs).toEqual(["hot-two", "pinned"]);

    await fs.remove(root);
  });

  it("keeps backlink render hashes sensitive to source titles, not source bodies", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-render-hashes");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/target.md"), "# Target");
    await fs.writeFile(
      path.join(root, "content/source.md"),
      "---\ntitle: Source\n---\n[[target]]\n\nOriginal body.",
    );

    await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });
    const firstTargetHash = readRenderHash(root, "target");

    await fs.writeFile(
      path.join(root, "content/source.md"),
      "---\ntitle: Source\n---\n[[target]]\n\nChanged body.",
    );
    await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });
    expect(readRenderHash(root, "target")).toBe(firstTargetHash);

    await fs.writeFile(
      path.join(root, "content/source.md"),
      "---\ntitle: Source Renamed\n---\n[[target]]\n\nChanged body.",
    );
    await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });
    expect(readRenderHash(root, "target")).not.toBe(firstTargetHash);

    await fs.remove(root);
  });

  it("does not overwrite user-owned robots or sitemap files", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute-public-overrides");
    await fs.emptyDir(path.join(root, "content"));
    await fs.ensureDir(path.join(root, "public"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await fs.writeFile(
      path.join(root, "public/robots.txt"),
      "User-agent: *\nDisallow: /private\n",
    );
    await fs.writeFile(
      path.join(root, "public/sitemap.xml"),
      "<xml>User sitemap</xml>",
    );
    await fs.ensureDir(path.join(root, ".silica/next/public"));
    await fs.copy(
      path.join(root, "public/robots.txt"),
      path.join(root, ".silica/next/public/robots.txt"),
    );
    await fs.copy(
      path.join(root, "public/sitemap.xml"),
      path.join(root, ".silica/next/public/sitemap.xml"),
    );

    await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    await expect(
      fs.readFile(path.join(root, ".silica/next/public/robots.txt"), "utf8"),
    ).resolves.toContain("Disallow");
    await expect(
      fs.readFile(path.join(root, ".silica/next/public/sitemap.xml"), "utf8"),
    ).resolves.toContain("User sitemap");

    await fs.remove(root);
  });
});

describe("getGitDates", () => {
  it("falls back safely outside a git history", async () => {
    const root = path.join(process.cwd(), ".tmp-git-dates");
    await fs.emptyDir(root);

    await expect(getGitDates(root, "content/index.md")).resolves.toEqual({});

    await fs.remove(root);
  });
});

function readNavigationEntries(root: string): Array<{
  slug: string;
  title: string;
}> {
  const db = openVaultDb(root);
  try {
    return db
      .prepare(
        `
        SELECT slug, menu_label AS title
        FROM notes
        WHERE listed = 1
        ORDER BY COALESCE(sort_key, slug), slug
      `,
      )
      .all() as Array<{ slug: string; title: string }>;
  } finally {
    db.close();
  }
}

function readPrerenderSlugs(root: string): string[] {
  const db = openVaultDb(root);
  try {
    return db
      .prepare(
        "SELECT slug FROM notes WHERE prerender = 1 ORDER BY COALESCE(sort_key, slug), slug",
      )
      .all()
      .map((row) => (row as { slug: string }).slug);
  } finally {
    db.close();
  }
}

function readRenderHash(root: string, slug: string): string | undefined {
  const db = openVaultDb(root);
  try {
    const row = db
      .prepare("SELECT render_hash FROM notes WHERE slug = ?")
      .get(slug) as { render_hash: string } | undefined;
    return row?.render_hash;
  } finally {
    db.close();
  }
}

function readSearchRowCount(root: string): number {
  const db = openVaultDb(root);
  try {
    const row = db
      .prepare("SELECT COUNT(*) AS count FROM search_index")
      .get() as { count: number };
    return row.count;
  } finally {
    db.close();
  }
}

function openVaultDb(root: string): Database.Database {
  const db = new Database(path.join(root, ".silica/vault.db"), {
    fileMustExist: true,
    readonly: true,
  });
  db.pragma("query_only = ON");
  return db;
}
