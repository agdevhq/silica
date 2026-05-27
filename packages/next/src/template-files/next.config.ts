import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  serverExternalPackages: ["flexsearch"],
  outputFileTracingIncludes: {
    "/*": [
      "../content/**/*",
      "../manifest.json",
      "../graph.json",
      "../config.json",
      "../search-index.json",
      "../build-id.txt",
    ],
  },
  experimental: {
    externalDir: true,
    serverSourceMaps: process.env.NODE_ENV !== "production",
  },
};

export default nextConfig;
