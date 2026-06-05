import { describe, expect, it } from "vitest";
import { resolvePublicAssetPath } from "./logo.js";

describe("resolvePublicAssetPath", () => {
  it("normalizes relative public paths", () => {
    expect(resolvePublicAssetPath("logo.svg")).toBe("/logo.svg");
    expect(resolvePublicAssetPath("/brand.png")).toBe("/brand.png");
  });

  it("passes through absolute URLs", () => {
    expect(resolvePublicAssetPath("https://cdn.example.com/logo.png")).toBe(
      "https://cdn.example.com/logo.png",
    );
  });

  it("returns undefined for empty values", () => {
    expect(resolvePublicAssetPath()).toBeUndefined();
    expect(resolvePublicAssetPath("  ")).toBeUndefined();
  });
});
