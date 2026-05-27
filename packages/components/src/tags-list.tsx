import * as React from "react";
import { tagMatches, tagToHref } from "@silicajs/remark-obsidian";
import type { Manifest } from "@silicajs/core/runtime";

import { TagBadge } from "@silicajs/ui/components/tag-badge";

import { SilicaLink } from "./routing.js";
import { slugToHref } from "./slug.js";

export type TagsListProps = {
  manifest: Manifest;
  tag: string;
  className?: string;
};

export function TagsList({ manifest, tag, className }: TagsListProps) {
  const entries = React.useMemo(
    () =>
      manifest.entries
        .filter((entry) =>
          entry.tags.some((entryTag) => tagMatches(entryTag, tag)),
        )
        .sort((a, b) => a.title.localeCompare(b.title)),
    [manifest.entries, tag],
  );
  const relatedTags = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      for (const t of entry.tags) {
        if (tagMatches(t, tag) && tagMatches(tag, t)) continue;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t);
  }, [entries, tag]);

  return (
    <section className={className} data-slot="tags-list">
      <header className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="text-muted-foreground">#</span>
          {tag}
        </h1>
        <span className="text-sm text-muted-foreground">
          {entries.length} {entries.length === 1 ? "page" : "pages"}
        </span>
      </header>
      {relatedTags.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {relatedTags.map((t) => (
            <TagBadge
              key={t}
              tag={t}
              href={tagToHref(t)}
              render={
                <SilicaLink
                  href={tagToHref(t)}
                  className="cursor-pointer text-foreground/80 no-underline transition-colors hover:text-foreground"
                />
              }
            />
          ))}
        </div>
      ) : null}
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.slug}>
            <SilicaLink
              href={slugToHref(entry.slug)}
              className="block rounded-md px-3 py-2 transition-colors hover:bg-muted"
            >
              <div className="font-medium text-foreground">{entry.title}</div>
              {entry.description ? (
                <div className="text-sm text-muted-foreground">
                  {entry.description}
                </div>
              ) : null}
            </SilicaLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
