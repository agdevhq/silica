/** A source page the assistant used to answer a question. */
export type AssistantCitation = {
  slug: string;
  title: string;
  href: string;
  /** Path of the original markdown file relative to the content root. */
  sourcePath: string;
};

/** One turn of the client-held conversation transcript. */
export type AssistantTranscriptMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Request body of `POST /api/assistant`. */
export type AssistantRequest = {
  messages: AssistantTranscriptMessage[];
};

/**
 * Newline-delimited JSON events streamed back by the assistant route.
 */
export type AssistantStreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-status"; command: string }
  | { type: "citations"; citations: AssistantCitation[] }
  | { type: "done" }
  | { type: "error"; message: string };

/** A published page the assistant may explore and cite. */
export type AssistantPage = {
  slug: string;
  title: string;
  /** Path relative to the content root (e.g. `guides/install.md`). */
  sourcePath: string;
  /** Absolute path of the markdown file on disk. */
  file: string;
};

/** Knowledge-site context the server runtime operates on. */
export type AssistantSiteContext = {
  siteTitle: string;
  siteDescription?: string;
  pages: AssistantPage[];
};
