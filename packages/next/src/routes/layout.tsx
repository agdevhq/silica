import { cacheLife, cacheTag } from "next/cache";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
import { loadBuildId, loadResolvedConfig } from "../server-data.js";

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
  const config = await loadResolvedConfig();
  const auth = resolveRuntimeAuthConfig(config);
  return {
    navigationEndpoint: `/api/navigation?build=${encodeURIComponent(buildId)}`,
    config: {
      title: config.title,
      description: config.description,
      logo: config.logo,
      baseUrl: config.baseUrl,
      authEnabled: auth.authEnabled,
    },
  };
}
