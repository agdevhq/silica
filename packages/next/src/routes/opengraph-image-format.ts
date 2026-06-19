/**
 * Public path of the auto-generated Open Graph image for a note slug. Mirrors
 * the `app/api/silica/og/[[...slug]]/route` handler that renders it.
 */
export function opengraphImagePath(slug: string): string {
  if (!slug || slug === "index") return "/api/silica/og";
  return `/api/silica/og/${slug.split("/").map(encodeURIComponent).join("/")}`;
}

export function titleFontSize(title: string): number {
  if (title.length <= 28) return 84;
  if (title.length <= 55) return 64;
  return 48;
}

export function clampText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function hostnameFromBaseUrl(baseUrl?: string): string | undefined {
  if (!baseUrl) return undefined;
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "") || undefined;
  }
}
