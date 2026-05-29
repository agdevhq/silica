import { normalizeTag } from "@silicajs/remark-obsidian";

export function tagToHref(tag: string): string {
  const normalized = normalizeTag(tag);
  if (!normalized) return "/tags";
  const encoded = normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/tags/${encoded}`;
}
