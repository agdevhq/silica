import { describe, expect, it } from "vitest";
import {
  formatPropertyLabel,
  formatPropertyValue,
  getMenuLabel,
  getPageProperties,
} from "./frontmatter.js";

describe("getMenuLabel", () => {
  it("uses menu_label when set, otherwise falls back to title", () => {
    expect(
      getMenuLabel(
        { menu_label: "Auth", title: "Authentication and Authorization" },
        "Authentication and Authorization",
      ),
    ).toBe("Auth");
    expect(getMenuLabel({ title: "Authentication" }, "Authentication")).toBe(
      "Authentication",
    );
    expect(getMenuLabel({}, "From Title")).toBe("From Title");
  });

  it("ignores blank menu_label values", () => {
    expect(getMenuLabel({ menu_label: "   " }, "Page Title")).toBe(
      "Page Title",
    );
  });
});

describe("getPageProperties", () => {
  it("returns arbitrary keys and excludes silica-reserved frontmatter", () => {
    expect(
      getPageProperties({
        title: "Welcome",
        description: "Intro",
        tags: ["home"],
        draft: true,
        menu_label: "Home",
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
