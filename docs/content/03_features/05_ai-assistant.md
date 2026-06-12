---
title: AI assistant
description: An optional AI assistant that answers questions from your pages, with citations.
---

Silica can add an AI assistant to your site. Readers ask questions in plain language; the assistant searches your original markdown files, answers from what it finds, and links the pages it used. It supports follow-up questions in the same conversation.

The assistant is **off by default**. A site without assistant configuration installs, builds, and runs without any AI packages, routes, or API keys.

## Enabling the assistant

1. Install the assistant package and the provider package for your model:

```bash
npm install @silicajs/assistant @core-ai/openai
```

2. Configure the model in `silica.config.ts`:

```typescript
import { defineConfig } from "@silicajs/core";

export default defineConfig({
  // ...
  assistant: {
    provider: "openai",
    model: "gpt-5-mini",
  },
});
```

3. Provide the provider API key and assistant signing secret as environment variables, for example in `.env`:

```bash
OPENAI_API_KEY=sk-...
SILICA_ASSISTANT_SECRET=generate-a-long-random-string
```

That's it. The next `silica dev` or `silica build` generates an `/api/assistant` route and hands the assistant UI to your theme.

## Providers

| `provider`  | Package                 | Default key variable |
| ----------- | ----------------------- | -------------------- |
| `openai`    | `@core-ai/openai`       | `OPENAI_API_KEY`     |
| `anthropic` | `@core-ai/anthropic`    | `ANTHROPIC_API_KEY`  |
| `google`    | `@core-ai/google-genai` | `GOOGLE_API_KEY`     |
| `mistral`   | `@core-ai/mistral`      | `MISTRAL_API_KEY`    |

Set `assistant.apiKeyEnv` to read the provider key from a different variable. `SILICA_ASSISTANT_SECRET` is a separate server-only secret used to sign the client-held conversation transcript so follow-up requests can verify prior assistant messages. If either value is missing at runtime, the site keeps working — the assistant simply reports that it is not configured.

## Rate limiting

The generated `/api/assistant` route is rate limited by default to 10 requests per minute per caller. Silica derives the caller from `x-forwarded-for`, which is the standard reverse-proxy header used by hosted Next.js deployments.

If your deployment proxy sets or overwrites a different client-IP header, configure it in `silica.config.ts`:

```typescript
export default defineConfig({
  assistant: {
    provider: "openai",
    model: "gpt-5-mini",
    rateLimit: {
      maxRequests: 20,
      windowMs: 60_000,
      trustedProxyHeaders: ["x-real-ip"],
    },
  },
});
```

Only include headers that your proxy controls before the request reaches Next.js. If you self-host, make sure the proxy strips or overwrites client-supplied forwarding headers.

## Using the assistant

With the default theme, readers open the assistant from the **Ask AI** button in the sidebar or with **⌘I** (Ctrl+I on Windows and Linux). The [[features/search|search palette]] also offers an _Ask AI assistant_ action that hands the current query over to the assistant.

Answers stream in, cite the pages they are based on, and keep the conversation so readers can ask follow-ups, stop a long answer, or retry a failed one.

## How it answers

The assistant runs inside your site's server and follows a citation-first loop: it explores your original markdown files with read-only commands (`ls`, `grep`, `cat`, …) in an in-process sandbox, reads only relevant pages, then answers and cites its sources.

A few properties worth knowing:

- It works on your **markdown source files**, not rendered HTML.
- Only published pages are mounted into the sandbox. Drafts and excluded files are invisible to it (see [[publishing/drafts-and-publishing|Drafts and publishing]]).
- The sandbox is simulated in-process: no host filesystem access, no network, no environment variables.
- If you enable [[publishing/authentication|authentication]], the assistant endpoint sits behind the same sign-in as your pages.

## Theme support

Themes decide whether and where to show the assistant. The default Amethyst theme places the trigger next to search and docks the conversation as a persistent, resizable sidebar next to the content. A theme without assistant support simply ignores the configuration — the site still builds and the `/api/assistant` route still exists, there is just no built-in UI for it.

If you build your own theme, the framework passes an `assistant` prop (provider, trigger, and chat panel components) to your `SiteLayout` whenever the assistant is enabled. The panel is layout-agnostic and fills whatever container you render it in — dock it, float it, or ignore the prop entirely.
