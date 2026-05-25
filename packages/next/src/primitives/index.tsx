"use client";

import { useEffect, useMemo, useState } from "react";
import type { Graph, Manifest, TocItem } from "@silicajs/core";
import { slugToHref } from "@silicajs/core";

export type ExplorerProps = {
  manifest: Manifest;
};

export function Explorer({ manifest }: ExplorerProps) {
  const entries = [...manifest.entries].sort((a, b) => a.slug.localeCompare(b.slug));
  return (
    <nav className="silica-explorer" aria-label="Vault pages">
      <a className="silica-explorer-home" href="/">
        Home
      </a>
      <ul>
        {entries
          .filter((entry) => entry.slug !== "index")
          .map((entry) => (
            <li key={entry.slug}>
              <a href={slugToHref(entry.slug)}>{entry.title}</a>
            </li>
          ))}
      </ul>
    </nav>
  );
}

export type BreadcrumbsProps = {
  slug: string;
};

export function Breadcrumbs({ slug }: BreadcrumbsProps) {
  const crumbs = slug === "index" ? [] : slug.split("/");
  let current = "";
  return (
    <nav className="silica-breadcrumbs" aria-label="Breadcrumbs">
      <a href="/">Home</a>
      {crumbs.map((crumb) => {
        current = current ? `${current}/${crumb}` : crumb;
        return (
          <span key={current}>
            <span aria-hidden="true">/</span>
            <a href={`/${current}`}>{pretty(crumb)}</a>
          </span>
        );
      })}
    </nav>
  );
}

export type TableOfContentsProps = {
  toc: TocItem[];
};

export function TableOfContents({ toc }: TableOfContentsProps) {
  if (toc.length === 0) return null;
  return (
    <nav className="silica-toc" aria-label="Table of contents">
      <p>On this page</p>
      <ul>
        {toc.map((item) => (
          <li key={item.id} style={{ paddingInlineStart: `${Math.max(0, item.depth - 2) * 0.75}rem` }}>
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export type BacklinksProps = {
  graph: Graph;
  slug: string;
  manifest: Manifest;
};

export function Backlinks({ graph, slug, manifest }: BacklinksProps) {
  const backlinks = graph.backlinks[slug] ?? [];
  if (backlinks.length === 0) return null;
  return (
    <section className="silica-backlinks">
      <h2>Backlinks</h2>
      <ul>
        {backlinks.map((source) => {
          const entry = manifest.bySlug[source];
          return (
            <li key={source}>
              <a href={slugToHref(source)}>{entry?.title ?? source}</a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button className="silica-search-trigger" type="button" onClick={() => setOpen(true)}>
        Search <kbd>⌘K</kbd>
      </button>
      {open ? <SearchPalette onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export type SearchPaletteProps = {
  onClose?: () => void;
};

export function SearchPalette({ onClose }: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ slug: string; title: string; excerpt: string }>>([]);

  useEffect(() => {
    const controller = new AbortController();
    if (!query.trim()) {
      setResults([]);
      return () => controller.abort();
    }
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { results: [] }))
      .then((payload) => setResults(payload.results ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [query]);

  return (
    <div className="silica-search-overlay" role="dialog" aria-modal="true">
      <div className="silica-search-palette">
        <div className="silica-search-row">
          <input autoFocus placeholder="Search your vault…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="button" onClick={onClose} aria-label="Close search">
            ×
          </button>
        </div>
        <ul>
          {results.map((result) => (
            <li key={result.slug}>
              <a href={slugToHref(result.slug)} onClick={onClose}>
                <strong>{result.title}</strong>
                <span>{result.excerpt}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DarkModeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const stored = window.localStorage.getItem("silica-theme");
    const initial = stored === "dark" || stored === "light" ? stored : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  return (
    <button
      className="silica-dark-toggle"
      type="button"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        window.localStorage.setItem("silica-theme", next);
        document.documentElement.dataset.theme = next;
      }}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}

export function UserMenu() {
  return <div className="silica-user-menu">Signed in</div>;
}

export function NotFound() {
  return (
    <main className="silica-status-page">
      <h1>Page not found</h1>
      <p>The requested note does not exist or is not published.</p>
      <a href="/">Return home</a>
    </main>
  );
}

export function NotAllowed() {
  return (
    <main className="silica-status-page">
      <h1>Not allowed</h1>
      <p>Your email is not on this site's allowlist.</p>
      <a href="/sign-in">Try a different account</a>
    </main>
  );
}

export type TagsListProps = {
  manifest: Manifest;
  tag: string;
};

export function TagsList({ manifest, tag }: TagsListProps) {
  const entries = useMemo(
    () => manifest.entries.filter((entry) => entry.tags.includes(tag)).sort((a, b) => a.title.localeCompare(b.title)),
    [manifest, tag],
  );
  return (
    <section className="silica-tag-list">
      <h1>#{tag}</h1>
      <ul>
        {entries.map((entry) => (
          <li key={entry.slug}>
            <a href={slugToHref(entry.slug)}>{entry.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function pretty(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
