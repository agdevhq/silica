import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { TagsList } from "@silicajs/components";
import { getTagHierarchy, tagMatches } from "@silicajs/core/runtime";
import { loadBuildId, loadManifest } from "../server-data.js";

export type TagsPageProps = {
  params: Promise<{ tag: string | string[] }> | { tag: string | string[] };
};

export async function generateStaticParams() {
  const manifest = await getTagsManifest();
  const tags = new Set(
    manifest.entries.flatMap((entry) =>
      entry.tags.flatMap((tag) => getTagHierarchy(tag)),
    ),
  );
  return [...tags].map((tag) => ({ tag: tag.split("/") }));
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
    !manifest.entries.some((entry) =>
      entry.tags.some((entryTag) => tagMatches(entryTag, tag)),
    )
  ) {
    notFound();
  }
  return <TagsList manifest={manifest} tag={tag} />;
}

async function getTagsManifest() {
  "use cache";
  cacheLife("max");
  const buildId = await loadBuildId();
  cacheTag("build", `build:${buildId}`);
  return loadManifest();
}

function routeTagToString(tag: string | string[]): string {
  return Array.isArray(tag) ? tag.join("/") : tag;
}
