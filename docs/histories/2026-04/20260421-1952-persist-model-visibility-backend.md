## [2026-04-21 19:52] | Task: Persist model visibility preferences in backend

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> in model selection, when I hide call or select all, the state looks like not stored in backend, save it in backend

### Changes Overview

- Area: chat composer model-picker persistence.
- Key actions:
  - Added a server-side chat preference store under `.data/preferences/chat-model-picker.json` for hidden model visibility keys.
  - Added `/api/chat/preferences` so the client can load and save `Manage Models` visibility state through the backend.
  - Updated the chat shell to hydrate hidden-model preferences from the backend, fall back to existing local storage when needed, and sync changes back to the server.
  - Updated architecture and frontend docs to describe the new persistence path and verification.

### Design Intent

`Manage Models` visibility is a picker-wide preference, not a per-chat attribute. Persisting it in a small backend store keeps the behavior stable across reloads and matches the user's expectation that `Hide all` and per-model visibility changes are part of saved application state rather than temporary browser-only UI state.

### Files Modified

- `app/api/chat/preferences/route.ts`
- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260421-1952-persist-model-visibility-backend.md`
- `lib/chat-picker-preferences.ts`
- `lib/chat-preferences-store.ts`
