import type { Graph, Manifest, TocItem } from "@silicajs/core/runtime";

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
  return (
    <a className="silica-search-trigger" href="/api/search?q=">
      Search <kbd>⌘K</kbd>
    </a>
  );
}

export type SearchPaletteProps = {
  onClose?: () => void;
};

export function SearchPalette({ onClose: _onClose }: SearchPaletteProps) {
  return (
    <div className="silica-search-overlay" role="dialog" aria-modal="true">
      <div className="silica-search-palette">
        <form className="silica-search-row" action="/api/search">
          <input name="q" placeholder="Search your vault…" />
          <button type="submit">Search</button>
        </form>
      </div>
    </div>
  );
}

export function DarkModeToggle() {
  return (
    <button className="silica-dark-toggle" type="button" aria-label="Dark mode toggle">
      Theme
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
  const entries = manifest.entries.filter((entry) => entry.tags.includes(tag)).sort((a, b) => a.title.localeCompare(b.title));
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

function slugToHref(slug: string): string {
  if (slug === "index") return "/";
  return `/${slug.replace(/\/index$/, "")}`;
}
