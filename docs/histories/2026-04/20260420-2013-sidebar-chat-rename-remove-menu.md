## [2026-04-20 20:13] | Task: add sidebar chat rename and remove menu

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `Codex CLI`

### User Query

> add rename and remove button to the sidebar items, when hover on a item, it should show up the three dot to give you expand options

### Changes Overview

- Area: sidebar chat history UI and persistence
- Key actions:
  - Added a hover/focus three-dot overflow trigger for each saved sidebar chat.
  - Added `Rename` and `Remove` menu actions in the sidebar item menu.
  - Extended chat history storage and the history API to support persisted custom titles and chat deletion.
  - Updated frontend verification guidance and release notes for the new sidebar behavior.

### Design Intent

Keep the sidebar compact by hiding secondary actions until hover or focus, while still making management actions discoverable. Persisting custom titles separately from generated titles preserves user-renamed chats even when later messages are saved.

### Files Modified

- `app/api/chat/history/route.ts`
- `app/globals.css`
- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
- `docs/releases/feature-release-notes.md`
- `lib/chat-store.ts`
