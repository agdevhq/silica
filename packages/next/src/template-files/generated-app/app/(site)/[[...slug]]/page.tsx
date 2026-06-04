import theme from "../../../silica-theme";
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
  return <VaultContent slug={slug} theme={theme} />;
}
