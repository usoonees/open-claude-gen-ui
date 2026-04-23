## [2026-04-23 11:52] | Task: save provider keys from frontend

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js + TypeScript`

### User Query

> When adding a new provider, support entering the API key from the frontend instead of only through `.env.local`, and store it in an elegant way that does not require editing code or restarting the service.

### Changes Overview

- Area:
  - Provider credential storage and provider setup UX.
- Key actions:
  - Added a local encrypted provider-credential store under `.data/providers/`.
  - Updated provider resolution so frontend-saved keys take effect immediately for chat requests, title generation, default provider selection, and model-list sync.
  - Reworked the `Connect provider` dialog so users can save and remove provider keys directly from the frontend.
  - Refined the provider dialog so the API-key input lives inside the selected provider row instead of a separate panel, and reduced duplicate setup copy.
  - Switched the provider API-key field to a masked plain-text input to avoid browser password/autocomplete popups, and show a longer masked placeholder for already connected providers.
  - Removed the old exception that kept unconfigured providers visible in the model picker, and normalize stale browser selections back to a configured default provider.
  - Made the `Connect provider` dialog return to `Manage Models` when it is closed after being opened from that management surface.
  - Split provider-dialog row focus from the active chat model selection so clicking an available unconfigured provider keeps that row open instead of snapping back to the first connected provider.
  - Added a backend cache for successful provider model sync results so `/api/chat/models` can reuse stored model lists after reloads and only overwrite them on the next explicit refresh.
  - Updated repository docs to explain the new local credential flow and security posture.

### Design Intent

The change keeps secrets server-side while removing the restart requirement that came from env-only configuration. The chosen tradeoff is a local-development credential store with masked metadata returned to the browser and env vars retained as a fallback, which fits the repository's current single-user, local-first posture without pretending to solve production secret management.

### Files Modified

- `README.md`
- `app/api/chat/providers/route.ts`
- `app/globals.css`
- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/QUALITY_SCORE.md`
- `docs/SECURITY.md`
- `lib/chat-model-config.ts`
- `lib/chat-models.ts`
- `lib/deepseek.ts`
- `lib/openrouter.ts`
- `lib/provider-credentials-store.ts`
- `lib/provider-model-cache.ts`
- `lib/volcengine-coding.ts`
- `lib/volcengine.ts`
