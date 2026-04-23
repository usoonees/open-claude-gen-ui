## [2026-04-23 11:34] | Task: add DeepSeek provider

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> add deepseek api provider, check this doc for detail: https://api-docs.deepseek.com/

### Changes Overview

- Area: chat provider integration
- Key actions:
  - Added a dedicated `deepseek` OpenAI-compatible provider module with environment-driven API key, base URL, and default model settings.
  - Registered DeepSeek in the shared provider catalog, provider registry, missing-key handling, and server-side model discovery flow.
  - Documented the new provider across runtime configuration, frontend component boundaries, and user-facing release notes.

### Design Intent

DeepSeek fits the repository's existing provider boundary as another OpenAI-compatible backend. Keeping it in its own small module preserves the current pattern used for OpenRouter and Volcengine, avoids special-case route logic, and leaves the provider selector free to treat DeepSeek like every other server-side model source.

### Files Modified

- `.env.example`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/releases/feature-release-notes.md`
- `lib/chat-model-config.ts`
- `lib/chat-models.ts`
- `lib/deepseek.ts`
