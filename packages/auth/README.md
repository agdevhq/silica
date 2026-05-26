# @silicajs/auth

Better Auth wrapper for Silica.

Provides:

- Google provider configuration from environment variables
- stateless cookie-cache session configuration using JWE
- OAuth callback allowlist enforcement
- request/session helpers for generated `proxy.ts`

Silica auth is optional; sites without an `auth` config remain public.
