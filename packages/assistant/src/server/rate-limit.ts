const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 10;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_TRUSTED_PROXY_HEADERS = ["x-forwarded-for"] as const;
const MAX_RATE_LIMIT_BUCKETS = 10_000;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export type AssistantRateLimitOptions = {
  /** Maximum assistant requests allowed per client in the configured window. */
  maxRequests?: number;
  /** Window size in milliseconds. Defaults to one minute. */
  windowMs?: number;
  /**
   * Headers set or overwritten by the deployment proxy and used to derive the
   * caller IP for the built-in rate limit. Defaults to `x-forwarded-for`.
   */
  trustedProxyHeaders?: readonly string[];
  /**
   * Custom bucket key. Prefer this for authenticated routes where a stable
   * session or user id is available.
   */
  key?: (request: Request) => string | Promise<string>;
};

/**
 * Fixed-window in-memory rate limit shared by the generated assistant routes.
 * Buckets live for the lifetime of the server process; multi-instance
 * deployments get a per-instance allowance.
 */
export function createRateLimitGuard(
  options: AssistantRateLimitOptions | undefined,
): (request: Request) => Promise<Response | undefined> {
  const maxRequests = Math.max(
    1,
    options?.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  );
  const windowMs = Math.max(
    1,
    options?.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
  );
  const trustedProxyHeaders =
    options?.trustedProxyHeaders ?? DEFAULT_TRUSTED_PROXY_HEADERS;

  return async (request) => {
    const now = Date.now();
    const key = await rateLimitKey(request, {
      key: options?.key,
      trustedProxyHeaders,
    });
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      pruneExpiredBuckets(now);
      return undefined;
    }

    bucket.count += 1;
    if (bucket.count <= maxRequests) return undefined;

    return Response.json(
      { error: "Too many assistant requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "retry-after": String(Math.ceil((bucket.resetAt - now) / 1000)),
        },
      },
    );
  };
}

async function rateLimitKey(
  request: Request,
  options: Pick<AssistantRateLimitOptions, "key" | "trustedProxyHeaders">,
): Promise<string> {
  const customKey = await options.key?.(request);
  if (customKey?.trim()) return customKey.trim();

  for (const header of options.trustedProxyHeaders ?? []) {
    const value = rateLimitHeaderValue(header, request.headers.get(header));
    if (value) return value;
  }

  return "anonymous";
}

function rateLimitHeaderValue(
  header: string,
  value: string | null,
): string | undefined {
  if (!value) return undefined;
  const normalizedHeader = header.toLowerCase();
  const candidate =
    normalizedHeader === "x-forwarded-for" ? value.split(",")[0] : value;
  return candidate?.trim() || undefined;
}

function pruneExpiredBuckets(now: number): void {
  if (rateLimitBuckets.size <= MAX_RATE_LIMIT_BUCKETS) return;
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}
