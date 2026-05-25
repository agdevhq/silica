import { notFound } from "next/navigation";
import { TagsList } from "../primitives/index.js";
import { loadManifest } from "../server-data.js";

export type TagsPageProps = {
  params: Promise<{ tag: string }> | { tag: string };
};

export async function generateStaticParams() {
  const manifest = await loadManifest();
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
  const manifest = await loadManifest();
  if (!manifest.entries.some((entry) => entry.tags.includes(tag))) notFound();
  return <TagsList manifest={manifest} tag={tag} />;
}
