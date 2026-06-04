import { afterEach, describe, expect, it } from "vitest";
import { resolveCallbackURL } from "./google-sign-in-button.js";

describe("resolveCallbackURL", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });

  it("accepts same-site callback paths", () => {
    expect(resolveCallbackURL("/docs")).toBe("/docs");
    expect(resolveCallbackURL("/docs?from=sign-in")).toBe("/docs?from=sign-in");
  });

  it("rejects external and protocol-relative callback URLs", () => {
    expect(resolveCallbackURL("https://evil.example")).toBe("/");
    expect(resolveCallbackURL("//evil.example")).toBe("/");
    expect(resolveCallbackURL("/\\evil.example")).toBe("/");
  });

  it("uses a safe callbackUrl query value when no explicit path is set", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "?callbackUrl=%2Fdocs" } },
    });

    expect(resolveCallbackURL()).toBe("/docs");
  });

  it("ignores unsafe callbackUrl query values", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "?callbackUrl=%2F%2Fevil.example" } },
    });

    expect(resolveCallbackURL()).toBe("/");
  });
});
