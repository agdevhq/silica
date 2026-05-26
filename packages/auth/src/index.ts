import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { AllowlistConfig } from "./allowlist.js";
import { hasAllowlist, isEmailAllowed } from "./allowlist.js";

export type SilicaAuthOptions = AllowlistConfig & {
  baseURL?: string;
  secret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
};

export function silicaAuth(options: SilicaAuthOptions = {}) {
  const allowlist = {
    allowedDomains: options.allowedDomains ?? [],
    allowedEmails: options.allowedEmails ?? [],
  };

  return betterAuth({
    baseURL: options.baseURL ?? process.env.BETTER_AUTH_URL,
    secret: options.secret ?? process.env.BETTER_AUTH_SECRET,
    socialProviders: {
      google: {
        clientId: options.googleClientId ?? process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: options.googleClientSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 7 * 24 * 60 * 60,
      },
    },
    account: {
      accountLinking: {
        enabled: false,
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (!ctx.path.includes("/callback/")) return;
        if (!hasAllowlist(allowlist)) return;

        const email = ctx.context.newSession?.user.email ?? "";
        if (!isEmailAllowed(email, allowlist)) {
          throw new APIError("FORBIDDEN", {
            message: "Email is not allowed to access this Silica site.",
            redirectTo: "/not-allowed",
          });
        }
      }),
    },
  });
}

export { hasAllowlist, isEmailAllowed };
export { getSilicaSession, hasSilicaSessionCookie, isSilicaRequestAllowed } from "./session.js";
export type { AllowlistConfig };
export type { SilicaSession, SilicaSessionOptions } from "./session.js";
