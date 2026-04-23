## [2026-04-23 11:57] | Task: add MiniMax provider

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> add provider minimax: https://platform.minimaxi.com/docs/api-reference/api-overview

### Changes Overview

- Area: chat provider integration
- Key actions:
  - Added a dedicated `minimax` OpenAI-compatible provider module with environment-driven API key, base URL, and default model settings.
  - Registered MiniMax in the shared provider catalog, credential resolution flow, missing-key handling, and chat model selection logic.
  - Added manual MiniMax model suggestions based on the current official OpenAI-compatible text model docs instead of depending on an undocumented model-list endpoint.
  - Documented the new provider across runtime configuration, frontend component boundaries, and user-facing release notes.

### Design Intent

MiniMax fits the existing provider abstraction as another OpenAI-compatible backend. The published docs clearly define the base URL and supported text model names, but they do not clearly document a model-list endpoint, so this integration uses a fixed suggested-model list to keep provider setup predictable and avoid depending on behavior that is not part of the documented contract.

### Files Modified

- `.env.example`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/releases/feature-release-notes.md`
- `lib/chat-model-config.ts`
- `lib/chat-models.ts`
- `lib/minimax.ts`
