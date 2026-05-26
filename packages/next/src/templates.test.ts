import { describe, expect, it } from "vitest";
import { nextConfigTemplate, themeModuleTemplate } from "./templates.js";

describe("generated templates", () => {
  it("enables externalDir for local theme imports", () => {
    expect(nextConfigTemplate()).toContain("externalDir: true");
  });

  it("generates a static import for local themes", () => {
    expect(themeModuleTemplate("./themes/my-theme")).toContain('from "../../themes/my-theme"');
  });
});
