import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AssistantSiteContext } from "../types.js";
import { createContentSandbox } from "./tools.js";

let contentRoot: string;
let site: AssistantSiteContext;

beforeAll(async () => {
  contentRoot = await mkdtemp(path.join(tmpdir(), "silica-assistant-"));
  await mkdir(path.join(contentRoot, "guides"));
  await writeFile(
    path.join(contentRoot, "guides/install.md"),
    "# Install\n\nRun `npm install silica`.\n",
  );
  await writeFile(
    path.join(path.dirname(contentRoot), "secret-draft.md"),
    "This draft is not published.\n",
  );
  site = {
    siteTitle: "Docs",
    contentRoot,
    resolveCitation: () => undefined,
  };
});

afterAll(async () => {
  await rm(contentRoot, { recursive: true, force: true });
});

describe("createContentSandbox", () => {
  it("exposes published pages under /content", async () => {
    const sandbox = createContentSandbox(site);
    expect(await sandbox.run("ls guides")).toBe("install.md");
    expect(await sandbox.run("grep -ril 'npm install' .")).toContain(
      "guides/install.md",
    );
    expect(await sandbox.run("cat guides/install.md")).toContain("# Install");
  });

  it("does not expose files outside the generated content root", async () => {
    const sandbox = createContentSandbox(site);
    const unpublishedFile = path.join(
      path.dirname(contentRoot),
      "secret-draft.md",
    );
    const escape = await sandbox.run(`cat ${unpublishedFile}`);
    expect(escape).toContain("No such file or directory");
    expect(escape).toContain("exit code: 1");
  });

  it("rejects writes and reports command failures as output", async () => {
    const sandbox = createContentSandbox(site);
    await expect(sandbox.run("echo hi > guides/install.md")).rejects.toThrow(
      "read-only file system",
    );
    expect(await sandbox.run("definitely-not-a-command")).toContain(
      "command not found",
    );
  });
});
