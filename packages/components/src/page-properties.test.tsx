import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageProperties } from "./page-properties.js";

describe("PageProperties", () => {
  it("renders resolved page-property wikilinks as anchors", () => {
    const html = renderToStaticMarkup(
      <PageProperties
        defaultOpen
        properties={[
          {
            key: "attendees",
            label: "attendees",
            value: "[[People/Ada|Ada]], [[missing|Missing]]",
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
                type: "broken-link",
                value: "Missing",
                target: "missing",
              },
            ],
          },
        ]}
      />,
    );

    expect(html).toContain('<a href="/people/ada"');
    expect(html).toContain(">Ada</a>");
    expect(html).toContain('<span class="silica-broken-link">Missing</span>');
    expect(html).not.toContain("[[People/Ada|Ada]]");
  });
});
