import { describe, expect, it } from "vitest";

import { breadcrumbSegmentHref } from "./slug.js";

describe("breadcrumbSegmentHref", () => {
  const allSlugs = ["index", "guides/index", "guides/setup", "features/search"];

  it("links folder segments that have index.md", () => {
    expect(breadcrumbSegmentHref("guides", allSlugs)).toBe("/guides");
  });

  it("omits href for folder segments without index.md", () => {
    expect(breadcrumbSegmentHref("features", allSlugs)).toBeUndefined();
  });

  it("links a segment backed by a top-level markdown file", () => {
    expect(
      breadcrumbSegmentHref("auth", ["index", "auth", "features/search"]),
    ).toBe("/auth");
  });
});
