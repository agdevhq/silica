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

/** Resolves a model-reported source path to a published page citation. */
export type AssistantCitationResolver = (
  sourcePath: string,
) => AssistantCitation | undefined | Promise<AssistantCitation | undefined>;

/** Knowledge-site context the server runtime operates on. */
export type AssistantSiteContext = {
  siteTitle: string;
  siteDescription?: string;
  /** Filesystem directory mounted read-only as `/content` for shell tools. */
  contentRoot: string;
  resolveCitation: AssistantCitationResolver;
};
