import { slugToHref } from "@silicajs/core/runtime";
import type { AssistantCitation, AssistantSiteContext } from "../types.js";

export const SOURCES_OPEN_TAG = "<sources>";
export const SOURCES_CLOSE_TAG = "</sources>";

/**
 * Splits a streamed answer into user-visible prose and the trailing
 * `<sources>` block. Text is emitted as it arrives, except that anything
 * which could still turn out to be the opening tag is withheld until it
 * is disambiguated.
 */
export class SourceTagFilter {
  private buffer = "";
  private inSources = false;

  /** Feed a streamed chunk; returns the part that is safe to emit. */
  push(chunk: string): string {
    if (this.inSources) {
      this.buffer += chunk;
      return "";
    }

    this.buffer += chunk;
    const tagIndex = this.buffer.indexOf(SOURCES_OPEN_TAG);
    if (tagIndex !== -1) {
      this.inSources = true;
      const visible = this.buffer.slice(0, tagIndex).replace(/\s+$/, "");
      this.buffer = this.buffer.slice(tagIndex);
      return visible;
    }

    // Withhold a partial opening tag and any whitespace directly before
    // it, so the blank line preceding the sources block never reaches
    // the client when the tag is split across chunks.
    const holdback = trailingPrefixLength(this.buffer, SOURCES_OPEN_TAG);
    let cut = this.buffer.length - holdback;
    while (cut > 0 && /\s/.test(this.buffer.charAt(cut - 1))) cut -= 1;
    const visible = this.buffer.slice(0, cut);
    this.buffer = this.buffer.slice(cut);
    return visible;
  }

  /** Returns any withheld prose plus the parsed source paths, if present. */
  flush(): { text: string; sources: string[] } {
    if (!this.inSources) {
      const text = this.buffer;
      this.buffer = "";
      return { text, sources: [] };
    }

    const block = this.buffer;
    this.buffer = "";
    this.inSources = false;
    return { text: "", sources: parseSourcesBlock(block) };
  }
}

function trailingPrefixLength(text: string, tag: string): number {
  const maxLength = Math.min(text.length, tag.length - 1);
  for (let length = maxLength; length > 0; length -= 1) {
    if (text.endsWith(tag.slice(0, length))) return length;
  }
  return 0;
}

function parseSourcesBlock(block: string): string[] {
  const withoutOpen = block.slice(SOURCES_OPEN_TAG.length);
  const closeIndex = withoutOpen.indexOf(SOURCES_CLOSE_TAG);
  const body =
    closeIndex === -1 ? withoutOpen : withoutOpen.slice(0, closeIndex);
  return body
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter((line) => line.length > 0);
}

/**
 * Resolves model-reported source paths to published pages. Unknown paths
 * are dropped so the assistant can never cite content that is not part
 * of the site.
 */
export function resolveCitations(
  site: AssistantSiteContext,
  sources: readonly string[],
): AssistantCitation[] {
  const bySourcePath = new Map(
    site.pages.map((page) => [normalizeSourcePath(page.sourcePath), page]),
  );

  const citations: AssistantCitation[] = [];
  const seenSlugs = new Set<string>();
  for (const source of sources) {
    const page = bySourcePath.get(normalizeSourcePath(source));
    if (!page || seenSlugs.has(page.slug)) continue;
    seenSlugs.add(page.slug);
    citations.push({
      slug: page.slug,
      title: page.title,
      href: slugToHref(page.slug),
      sourcePath: page.sourcePath,
    });
  }
  return citations;
}

function normalizeSourcePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^content\//, "");
}
