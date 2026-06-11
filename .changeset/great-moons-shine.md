---
"@silicajs/assistant": minor
"@silicajs/core": minor
"@silicajs/next": minor
"@silicajs/cli": minor
"@silicajs/components": minor
"@silicajs/theme-amethyst": minor
"@silicajs/ui": minor
---

Add the optional AI assistant. A new `@silicajs/assistant` package answers reader questions from the site's markdown sources with citations and multi-turn conversations, powered by core-ai and a read-only in-process shell sandbox. Sites opt in via the new `ai` config (provider, model, API key env var); without it no AI packages, routes, or keys are required. Themes receive assistant UI through a new `assistant` slot prop on `SiteLayout` — a provider, a trigger, and a layout-agnostic chat panel — and decide how to present the conversation. The search palette gains an "Ask AI assistant" handoff, and Amethyst integrates the trigger, keyboard shortcut (⌘I), and a persistent, resizable conversation sidebar (built on new resizable panel primitives in `@silicajs/ui`) as the reference experience.
