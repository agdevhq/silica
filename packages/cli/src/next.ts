import path from "node:path";
import { execa, type ResultPromise } from "execa";
import fs from "fs-extra";
import { loadConfig } from "@silicajs/core";

export type NextCommand = "dev" | "build" | "start";
export type NextSubprocess = {
  subprocess: ResultPromise;
};

export async function runNext(
  command: NextCommand,
  nextRoot: string,
): Promise<void> {
  const { subprocess } = await startNext(command, nextRoot);
  await subprocess;
}

export async function runStart(nextRoot: string): Promise<void> {
  const standaloneServer = await findStandaloneServer(nextRoot);
  if (!standaloneServer) {
    await runNext("start", nextRoot);
    return;
  }

  await prepareStandaloneAssets(nextRoot, standaloneServer);
  installStackTraceRewrite(nextRoot);
  const subprocess = execa("node", [standaloneServer], {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
    cwd: path.dirname(standaloneServer),
    env: await makeNextEnv(),
  });
  subprocess.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(rewriteFrameworkPaths(chunk.toString(), nextRoot));
  });
  subprocess.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(rewriteFrameworkPaths(chunk.toString(), nextRoot));
  });
  await subprocess;
}

export async function startNext(
  command: NextCommand,
  nextRoot: string,
): Promise<NextSubprocess> {
  installStackTraceRewrite(nextRoot);
  const subprocess = execa("next", [command, nextRoot], {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
    env: await makeNextEnv(),
  });

  subprocess.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(rewriteFrameworkPaths(chunk.toString(), nextRoot));
  });
  subprocess.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(rewriteFrameworkPaths(chunk.toString(), nextRoot));
  });

  return { subprocess };
}

export async function findStandaloneServer(
  nextRoot: string,
): Promise<string | undefined> {
  const standaloneRoot = path.join(nextRoot, ".next/standalone");
  if (!(await fs.pathExists(standaloneRoot))) return undefined;
  return findFile(standaloneRoot, "server.js");
}

export async function prepareStandaloneAssets(
  nextRoot: string,
  standaloneServer: string,
): Promise<void> {
  const serverRoot = path.dirname(standaloneServer);
  await syncStandaloneAsset(
    path.join(nextRoot, ".next/static"),
    path.join(serverRoot, ".next/static"),
  );
  await syncStandaloneAsset(
    path.join(nextRoot, "public"),
    path.join(serverRoot, "public"),
  );
}

export function installStackTraceRewrite(nextRoot: string): void {
  const previous = Error.prepareStackTrace;
  Error.prepareStackTrace = (error, stack) => {
    const rendered = previous
      ? previous(error, stack)
      : `${error.name}: ${error.message}\n${stack.join("\n")}`;
    return rewriteFrameworkPaths(String(rendered), nextRoot);
  };
}

export function rewriteFrameworkPaths(
  output: string,
  nextRoot: string,
): string {
  const normalizedRoot = nextRoot.replace(/\\/g, "/");
  const escapedWindowsRoot = normalizedRoot.replace(/\//g, "\\");
  return output
    .replaceAll(`${normalizedRoot}/app/`, "@silicajs/next [route]/")
    .replaceAll(`${escapedWindowsRoot}\\app\\`, "@silicajs/next [route]\\")
    .replaceAll(`${normalizedRoot}/`, ".silica/next/")
    .replaceAll(`${escapedWindowsRoot}\\`, ".silica\\next\\");
}

async function makeNextEnv(): Promise<NodeJS.ProcessEnv> {
  const config = await loadConfig(process.cwd());
  const authEnabled =
    Boolean(config.auth) || process.env.SILICA_AUTH_ENABLED === "true";
  const allowedDomains = uniqueList([
    ...(config.auth?.allowedDomains ?? []),
    ...parseList(process.env.SILICA_ALLOWED_DOMAINS),
  ]);
  const allowedEmails = uniqueList([
    ...(config.auth?.allowedEmails ?? []),
    ...parseList(process.env.SILICA_ALLOWED_EMAILS),
  ]);

  return {
    ...process.env,
    SILICA_PROJECT_ROOT: process.cwd(),
    SILICA_AUTH_ENABLED: authEnabled ? "true" : "false",
    SILICA_ALLOWED_DOMAINS: allowedDomains.join(","),
    SILICA_ALLOWED_EMAILS: allowedEmails.join(","),
  };
}

function parseList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function uniqueList(values: readonly string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

async function syncStandaloneAsset(
  source: string,
  destination: string,
): Promise<void> {
  if (!(await fs.pathExists(source))) return;
  if (path.resolve(source) === path.resolve(destination)) return;

  await fs.remove(destination);
  await fs.ensureDir(path.dirname(destination));
  try {
    await fs.symlink(source, destination, "dir");
  } catch {
    await fs.copy(source, destination);
  }
}

async function findFile(
  root: string,
  filename: string,
): Promise<string | undefined> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isFile() && entry.name === filename) return absolute;
    if (entry.isDirectory()) {
      const found = await findFile(absolute, filename);
      if (found) return found;
    }
  }
  return undefined;
}
