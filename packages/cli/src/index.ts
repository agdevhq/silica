import { Command } from "commander";
import {
  buildCommand,
  createCommand,
  devCommand,
  mcpKeyCommand,
  startCommand,
} from "./commands.js";

export {
  buildCommand,
  createCommand,
  devCommand,
  generateMcpApiKey,
  mcpKeyCommand,
  startCommand,
} from "./commands.js";

export async function main(argv = process.argv): Promise<void> {
  const program = new Command();
  program
    .name("silica")
    .description("Publish an Obsidian-flavored markdown vault with Next.js.")
    .version("0.1.0");

  program
    .command("create")
    .argument("<directory>", "directory to create")
    .description("scaffold a new Silica vault")
    .action(async (directory: string) => {
      await createCommand(directory);
    });

  program
    .command("dev")
    .description("materialize the hidden Next.js app and start development")
    .action(async () => {
      await devCommand();
    });

  program
    .command("build")
    .description("precompute content and build the hidden Next.js app")
    .action(async () => {
      await buildCommand();
    });

  program
    .command("start")
    .description("start the built hidden Next.js app")
    .action(async () => {
      await startCommand();
    });

  program
    .command("mcp-key")
    .description("generate a random API key for the assistant MCP endpoint")
    .action(() => {
      mcpKeyCommand();
    });

  await program.parseAsync(argv);
}
