import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { TagsList } from "@silicajs/components";
import { getTagHierarchy, tagMatches } from "@silicajs/remark-obsidian";
import { loadPageRuntimeData } from "../server-data.js";

const EMPTY_TAG_STATIC_PARAM = "__silica_empty_tags__";

export type TagsPageProps = {
  params: Promise<{ tag: string | string[] }> | { tag: string | string[] };
};

export async function generateStaticParams() {
  const manifest = await getTagsManifest();
  const tags = new Set(
    manifest.entries
      .filter(isListedEntry)
      .flatMap((entry) => entry.tags.flatMap((tag) => getTagHierarchy(tag))),
  );
  const params = [...tags].map((tag) => ({ tag: tag.split("/") }));
  return params.length > 0 ? params : [{ tag: [EMPTY_TAG_STATIC_PARAM] }];
}

export async function generateMetadata({ params }: TagsPageProps) {
  const tag = routeTagToString((await params).tag);
  return {
    title: `#${tag}`,
  };
}

export default async function TagsPage({ params }: TagsPageProps) {
  const tag = routeTagToString((await params).tag);
  const manifest = await getTagsManifest();
  if (
    !manifest.entries
      .filter(isListedEntry)
      .some((entry) => entry.tags.some((entryTag) => tagMatches(entryTag, tag)))
  ) {
    notFound();
  }
  return (
    <TagsList
      manifest={{
        ...manifest,
        entries: manifest.entries.filter(isListedEntry),
      }}
      tag={tag}
    />
  );
}

async function getTagsManifest() {
  "use cache";
  cacheLife("max");
  const { cacheState, manifest } = await loadPageRuntimeData();
  cacheTag(`environment:${cacheState.renderEnvironmentHash}`);
  return manifest;
}

function routeTagToString(tag: string | string[]): string {
  return Array.isArray(tag) ? tag.join("/") : tag;
}

function isListedEntry(entry: { frontmatter: Record<string, unknown> }) {
  return entry.frontmatter.listed !== false;
}
