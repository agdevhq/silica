import path from "node:path";
import crypto from "node:crypto";
import fs from "fs-extra";
import { generatedAppPackageManifest } from "@silicajs/next";
import { afterEach, describe, expect, it } from "vitest";
import { loadProjectEnv } from "./env.js";
import { materializeNextApp } from "./materialize.js";
import { scaffoldProject } from "./scaffold.js";
import { scaffoldDependencyRanges } from "./scaffold-versions.js";

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
    expect(
      await fs.pathExists(path.join(root, ".github/workflows/deploy.yml")),
    ).toBe(true);
    const dockerfile = await fs.readFile(path.join(root, "Dockerfile"), "utf8");
    expect(dockerfile).toContain("find . -path '*/server.js'");
    expect(dockerfile).toContain('"$server_dir/.next/static"');
    expect(dockerfile).toContain('"$server_dir/public"');
    expect(dockerfile).toContain('"$server_dir/data"');
    expect(dockerfile).not.toContain(
      "COPY --from=build /app/.silica/next/.next/static ./.next/static",
    );
    expect(dockerfile).not.toContain(
      "COPY --from=build /app/.silica/next/public ./public",
    );
    expect(dockerfile).not.toContain("/app/content");
    expect(
      await fs.readFile(path.join(root, ".dockerignore"), "utf8"),
    ).toContain(".env.*");
    expect(
      await fs.readFile(
        path.join(root, ".github/workflows/deploy.yml"),
        "utf8",
      ),
    ).toContain("Optional SSH deploy");
    expect(await fs.pathExists(path.join(root, "app"))).toBe(false);
    expect(await fs.pathExists(path.join(root, "next.config.ts"))).toBe(false);
    const scaffoldPackageJson = JSON.parse(
      await fs.readFile(path.join(root, "package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(scaffoldPackageJson.dependencies["@silicajs/cli"]).toBe(
      scaffoldDependencyRanges["@silicajs/cli"],
    );
    expect(scaffoldPackageJson.dependencies["@silicajs/core"]).toBe(
      scaffoldDependencyRanges["@silicajs/core"],
    );
    expect(scaffoldPackageJson.dependencies["@silicajs/next"]).toBe(
      scaffoldDependencyRanges["@silicajs/next"],
    );
    expect(scaffoldPackageJson.dependencies["@silicajs/theme-amethyst"]).toBe(
      scaffoldDependencyRanges["@silicajs/theme-amethyst"],
    );
    expect(scaffoldPackageJson.devDependencies["@types/react"]).toBe(
      "^19.2.10",
    );
    expect(scaffoldPackageJson.devDependencies.tailwindcss).toBe("^4.1.18");
  });

  it("materializes the hidden Next.js app and preserves user public files", async () => {
    const root = await makeTempRoot("silica-materialize");
    await fs.ensureDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await fs.writeFile(
      path.join(root, "silica.config.ts"),
      'export default { title: "Test Vault" };\n',
    );
    await writeProjectPackage(root);
    await fs.ensureDir(path.join(root, "public"));
    await fs.writeFile(path.join(root, "public/favicon.svg"), "<svg />");

    const nextRoot = await materializeNextApp({ projectRoot: root });

    expect(nextRoot).toBe(path.join(root, ".silica/next"));
    expect(
      await fs.readFile(path.join(nextRoot, "app/layout.tsx"), "utf8"),
    ).toContain("silica-theme");
    expect(
      await fs.readFile(path.join(nextRoot, "proxy.ts"), "utf8"),
    ).toContain('"authEnabled": false');
    expect(
      await fs.readFile(path.join(nextRoot, "silica-theme.ts"), "utf8"),
    ).toContain("@silicajs/theme-amethyst");
    expect(
      await fs.readFile(path.join(nextRoot, "next.config.ts"), "utf8"),
    ).toContain('jiti("../../silica.config.ts")');
    expect(
      await fs.pathExists(path.join(nextRoot, "silica.user.config.ts")),
    ).toBe(false);
    const generatedPackageJson = JSON.parse(
      await fs.readFile(path.join(nextRoot, "package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(generatedPackageJson.dependencies.next).toBe(
      generatedAppPackageManifest.dependencies.next,
    );
    expect(generatedPackageJson.dependencies.react).toBe(
      generatedAppPackageManifest.dependencies.react,
    );
    const nextTarball = workspaceTarballFilename("@silicajs/next", "next");
    expect(generatedPackageJson.dependencies["@silicajs/next"]).toBe(
      `file:.silica-packages/${nextTarball}`,
    );
    expect(
      await fs.pathExists(path.join(nextRoot, ".silica-packages", nextTarball)),
    ).toBe(true);
    const uiTarball = workspaceTarballFilename("@silicajs/ui", "ui");
    expect(generatedPackageJson.dependencies["@silicajs/ui"]).toBe(
      `file:.silica-packages/${uiTarball}`,
    );
    expect(generatedPackageJson.dependencies["@tailwindcss/postcss"]).toBe(
      generatedAppPackageManifest.dependencies["@tailwindcss/postcss"],
    );
    expect(generatedPackageJson.dependencies.tailwindcss).toBe(
      generatedAppPackageManifest.dependencies.tailwindcss,
    );
    expect(generatedPackageJson.devDependencies["@types/node"]).toBe(
      generatedAppPackageManifest.devDependencies["@types/node"],
    );
    expect(generatedPackageJson.devDependencies["@types/better-sqlite3"]).toBe(
      generatedAppPackageManifest.devDependencies["@types/better-sqlite3"],
    );
    expect(generatedPackageJson.devDependencies.typescript).toBe(
      generatedAppPackageManifest.devDependencies.typescript,
    );
    expect(await fs.pathExists(path.join(nextRoot, "public/favicon.svg"))).toBe(
      true,
    );
    expect(
      (
        await fs.lstat(path.join(nextRoot, "public/favicon.svg"))
      ).isSymbolicLink(),
    ).toBe(false);
  });

  it("loads project env without materializing env files", async () => {
    const root = await makeTempRoot("silica-project-env");
    await fs.ensureDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await writeProjectPackage(root);
    await fs.writeFile(path.join(root, ".env"), "SILICA_TEST_ENV=local\n");
    await fs.writeFile(path.join(root, ".env.example"), "SECRET=\n");

    const previousValue = process.env.SILICA_TEST_ENV;
    try {
      delete process.env.SILICA_TEST_ENV;

      loadProjectEnv(root, "production");
      expect(process.env.SILICA_TEST_ENV).toBe("local");

      const nextRoot = await materializeNextApp({ projectRoot: root });
      await fs.writeFile(path.join(nextRoot, ".env"), "STALE=true\n");

      await materializeNextApp({ projectRoot: root });
      expect(await fs.pathExists(path.join(nextRoot, ".env"))).toBe(false);
      expect(await fs.pathExists(path.join(nextRoot, ".env.example"))).toBe(
        false,
      );
    } finally {
      if (previousValue === undefined) {
        delete process.env.SILICA_TEST_ENV;
      } else {
        process.env.SILICA_TEST_ENV = previousValue;
      }
    }
  });

  it("materializes a static assistant route for a resolved provider package", async () => {
    const root = await makeTempRoot("silica-materialize-assistant");
    await fs.ensureDir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content/index.md"), "# Home");
    await writeProjectPackage(root, {
      "@acme/provider": "^1.0.0",
      "@silicajs/assistant": "^0.1.0",
    });
    await fs.outputJson(
      path.join(root, "node_modules/@silicajs/assistant/package.json"),
      {},
    );
    await fs.outputJson(
      path.join(root, "node_modules/@acme/provider/package.json"),
      {},
    );
    await fs.writeFile(
      path.join(root, "silica.config.ts"),
      `export default {
  assistant: {
    provider: {
      package: "@acme/provider",
      factory: "createAcme"
    },
    model: "acme-chat"
  }
};
`,
    );

    const nextRoot = await materializeNextApp({ projectRoot: root });

    const route = await fs.readFile(
      path.join(nextRoot, "app/api/assistant/route.ts"),
      "utf8",
    );
    expect(route).toContain(
      'import * as assistantProvider from "@acme/provider"',
    );
    expect(route).toContain("providerModule: assistantProvider");
    const generatedPackageJson = JSON.parse(
      await fs.readFile(path.join(nextRoot, "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    expect(generatedPackageJson.dependencies["@acme/provider"]).toBe("^1.0.0");
  });
});

async function makeTempRoot(prefix: string): Promise<string> {
  const root = path.join(
    process.cwd(),
    `.tmp-${prefix}-${crypto.randomUUID()}`,
  );
  tempRoots.push(root);
  await fs.emptyDir(root);
  return root;
}

async function writeProjectPackage(
  root: string,
  dependencies: Record<string, string> = {},
): Promise<void> {
  await fs.writeJson(path.join(root, "package.json"), {
    type: "module",
    dependencies: {
      "@silicajs/core": "^0.8.0",
      "@silicajs/next": "^0.5.0",
      "@silicajs/theme-amethyst": "^0.5.0",
      next: "^16.2.7",
      react: "^19.2.6",
      "react-dom": "^19.2.7",
      ...dependencies,
    },
  });
}

function workspaceTarballFilename(
  packageName: string,
  workspace: string,
): string {
  const packageJson = fs.readJsonSync(
    path.join(process.cwd(), `../${workspace}/package.json`),
  ) as { version: string };
  return `${packageName.replace(/^@/, "").replace("/", "-")}-${packageJson.version}.tgz`;
}
