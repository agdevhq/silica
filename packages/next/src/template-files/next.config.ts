import type { NextConfig } from "next";
/* __SILICA_CONFIG_IMPORT__ */

const baseNextConfig: NextConfig = {
  cacheComponents: true,
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
      "../search.db",
      "../build-id.txt",
    ],
  },
  experimental: {
    externalDir: true,
    serverSourceMaps: process.env.NODE_ENV !== "production",
  },
};

/* __SILICA_CONFIG_OVERRIDE__ */

export default nextConfig;
