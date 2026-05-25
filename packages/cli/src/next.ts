import { execa } from "execa";

export type NextCommand = "dev" | "build" | "start";

export async function runNext(command: NextCommand, nextRoot: string): Promise<void> {
  installStackTraceRewrite(nextRoot);
  await execa("next", [command, nextRoot], {
    stdio: "inherit",
    env: {
      ...process.env,
      SILICA_PROJECT_ROOT: process.cwd(),
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
