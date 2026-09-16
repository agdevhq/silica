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

  it("leaves the assistant MCP server disabled by default", () => {
    expect(
      resolveConfig({ assistant: { provider: "openai", model: "gpt-5.2" } })
        .assistant?.mcp,
    ).toBeUndefined();
    expect(
      resolveConfig({
        assistant: { provider: "openai", model: "gpt-5.2", mcp: false },
      }).assistant?.mcp,
    ).toBeUndefined();
    expect(
      resolveConfig({
        assistant: {
          provider: "openai",
          model: "gpt-5.2",
          mcp: { enabled: false },
        },
      }).assistant?.mcp,
    ).toBeUndefined();
  });

  it("resolves the assistant MCP server with every tool by default", () => {
    expect(
      resolveConfig({
        assistant: { provider: "openai", model: "gpt-5.2", mcp: true },
      }).assistant?.mcp,
    ).toEqual({
      tools: ["search_pages", "read_page", "list_pages", "run_shell"],
    });
    expect(
      resolveConfig({
        assistant: {
          provider: "openai",
          model: "gpt-5.2",
          mcp: {
            tools: ["read_page", "search_pages", "read_page"],
            rateLimit: { maxRequests: 5 },
          },
        },
      }).assistant?.mcp,
    ).toEqual({
      tools: ["read_page", "search_pages"],
      rateLimit: { maxRequests: 5 },
    });
  });

  it("rejects unknown or empty MCP tool lists", () => {
    expect(() =>
      resolveConfig({
        assistant: {
          provider: "openai",
          model: "gpt-5.2",
          mcp: { tools: ["read_page", "write_page" as never] },
        },
      }),
    ).toThrow(/Unknown Silica MCP tool "write_page"/);
    expect(() =>
      resolveConfig({
        assistant: { provider: "openai", model: "gpt-5.2", mcp: { tools: [] } },
      }),
    ).toThrow(/at least one tool/);
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
