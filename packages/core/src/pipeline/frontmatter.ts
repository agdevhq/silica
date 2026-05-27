export type PageProperty = {
  key: string;
  label: string;
  value: string;
};

const RESERVED_FRONTMATTER_KEYS = new Set([
  "aliases",
  "alias",
  "created",
  "cssclass",
  "cssclasses",
  "date",
  "description",
  "draft",
  "modified",
  "permalink",
  "publish",
  "tag",
  "tags",
  "title",
]);

export function getPageProperties(
  frontmatter: Record<string, unknown>,
): PageProperty[] {
  return Object.entries(frontmatter)
    .filter(([key]) => !RESERVED_FRONTMATTER_KEYS.has(key.toLowerCase()))
    .map(([key, value]) => {
      const formatted = formatPropertyValue(value);
      if (formatted === undefined) return undefined;
      return {
        key,
        label: formatPropertyLabel(key),
        value: formatted,
      };
    })
    .filter((property): property is PageProperty => property !== undefined)
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function formatPropertyLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

export function formatPropertyValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatPropertyValue(item))
      .filter((item): item is string => item !== undefined);
    return items.length ? items.join(", ") : undefined;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
