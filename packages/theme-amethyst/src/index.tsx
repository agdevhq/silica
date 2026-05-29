import type { ReactNode } from "react";
import { tagToHref } from "@silicajs/core/runtime";
import type { ThemeLayoutProps, ThemePageProps } from "@silicajs/core/theme";
import {
  Backlinks,
  Breadcrumbs,
  PageProperties,
  SilicaLink,
  TableOfContents,
} from "@silicajs/components";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@silicajs/ui/components/sidebar";

import { Callout } from "./callout.js";
import { CodeBlock } from "./code-block.js";
import { Sidebar } from "./sidebar.js";

function DefaultProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const THEME_INIT_SCRIPT = String.raw`
(function () {
  try {
    var storageKey = "silica-theme";
    var root = document.documentElement;
    var stored = window.localStorage.getItem(storageKey);
    var theme =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    root.classList.remove("dark", "light");
    root.classList.add(theme);
  } catch (_) {}
})();
`;

export function Layout({
  navigation,
  config,
  children,
  Provider = DefaultProvider,
}: ThemeLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <Provider>
          <SidebarProvider>
            <Sidebar navigation={navigation} config={config} />
            <SidebarInset>
              <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:hidden">
                <SidebarTrigger />
                <SilicaLink
                  href="/"
                  className="truncate text-sm font-semibold tracking-tight text-foreground"
                >
                  {config.title}
                </SilicaLink>
              </header>
              {children}
            </SidebarInset>
          </SidebarProvider>
        </Provider>
      </body>
    </html>
  );
}

export function PageRenderer({ page, graph, manifest }: ThemePageProps) {
  const hasBreadcrumb = page.slug !== "index" && page.slug.includes("/");
  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12">
      <article className="min-w-0">
        <header className="mb-10 flex flex-col gap-3">
          {hasBreadcrumb ? (
            <Breadcrumbs
              slug={page.slug}
              allSlugs={manifest.allSlugs}
              className="text-xs"
            />
          ) : null}
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {page.title}
          </h1>
          {page.description ? (
            <p className="text-lg leading-relaxed text-muted-foreground">
              {page.description}
            </p>
          ) : null}
          <PageProperties frontmatter={page.frontmatter} />
          {page.entry.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {page.entry.tags.map((tag) => (
                <SilicaLink
                  key={tag}
                  href={tagToHref(tag)}
                  className="inline-flex h-6 items-center rounded-full border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <span className="text-muted-foreground/70">#</span>
                  <span className="ml-0.5">{tag}</span>
                </SilicaLink>
              ))}
            </div>
          ) : null}
        </header>
        <div className="prose max-w-none">{page.content}</div>
        <div className="mt-16">
          <Backlinks graph={graph} slug={page.slug} manifest={manifest} />
        </div>
      </article>
      <aside className="mt-12 hidden lg:sticky lg:top-12 lg:mt-0 lg:block lg:self-start">
        <TableOfContents toc={page.toc} />
      </aside>
    </div>
  );
}

export const components = {
  "silica-callout": Callout,
  "silica-code-block": CodeBlock,
};

export default { Layout, PageRenderer, components };
