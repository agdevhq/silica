import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import {
  findStandaloneServer,
  prepareStandaloneAssets,
  rewriteFrameworkPaths,
} from "./next.js";

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
    expect(rewriteFrameworkPaths(output, "/tmp/site/.silica/next")).toContain(
      ".silica/next/server-data.ts",
    );
  });
});

describe("findStandaloneServer", () => {
  it("finds Next standalone server output", async () => {
    const root = path.join(
      process.cwd(),
      `.tmp-standalone-${crypto.randomUUID()}`,
    );
    const serverPath = path.join(
      root,
      ".next/standalone/site/.silica/next/server.js",
    );
    await fs.ensureDir(path.dirname(serverPath));
    await fs.writeFile(serverPath, "");

    await expect(findStandaloneServer(root)).resolves.toBe(serverPath);

    await fs.remove(root);
  });
});

describe("prepareStandaloneAssets", () => {
  it("stages static, public, and data assets beside the standalone server", async () => {
    const root = path.join(
      process.cwd(),
      `.tmp-standalone-assets-${crypto.randomUUID()}`,
    );
    const nextRoot = path.join(root, ".silica/next");
    const standaloneRoot = path.join(
      nextRoot,
      ".next/standalone/site/.silica/next",
    );
    const serverPath = path.join(standaloneRoot, "server.js");

    await fs.ensureDir(path.dirname(serverPath));
    await fs.writeFile(serverPath, "");
    await fs.outputFile(
      path.join(nextRoot, ".next/static/chunks/app.js"),
      "console.log('ok');",
    );
    await fs.outputFile(path.join(nextRoot, "public/favicon.svg"), "<svg />");
    await fs.outputFile(path.join(nextRoot, "data/vault.db"), "");

    await prepareStandaloneAssets(nextRoot, serverPath);

    await expect(
      fs.pathExists(path.join(standaloneRoot, ".next/static/chunks/app.js")),
    ).resolves.toBe(true);
    await expect(
      fs.pathExists(path.join(standaloneRoot, "public/favicon.svg")),
    ).resolves.toBe(true);
    await expect(
      fs.pathExists(path.join(standaloneRoot, "data/vault.db")),
    ).resolves.toBe(true);

    await fs.remove(root);
  });
});
