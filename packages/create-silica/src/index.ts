import { runCreateSilica } from "@silicajs/create";

runCreateSilica(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
