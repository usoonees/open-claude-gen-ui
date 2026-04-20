## [2026-04-20 19:01] | Task: fix first message render

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `Codex CLI in repository workspace`

### User Query

> when I send a new query in chat, it only render assistant in frontend

### Changes Overview

- Area: chat UI state management for brand-new conversations
- Key actions:
  - Prevented the first history fetch for a newly created chat id from overwriting the optimistic user message with an empty server response.
  - Added an inline comment in the chat shell to document why fresh chats must be treated as locally loaded before the first save completes.

### Design Intent

The first submitted message in a new chat is rendered optimistically on the client before the server has persisted any chat history. The history-loading effect was immediately fetching that new id, receiving an empty history payload, and replacing the local message list. Marking the fresh chat id as already loaded preserves the optimistic user turn until the assistant response finishes and the server-side save catches up.

### Files Modified

- `components/chat-shell.tsx`
- `docs/histories/2026-04/20260420-1901-fix-first-message-render.md`
