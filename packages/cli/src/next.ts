import { execa } from "execa";
import { loadConfig } from "@silicajs/core";

export type NextCommand = "dev" | "build" | "start";

export async function runNext(command: NextCommand, nextRoot: string): Promise<void> {
  installStackTraceRewrite(nextRoot);
  const config = await loadConfig(process.cwd());
  const subprocess = execa("next", [command, nextRoot], {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      SILICA_PROJECT_ROOT: process.cwd(),
      SILICA_AUTH_ENABLED: config.auth ? "true" : "false",
      SILICA_ALLOWED_DOMAINS: config.auth?.allowedDomains?.join(",") ?? "",
      SILICA_ALLOWED_EMAILS: config.auth?.allowedEmails?.join(",") ?? "",
    },
  });

  subprocess.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(rewriteFrameworkPaths(chunk.toString(), nextRoot));
  });
  subprocess.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(rewriteFrameworkPaths(chunk.toString(), nextRoot));
  });

  await subprocess;
}

export function installStackTraceRewrite(nextRoot: string): void {
  const previous = Error.prepareStackTrace;
  Error.prepareStackTrace = (error, stack) => {
    const rendered = previous ? previous(error, stack) : `${error.name}: ${error.message}\n${stack.join("\n")}`;
    return rewriteFrameworkPaths(String(rendered), nextRoot);
  };
}

export function rewriteFrameworkPaths(output: string, nextRoot: string): string {
  const normalizedRoot = nextRoot.replace(/\\/g, "/");
  const escapedWindowsRoot = normalizedRoot.replace(/\//g, "\\");
  return output
    .replaceAll(`${normalizedRoot}/app/`, "@silicajs/next [route]/")
    .replaceAll(`${escapedWindowsRoot}\\app\\`, "@silicajs/next [route]\\")
    .replaceAll(`${normalizedRoot}/`, ".silica/next/")
    .replaceAll(`${escapedWindowsRoot}\\`, ".silica\\next\\");
}
