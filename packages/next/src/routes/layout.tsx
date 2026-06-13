import { cacheLife, cacheTag } from "next/cache";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
import { getCacheState, getConfig } from "../server-data.js";

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
  const cacheState = getCacheState();
  return getCachedLayoutProps(cacheState.renderEnvironmentHash);
}

async function getCachedLayoutProps(renderEnvironmentHash: string) {
  "use cache";
  cacheLife("max");
  cacheTag(`environment:${renderEnvironmentHash}`);
  const config = getConfig();
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
      assistantEnabled: Boolean(config.assistant),
    },
  };
}
