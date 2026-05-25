export type TemplateFile = {
  path: string;
  content: string;
};

export function getSilicaTemplates(): TemplateFile[] {
  return [
    {
      path: "app/layout.tsx",
      content: `import "@silicajs/theme-default/styles.css";\nexport { default, generateMetadata } from "@silicajs/next/routes/layout";\n`,
    },
    {
      path: "app/[[...slug]]/page.tsx",
      content: `export { default, generateMetadata, generateStaticParams } from "@silicajs/next/routes/page";\n`,
    },
    {
      path: "app/tags/[tag]/page.tsx",
      content: `export { default, generateMetadata, generateStaticParams } from "@silicajs/next/routes/tags-page";\n`,
    },
    {
      path: "app/sign-in/page.tsx",
      content: `export { default } from "@silicajs/next/routes/sign-in";\n`,
    },
    {
      path: "app/not-allowed/page.tsx",
      content: `export { default } from "@silicajs/next/routes/not-allowed";\n`,
    },
    {
      path: "app/not-found.tsx",
      content: `export { default } from "@silicajs/next/routes/not-found";\n`,
    },
    {
      path: "app/api/auth/[...all]/route.ts",
      content: `export { GET, POST, runtime, dynamic } from "@silicajs/next/routes/api-auth";\n`,
    },
    {
      path: "app/api/search/route.ts",
      content: `export { GET, runtime, dynamic } from "@silicajs/next/routes/api-search";\n`,
    },
    {
      path: "app/__silica/revalidate/route.ts",
      content: `export { POST, dynamic } from "@silicajs/next/routes/api-revalidate";\n`,
    },
    {
      path: "proxy.ts",
      content: `export { silicaProxy as proxy, config } from "@silicajs/next/proxy";\n`,
    },
  ];
}

export function nextConfigTemplate(): string {
  return `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {\n  cacheComponents: true,\n  output: "standalone",\n  transpilePackages: [\n    "@silicajs/core",\n    "@silicajs/next",\n    "@silicajs/auth",\n    "@silicajs/search",\n    "@silicajs/theme-default"\n  ],\n  serverExternalPackages: ["flexsearch"],\n  experimental: {\n    externalDir: true,\n    serverSourceMaps: true,\n    outputFileTracingIncludes: {\n      "/*": ["../../content/**/*", "../manifest.json", "../graph.json", "../search-index.json", "../build-id.txt"]\n    }\n  },\n};\n\nexport default nextConfig;\n`;
}

export function tsconfigTemplate(hasUserTsconfig: boolean): string {
  return JSON.stringify(
    {
      extends: hasUserTsconfig ? "../../tsconfig.json" : undefined,
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "es2022"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    (_, value) => (value === undefined ? undefined : value),
    2,
  );
}

export function packageJsonTemplate(): string {
  return `${JSON.stringify(
    {
      private: true,
      name: ".silica-next",
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
    },
    null,
    2,
  )}\n`;
}
