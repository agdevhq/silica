/** A source page the assistant used to answer a question. */
export type AssistantCitation = {
  slug: string;
  title: string;
  href: string;
  /** Path of the original markdown file relative to the content root. */
  sourcePath: string;
};

/** One user turn of the client-held conversation transcript. */
export type AssistantUserTranscriptMessage = {
  id: string;
  previousMessageId: string | null;
  role: "user";
  content: string;
};

/** One assistant turn signed by the server for stateless transcript replay. */
export type AssistantSignedTranscriptMessage = {
  id: string;
  previousMessageId: string | null;
  role: "assistant";
  content: string;
  signature: string;
};

/** One turn of the client-held conversation transcript. */
export type AssistantTranscriptMessage =
  | AssistantUserTranscriptMessage
  | AssistantSignedTranscriptMessage;

/** Request body of `POST /api/assistant`. */
export type AssistantRequest = {
  messages: AssistantTranscriptMessage[];
  responseMessageId: string;
};

/**
 * Newline-delimited JSON events streamed back by the assistant route.
 */
export type AssistantStreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-status"; command: string }
  | { type: "citations"; citations: AssistantCitation[] }
  | {
      type: "message-signature";
      id: string;
      previousMessageId: string | null;
      signature: string;
    }
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
  homePage?: {
    title: string;
    sourcePath: string;
    excerpt: string;
  };
  /** Filesystem directory mounted read-only as `/content` for shell tools. */
  contentRoot: string;
  resolveCitation: AssistantCitationResolver;
};
