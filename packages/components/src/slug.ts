export function slugToHref(slug: string): string {
  if (slug === "index") return "/";
  return `/${slug.replace(/\/index$/, "")}`;
}

export function prettySegment(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
