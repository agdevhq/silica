import { afterEach, describe, expect, it } from "vitest";
import { createChatModelFromConfig } from "./provider.js";

const originalAcmeApiKey = process.env.ACME_API_KEY;
const originalAcmeEndpoint = process.env.ACME_ENDPOINT;
let capturedOptions: unknown;

afterEach(() => {
  restoreEnv("ACME_API_KEY", originalAcmeApiKey);
  restoreEnv("ACME_ENDPOINT", originalAcmeEndpoint);
  capturedOptions = undefined;
});

describe("createChatModelFromConfig", () => {
  it("creates a model from a statically imported provider module", () => {
    process.env.ACME_API_KEY = "test-key";
    process.env.ACME_ENDPOINT = "https://env.example.com";

    const model = createChatModelFromConfig(
      {
        model: "acme-chat",
        provider: {
          package: "@acme/core-ai-provider",
          factory: "createAcme",
          env: { endpoint: "ACME_ENDPOINT" },
          secrets: { apiKey: "ACME_API_KEY" },
          options: { endpoint: "https://api.example.com" },
        },
      },
      providerModule,
    );

    expect(model.provider).toBe("acme");
    expect(model.modelId).toBe("acme-chat");
    expect(capturedOptions).toEqual({
      endpoint: "https://api.example.com",
      apiKey: "test-key",
    });
  });

  it("passes runtime env options to the provider factory", () => {
    process.env.ACME_API_KEY = "test-key";
    process.env.ACME_ENDPOINT = "https://env.example.com";

    createChatModelFromConfig(
      {
        model: "acme-chat",
        provider: {
          package: "@acme/core-ai-provider",
          factory: "createAcme",
          env: { endpoint: "ACME_ENDPOINT" },
          secrets: { apiKey: "ACME_API_KEY" },
        },
      },
      providerModule,
    );

    expect(capturedOptions).toEqual({
      endpoint: "https://env.example.com",
      apiKey: "test-key",
    });
  });

  it("reports missing secret environment variables", () => {
    delete process.env.ACME_API_KEY;

    expect(() =>
      createChatModelFromConfig(
        {
          model: "acme-chat",
          provider: {
            package: "@acme/core-ai-provider",
            factory: "createAcme",
            secrets: { apiKey: "ACME_API_KEY" },
          },
        },
        providerModule,
      ),
    ).toThrowError(/ACME_API_KEY/);
  });

  it("reports missing runtime env options", () => {
    delete process.env.ACME_ENDPOINT;

    expect(() =>
      createChatModelFromConfig(
        {
          model: "acme-chat",
          provider: {
            package: "@acme/core-ai-provider",
            factory: "createAcme",
            env: { endpoint: "ACME_ENDPOINT" },
          },
        },
        providerModule,
      ),
    ).toThrowError(/ACME_ENDPOINT/);
  });

  it("reports a missing provider factory export", () => {
    expect(() =>
      createChatModelFromConfig(
        {
          model: "acme-chat",
          provider: {
            package: "@acme/core-ai-provider",
            factory: "createMissing",
          },
        },
        providerModule,
      ),
    ).toThrowError(/does not export createMissing/);
  });
});

const providerModule = {
  createAcme(options: Record<string, unknown>) {
    capturedOptions = options;
    return {
      chatModel(modelId: string) {
        return {
          provider: "acme",
          modelId,
          stream() {
            throw new Error("not implemented");
          },
          generate() {
            throw new Error("not implemented");
          },
          generateObject() {
            throw new Error("not implemented");
          },
          streamObject() {
            throw new Error("not implemented");
          },
        };
      },
    };
  },
};

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
