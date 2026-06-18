import fs from "node:fs";
import path from "node:path";

export const VAULT_DATABASE_FILENAME = "vault.db";

export function resolveProjectRoot(): string {
  const cwd = /* turbopackIgnore: true */ process.cwd();
  const configured = process.env.SILICA_PROJECT_ROOT?.trim();
  if (configured) {
    const configuredRoot = resolveConfiguredProjectRoot(configured, cwd);
    if (path.isAbsolute(configured) || isSilicaProjectRoot(configuredRoot)) {
      return configuredRoot;
    }

    const generatedRoot = resolveGeneratedRuntimeProjectRoot(cwd);
    if (generatedRoot) return generatedRoot;

    return configuredRoot;
  }

  const generatedRoot = resolveGeneratedRuntimeProjectRoot(cwd);
  if (generatedRoot) return generatedRoot;

  throw new Error("SILICA_PROJECT_ROOT must be set by the Silica CLI.");
}

export function tryResolveProjectRoot(): string | undefined {
  try {
    return resolveProjectRoot();
  } catch {
    return undefined;
  }
}

function resolveConfiguredProjectRoot(value: string, cwd: string): string {
  return path.isAbsolute(value) ? value : path.resolve(cwd, value);
}

export function resolveGeneratedRuntimeProjectRoot(
  cwd = /* turbopackIgnore: true */ process.cwd(),
): string | undefined {
  const projectRoot = path.resolve(cwd, "../..");
  return isSilicaProjectRoot(projectRoot) ? projectRoot : undefined;
}

function isSilicaProjectRoot(projectRoot: string): boolean {
  return fs.existsSync(
    path.join(projectRoot, ".silica", VAULT_DATABASE_FILENAME),
  );
}
