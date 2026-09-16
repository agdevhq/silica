import { createHash, timingSafeEqual } from "node:crypto";

export const MCP_API_KEYS_ENV = "SILICA_MCP_API_KEYS";
const MAX_API_KEY_LENGTH = 512;
const KEY_ID_BYTES = 8;

export type McpApiKeyGuardOptions = {
  /**
   * Returns the accepted API keys. Defaults to the comma-separated
   * `SILICA_MCP_API_KEYS` environment variable, read at request time.
   */
  keys?: () => readonly string[];
};

export type McpApiKeyAuthorization =
  | {
      ok: true;
      /** Stable, non-reversible identifier for the matched key. */
      keyId: string;
    }
  | { ok: false; response: Response };

/** Splits a comma-separated API key list, ignoring blanks. */
export function parseMcpApiKeys(value: string | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((key) => key.trim())
        .filter((key) => key.length > 0 && key.length <= MAX_API_KEY_LENGTH),
    ),
  ];
}

/**
 * Bearer-token guard for the MCP endpoint. Keys are compared by SHA-256
 * digest in constant time so neither key length nor content leaks through
 * timing.
 */
export function createMcpApiKeyGuard(
  options: McpApiKeyGuardOptions = {},
): (request: Request) => McpApiKeyAuthorization {
  return (request) => {
    const keys =
      options.keys?.() ?? parseMcpApiKeys(process.env[MCP_API_KEYS_ENV]);
    if (keys.length === 0) {
      return {
        ok: false,
        response: jsonError(
          `The MCP server is not configured: set the ${MCP_API_KEYS_ENV} environment variable.`,
          503,
        ),
      };
    }

    const presented = readBearerToken(request);
    if (!presented) return unauthorized();

    const presentedDigest = digest(presented);
    for (const key of keys) {
      if (timingSafeEqual(presentedDigest, digest(key))) {
        return {
          ok: true,
          keyId: presentedDigest.subarray(0, KEY_ID_BYTES).toString("hex"),
        };
      }
    }
    return unauthorized();
  };
}

function readBearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header) return undefined;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  const token = match?.[1];
  if (!token || token.length > MAX_API_KEY_LENGTH) return undefined;
  return token;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function unauthorized(): McpApiKeyAuthorization {
  return {
    ok: false,
    response: Response.json(
      { error: "A valid MCP API key is required." },
      {
        status: 401,
        headers: {
          "www-authenticate": 'Bearer realm="silica-mcp"',
          "cache-control": "no-store",
        },
      },
    ),
  };
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
