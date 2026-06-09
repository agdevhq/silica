import { afterEach, describe, expect, it } from "vitest";
import { resolveRuntimeAuthConfig } from "./auth-config.js";
import type { ResolvedSilicaConfig } from "@silicajs/core/runtime";

const baseConfig: ResolvedSilicaConfig = {
  projectRoot: "/tmp/site",
  title: "Test",
  description: "Test",
  contentDir: "content",
  theme: "default",
  wikilinks: { strategy: "shortest", strict: false },
  tags: { inline: true },
  ordering: { numericPrefixes: true },
  filters: { removeDrafts: true, explicitPublish: false },
  render: {
    prerender: { strategy: "all" },
    cache: { storage: "filesystem" },
  },
};

describe("resolveRuntimeAuthConfig", () => {
  const previousEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  it("lets runtime env enable auth and supply allowlists", () => {
    process.env.SILICA_AUTH_ENABLED = "true";
    process.env.SILICA_ALLOWED_DOMAINS = "example.com";
    process.env.SILICA_ALLOWED_EMAILS = "reviewer@example.com";

    expect(resolveRuntimeAuthConfig(baseConfig)).toEqual({
      authEnabled: true,
      allowedDomains: ["example.com"],
      allowedEmails: ["reviewer@example.com"],
    });
  });
});
