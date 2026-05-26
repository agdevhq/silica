import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "fs-extra";
import { findStandaloneServer, rewriteFrameworkPaths } from "./next.js";

describe("rewriteFrameworkPaths", () => {
  it("rewrites generated route stack frames to framework labels", () => {
    const output = [
      "Error: boom",
      "    at Page (/tmp/site/.silica/next/app/[[...slug]]/page.tsx:12:3)",
      "    at helper (/tmp/site/.silica/next/server-data.ts:4:1)",
    ].join("\n");

    expect(rewriteFrameworkPaths(output, "/tmp/site/.silica/next")).toContain(
      "@silicajs/next [route]/[[...slug]]/page.tsx",
    );
    expect(rewriteFrameworkPaths(output, "/tmp/site/.silica/next")).toContain(".silica/next/server-data.ts");
  });
});

describe("findStandaloneServer", () => {
  it("finds Next standalone server output", async () => {
    const root = path.join(process.cwd(), `.tmp-standalone-${crypto.randomUUID()}`);
    const serverPath = path.join(root, ".next/standalone/site/.silica/next/server.js");
    await fs.ensureDir(path.dirname(serverPath));
    await fs.writeFile(serverPath, "");

    await expect(findStandaloneServer(root)).resolves.toBe(serverPath);

    await fs.remove(root);
  });
});
