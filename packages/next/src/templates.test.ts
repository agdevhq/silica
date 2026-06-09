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
      "app/(site)/[[...slug]]/page.tsx",
      "app/(site)/layout.tsx",
      "app/(site)/tags/[...tag]/page.tsx",
      "app/api/auth/[...all]/route.ts",
      "app/api/navigation/route.ts",
      "app/api/search/route.ts",
      "app/api/silica/dev-events/route.ts",
      "app/api/silica/revalidate/route.ts",
      "app/layout.tsx",
      "app/not-allowed/page.tsx",
      "app/not-found.tsx",
      "app/sign-in/page.tsx",
      "cache-handlers/filesystem-cache.js",
      "postcss.config.mjs",
      "proxy.ts",
    ]);
  });

  it("enables externalDir for local theme imports", () => {
    expect(nextConfigTemplate()).toContain("externalDir: true");
  });

  it("uses the base Next config when there is no user config", () => {
    expect(nextConfigTemplate()).toContain("const nextConfig = baseNextConfig");
    expect(nextConfigTemplate()).not.toContain("{{silicaConfig");
  });

  it("applies user Next config overrides when a user config exists", () => {
    const rendered = nextConfigTemplate("../../silica.config.ts");

    expect(rendered).toContain('import { createJiti } from "jiti";');
    expect(rendered).toContain('jiti("../../silica.config.ts")');
    expect(rendered).toContain("mergeNextConfig(baseNextConfig");
  });

  it("traces only precomputed runtime content", () => {
    expect(nextConfigTemplate()).toContain('"../content/**/*"');
    expect(nextConfigTemplate()).toContain('"../vault.db"');
    expect(nextConfigTemplate()).not.toContain('"../navigation.json"');
    expect(nextConfigTemplate()).not.toContain('"../cache-state.json"');
    expect(nextConfigTemplate()).not.toContain('"../route-cache-keys.json"');
    expect(nextConfigTemplate()).not.toContain('"../../content/**/*"');
  });

  it("configures stable build ids and filesystem cache handlers", () => {
    const rendered = nextConfigTemplate();
    expect(rendered).toContain("generateBuildId");
    expect(rendered).toContain("cacheHandlers");
    expect(rendered).toContain("./cache-handlers/filesystem-cache.js");
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
        logo: "/logo.svg",
        contentDir: "content",
        theme: "default",
        auth: {
          enabled: true,
          provider: "google",
          allowedDomains: ["example.com"],
          allowedEmails: [],
        },
        wikilinks: { strategy: "shortest", strict: false },
        tags: { inline: true },
        ordering: { numericPrefixes: true },
        filters: { removeDrafts: true, explicitPublish: false },
        render: {
          prerender: { strategy: "all" },
          cache: { storage: "filesystem" },
        },
      }),
    ).toContain('"authEnabled": true');
  });

  it("bakes the configured logo into generated proxy public paths", () => {
    expect(
      proxyTemplate({
        projectRoot: "/tmp/site",
        title: "Test",
        description: "Test",
        logo: "/logo.svg",
        contentDir: "content",
        theme: "default",
        wikilinks: { strategy: "shortest", strict: false },
        tags: { inline: true },
        ordering: { numericPrefixes: true },
        filters: { removeDrafts: true, explicitPublish: false },
        render: {
          prerender: { strategy: "all" },
          cache: { storage: "filesystem" },
        },
      }),
    ).toContain('"publicPaths": [\n    "/logo.svg"\n  ]');
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
