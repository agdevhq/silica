/** Normalize a public asset path or pass through absolute URLs. */
export function resolvePublicAssetPath(asset?: string): string | undefined {
  const trimmed = asset?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
