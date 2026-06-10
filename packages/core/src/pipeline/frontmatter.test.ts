import { describe, expect, it } from "vitest";
import {
  formatPropertyLabel,
  formatPropertyValue,
  getMenuLabel,
  getPageProperties,
  getResolvedPageProperties,
  resolvePagePropertyValue,
} from "./frontmatter.js";
import { createWikiLinkResolutionIndex } from "../path.js";
import type { RenderContext } from "../types.js";

function testContext(
  slug: string,
  allSlugs: string[],
  overrides: Omit<RenderContext, "slug" | "wikilinkIndex"> = {},
): RenderContext {
  return {
    slug,
    wikilinkIndex: createWikiLinkResolutionIndex(allSlugs),
    ...overrides,
  };
}

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
        listed: false,
        menu_label: "Home",
        author: "Silica team",
        status: "published",
        reviewCycle: "monthly",
      }),
    ).toEqual([
      { key: "author", label: "author", value: "Silica team" },
      { key: "reviewCycle", label: "review cycle", value: "monthly" },
      { key: "status", label: "status", value: "published" },
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
      { key: "featured", label: "featured", value: "true" },
      { key: "latencyTargetMs", label: "latency target ms", value: "100" },
      { key: "relatedTopics", label: "related topics", value: "search, auth" },
      { key: "reviewedOn", label: "reviewed on", value: "2026-05-25" },
    ]);
  });
});

describe("formatPropertyLabel", () => {
  it("humanizes snake_case and camelCase keys", () => {
    expect(formatPropertyLabel("review_cycle")).toBe("review cycle");
    expect(formatPropertyLabel("latencyTargetMs")).toBe("latency target ms");
  });
});

describe("formatPropertyValue", () => {
  it("drops empty strings and nullish values", () => {
    expect(formatPropertyValue("")).toBeUndefined();
    expect(formatPropertyValue("   ")).toBeUndefined();
    expect(formatPropertyValue(null)).toBeUndefined();
  });
});

describe("resolvePagePropertyValue", () => {
  it("resolves wikilinks into renderable property parts", () => {
    const resolution = resolvePagePropertyValue(
      "See [[docs/intro|Intro]] and [[missing|Missing]].",
      testContext("index", ["index", "docs/intro"]),
    );

    expect(resolution.parts).toEqual([
      { type: "text", value: "See " },
      {
        type: "link",
        value: "Intro",
        target: "docs/intro",
        slug: "docs/intro",
        href: "/docs/intro",
      },
      { type: "text", value: " and " },
      {
        type: "broken-link",
        value: "Missing",
        target: "missing",
      },
      { type: "text", value: "." },
    ]);
    expect(resolution.links).toEqual(["docs/intro"]);
    expect(resolution.brokenLinks).toEqual([
      { source: "index", target: "missing" },
    ]);
  });

  it("preserves heading and block fragments in resolved property links", () => {
    const resolution = resolvePagePropertyValue(
      "[[Guide#Install Guide|Install]] and [[Guide#^intro|Intro block]]",
      testContext("index", ["index", "guide"]),
    );

    expect(resolution.parts).toEqual([
      {
        type: "link",
        value: "Install",
        target: "Guide#Install Guide",
        slug: "guide",
        href: "/guide#install-guide",
      },
      { type: "text", value: " and " },
      {
        type: "link",
        value: "Intro block",
        target: "Guide#^intro",
        slug: "guide",
        href: "/guide#^intro",
      },
    ]);
    expect(resolution.links).toEqual(["guide"]);
  });
});

describe("getResolvedPageProperties", () => {
  it("resolves wikilinks after formatting array properties", () => {
    const properties = getResolvedPageProperties(
      {
        attendees: ["[[People/Ada|Ada]]", "[[People/Ben]]"],
      },
      testContext("meetings/weekly", [
        "meetings/weekly",
        "people/ada",
        "people/ben",
      ]),
    );

    expect(properties).toEqual([
      {
        key: "attendees",
        label: "attendees",
        value: "[[People/Ada|Ada]], [[People/Ben]]",
        parts: [
          {
            type: "link",
            value: "Ada",
            target: "People/Ada",
            slug: "people/ada",
            href: "/people/ada",
          },
          { type: "text", value: ", " },
          {
            type: "link",
            value: "People/Ben",
            target: "People/Ben",
            slug: "people/ben",
            href: "/people/ben",
          },
        ],
      },
    ]);
  });
});
