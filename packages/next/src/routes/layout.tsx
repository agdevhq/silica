import { cacheLife } from "next/cache";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
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
  const auth = resolveRuntimeAuthConfig(config);
  return {
    navigation: {
      entries: manifest.entries.map((entry) => ({
        slug: entry.slug,
        title: entry.title,
      })),
    },
    config: {
      title: config.title,
      description: config.description,
      baseUrl: config.baseUrl,
      authEnabled: auth.authEnabled,
    },
  };
}
