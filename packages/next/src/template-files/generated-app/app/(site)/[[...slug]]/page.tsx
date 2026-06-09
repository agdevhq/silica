import theme from "../../../silica-theme";
import routeCacheKeys from "../../../../route-cache-keys.json";
import { VaultContent } from "@silicajs/next/routes/page";
export {
  generateMetadata,
  generateStaticParams,
} from "@silicajs/next/routes/page";

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }> | { slug?: string[] };
}) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug?.length
    ? resolvedParams.slug.join("/")
    : "index";
  const renderKey = (
    routeCacheKeys as {
      renderEnvironmentHash: string;
      entries: Record<string, { renderHash: string }>;
    }
  ).entries[slug];
  return (
    <VaultContent
      slug={slug}
      renderHash={renderKey?.renderHash ?? "missing"}
      renderEnvironmentHash={
        (
          routeCacheKeys as {
            renderEnvironmentHash: string;
            entries: Record<string, { renderHash: string }>;
          }
        ).renderEnvironmentHash
      }
      theme={theme}
    />
  );
}
