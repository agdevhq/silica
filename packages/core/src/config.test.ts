import { describe, expect, it } from "vitest";
import { resolveConfig } from "./config.js";

describe("resolveConfig", () => {
  it("defaults render settings for static-first standalone output", () => {
    expect(resolveConfig().render).toEqual({
      prerender: { strategy: "all" },
      cache: { storage: "filesystem" },
    });
  });

  it("leaves AI disabled by default", () => {
    expect(resolveConfig().ai).toBeUndefined();
    expect(resolveConfig({ ai: false }).ai).toBeUndefined();
  });

  it("resolves AI config with the provider's default API key variable", () => {
    expect(
      resolveConfig({ ai: { provider: "openai", model: "gpt-5.2" } }).ai,
    ).toEqual({
      provider: "openai",
      model: "gpt-5.2",
      apiKeyEnv: "OPENAI_API_KEY",
    });
  });

  it("respects an explicit apiKeyEnv and enabled: false", () => {
    expect(
      resolveConfig({
        ai: {
          provider: "anthropic",
          model: "claude-sonnet-4-5",
          apiKeyEnv: "MY_KEY",
        },
      }).ai,
    ).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      apiKeyEnv: "MY_KEY",
    });
    expect(
      resolveConfig({
        ai: { enabled: false, provider: "openai", model: "gpt-5.2" },
      }).ai,
    ).toBeUndefined();
  });

  it("rejects AI config without a model", () => {
    expect(() =>
      resolveConfig({ ai: { provider: "openai", model: "" } }),
    ).toThrowError(/requires a model/);
  });

  it("normalizes depth prerender shorthand", () => {
    expect(
      resolveConfig({
        render: {
          prerender: { depth: 2, include: ["index"], limit: 10 },
          cache: { storage: "memory" },
        },
      }).render,
    ).toEqual({
      prerender: {
        strategy: "depth",
        depth: 2,
        include: ["index"],
        limit: 10,
      },
      cache: { storage: "memory" },
    });
  });
});
