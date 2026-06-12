import { describe, expect, it } from "vitest";
import { resolveConfig } from "./config.js";

describe("resolveConfig", () => {
  it("defaults render settings for static-first standalone output", () => {
    expect(resolveConfig().render).toEqual({
      prerender: { strategy: "all" },
      cache: { storage: "filesystem" },
    });
  });

  it("leaves the assistant disabled by default", () => {
    expect(resolveConfig().assistant).toBeUndefined();
    expect(resolveConfig({ assistant: false }).assistant).toBeUndefined();
  });

  it("resolves assistant config with the provider's default API key variable", () => {
    expect(
      resolveConfig({ assistant: { provider: "openai", model: "gpt-5.2" } })
        .assistant,
    ).toEqual({
      provider: "openai",
      model: "gpt-5.2",
      apiKeyEnv: "OPENAI_API_KEY",
    });
  });

  it("respects an explicit apiKeyEnv and enabled: false", () => {
    expect(
      resolveConfig({
        assistant: {
          provider: "anthropic",
          model: "claude-sonnet-4-5",
          apiKeyEnv: "MY_KEY",
        },
      }).assistant,
    ).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      apiKeyEnv: "MY_KEY",
    });
    expect(
      resolveConfig({
        assistant: { enabled: false, provider: "openai", model: "gpt-5.2" },
      }).assistant,
    ).toBeUndefined();
  });

  it("resolves assistant rate limit config", () => {
    expect(
      resolveConfig({
        assistant: {
          provider: "openai",
          model: "gpt-5.2",
          rateLimit: {
            maxRequests: 20,
            windowMs: 120_000,
            trustedProxyHeaders: ["x-real-ip"],
          },
        },
      }).assistant?.rateLimit,
    ).toEqual({
      maxRequests: 20,
      windowMs: 120_000,
      trustedProxyHeaders: ["x-real-ip"],
    });
    expect(
      resolveConfig({
        assistant: {
          provider: "openai",
          model: "gpt-5.2",
          rateLimit: false,
        },
      }).assistant?.rateLimit,
    ).toBe(false);
  });

  it("rejects assistant config without a model", () => {
    expect(() =>
      resolveConfig({ assistant: { provider: "openai", model: "" } }),
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
