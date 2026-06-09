import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { precompute, resolveConfig } from "@silicajs/core";
import { getPageRuntimeData, loadVaultDb } from "./server-data.js";

describe("server data", () => {
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
});
