import { describe, expect, it } from "vitest";
import {
  getSilicaTemplates,
  nextConfigTemplate,
  themeModuleTemplate,
  tsconfigTemplate,
} from "./templates.js";

describe("generated templates", () => {
  it("loads generated app templates from files", () => {
    expect(getSilicaTemplates().map((template) => template.path)).toEqual([
      "app/__silica/revalidate/route.ts",
      "app/[[...slug]]/page.tsx",
      "app/api/auth/[...all]/route.ts",
      "app/api/search/route.ts",
      "app/layout.tsx",
      "app/not-allowed/page.tsx",
      "app/not-found.tsx",
      "app/sign-in/page.tsx",
      "app/tags/[tag]/page.tsx",
      "proxy.ts",
    ]);
  });

  it("enables externalDir for local theme imports", () => {
    expect(nextConfigTemplate()).toContain("externalDir: true");
  });

  it("generates a static import for local themes", () => {
    expect(themeModuleTemplate("./themes/my-theme")).toContain(
      'from "../../themes/my-theme"',
    );
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
