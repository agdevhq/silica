---
title: Authentication
description: Put your site behind Google sign-in.
---

By default a Silica site is fully public. If your vault is private, you can gate the whole site behind Google OAuth so only people you allow can read it.

## Turning it on

1. Copy `.env.example` to `.env` and fill in your credentials.
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

3. Set `baseUrl` to your production URL so sign-in redirects work.

> [!warning] An allowlist is required
> When auth is enabled you must list at least one `allowedDomains` or `allowedEmails` entry. Otherwise the site refuses to start.

## What readers experience

- Visitors are sent to a sign-in page and authenticate with Google OAuth.
- People on your allowlist get straight in.
- Anyone signing in who is not on the allowlist sees a "not allowed" page.

Sign-in protects everything — pages, search, and your vault's images and files — so nothing leaks before a reader is authenticated.

## Environment variables

| Variable               | Purpose                                 |
| ---------------------- | --------------------------------------- |
| `BETTER_AUTH_SECRET`   | Session secret (required in production) |
| `BETTER_AUTH_URL`      | Your public site URL                    |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                  |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret              |

## Turning it off

Omit the `auth` block, or set `auth: false`, for a public site.
