import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { materializeNextApp } from "./materialize.js";
import { scaffoldProject } from "./scaffold.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.remove(root)));
});

describe("silica CLI helpers", () => {
  it("scaffolds only user-facing vault files", async () => {
    const root = await makeTempRoot("silica-scaffold");
    await scaffoldProject(root);

    expect(await fs.pathExists(path.join(root, "content/index.md"))).toBe(true);
    expect(await fs.pathExists(path.join(root, "silica.config.ts"))).toBe(true);
    expect(await fs.pathExists(path.join(root, ".github/workflows/deploy.yml"))).toBe(true);
    expect(await fs.readFile(path.join(root, "Dockerfile"), "utf8")).toContain("find . -path '*/server.js'");
    expect(await fs.readFile(path.join(root, ".github/workflows/deploy.yml"), "utf8")).toContain("Optional SSH deploy");
    expect(await fs.pathExists(path.join(root, "app"))).toBe(false);
    expect(await fs.pathExists(path.join(root, "next.config.ts"))).toBe(false);
  });

  it("materializes the hidden Next.js app and preserves user public files", async () => {
    const root = await makeTempRoot("silica-materialize");
    await fs.ensureDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await fs.writeFile(path.join(root, "silica.config.ts"), 'export default { title: "Test Vault" };\n');
    await fs.ensureDir(path.join(root, "public"));
    await fs.writeFile(path.join(root, "public/favicon.svg"), "<svg />");

    const nextRoot = await materializeNextApp({ projectRoot: root });

    expect(nextRoot).toBe(path.join(root, ".silica/next"));
    expect(await fs.readFile(path.join(nextRoot, "app/layout.tsx"), "utf8")).toContain("silica-theme");
    expect(await fs.readFile(path.join(nextRoot, "silica-theme.ts"), "utf8")).toContain("@silicajs/theme-default");
    expect(await fs.pathExists(path.join(nextRoot, "public/favicon.svg"))).toBe(true);
  });
});

async function makeTempRoot(prefix: string): Promise<string> {
  const root = path.join(process.cwd(), `.tmp-${prefix}-${crypto.randomUUID()}`);
  tempRoots.push(root);
  await fs.emptyDir(root);
  return root;
}
