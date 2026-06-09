import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { TagsList } from "@silicajs/components";
import {
  getCacheState,
  getEntriesForTag,
  getTagSlugs,
} from "../server-data.js";

const EMPTY_TAG_STATIC_PARAM = "__silica_empty_tags__";

export type TagsPageProps = {
  params: Promise<{ tag: string | string[] }> | { tag: string | string[] };
};

export async function generateStaticParams() {
  const params = getTagSlugs().map((tag) => ({ tag: tag.split("/") }));
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
  const cacheState = getCacheState();
  const entries = await getTagEntries(
    tag,
    cacheState.renderEnvironmentHash,
    cacheState.tagIndexHash,
  );
  if (entries.length === 0) notFound();
  return <TagsList entries={entries} tag={tag} />;
}

async function getTagEntries(
  tag: string,
  renderEnvironmentHash: string,
  tagIndexHash: string,
) {
  "use cache";
  cacheLife("max");
  cacheTag(`environment:${renderEnvironmentHash}`, `tags:${tagIndexHash}`);
  return getEntriesForTag(tag);
}

function routeTagToString(tag: string | string[]): string {
  return Array.isArray(tag) ? tag.join("/") : tag;
}
