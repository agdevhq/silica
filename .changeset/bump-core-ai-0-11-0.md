---
"@silicajs/core": minor
"@silicajs/assistant": minor
"@silicajs/next": minor
"@silicajs/cli": patch
---

Bump core-ai to 0.11.0 and make assistant provider wiring dynamic. This is a breaking pre-1.0 assistant config change: provider presets now resolve to package/factory config, `assistant.apiKeyEnv` is replaced by provider `secrets`, and custom core-ai-compatible providers can be configured through explicit package, factory, options, env, and server-side secret mappings.
