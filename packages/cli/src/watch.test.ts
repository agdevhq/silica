import { describe, expect, it } from "vitest";
import { requiresRestart, resolveDevPort } from "./watch.js";

describe("watch helpers", () => {
  it("restarts for config and local theme changes", () => {
    expect(requiresRestart("silica.config.ts")).toBe(true);
    expect(requiresRestart("themes/my-theme/index.tsx")).toBe(true);
    expect(requiresRestart("content/index.md")).toBe(false);
  });

  it("uses PORT for dev revalidation when available", () => {
    expect(resolveDevPort({ PORT: "4242" })).toBe(4242);
    expect(resolveDevPort({ PORT: "nope" })).toBe(3000);
  });
});
