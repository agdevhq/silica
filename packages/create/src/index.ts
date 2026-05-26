import { fileURLToPath } from "node:url";
import { createCommand } from "@silicajs/cli";

export async function runCreateSilica(argv = process.argv): Promise<void> {
  const [, , directory] = argv;

  if (!directory) {
    console.error("Usage: create-silica <directory>");
    process.exitCode = 1;
    return;
  }

  await createCommand(directory);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCreateSilica().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
