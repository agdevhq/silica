import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AssistantSiteContext } from "../types.js";
import { createContentSandbox } from "./tools.js";

let contentRoot: string;
let site: AssistantSiteContext;

beforeAll(async () => {
  contentRoot = await mkdtemp(path.join(tmpdir(), "silica-assistant-"));
  await writeFile(
    path.join(contentRoot, "install.md"),
    "# Install\n\nRun `npm install silica`.\n",
  );
  await writeFile(
    path.join(contentRoot, "secret-draft.md"),
    "This draft is not published.\n",
  );
  site = {
    siteTitle: "Docs",
    pages: [
      {
        slug: "install",
        title: "Install",
        sourcePath: "guides/install.md",
        file: path.join(contentRoot, "install.md"),
      },
    ],
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

  it("does not expose unpublished files or the host filesystem", async () => {
    const sandbox = createContentSandbox(site);
    expect(await sandbox.run("ls /content")).not.toContain("secret-draft.md");
    const escape = await sandbox.run(`cat ${contentRoot}/secret-draft.md`);
    expect(escape).toContain("No such file or directory");
    expect(escape).toContain("exit code: 1");
  });

  it("keeps writes virtual and reports failures as output", async () => {
    const sandbox = createContentSandbox(site);
    expect(
      await sandbox.run("echo hi > /tmp-note.txt && cat /tmp-note.txt"),
    ).toBe("hi");
    expect(await sandbox.run("definitely-not-a-command")).toContain(
      "command not found",
    );
  });
});
