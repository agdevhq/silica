import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import type { Session, User } from "better-auth";
import type { AllowlistConfig } from "./allowlist.js";
import { hasAllowlist, isEmailAllowed } from "./allowlist.js";

export type SilicaSession = {
  session: Session & Record<string, unknown>;
  user: User & Record<string, unknown>;
  updatedAt: number;
  version?: string;
};

export type SilicaSessionOptions = AllowlistConfig & {
  secret?: string;
  strategy?: "compact" | "jwt" | "jwe";
};

export async function getSilicaSession(request: Request | Headers, options: SilicaSessionOptions = {}): Promise<SilicaSession | null> {
  try {
    return await getCookieCache<SilicaSession>(request, {
      secret: options.secret ?? process.env.BETTER_AUTH_SECRET,
      strategy: options.strategy ?? "compact",
    });
  } catch {
    return null;
  }
}

export function hasSilicaSessionCookie(request: Request | Headers): boolean {
  return Boolean(getSessionCookie(request));
}

export async function isSilicaRequestAllowed(request: Request | Headers, options: SilicaSessionOptions = {}): Promise<boolean> {
  const session = await getSilicaSession(request, options);
  if (!session) return false;
  if (!hasAllowlist(options)) return true;
  return isEmailAllowed(session.user.email, options);
}
