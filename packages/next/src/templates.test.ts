import { describe, expect, it } from "vitest";
import {
  getSilicaTemplates,
  nextConfigTemplate,
  proxyTemplate,
  themeModuleTemplate,
  tsconfigTemplate,
} from "./templates.js";

describe("generated templates", () => {
  it("loads generated app templates from files", () => {
    expect(getSilicaTemplates().map((template) => template.path)).toEqual([
      "app/[[...slug]]/page.tsx",
      "app/api/auth/[...all]/route.ts",
      "app/api/search/route.ts",
      "app/api/silica/dev-events/route.ts",
      "app/api/silica/revalidate/route.ts",
      "app/layout.tsx",
      "app/not-allowed/page.tsx",
      "app/not-found.tsx",
      "app/sign-in/page.tsx",
      "app/tags/[tag]/page.tsx",
      "postcss.config.mjs",
      "proxy.ts",
    ]);
  });

  it("enables externalDir for local theme imports", () => {
    expect(nextConfigTemplate()).toContain("externalDir: true");
  });

  it("traces only precomputed runtime content", () => {
    expect(nextConfigTemplate()).toContain('"../content/**/*"');
    expect(nextConfigTemplate()).not.toContain('"../../content/**/*"');
  });

  it("generates a static import for local themes", () => {
    expect(themeModuleTemplate("./themes/my-theme")).toContain(
      'from "../../themes/my-theme"',
    );
  });

  it("bakes resolved auth settings into generated proxy", () => {
    expect(
      proxyTemplate({
        projectRoot: "/tmp/site",
        title: "Test",
        description: "Test",
        contentDir: "content",
        theme: "default",
        auth: {
          enabled: true,
          provider: "google",
          allowedDomains: ["example.com"],
          allowedEmails: [],
        },
        wikilinks: { strategy: "shortest", strict: false },
        filters: { removeDrafts: true, explicitPublish: false },
      }),
    ).toContain('"authEnabled": true');
  });

  it("renders the tsconfig extends placeholder when a user config exists", () => {
    expect(tsconfigTemplate(true)).toContain(
      '"extends": "../../tsconfig.json"',
    );
  });

  it("removes the tsconfig extends placeholder without a user config", () => {
    expect(tsconfigTemplate(false)).not.toContain("{{extends}}");
    expect(tsconfigTemplate(false)).not.toContain('"extends"');
  });
});
