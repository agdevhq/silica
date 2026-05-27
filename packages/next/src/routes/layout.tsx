import { cacheLife, cacheTag } from "next/cache";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
import {
  loadBuildId,
  loadManifest,
  loadResolvedConfig,
} from "../server-data.js";

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
  const buildId = await loadBuildId();
  cacheTag("build", `build:${buildId}`);
  const [manifest, config] = await Promise.all([
    loadManifest(),
    loadResolvedConfig(),
  ]);
  const auth = resolveRuntimeAuthConfig(config);
  return {
    navigation: {
      entries: manifest.entries.map((entry) => ({
        slug: entry.slug,
        title: entry.menuLabel ?? entry.title,
        sortKey: entry.sortKey,
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
