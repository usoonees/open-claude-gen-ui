## [2026-04-23 12:58] | Task: refresh starter prompts on new chat

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> For the prompt recommendation above the chat input box, load new prompt examples from the backend randomly each time I start a new chat.

### Changes Overview

- Area: chat empty-state starter prompts
- Key actions:
  - Refreshed starter prompt loading whenever the active chat returns to the draft empty state.
  - Added request-order protection so only the newest starter prompt fetch can update the UI.
  - Updated architecture and frontend verification docs to describe the per-new-chat refresh behavior.

### Design Intent

The starter prompt API was already backend-owned and randomized, but the UI only consumed it once on initial mount. Tying the fetch to the empty draft-chat state preserves the current backend contract and keeps `New Chat` lightweight while ensuring users see a fresh randomized set each time they reset the conversation.

### Files Modified

- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260423-1258-refresh-starter-prompts-on-new-chat.md`
