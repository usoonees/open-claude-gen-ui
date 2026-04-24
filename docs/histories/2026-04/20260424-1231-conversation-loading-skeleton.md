## [2026-04-24 12:31] | Task: Conversation loading skeleton

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `Codex CLI`

### User Query

> When switching conversations, do not briefly show the empty home page. Use a skeleton while loading the conversation.

### Changes Overview

- Area: Chat UI navigation and loading state.
- Key actions: Added an explicit loading target for saved conversation switches, render a transcript skeleton while persisted messages load, suppress starter prompts during that loading state, and documented the verification expectation.

### Design Intent

Saved conversations briefly attach to an empty local chat controller before `/api/chat/history` returns. The skeleton distinguishes that transient loading state from a real new-chat draft, so the empty composer remains available only for actual new chats.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
