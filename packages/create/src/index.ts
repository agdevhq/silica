import { createCommand } from "@silicajs/cli";

const [, , directory] = process.argv;

if (!directory) {
  console.error("Usage: create-silica <directory>");
  process.exitCode = 1;
} else {
  createCommand(directory).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
