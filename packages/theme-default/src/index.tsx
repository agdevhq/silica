import { Suspense } from "react";
import type { ThemeLayoutProps, ThemePageProps } from "@silicajs/next/theme";
import {
  Backlinks,
  Breadcrumbs,
  DarkModeToggle,
  Explorer,
  SearchTrigger,
  TableOfContents,
  UserMenu,
} from "@silicajs/next/primitives";

export function Layout({ manifest, config, children }: ThemeLayoutProps) {
  return (
    <html lang="en">
      <body className="silica-shell">
        <aside className="silica-sidebar">
          <div className="silica-brand">
            <a href="/">{config.title}</a>
          </div>
          <SearchTrigger />
          <Explorer manifest={manifest} />
        </aside>
        <div className="silica-main-frame">
          <header className="silica-header">
            <div className="silica-header-title">{config.description}</div>
            <div className="silica-header-actions">
              <DarkModeToggle />
              {config.auth ? (
                <Suspense fallback={null}>
                  <UserMenu />
                </Suspense>
              ) : null}
            </div>
          </header>
          <main className="silica-main">{children}</main>
        </div>
      </body>
    </html>
  );
}

export function PageRenderer({ page, graph, manifest }: ThemePageProps) {
  return (
    <div className="silica-page-grid">
      <article className="silica-article">
        <Breadcrumbs slug={page.slug} />
        <header className="silica-page-header">
          <h1>{page.title}</h1>
          {page.description ? <p>{page.description}</p> : null}
          {page.entry.tags.length ? (
            <div className="silica-tags">
              {page.entry.tags.map((tag) => (
                <a key={tag} href={`/tags/${tag}`}>
                  #{tag}
                </a>
              ))}
            </div>
          ) : null}
        </header>
        <div className="silica-content">{page.content}</div>
        <Backlinks graph={graph} slug={page.slug} manifest={manifest} />
      </article>
      <aside className="silica-right-rail">
        <TableOfContents toc={page.toc} />
      </aside>
    </div>
  );
}

export default { Layout, PageRenderer };
