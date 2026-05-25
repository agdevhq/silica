import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { precompute } from "./precompute.js";
import { resolveConfig } from "./config.js";

describe("precompute", () => {
  it("emits manifest, graph, search, and copies assets", async () => {
    const root = path.join(process.cwd(), ".tmp-precompute");
    await fs.emptyDir(path.join(root, "content"));
    await fs.writeFile(
      path.join(root, "content/index.md"),
      "---\ntitle: Home\ntags: [start]\n---\n# Home\nSee [[Notes/Auth|Auth]] and ![[image.png]].",
    );
    await fs.ensureDir(path.join(root, "content/notes"));
    await fs.writeFile(path.join(root, "content/notes/auth.md"), "# Auth\nOAuth notes.");
    await fs.writeFile(path.join(root, "content/draft.md"), "---\ndraft: true\n---\n# Draft");
    await fs.writeFile(path.join(root, "content/image.png"), "fake");

    const result = await precompute({
      projectRoot: root,
      config: resolveConfig({ title: "Test" }, root),
    });

    expect(result.manifest.allSlugs).toEqual(["index", "notes/auth"]);
    expect(result.graph.backlinks["notes/auth"]).toEqual(["index"]);
    expect(await fs.pathExists(path.join(root, ".silica/search-index.json"))).toBe(true);
    expect(await fs.pathExists(path.join(root, ".silica/next/public/silica/image.png"))).toBe(true);

    await fs.remove(root);
  });
});
