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
