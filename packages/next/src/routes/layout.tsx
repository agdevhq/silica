import { cacheLife, cacheTag } from "next/cache";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
import { loadRenderCacheState, loadResolvedConfig } from "../server-data.js";

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
  const cacheState = await loadRenderCacheState();
  const renderEnvironmentHash = cacheState.renderEnvironmentHash;
  cacheTag(`environment:${renderEnvironmentHash}`);
  const config = await loadResolvedConfig();
  const auth = resolveRuntimeAuthConfig(config);
  return {
    navigationEndpoint: `/api/navigation?build=${encodeURIComponent(
      renderEnvironmentHash,
    )}`,
    config: {
      title: config.title,
      description: config.description,
      logo: config.logo,
      baseUrl: config.baseUrl,
      authEnabled: auth.authEnabled,
    },
  };
}
