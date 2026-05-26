import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { TagsList } from "@silicajs/components";
import { loadManifest } from "../server-data.js";

export type TagsPageProps = {
  params: Promise<{ tag: string }> | { tag: string };
};

export async function generateStaticParams() {
  const manifest = await getTagsManifest();
  const tags = new Set(manifest.entries.flatMap((entry) => entry.tags));
  return [...tags].map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: TagsPageProps) {
  const { tag } = await params;
  return {
    title: `#${tag}`,
  };
}

export default async function TagsPage({ params }: TagsPageProps) {
  const { tag } = await params;
  const manifest = await getTagsManifest();
  if (!manifest.entries.some((entry) => entry.tags.includes(tag))) notFound();
  return <TagsList manifest={manifest} tag={tag} />;
}

async function getTagsManifest() {
  "use cache";
  cacheLife("max");
  return loadManifest();
}
