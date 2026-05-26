import { cacheLife } from "next/cache";
import { loadManifest, loadResolvedConfig } from "../server-data.js";

export async function generateMetadata() {
  const { config } = await getLayoutProps();
  return {
    title: {
      default: config.title,
      template: `%s · ${config.title}`,
    },
    description: config.description,
  };
}

export async function getLayoutProps() {
  "use cache";
  cacheLife("max");
  const [manifest, config] = await Promise.all([
    loadManifest(),
    loadResolvedConfig(),
  ]);
  return { manifest, config };
}
