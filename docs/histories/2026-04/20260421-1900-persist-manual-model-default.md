## [2026-04-21 19:00] | Task: Persist manual model default across new chats

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> Once the user changes the model selection manually, record that as the user's selection in localStorage. When starting a new chat, use that value. If the user just jumps to a conversation with a different model, do not change this value. Only manual changes should update it, including from a new chat conversation.

### Changes Overview

- Area: chat composer model-selection state and browser-local preferences.
- Key actions:
  - Added a browser-local `MODEL_SELECTION_STORAGE_KEY` so the last explicit provider/model choice is persisted independently from saved chat records.
  - Updated the chat shell to hydrate a manual default for future new chats without letting route changes or saved-chat loads overwrite it.
  - Made explicit picker actions persist both the active selection and the future new-chat default, including direct model picks, provider switches, and typed custom model ids.
  - Updated frontend and architecture docs to describe the new browser-local default-selection behavior.

### Design Intent

The fix separates three concerns that were previously blurred together: server-derived defaults, per-chat saved selections, and the user's browser-wide manual default for future chats. That keeps existing conversations stable while making `New Chat` consistently reuse the user's last explicit choice instead of whatever conversation they happened to open most recently.

### Files Modified

- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
