---
"@silicajs/assistant": minor
"@silicajs/core": minor
"@silicajs/next": minor
"@silicajs/cli": minor
"@silicajs/components": minor
"@silicajs/theme-amethyst": minor
---

Add the optional AI assistant. A new `@silicajs/assistant` package answers reader questions from the site's markdown sources with citations and multi-turn conversations, powered by core-ai and a read-only in-process shell sandbox. Sites opt in via the new `ai` config (provider, model, API key env var); without it no AI packages, routes, or keys are required. Themes receive assistant UI through a new `assistant` slot prop on `SiteLayout`, the search palette gains an "Ask AI assistant" handoff, and Amethyst integrates the trigger, keyboard shortcut (⌘I), and conversation sidebar as the reference experience.
