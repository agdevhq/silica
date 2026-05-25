import { execa } from "execa";
import { loadConfig } from "@silicajs/core";

export type NextCommand = "dev" | "build" | "start";

export async function runNext(command: NextCommand, nextRoot: string): Promise<void> {
  installStackTraceRewrite(nextRoot);
  const config = await loadConfig(process.cwd());
  await execa("next", [command, nextRoot], {
    stdio: "inherit",
    env: {
      ...process.env,
      SILICA_PROJECT_ROOT: process.cwd(),
      SILICA_AUTH_ENABLED: config.auth ? "true" : "false",
    },
  });
}

export function installStackTraceRewrite(nextRoot: string): void {
  const previous = Error.prepareStackTrace;
  Error.prepareStackTrace = (error, stack) => {
    const rendered = previous ? previous(error, stack) : `${error.name}: ${error.message}\n${stack.join("\n")}`;
    return String(rendered).replaceAll(`${nextRoot}/app/`, "@silicajs/next [route]/");
  };
}
