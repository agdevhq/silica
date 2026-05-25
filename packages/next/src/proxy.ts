import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@silicajs/core";

const PUBLIC_PREFIXES = ["/_next", "/silica", "/api/auth", "/api/search", "/__silica/revalidate"];
const PUBLIC_PATHS = ["/sign-in", "/not-allowed", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

export async function silicaProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const config = await loadConfig(process.env.SILICA_PROJECT_ROOT ?? process.cwd());
  if (!config.auth) return NextResponse.next();

  const sessionCookie = getSessionCookieValue(request);
  if (!sessionCookie) {
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

function getSessionCookieValue(request: NextRequest): string | undefined {
  return (
    request.cookies.get("__Secure-better-auth.session_token")?.value ??
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("better-auth.session-token")?.value
  );
}
