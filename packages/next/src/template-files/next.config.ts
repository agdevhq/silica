import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: "standalone",
  transpilePackages: [
    "@silicajs/core",
    "@silicajs/next",
    "@silicajs/auth",
    "@silicajs/search",
    "@silicajs/theme-default",
  ],
  serverExternalPackages: ["flexsearch"],
  outputFileTracingIncludes: {
    "/*": [
      "../../content/**/*",
      "../manifest.json",
      "../graph.json",
      "../search-index.json",
      "../build-id.txt",
    ],
  },
  experimental: {
    externalDir: true,
    serverSourceMaps: true,
  },
};

export default nextConfig;
