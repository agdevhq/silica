import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { getGitDates, precompute } from "./precompute.js";
import { resolveConfig } from "./config.js";

describe("precompute", () => {
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

  it("emits manifest, graph, search, and copies assets", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(
      path.join(root, "content/index.md"),
      "---\ntitle: Home\ntags: [start]\n---\n# Home\nSee [[Notes/Auth|Auth]] and ![[image.png]].",
    );
    await fs.ensureDir(path.join(root, "content/notes"));
    await fs.writeFile(
      path.join(root, "content/notes/auth.md"),
      "# Auth\nOAuth notes.",
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

    expect(result.manifest.allSlugs).toEqual(["index", "notes/auth"]);
    expect(result.graph.backlinks["notes/auth"]).toEqual(["index"]);
    expect(
      await fs.pathExists(path.join(root, ".silica/search-index.json")),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(root, ".silica/next/public/silica/image.png"),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(root, ".silica/content/index.md")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(root, ".silica/content/draft.md")),
    ).toBe(false);
    expect(
      result.manifest.entries.every((entry) => !path.isAbsolute(entry.file)),
    ).toBe(true);

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
