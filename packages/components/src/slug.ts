export function slugToHref(slug: string): string {
  if (slug === "index") return "/";
  return `/${slug.replace(/\/index$/, "")}`;
}

/** Returns an href when `segmentPath` maps to a real page; otherwise undefined. */
export function breadcrumbSegmentHref(
  segmentPath: string,
  allSlugs: readonly string[],
): string | undefined {
  const slugs = new Set(allSlugs);
  if (slugs.has(segmentPath)) return slugToHref(segmentPath);
  const indexSlug = `${segmentPath}/index`;
  if (slugs.has(indexSlug)) return slugToHref(indexSlug);
  return undefined;
}

export function prettySegment(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
