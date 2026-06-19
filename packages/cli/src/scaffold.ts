import path from "node:path";
import fs from "fs-extra";
import { scaffoldDependencyRanges } from "./scaffold-versions.js";

export async function scaffoldProject(targetDir: string): Promise<void> {
  const root = path.resolve(targetDir);
  if ((await fs.pathExists(root)) && (await fs.readdir(root)).length > 0) {
    throw new Error(`Target directory is not empty: ${root}`);
  }

  await fs.ensureDir(path.join(root, "content/notes"));
  await fs.ensureDir(path.join(root, ".github/workflows"));
  await fs.writeFile(path.join(root, "content/index.md"), indexMarkdown());
  await fs.writeFile(
    path.join(root, "content/notes/getting-started.md"),
    gettingStartedMarkdown(),
  );
  await fs.writeFile(path.join(root, "silica.config.ts"), silicaConfig());
  await fs.writeFile(path.join(root, "tsconfig.json"), tsconfig());
  await fs.writeFile(
    path.join(root, "package.json"),
    packageJson(path.basename(root)),
  );
  await fs.writeFile(path.join(root, ".env.example"), envExample());
  await fs.writeFile(path.join(root, ".gitignore"), gitignore());
  await fs.writeFile(path.join(root, ".dockerignore"), dockerignore());
  await fs.writeFile(path.join(root, "README.md"), readme(path.basename(root)));
  await fs.writeFile(path.join(root, "Dockerfile"), dockerfile());
  await fs.writeFile(
    path.join(root, ".github/workflows/deploy.yml"),
    workflow(),
  );
}

function indexMarkdown(): string {
  return `---\ntitle: Welcome\ntags: [home]\n---\n\n# Welcome\n\nThis is your new Silica vault. Open [[notes/getting-started|Getting started]] to learn the basics.\n\n> [!note] Edit freely\n> Write standard Markdown plus Obsidian-style wikilinks.\n`;
}

function gettingStartedMarkdown(): string {
  return `---\ntitle: Getting started\ntags: [guide]\n---\n\n# Getting started\n\nRun \`npm run dev\` and edit files in \`content/\`. Silica regenerates the hidden Next.js app under \`.silica/\`.\n`;
}

function silicaConfig(): string {
  return `import { defineConfig } from "@silicajs/core";\n\nexport default defineConfig({\n  title: "My Silica Site",\n  description: "A private knowledge site",\n  theme: "default",\n  // Self-hosted via the included Dockerfile. Remove this to deploy to a managed\n  // platform such as Vercel and let its adapter manage caching.\n  render: { output: "standalone" },\n  // auth: {\n  //   provider: "google",\n  //   allowedDomains: ["example.com"],\n  // },\n});\n`;
}

function tsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        skipLibCheck: true,
      },
    },
    null,
    2,
  )}\n`;
}

function packageJson(name: string): string {
  return `${JSON.stringify(
    {
      name,
      private: true,
      type: "module",
      scripts: {
        dev: "silica dev",
        build: "silica build",
        start: "silica start",
      },
      dependencies: {
        ...scaffoldDependencyRanges,
        next: "^16.2.6",
        react: "^19.2.6",
        "react-dom": "^19.2.6",
      },
      devDependencies: {
        "@tailwindcss/postcss": "^4.1.18",
        "@types/node": "^25.9.1",
        "@types/react": "^19.2.10",
        "@types/react-dom": "^19.2.3",
        tailwindcss: "^4.1.18",
        typescript: "^6.0.3",
      },
    },
    null,
    2,
  )}\n`;
}

function envExample(): string {
  return `BETTER_AUTH_SECRET=\nBETTER_AUTH_URL=http://localhost:3000\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\nSILICA_ASSISTANT_SECRET=\n`;
}

function gitignore(): string {
  return `.silica/\nnode_modules/\n.env\n.env.*\n!.env.example\n`;
}

function dockerignore(): string {
  return `.git\n.silica\nnode_modules\n.env\n.env.*\n!.env.example\n`;
}

