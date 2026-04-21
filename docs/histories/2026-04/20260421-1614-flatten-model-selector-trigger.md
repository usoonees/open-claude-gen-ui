## [2026-04-21 16:14] | Task: Align composer model selector with OpenCode flows

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> For the model selection part down in the input box, remove any gradient color and 3D style, make sure it's compact, also remove the card surround for the model selection, make it compact, only a text there.

> Here is the OpenCode source code: `/Users/bytedance/Developer/githubs/opencode`

> Check carefully how `Choose model` works, and how `Connect Provider` and `Manage Models` works, make our system consistent with that.

### Changes Overview

- Area: composer footer model-selection UI.
- Key actions:
  - Flattened the closed-state trigger down to a compact text-only control.
  - Replaced the old inline add-provider/model card flow with three OpenCode-style picker views: `Choose model`, `Connect Provider`, and `Manage Models`.
  - Added browser-local model visibility persistence so `Manage Models` controls which models appear in `Choose model`.
  - Kept typed custom model IDs for the current provider and moved model-list syncing into the management flow.
  - Extended provider metadata with the required API-key env var so the provider view can explain setup for unconfigured providers.
  - Updated architecture and frontend docs to describe the new picker behavior.

### Design Intent

The first pass flattened the trigger visually, but the OpenCode comparison showed the bigger mismatch was interaction design. The final implementation keeps this repository's server-side env constraints, while adopting OpenCode's clearer separation between choosing a model, connecting a provider, and managing model visibility.

### Files Modified

- `app/globals.css`
- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `lib/chat-model-config.ts`
- `lib/chat-models.ts`
