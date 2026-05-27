import { describe, expect, it } from "vitest";
import { isSilicaPublicPath } from "./proxy.js";

describe("silica proxy helpers", () => {
  it("keeps public auth routes boundary-aware", () => {
    expect(isSilicaPublicPath("/api/auth")).toBe(true);
    expect(isSilicaPublicPath("/api/auth/sign-in")).toBe(true);
    expect(isSilicaPublicPath("/api/authors")).toBe(false);
    expect(isSilicaPublicPath("/api/authenticated-search")).toBe(false);
  });
});
