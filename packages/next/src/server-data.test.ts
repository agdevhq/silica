import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { precompute, resolveConfig } from "@silicajs/core";
import {
  getPageBySourcePath,
  getPageRuntimeData,
  getProjectRoot,
  loadVaultDb,
  resolveAssetFromDb,
  resolveWikiLinkFromDb,
} from "./server-data.js";

describe("server data", () => {
  it("resolves a relative SILICA_PROJECT_ROOT against cwd", () => {
    const root = path.join(process.cwd(), ".tmp-server-data-relative-root");
    const previousProjectRoot = process.env.SILICA_PROJECT_ROOT;
    process.env.SILICA_PROJECT_ROOT = root;

    try {
      expect(getProjectRoot()).toBe(root);
    } finally {
      if (previousProjectRoot === undefined) {
        delete process.env.SILICA_PROJECT_ROOT;
      } else {
        process.env.SILICA_PROJECT_ROOT = previousProjectRoot;
      }
    }
  });

  it("reloads vault.db when precompute swaps the database", async () => {
    const root = path.join(process.cwd(), ".tmp-server-data-reload");
    const previousProjectRoot = process.env.SILICA_PROJECT_ROOT;
    process.env.SILICA_PROJECT_ROOT = root;
    await fs.emptyDir(path.join(root, "content"));

    await fs.writeFile(
      path.join(root, "content/index.md"),
      "---\ntitle: First\n---\n# First",
    );
    await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });
    expect(getPageRuntimeData("index")?.entry.title).toBe("First");
    expect(getPageBySourcePath("/content/index.md")?.slug).toBe("index");

    await fs.writeFile(
      path.join(root, "content/index.md"),
      "---\ntitle: Second\n---\n# Second",
    );
    await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });
    expect(getPageRuntimeData("index")?.entry.title).toBe("Second");

    loadVaultDb().close();

    if (previousProjectRoot === undefined) {
      delete process.env.SILICA_PROJECT_ROOT;
    } else {
      process.env.SILICA_PROJECT_ROOT = previousProjectRoot;
    }
    await fs.remove(root);
  });

  it("resolves asset aliases from vault.db", async () => {
    const root = path.join(process.cwd(), ".tmp-server-data-assets");
    const previousProjectRoot = process.env.SILICA_PROJECT_ROOT;
    process.env.SILICA_PROJECT_ROOT = root;
    await fs.emptyDir(path.join(root, "content/01 Notes"));
    await fs.emptyDir(path.join(root, "content/attachments"));

    try {
      await fs.writeFile(path.join(root, "content/index.md"), "# Home");
      await fs.writeFile(
        path.join(root, "content/01 Notes/02 Page.md"),
        "# Page",
      );
      await fs.writeFile(
        path.join(root, "content/01 Notes/Local Image.PNG"),
        "fake",
      );
      await fs.writeFile(
        path.join(root, "content/attachments/photo.png"),
        "fake",
      );
      await fs.writeFile(
        path.join(root, "content/attachments/Local Image.PNG"),
        "fake",
      );
      await precompute({
        projectRoot: root,
        config: resolveConfig({ title: "Test" }, root),
      });

      expect(resolveAssetFromDb("index.md", "photo.png", "shortest")).toBe(
        "attachments/photo.png",
      );
      expect(
        resolveAssetFromDb(
          "01 Notes/02 Page.md",
          "Local Image.PNG",
          "relative",
          { numericPrefixes: true },
        ),
      ).toBe("notes/local-image.png");
      expect(
        resolveAssetFromDb(
          "01 Notes/02 Page.md",
          "./Local Image.PNG",
          "shortest",
          { numericPrefixes: true },
        ),
      ).toBe("notes/local-image.png");
    } finally {
      if (await fs.pathExists(path.join(root, ".silica/vault.db"))) {
        loadVaultDb().close();
      }
      if (previousProjectRoot === undefined) {
        delete process.env.SILICA_PROJECT_ROOT;
      } else {
        process.env.SILICA_PROJECT_ROOT = previousProjectRoot;
      }
      await fs.remove(root);
    }
  });

  it("resolves ambiguous shortest wikilinks from vault.db by proximity", async () => {
    const root = path.join(process.cwd(), ".tmp-server-data-wikilinks");
    const previousProjectRoot = process.env.SILICA_PROJECT_ROOT;
    process.env.SILICA_PROJECT_ROOT = root;
    await fs.emptyDir(path.join(root, "content/notes"));
    await fs.emptyDir(path.join(root, "content/archive"));

    try {
      await fs.writeFile(path.join(root, "content/index.md"), "# Home");
      await fs.writeFile(
        path.join(root, "content/notes/index.md"),
        "# Notes\n\n[[Overview]]",
      );
      await fs.writeFile(
        path.join(root, "content/notes/Overview.md"),
        "# Notes Overview",
      );
      await fs.writeFile(
        path.join(root, "content/archive/Overview.md"),
        "# Archive Overview",
      );
      await precompute({
        projectRoot: root,
        config: resolveConfig({ title: "Test" }, root),
      });

      expect(resolveWikiLinkFromDb("notes/index", "Overview", "shortest")).toBe(
        "notes/overview",
      );
      expect(resolveWikiLinkFromDb("index", "Overview", "shortest")).toBe(
        "archive/overview",
      );
    } finally {
      if (await fs.pathExists(path.join(root, ".silica/vault.db"))) {
        loadVaultDb().close();
      }
      if (previousProjectRoot === undefined) {
        delete process.env.SILICA_PROJECT_ROOT;
      } else {
        process.env.SILICA_PROJECT_ROOT = previousProjectRoot;
      }
      await fs.remove(root);
    }
  });
});
