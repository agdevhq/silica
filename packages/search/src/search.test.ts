import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSearchDatabase } from "./build.js";
import { loadSearchIndex } from "./load.js";
import { querySearchIndex } from "./query.js";

describe("search index", () => {
  it("round-trips a SQLite full-text search database", async () => {
    const databasePath = path.join(process.cwd(), ".tmp-search-test.db");
    await buildSearchDatabase(
      [
        {
          id: "index",
          slug: "index",
          title: "Welcome to Silica",
          content:
            "Silica publishes Obsidian-flavored markdown with server side search.",
          description: "Home",
          tags: ["home"],
        },
        {
          id: "notes/auth",
          slug: "notes/auth",
          title: "Authentication",
          content: "Google OAuth is handled by Better Auth in stateless mode.",
          tags: ["security/auth"],
        },
      ],
      databasePath,
    );

    const loaded = await loadSearchIndex(databasePath);
    try {
      const results = querySearchIndex(loaded, "oauth");

      expect(results[0]?.slug).toBe("notes/auth");
      expect(partsText(results[0]?.excerptParts).toLowerCase()).toContain(
        "oauth",
      );
      expect(results[0]?.excerptParts.some((part) => part.highlighted)).toBe(
        true,
      );
      expect(
        querySearchIndex(loaded, "oauth", { tags: ["#security"] })[0]?.slug,
      ).toBe("notes/auth");
      expect(
        querySearchIndex(loaded, "", { tags: ["security"] })[0]?.slug,
      ).toBe("notes/auth");
      expect(querySearchIndex(loaded, "oauth", { tags: ["home"] })).toEqual([]);
    } finally {
      loaded.close();
      await fs.rm(databasePath, { force: true });
    }
  });

  it("supports prefix search for in-progress terms", async () => {
    const databasePath = path.join(process.cwd(), ".tmp-search-prefix-test.db");
    await buildSearchDatabase(
      [
        {
          id: "index",
          slug: "index",
          title: "Home",
          content: "Silica supports authentication guides.",
          tags: [],
        },
      ],
      databasePath,
    );

    const loaded = await loadSearchIndex(databasePath);
    try {
      expect(querySearchIndex(loaded, "authent")[0]?.slug).toBe("index");
    } finally {
      loaded.close();
      await fs.rm(databasePath, { force: true });
    }
  });
});

function partsText(parts: { text: string }[] | undefined): string {
  return parts?.map((part) => part.text).join("") ?? "";
}
