## [2026-04-21 17:05] | Task: add OpenRouter provider

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Add OpenRouter to provider.

### Changes Overview

- Area: provider registry and configuration
- Key actions:
  - Added an OpenRouter OpenAI-compatible provider helper with configurable API key, base URL, and default model
  - Registered OpenRouter in the shared provider catalog, missing-key handling, and server-side model discovery flow
  - Updated the model-list route, env example, and architecture/frontend docs so the provider selector exposes the new option cleanly

### Design Intent

OpenRouter fits the repository's existing provider abstraction best as another OpenAI-compatible backend. Reusing the current provider-registry and model-discovery patterns keeps the new provider explicit and legible while avoiding one-off route or UI logic just for OpenRouter.

### Files Modified

- `.env.example`
- `app/api/chat/models/route.ts`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `lib/chat-model-config.ts`
- `lib/chat-models.ts`
- `lib/openrouter.ts`
