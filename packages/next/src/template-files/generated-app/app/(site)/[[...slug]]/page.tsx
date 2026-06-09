import theme from "../../../silica-theme";
import { VaultContent } from "@silicajs/next/routes/page";
import { getRenderKey, normalizeRouteSlug } from "@silicajs/next/server-data";
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
  const slug = normalizeRouteSlug(resolvedParams?.slug);
  const renderKey = getRenderKey(slug);
  return (
    <VaultContent
      slug={slug}
      renderHash={renderKey.renderHash}
      renderEnvironmentHash={renderKey.renderEnvironmentHash}
      theme={theme}
    />
  );
}
