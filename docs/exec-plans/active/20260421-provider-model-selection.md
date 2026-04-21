# Provider And Model Selection

## Goal

Make the composer's provider and model controls functional end to end so a chat can select a supported AI SDK provider, persist that choice with the conversation, fetch provider model lists when possible, and still accept a manually typed model id.

## Scope

- In scope: server-side provider registry, per-chat selection persistence, provider model-list routes, working composer controls, and docs/history updates.
- Out of scope: auth-scoped per-user provider credentials, browser automation, and non-chat model surfaces such as embeddings or image generation.

## Context

- Relevant docs: `docs/REPO_COLLAB_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/HISTORY_GUIDE.md`, `docs/QUALITY_SCORE.md`.
- Relevant code paths: `components/chat-shell.tsx`, `app/api/chat/route.ts`, `app/api/chat/history/route.ts`, `lib/chat-agent.ts`, `lib/chat-title.ts`, `lib/volcengine.ts`.
- Constraints: keep credentials server-side, preserve existing chat persistence behavior, and avoid breaking the current Volcengine-first setup when other provider keys are absent.

## Risks

- Risk: provider model-list APIs differ, so a single generic fetch path may be brittle.
- Mitigation: centralize provider-specific model-list fetchers and keep manual model entry as the fallback path.

- Risk: chat selection can drift between draft state, active chat state, and persisted history.
- Mitigation: store a normalized selection with each chat and send that selection in both optimistic history saves and real chat requests.

## Milestones

1. Discovery and design alignment.
2. Backend provider/model plumbing plus model-list APIs.
3. Composer UI, documentation, and validation.

## Validation

- Commands: `pnpm check`, `pnpm build`.
- Manual checks: verify the provider selector updates the model field, the model field accepts manual text, and provider-fetched models appear when available.
- Observability checks: provider-specific missing-key errors stay explicit, and saved chat JSON includes the chosen provider/model.

## Progress Log

- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

## Decision Log

- 2026-04-21: Use AI SDK provider registry plus provider-specific model-list fetchers instead of a frontend-only selector, so the chosen provider/model affects real chat requests and survives reloads.
