---
title: Authentication
description: Optional Google OAuth with Better Auth and allowlist enforcement.
---

Authentication is optional. Sites without an `auth` config remain fully public.

## Enabling auth

1. Copy `.env.example` to `.env` and fill in credentials.
2. Add an `auth` block to `silica.config.ts`:

```ts
export default defineConfig({
  title: "Private Docs",
  auth: {
    provider: "google",
    allowedDomains: ["example.com"],
    // allowedEmails: ["you@example.com"],
  },
});
```

3. Set `baseUrl` to your production URL for OAuth callbacks.

> [!warning] Allowlist required
> Silica requires at least one `allowedDomains` or `allowedEmails` entry when auth is enabled. Without it, config loading throws an error.

## Environment variables

| Variable               | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `BETTER_AUTH_SECRET`   | Session encryption secret (required in production) |
| `BETTER_AUTH_URL`      | Public site URL (e.g. `https://docs.example.com`)  |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                             |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                         |

## How access control works

1. `@silicajs/auth` configures Better Auth with Google OAuth and stateless JWE cookie sessions.
2. The generated `proxy.ts` runs before cached pages, search, and vault assets.
3. Unauthenticated users are redirected to `/sign-in`.
4. Users outside the allowlist see `/not-allowed`.

Protected routes include:

- All vault pages
- `/api/search`
- `/silica/*` asset paths

## Disabling auth

Set `auth: false` explicitly, or omit the `auth` block entirely.

