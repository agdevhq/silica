import { runCreateSilica } from "./index.js";

runCreateSilica().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
