import { describe, expect, it } from "vitest";
import { resolveConfig } from "./config.js";

describe("resolveConfig", () => {
  it("defaults render settings to platform-managed output", () => {
    expect(resolveConfig().render).toEqual({
      prerender: { strategy: "all" },
      output: "default",
      cache: {},
    });
  });

  it("resolves standalone output when requested", () => {
    expect(resolveConfig({ render: { output: "standalone" } }).render).toEqual({
      prerender: { strategy: "all" },
      output: "standalone",
      cache: {},
    });
  });

  it("leaves the assistant disabled by default", () => {
    expect(resolveConfig().assistant).toBeUndefined();
    expect(resolveConfig({ assistant: false }).assistant).toBeUndefined();
  });

  it("resolves assistant config with the provider preset", () => {
    expect(
      resolveConfig({ assistant: { provider: "openai", model: "gpt-5.2" } })
        .assistant,
    ).toEqual({
      provider: {
        package: "@core-ai/openai",
        factory: "createOpenAI",
        secrets: { apiKey: "OPENAI_API_KEY" },
      },
      model: "gpt-5.2",
    });
  });

  it("resolves preset options and enabled: false", () => {
    expect(
      resolveConfig({
        assistant: {
          provider: {
            preset: "azure-openai",
            options: {
              endpoint: "https://example.openai.azure.com/openai/v1",
            },
          },
          model: "gpt-5-mini-deployment",
        },
      }).assistant,
    ).toEqual({
      provider: {
        package: "@core-ai/azure-openai",
        factory: "createAzureOpenAI",
        env: { endpoint: "AZURE_OPENAI_ENDPOINT" },
        secrets: { apiKey: "AZURE_OPENAI_API_KEY" },
        options: {
          endpoint: "https://example.openai.azure.com/openai/v1",
        },
      },
      model: "gpt-5-mini-deployment",
    });
    expect(
      resolveConfig({
        assistant: { enabled: false, provider: "openai", model: "gpt-5.2" },
      }).assistant,
    ).toBeUndefined();
  });

  it("resolves azure-openai endpoint as a runtime env mapping", () => {
    expect(
      resolveConfig({
        assistant: {
          provider: "azure-openai",
          model: "gpt-5-mini-deployment",
        },
      }).assistant,
    ).toMatchObject({
      provider: {
        package: "@core-ai/azure-openai",
        factory: "createAzureOpenAI",
        env: { endpoint: "AZURE_OPENAI_ENDPOINT" },
        secrets: { apiKey: "AZURE_OPENAI_API_KEY" },
      },
    });
  });

  it("resolves manual assistant provider config", () => {
    expect(
      resolveConfig({
        assistant: {
          provider: {
            package: "@acme/core-ai-provider",
            factory: "createAcme",
            secrets: { apiKey: "ACME_API_KEY" },
            options: { baseURL: "https://api.example.com" },
          },
          model: "acme-chat",
        },
      }).assistant,
    ).toEqual({
      provider: {
        package: "@acme/core-ai-provider",
        factory: "createAcme",
        secrets: { apiKey: "ACME_API_KEY" },
        options: { baseURL: "https://api.example.com" },
      },
      model: "acme-chat",
    });
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

  it("rejects unknown assistant provider presets", () => {
    expect(() =>
      resolveConfig({
        assistant: {
          provider: "not-real" as never,
          model: "fake-model",
        },
      }),
    ).toThrowError(/Unknown Silica assistant provider/);
  });

  it("rejects provider options that cannot be serialized", () => {
    expect(() =>
      resolveConfig({
        assistant: {
          provider: {
            package: "@acme/core-ai-provider",
            factory: "createAcme",
            options: { endpoint: undefined },
          },
          model: "acme-chat",
        },
      }),
    ).toThrowError(/cannot be undefined/);
  });

  it("normalizes depth prerender shorthand", () => {
    expect(
      resolveConfig({
        render: {
          prerender: { depth: 2, include: ["index"], limit: 10 },
        },
      }).render,
    ).toEqual({
      prerender: {
        strategy: "depth",
        depth: 2,
        include: ["index"],
        limit: 10,
      },
      output: "default",
      cache: {},
    });
  });
});
