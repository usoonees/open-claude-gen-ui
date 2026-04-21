## [2026-04-21 16:05] | Task: Make provider and model selection work

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> Make the provider and model selection below the input box really work. Check whether Vercel AI SDK already supports different providers. Let users fetch a model list from the provider and select a model, but also manually type the model name.

### Changes Overview

- Area: chat provider/model configuration, persistence, and composer controls.
- Key actions:
  - Added a shared chat model selection type plus a server-side AI SDK provider registry for Volcengine, OpenAI, Anthropic, and Google.
  - Added `/api/chat/providers` and `/api/chat/models` so the client can load provider metadata and provider-backed model lists when available.
  - Replaced the placeholder composer pills with a working provider selector, manual model input, model sync button, and quick model chips.
  - Persisted `modelSelection` with each saved chat and reused the selected provider/model for chat execution and background title generation.
  - Updated environment examples and repository docs from Volcengine-only wording to multi-provider selection behavior.

### Design Intent

The selector needed to affect actual inference requests, not just the UI. The implementation keeps provider secrets on the server, normalizes selections in one place, and treats provider-fetched model lists as a convenience rather than a hard dependency, so manual model ids still work when a provider does not list models cleanly or the user wants a newer id.

### Files Modified

- `.env.example`
- `README.md`
- `app/api/chat/history/route.ts`
- `app/api/chat/models/route.ts`
- `app/api/chat/providers/route.ts`
- `app/api/chat/route.ts`
- `app/globals.css`
- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/QUALITY_SCORE.md`
- `docs/exec-plans/active/20260421-provider-model-selection.md`
- `lib/chat-agent.ts`
- `lib/chat-model-config.ts`
- `lib/chat-models.ts`
- `lib/chat-store.ts`
- `lib/chat-title.ts`
- `lib/volcengine.ts`
