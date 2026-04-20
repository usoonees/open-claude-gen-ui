## [2026-04-20 20:15] | Task: fix live sidebar history updates

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> when I send a new query, it doesn't occur in sidebar chat history immediately, only if I reload, the sidebar history list will change, make it in real time

### Changes Overview

- Area: chat history synchronization
- Key actions:
  - Persisted the optimistic user turn to `/api/chat/history` as soon as a message or starter prompt is submitted.
  - Refreshed the sidebar chat list immediately after that save so a new or updated chat appears without a page reload.
  - Added a second sidebar refresh when the streamed assistant response finishes so the client converges back to the server-canonical conversation state.

### Design Intent

The sidebar should reflect user actions as they happen, not only after a reload or after a later navigation. Reusing the existing chat-history store keeps the sidebar state grounded in the same persistence path the server already uses, while still preserving the streaming response flow.

### Files Modified

- `components/chat-shell.tsx`
