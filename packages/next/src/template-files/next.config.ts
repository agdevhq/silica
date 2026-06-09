import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
/* __SILICA_CONFIG_IMPORT__ */

const require = createRequire(import.meta.url);
const nextRoot = path.dirname(fileURLToPath(import.meta.url));
const silicaRoot = path.resolve(nextRoot, "..");
const cacheState = readJson<{ renderEnvironmentHash?: string }>(
  path.join(silicaRoot, "cache-state.json"),
);
const resolvedConfig = readJson<{
  render?: { cache?: { storage?: "memory" | "filesystem" } };
}>(path.join(silicaRoot, "config.json"));
const useFilesystemCache = resolvedConfig.render?.cache?.storage !== "memory";

const baseNextConfig: NextConfig = {
  cacheComponents: true,
  ...(useFilesystemCache
    ? {
        cacheHandlers: {
          default: require.resolve("./cache-handlers/filesystem-cache.js"),
          remote: require.resolve("./cache-handlers/filesystem-cache.js"),
        },
      }
    : {}),
  generateBuildId: async () => cacheState.renderEnvironmentHash ?? "silica",
  deploymentId: process.env.SILICA_DEPLOYMENT_ID,
  output: "standalone",
  transpilePackages: [
    "@silicajs/core",
    "@silicajs/next",
    "@silicajs/auth",
    "@silicajs/search",
    "@silicajs/components",
    "@silicajs/ui",
    "@silicajs/theme-amethyst",
  ],
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/*": [
      "../content/**/*",
      "../manifest.json",
      "../navigation.json",
      "../graph.json",
      "../config.json",
      "../cache-state.json",
      "../prerender.json",
      "../route-cache-keys.json",
      "../search.db",
    ],
  },
  experimental: {
    externalDir: true,
    serverSourceMaps: process.env.NODE_ENV !== "production",
  },
};

function readJson<T>(filePath: string): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return {} as T;
  }
}

/* __SILICA_CONFIG_OVERRIDE__ */

export default nextConfig;
