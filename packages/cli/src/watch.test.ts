import path from "node:path";
import { describe, expect, it } from "vitest";
import { requiresRestart, resolveDevPort, resolveWatchPaths } from "./watch.js";

describe("watch helpers", () => {
  const projectRoot = "/vault";

  it("restarts for config and local theme changes", () => {
    expect(requiresRestart("silica.config.ts", projectRoot)).toBe(true);
    expect(requiresRestart("themes/my-theme/index.tsx", projectRoot)).toBe(
      true,
    );
    expect(requiresRestart("content/index.md", projectRoot)).toBe(false);
  });

  it("normalizes absolute paths against the project root", () => {
    expect(
      requiresRestart(path.join(projectRoot, "silica.config.ts"), projectRoot),
    ).toBe(true);
    expect(
      requiresRestart(
        path.join(projectRoot, "themes/my-theme/index.tsx"),
        projectRoot,
      ),
    ).toBe(true);
    expect(
      requiresRestart(path.join(projectRoot, "content/index.md"), projectRoot),
    ).toBe(false);
  });

  it("uses PORT for dev revalidation when available", () => {
    expect(resolveDevPort({ PORT: "4242" })).toBe(4242);
    expect(resolveDevPort({ PORT: "nope" })).toBe(3000);
  });

  it("watches source directories instead of broken globs", () => {
    expect(resolveWatchPaths(projectRoot)).toEqual([
      path.join(projectRoot, "content"),
      path.join(projectRoot, "themes"),
      path.join(projectRoot, "silica.config.ts"),
    ]);
  });
});
