import { NextRequest, NextResponse } from "next/server";
import { hasSilicaSessionCookie, isSilicaRequestAllowed } from "@silicajs/auth";

const PUBLIC_PREFIXES = ["/_next", "/silica", "/api/auth", "/api/search", "/__silica/revalidate"];
const PUBLIC_PATHS = ["/sign-in", "/not-allowed", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

export async function silicaProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  if (process.env.SILICA_AUTH_ENABLED !== "true") return NextResponse.next();

  const allowedDomains = parseList(process.env.SILICA_ALLOWED_DOMAINS);
  const allowedEmails = parseList(process.env.SILICA_ALLOWED_EMAILS);
  const hasValidatedSession = await isSilicaRequestAllowed(request, {
      secret: process.env.BETTER_AUTH_SECRET,
      allowedDomains,
      allowedEmails,
    });
  const hasDevelopmentCookieFallback = !process.env.BETTER_AUTH_SECRET && hasSilicaSessionCookie(request);

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
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function parseList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}
