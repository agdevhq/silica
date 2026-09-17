import { afterEach, describe, expect, it } from "vitest";
import {
  MCP_API_KEYS_ENV,
  createMcpApiKeyGuard,
  parseMcpApiKeys,
} from "./api-key.js";

const originalKeys = process.env[MCP_API_KEYS_ENV];

afterEach(() => {
  if (originalKeys === undefined) delete process.env[MCP_API_KEYS_ENV];
  else process.env[MCP_API_KEYS_ENV] = originalKeys;
});

function request(authorization?: string): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

describe("parseMcpApiKeys", () => {
  it("splits comma-separated keys and drops blanks and duplicates", () => {
    expect(parseMcpApiKeys(" slk_a, slk_b ,, slk_a ,")).toEqual([
      "slk_a",
      "slk_b",
    ]);
    expect(parseMcpApiKeys(undefined)).toEqual([]);
    expect(parseMcpApiKeys("")).toEqual([]);
  });
});

describe("createMcpApiKeyGuard", () => {
  it("reports a 503 when no keys are configured", async () => {
    delete process.env[MCP_API_KEYS_ENV];
    const result = createMcpApiKeyGuard()(request("Bearer slk_a"));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.response.status).toBe(503);
    await expect(result.response.json()).resolves.toEqual({
      error: `The MCP server is not configured: set the ${MCP_API_KEYS_ENV} environment variable.`,
    });
  });

  it("rejects missing, malformed, and unknown bearer tokens with 401", () => {
    process.env[MCP_API_KEYS_ENV] = "slk_a,slk_b";
    const guard = createMcpApiKeyGuard();
    for (const header of [
      undefined,
      "slk_a",
      "Basic slk_a",
      "Bearer",
      "Bearer slk_c",
      "Bearer slk_a extra",
    ]) {
      const result = guard(request(header));
      expect(result.ok, header).toBe(false);
      if (result.ok) continue;
      expect(result.response.status).toBe(401);
      expect(result.response.headers.get("www-authenticate")).toBe(
        'Bearer realm="silica-mcp"',
      );
    }
  });

  it("accepts configured keys and derives a stable, opaque key id", () => {
    process.env[MCP_API_KEYS_ENV] = "slk_a,slk_b";
    const guard = createMcpApiKeyGuard();
    const first = guard(request("bearer slk_a"));
    const again = guard(request("Bearer slk_a"));
    const second = guard(request("Bearer slk_b"));
    expect(first).toEqual({ ok: true, keyId: expect.any(String) });
    expect(again).toEqual(first);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("unreachable");
    expect(second.keyId).not.toBe(first.keyId);
    expect(first.keyId).not.toContain("slk_a");
  });

  it("prefers an explicit key source over the environment", () => {
    process.env[MCP_API_KEYS_ENV] = "slk_env";
    const guard = createMcpApiKeyGuard({ keys: () => ["slk_explicit"] });
    expect(guard(request("Bearer slk_env")).ok).toBe(false);
    expect(guard(request("Bearer slk_explicit")).ok).toBe(true);
  });
});
