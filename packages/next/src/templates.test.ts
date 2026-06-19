import { describe, expect, it } from "vitest";
import {
  assistantModuleTemplate,
  assistantRouteTemplate,
  getSilicaTemplates,
  nextConfigTemplate,
  packageJsonTemplate,
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
      "app/api/silica/og/[[...slug]]/route.ts",
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

  it("self-roots generated Next config", () => {
    const rendered = nextConfigTemplate();

    expect(rendered).toContain("outputFileTracingRoot: turbopackRoot");
    expect(rendered).toContain(
      "const turbopackRoot = findTurbopackRoot(nextRoot)",
    );
    expect(rendered).toContain("root: turbopackRoot");
    expect(rendered).not.toContain("externalDir: true");
  });

  it("uses the base Next config when there is no user config", () => {
    expect(nextConfigTemplate()).toContain("const nextConfig = baseNextConfig");
    expect(nextConfigTemplate()).not.toContain("{{silicaConfig");
  });

  it("applies user Next config overrides when a user config exists", () => {
    const rendered = nextConfigTemplate("./silica.user.config.ts");

    expect(rendered).toContain('import { createJiti } from "jiti";');
    expect(rendered).toContain('jiti("./silica.user.config.ts")');
    expect(rendered).toContain("mergeNextConfig(baseNextConfig");
  });

  it("traces only app-local precomputed runtime data", () => {
    expect(nextConfigTemplate()).toContain("const tracedDataGlob");
    expect(nextConfigTemplate()).toContain('"/*": [tracedDataGlob]');
    expect(nextConfigTemplate()).toContain('path.join(dataRoot, "vault.db")');
    expect(nextConfigTemplate()).not.toContain('"../content/**/*"');
    expect(nextConfigTemplate()).not.toContain('"../vault.db"');
    expect(nextConfigTemplate()).not.toContain('"../navigation.json"');
    expect(nextConfigTemplate()).not.toContain('"../cache-state.json"');
    expect(nextConfigTemplate()).not.toContain('"../route-cache-keys.json"');
    expect(nextConfigTemplate()).not.toContain('"../../content/**/*"');
  });

  it("generates package.json with supplied dependencies", () => {
    expect(
      JSON.parse(
        packageJsonTemplate({
          next: "^16.2.7",
          react: "^19.2.6",
          "react-dom": "^19.2.7",
          "@silicajs/next": "^0.5.0",
        }),
      ),
    ).toMatchObject({
      scripts: {
        build: "next build",
      },
      dependencies: {
        next: "^16.2.7",
        react: "^19.2.6",
        "react-dom": "^19.2.7",
        "@silicajs/next": "^0.5.0",
      },
    });
  });

  it("configures stable build ids and filesystem cache handlers", () => {
    const rendered = nextConfigTemplate();
    expect(rendered).toContain("generateBuildId");
    expect(rendered).toContain("cacheHandlers");
    expect(rendered).toContain("./cache-handlers/filesystem-cache.js");
  });

  it("traces configured assistant provider packages for standalone output", () => {
    const rendered = nextConfigTemplate();

    expect(rendered).toContain("resolvedConfig?.assistant?.provider?.package");
    expect(rendered).toContain("serverExternalPackages");
    expect(rendered).toContain('"better-sqlite3"');
    expect(rendered).toContain('"just-bash"');
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
          output: "default",
          cache: {},
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
          output: "default",
          cache: {},
        },
      }),
    ).toContain('"publicPaths": [\n    "/logo.svg"\n  ]');
  });

  it("generates an inert assistant module when AI is disabled", () => {
    const rendered = assistantModuleTemplate(false);
    expect(rendered).toContain("export const assistant");
    expect(rendered).toContain("undefined");
    expect(rendered).not.toContain("@silicajs/assistant");
  });

  it("wires assistant slots when the assistant is enabled", () => {
    const rendered = assistantModuleTemplate(true);
    expect(rendered).toContain('from "@silicajs/assistant/ui"');
    expect(rendered).toContain("Provider: AssistantProvider");
    expect(rendered).toContain("Trigger: AssistantTrigger");
    expect(rendered).toContain("Panel: AssistantPanel");
  });

  it("generates an assistant route with a static provider import", () => {
    const rendered = assistantRouteTemplate({
      model: "gpt-5.2",
      provider: {
        package: "@core-ai/openai",
        factory: "createOpenAI",
        secrets: { apiKey: "OPENAI_API_KEY" },
      },
    });

    expect(rendered).toContain(
      'import * as assistantProvider from "@core-ai/openai"',
    );
    expect(rendered).toContain(
      'import { createAssistantRouteHandler } from "@silicajs/assistant/next"',
    );
    expect(rendered).toContain(
      "export const POST = createAssistantRouteHandler({",
    );
    expect(rendered).toContain("providerModule: assistantProvider");
    expect(rendered).not.toContain("rateLimit:");
  });

  it("can render the tsconfig extends placeholder for legacy callers", () => {
    expect(tsconfigTemplate(true)).toContain(
      '"extends": "../../tsconfig.json"',
    );
  });

  it("removes the tsconfig extends placeholder without a user config", () => {
    expect(tsconfigTemplate(false)).not.toContain("{{extends}}");
    expect(tsconfigTemplate(false)).not.toContain('"extends"');
  });
});
