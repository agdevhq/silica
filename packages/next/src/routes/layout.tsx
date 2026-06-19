import { cacheLife, cacheTag } from "next/cache";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
import { getCacheState, getConfig } from "../server-data.js";

export async function generateMetadata() {
  const { config } = await getLayoutProps();
  return {
    metadataBase: resolveMetadataBase(config.baseUrl),
    title: {
      default: config.title,
      template: `%s · ${config.title}`,
    },
    description: config.description,
    openGraph: {
      type: "website",
      siteName: config.title,
      title: config.title,
      description: config.description,
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
    },
  };
}

function resolveMetadataBase(baseUrl?: string): URL | undefined {
  if (!baseUrl) return undefined;
  try {
    return new URL(baseUrl);
  } catch {
    return undefined;
  }
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
