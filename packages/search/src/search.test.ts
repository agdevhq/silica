import { describe, expect, it } from "vitest";
import { buildSearchIndex } from "./build.js";
import { hydrateSearchIndex } from "./load.js";
import { querySearchIndex } from "./query.js";

describe("search index", () => {
  it("round-trips a FlexSearch document artifact", async () => {
    const artifact = await buildSearchIndex([
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
    ]);

    const loaded = await hydrateSearchIndex(artifact);
    const results = querySearchIndex(loaded, "oauth");

    expect(results[0]?.slug).toBe("notes/auth");
    expect(results[0]?.excerpt.toLowerCase()).toContain("oauth");
    expect(
      querySearchIndex(loaded, "oauth", { tags: ["#security"] })[0]?.slug,
    ).toBe("notes/auth");
    expect(querySearchIndex(loaded, "", { tags: ["security"] })[0]?.slug).toBe(
      "notes/auth",
    );
    expect(querySearchIndex(loaded, "oauth", { tags: ["home"] })).toEqual([]);
  });
});
