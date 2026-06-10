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
  render?: { cache?: { storage?: "memory" | "filesystem" } };
};
const resolvedConfig = parseJson<VaultConfig>(vaultMetadata.configJson);
const useFilesystemCache = resolvedConfig?.render?.cache?.storage !== "memory";

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
  generateBuildId: async () => vaultMetadata.renderEnvironmentHash ?? "silica",
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
  serverExternalPackages: ["better-sqlite3", "just-bash"],
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
