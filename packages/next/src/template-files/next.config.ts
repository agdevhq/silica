import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
/* __SILICA_CONFIG_IMPORT__ */

const require = createRequire(import.meta.url);
const nextRoot = path.dirname(fileURLToPath(import.meta.url));
const silicaRoot = path.resolve(nextRoot, "..");
const vaultMetadata = readVaultMetadata(path.join(silicaRoot, "vault.db"));
type VaultConfig = {
  assistant?: { provider?: { package?: string } };
  render?: { output?: "standalone" | "default" };
};
const resolvedConfig = parseJson<VaultConfig>(vaultMetadata.configJson);
const standaloneOutput = resolvedConfig?.render?.output === "standalone";
const serverExternalPackages = [
  "better-sqlite3",
  "just-bash",
  resolvedConfig?.assistant?.provider?.package,
].filter((packageName, index, packages): packageName is string => {
  return Boolean(packageName) && packages.indexOf(packageName) === index;
});

const baseNextConfig: NextConfig = {
  cacheComponents: true,
  ...(process.env.SILICA_TIMING_LOGS
    ? { env: { SILICA_TIMING_LOGS: process.env.SILICA_TIMING_LOGS } }
    : {}),
  // Standalone output and the filesystem cache handler are both self-hosting
  // concerns, enabled together by `render.output: "standalone"`. The default
  // (`"default"`) emits a regular build so the deployment platform's adapter
  // (e.g. Netlify) bundles the server and installs its own durable Cache
  // Components handler, instead of Next falling back to writing segments onto a
  // read-only disk.
  ...(standaloneOutput
    ? {
        output: "standalone" as const,
        cacheHandlers: {
          default: require.resolve("./cache-handlers/filesystem-cache.js"),
          remote: require.resolve("./cache-handlers/filesystem-cache.js"),
        },
      }
    : {}),
  generateBuildId: async () => vaultMetadata.renderEnvironmentHash ?? "silica",
  deploymentId: process.env.SILICA_DEPLOYMENT_ID,
  transpilePackages: [
    "@silicajs/core",
    "@silicajs/next",
    "@silicajs/auth",
    "@silicajs/search",
    "@silicajs/components",
    "@silicajs/ui",
    "@silicajs/theme-amethyst",
  ],
  serverExternalPackages,
  outputFileTracingIncludes: {
    "/*": ["../content/**/*", "../vault.db"],
  },
  experimental: {
    externalDir: true,
    serverSourceMaps: process.env.NODE_ENV !== "production",
  },
};

function readVaultMetadata(databasePath: string): {
  renderEnvironmentHash?: string;
  configJson?: string;
} {
  if (!fs.existsSync(databasePath)) return {};
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  const db = new Database(databasePath, {
    fileMustExist: true,
    readonly: true,
  });
  try {
    const rows = db
      .prepare("SELECT key, value FROM vault_metadata")
      .all() as Array<{ key: string; value: string }>;
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } finally {
    db.close();
  }
}

function parseJson<T>(value: string | undefined): T | undefined {
  return value ? (JSON.parse(value) as T) : undefined;
}

/* __SILICA_CONFIG_OVERRIDE__ */

export default nextConfig;
