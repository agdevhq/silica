import { describe, expect, it } from "vitest";
import {
  ASSISTANT_PROVIDER_PRESETS,
  resolveAssistantProvider,
} from "./assistant-providers.js";

describe("assistant provider presets", () => {
  it("defines complete provider presets", () => {
    expect(Object.keys(ASSISTANT_PROVIDER_PRESETS)).toEqual([
      "openai",
      "anthropic",
      "google",
      "mistral",
      "omnifact",
      "azure-openai",
    ]);

    for (const preset of Object.values(ASSISTANT_PROVIDER_PRESETS)) {
      expect(preset.package).toMatch(/^@core-ai\//);
      expect(preset.factory).toMatch(/^create/);
      expect(preset.secrets?.apiKey).toMatch(/_API_KEY$/);
    }
  });

  it("keeps preset metadata out of resolved provider config", () => {
    expect(
      resolveAssistantProvider({
        preset: "azure-openai",
        options: { endpoint: "https://example.openai.azure.com/openai/v1" },
      }),
    ).toEqual({
      package: "@core-ai/azure-openai",
      factory: "createAzureOpenAI",
      env: { endpoint: "AZURE_OPENAI_ENDPOINT" },
      secrets: { apiKey: "AZURE_OPENAI_API_KEY" },
      options: { endpoint: "https://example.openai.azure.com/openai/v1" },
    });
    expect(ASSISTANT_PROVIDER_PRESETS["azure-openai"].env).toEqual({
      endpoint: "AZURE_OPENAI_ENDPOINT",
    });
  });
});