function readme(name: string): string {
  return `# ${name}\n\nA Silica vault.\n\n## Commands\n\n- \`npm run dev\` — materialize and run the hidden Next.js app.\n- \`npm run build\` — precompute content and build for production.\n- \`npm run start\` — serve the production build.\n\n## Rendering\n\nSilica prerenders all notes by default and caches every rendered note. Large vaults can reduce build work in \`silica.config.ts\`:\n\n\`\`\`ts\nexport default defineConfig({\n  render: {\n    prerender: { depth: 2 },\n  },\n});\n\`\`\`\n\nUse \`prerender: \"none\"\` for fully on-demand rendering, or \`strategy: \"custom\"\` with \`include\`, \`exclude\`, and \`limit\` for hot-page selection.\n\n## Auth\n\nCopy \`.env.example\` to \`.env\` and fill in Better Auth / Google OAuth values before enabling \`auth\` in \`silica.config.ts\`. Auth requires at least one \`allowedDomains\` or \`allowedEmails\` entry and a strong \`BETTER_AUTH_SECRET\` in production.\n\n## Docker\n\nThe scaffolded Dockerfile builds the generated standalone Next.js output and starts the traced \`server.js\` from wherever Next places it inside the standalone tree. Mount \`/app/data/cache/next\` as a volume to preserve rendered-note cache entries across container replacement.\n`;
}

function dockerfile(): string {
  return `FROM node:22-alpine AS deps\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\n\nFROM deps AS build\nCOPY . .\nRUN npm run build\n\nFROM node:22-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nENV SILICA_CACHE_DIR=/app/data/cache/next\nCOPY --from=build /app/.silica/next/.next/standalone ./\nCOPY --from=build /app/.silica/next/.next/static ./.silica-standalone-assets/.next/static\nCOPY --from=build /app/.silica/next/public ./.silica-standalone-assets/public\nCOPY --from=build /app/.silica/next/data ./.silica-standalone-assets/data\nRUN set -eux; \\\n  server_file="$(find . -path '*/server.js' -print -quit)"; \\\n  test -n "$server_file"; \\\n  server_dir="$(dirname "$server_file")"; \\\n  rm -rf "$server_dir/.next/static" "$server_dir/public" "$server_dir/data"; \\\n  mkdir -p "$server_dir/.next"; \\\n  cp -R .silica-standalone-assets/.next/static "$server_dir/.next/static"; \\\n  cp -R .silica-standalone-assets/public "$server_dir/public"; \\\n  cp -R .silica-standalone-assets/data "$server_dir/data"; \\\n  rm -rf .silica-standalone-assets\nEXPOSE 3000\nCMD ["sh", "-c", "node $(find . -path '*/server.js' -print -quit)"]\n`;
}

function workflow(): string {
  return `name: Build Silica image\n\non:\n  push:\n    branches: [main]\n\njobs:\n  image:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n      packages: write\n    steps:\n      - uses: actions/checkout@v5\n      - uses: docker/login-action@v4\n        with:\n          registry: ghcr.io\n          username: \${{ github.actor }}\n          password: \${{ secrets.GITHUB_TOKEN }}\n      - uses: docker/build-push-action@v7\n        with:\n          context: .\n          push: true\n          tags: ghcr.io/\${{ github.repository }}:latest\n      # Optional SSH deploy:\n      # - name: Deploy on remote host\n      #   if: \${{ secrets.SSH_HOST != '' }}\n      #   uses: appleboy/ssh-action@v1.2.0\n      #   with:\n      #     host: \${{ secrets.SSH_HOST }}\n      #     username: \${{ secrets.SSH_USER }}\n      #     key: \${{ secrets.SSH_KEY }}\n      #     script: |\n      #       docker pull ghcr.io/\${{ github.repository }}:latest\n      #       docker stop silica || true\n      #       docker rm silica || true\n      #       docker run -d --name silica -p 3000:3000 ghcr.io/\${{ github.repository }}:latest\n`;
}
