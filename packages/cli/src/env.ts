import nextEnv from "@next/env";

export type ProjectEnvMode = "development" | "production";

export function loadProjectEnv(
  projectRoot: string,
  mode: ProjectEnvMode,
): void {
  nextEnv.loadEnvConfig(projectRoot, mode === "development", console, true);
}
