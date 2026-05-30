export type BrokenLinkDiagnostic = {
  source: string;
  target: string;
};

export function formatBrokenWikilinks(links: BrokenLinkDiagnostic[]): string {
  if (links.length === 0) return "";
  return [
    "[silica] broken wikilinks:",
    ...links
      .slice()
      .sort((a, b) =>
        `${a.source}\0${a.target}`.localeCompare(`${b.source}\0${b.target}`),
      )
      .map((link) => `  ${link.source} -> ${link.target}`),
  ].join("\n");
}

export function reportBrokenWikilinks(links: BrokenLinkDiagnostic[]): void {
  const message = formatBrokenWikilinks(links);
  if (message) console.warn(message);
}
