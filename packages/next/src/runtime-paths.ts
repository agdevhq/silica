import fs from "node:fs";
import path from "node:path";

export const VAULT_DATABASE_FILENAME = "vault.db";
export const SILICA_DATA_DIRNAME = "data";

export function resolveProjectRoot(): string {
  const cwd = /* turbopackIgnore: true */ process.cwd();
  return resolveAppRoot(cwd);
}

export function tryResolveProjectRoot(): string | undefined {
  try {
    return resolveProjectRoot();
  } catch {
    return undefined;
  }
}

export function resolveDataRoot(
  cwd = /* turbopackIgnore: true */ process.cwd(),
): string {
  const configured = process.env.SILICA_DATA_ROOT?.trim();
  if (configured) return resolveConfiguredPath(configured, cwd);

  const configuredProjectRoot = process.env.SILICA_PROJECT_ROOT?.trim();
  if (configuredProjectRoot) {
    const root = resolveConfiguredPath(configuredProjectRoot, cwd);
    const generatedDataRoot = path.join(root, ".silica/next/data");
    if (isSilicaDataRoot(generatedDataRoot)) return generatedDataRoot;

    const legacyDataRoot = path.join(root, ".silica");
    if (isSilicaDataRoot(legacyDataRoot)) return legacyDataRoot;
  }

  const generatedDataRoot = resolveGeneratedRuntimeDataRoot(cwd);
  if (generatedDataRoot) return generatedDataRoot;

  throw new Error("Silica runtime data could not be found.");
}

export function tryResolveDataRoot(): string | undefined {
  try {
    return resolveDataRoot();
  } catch {
    return undefined;
  }
}

function resolveConfiguredPath(value: string, cwd: string): string {
  return path.isAbsolute(value) ? value : path.resolve(cwd, value);
}

export function resolveGeneratedRuntimeProjectRoot(
  cwd = /* turbopackIgnore: true */ process.cwd(),
): string | undefined {
  const dataRoot = resolveGeneratedRuntimeDataRoot(cwd);
  return dataRoot ? path.dirname(dataRoot) : undefined;
}

export function resolveVaultDatabasePath(
  cwd = /* turbopackIgnore: true */ process.cwd(),
): string {
  return path.join(resolveDataRoot(cwd), VAULT_DATABASE_FILENAME);
}

function resolveAppRoot(cwd: string): string {
  const dataRoot = resolveDataRoot(cwd);
  return path.dirname(dataRoot);
}

function resolveGeneratedRuntimeDataRoot(cwd: string): string | undefined {
  const directDataRoot = path.join(cwd, SILICA_DATA_DIRNAME);
  if (isSilicaDataRoot(directDataRoot)) return directDataRoot;

  const projectGeneratedDataRoot = path.join(cwd, ".silica/next/data");
  if (isSilicaDataRoot(projectGeneratedDataRoot))
    return projectGeneratedDataRoot;

  const ancestorDataRoot = findAncestorDataRoot(cwd);
  if (ancestorDataRoot) return ancestorDataRoot;

  const legacyDataRoot = path.join(cwd, ".silica");
  if (isSilicaDataRoot(legacyDataRoot)) return legacyDataRoot;
}

function findAncestorDataRoot(cwd: string): string | undefined {
  let current = path.resolve(cwd);
  for (let depth = 0; depth < 8; depth += 1) {
    const dataRoot = path.join(current, SILICA_DATA_DIRNAME);
    if (isSilicaDataRoot(dataRoot)) return dataRoot;

    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function isSilicaDataRoot(dataRoot: string): boolean {
  return fs.existsSync(path.join(dataRoot, VAULT_DATABASE_FILENAME));
}
