import { describe, expect, it } from "vitest";
import {
  formatPropertyLabel,
  formatPropertyValue,
  getPageProperties,
} from "./frontmatter.js";

describe("getPageProperties", () => {
  it("returns arbitrary keys and excludes silica-reserved frontmatter", () => {
    expect(
      getPageProperties({
        title: "Welcome",
        description: "Intro",
        tags: ["home"],
        draft: true,
        author: "Silica team",
        status: "published",
        reviewCycle: "monthly",
      }),
    ).toEqual([
      { key: "author", label: "Author", value: "Silica team" },
      { key: "reviewCycle", label: "Review Cycle", value: "monthly" },
      { key: "status", label: "Status", value: "published" },
    ]);
  });

  it("formats arrays, booleans, numbers, and dates", () => {
    expect(
      getPageProperties({
        featured: true,
        latencyTargetMs: 100,
        relatedTopics: ["search", "auth"],
        reviewedOn: new Date("2026-05-25T00:00:00.000Z"),
      }),
    ).toEqual([
      { key: "featured", label: "Featured", value: "true" },
      { key: "latencyTargetMs", label: "Latency Target Ms", value: "100" },
      { key: "relatedTopics", label: "Related Topics", value: "search, auth" },
      { key: "reviewedOn", label: "Reviewed On", value: "2026-05-25" },
    ]);
  });
});

describe("formatPropertyLabel", () => {
  it("humanizes snake_case and camelCase keys", () => {
    expect(formatPropertyLabel("review_cycle")).toBe("Review Cycle");
    expect(formatPropertyLabel("latencyTargetMs")).toBe("Latency Target Ms");
  });
});

describe("formatPropertyValue", () => {
  it("drops empty strings and nullish values", () => {
    expect(formatPropertyValue("")).toBeUndefined();
    expect(formatPropertyValue("   ")).toBeUndefined();
    expect(formatPropertyValue(null)).toBeUndefined();
  });
});
