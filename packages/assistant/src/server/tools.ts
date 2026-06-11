import { Bash, OverlayFs } from "just-bash";
import type { AssistantSiteContext } from "../types.js";

export const CONTENT_MOUNT = "/";

const MAX_TOOL_OUTPUT_CHARS = 16_000;
const COMMAND_TIMEOUT_MS = 10_000;

export type ContentSandbox = {
  run(command: string, signal?: AbortSignal): Promise<string>;
};

/**
 * In-process simulated shell over the generated runtime markdown directory.
 * The content root is mounted read-only at `/`; the sandbox has no
 * access to the rest of the host filesystem, network, or environment.
 */
export function createContentSandbox(
  site: AssistantSiteContext,
): ContentSandbox {
  const bash = new Bash({
    fs: new OverlayFs({
      root: site.contentRoot,
      mountPoint: CONTENT_MOUNT,
      readOnly: true,
    }),
    cwd: CONTENT_MOUNT,
    // defenseInDepth patches process-wide globals (performance, process.env,
    // Promise.then, …) during exec() and throws when anything else touches
    // them. Inside a Next.js server the framework's own async hooks run in
    // that window, so the patches misfire and crash the process. Isolation
    // here comes from the virtual filesystem itself: no network, no env,
    // no js/python runtimes, and only generated runtime content is mounted.
    defenseInDepth: false,
  });

  return {
    async run(command, signal) {
      const timeout = AbortSignal.timeout(COMMAND_TIMEOUT_MS);
      const result = await bash.exec(command, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });

      const parts: string[] = [];
      if (result.stdout) parts.push(result.stdout);
      if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
      if (result.exitCode !== 0) parts.push(`exit code: ${result.exitCode}`);
      return truncate(parts.join("\n").trim() || "(no output)");
    },
  };
}

function truncate(output: string): string {
  if (output.length <= MAX_TOOL_OUTPUT_CHARS) return output;
  return `${output.slice(0, MAX_TOOL_OUTPUT_CHARS)}\n[output truncated]`;
}
