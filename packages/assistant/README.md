# @silicajs/assistant

Optional AI assistant for [Silica](https://github.com/agdevhq/silica) knowledge sites.

The assistant answers reader questions from the site's original markdown files, cites the source pages it used, and supports multi-turn follow-ups. It is built on [core-ai](https://core-ai.dev) for provider-agnostic model access and uses an in-process, read-only shell sandbox ([just-bash](https://github.com/vercel-labs/just-bash)) for markdown exploration (`ls`, `grep`, `cat`, …).

## Usage

Install alongside the provider package for your model:

```bash
npm install @silicajs/assistant @core-ai/openai
```

Enable it in `silica.config.ts`:

```typescript
assistant: {
  provider: "openai",
  model: "gpt-5-mini",
},
```

and set the provider API key (e.g. `OPENAI_API_KEY`) plus a server-only `SILICA_ASSISTANT_SECRET` in your environment. The Silica CLI generates the `/api/assistant` route and passes the assistant UI to the active theme.

For providers without a Silica preset, configure the core-ai package and factory explicitly:

```typescript
assistant: {
  provider: {
    package: "@acme/core-ai-provider",
    factory: "createAcme",
    env: { baseURL: "ACME_BASE_URL" },
    secrets: { apiKey: "ACME_API_KEY" },
    options: { region: "eu" },
  },
  model: "acme-chat",
},
```

Generated assistant routes include a 10 requests/minute rate limit keyed by `x-forwarded-for`. In `silica.config.ts`, set `assistant.rateLimit.trustedProxyHeaders` if your deployment proxy uses a different client-IP header, and only include headers your proxy sets or overwrites.

## Entry points

| Export                       | Contents                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `@silicajs/assistant`        | Shared types (citations, transcript, stream events)                          |
| `@silicajs/assistant/ui`     | Client components: `AssistantProvider`, `AssistantTrigger`, `AssistantPanel` |
| `@silicajs/assistant/server` | Framework-agnostic runtime: handler, agent loop, sandbox, citations          |
| `@silicajs/assistant/next`   | Route glue for the generated Silica Next.js app                              |

See the [Silica docs](https://github.com/agdevhq/silica) for the full feature documentation.
