import { NextRequest, NextResponse } from "next/server";
import { isSilicaRequestAllowed } from "@silicajs/auth";

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
    options.authEnabled === true || process.env.SILICA_AUTH_ENABLED === "true";
  if (!authEnabled) return NextResponse.next();
  if (isSilicaPublicPath(pathname)) return NextResponse.next();

  const allowedDomains = uniqueList([
    ...(options.allowedDomains ?? []),
    ...parseList(process.env.SILICA_ALLOWED_DOMAINS),
  ]);
  const allowedEmails = uniqueList([
    ...(options.allowedEmails ?? []),
    ...parseList(process.env.SILICA_ALLOWED_EMAILS),
  ]);
  const secret = process.env.BETTER_AUTH_SECRET;
  const hasValidatedSession = secret
    ? await isSilicaRequestAllowed(request, {
        secret: process.env.BETTER_AUTH_SECRET,
        allowedDomains,
        allowedEmails,
      })
    : false;

  if (!hasValidatedSession) {
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

export function isSilicaPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
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

function uniqueList(values: readonly string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}
