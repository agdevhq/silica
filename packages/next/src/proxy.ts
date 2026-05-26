import { NextRequest, NextResponse } from "next/server";
import { hasSilicaSessionCookie, isSilicaRequestAllowed } from "@silicajs/auth";

export type SilicaProxyOptions = {
  authEnabled?: boolean;
  allowedDomains?: readonly string[];
  allowedEmails?: readonly string[];
};

const PUBLIC_PREFIXES = ["/_next", "/api/auth", "/__silica/revalidate"];
const PUBLIC_PATHS = ["/sign-in", "/not-allowed", "/favicon.ico"];

export async function silicaProxy(
  request: NextRequest,
  options: SilicaProxyOptions = {},
) {
  const { pathname } = request.nextUrl;

  const authEnabled =
    options.authEnabled ?? process.env.SILICA_AUTH_ENABLED === "true";
  if (!authEnabled) return NextResponse.next();
  if (isPublicPath(pathname)) return NextResponse.next();

  const allowedDomains =
    options.allowedDomains ?? parseList(process.env.SILICA_ALLOWED_DOMAINS);
  const allowedEmails =
    options.allowedEmails ?? parseList(process.env.SILICA_ALLOWED_EMAILS);
  const secret = process.env.BETTER_AUTH_SECRET;
  const hasValidatedSession = secret
    ? await isSilicaRequestAllowed(request, {
        secret: process.env.BETTER_AUTH_SECRET,
        allowedDomains: [...allowedDomains],
        allowedEmails: [...allowedEmails],
      })
    : false;
  const hasDevelopmentCookieFallback =
    process.env.NODE_ENV !== "production" &&
    !secret &&
    hasSilicaSessionCookie(request);

  if (!hasValidatedSession && !hasDevelopmentCookieFallback) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function parseList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}
