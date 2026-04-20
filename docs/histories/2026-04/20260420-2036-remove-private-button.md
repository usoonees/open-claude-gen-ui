## [2026-04-20 20:36] | Task: remove private button

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> remove the private button, it's useless

### Changes Overview

- Area: chat header UI
- Key actions: removed the unused `Private` button from the chat header and deleted the now-unused header button styling

### Design Intent

The header should only expose controls that have a clear function. Removing a non-functional button reduces visual noise and makes the remaining actions easier to scan.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/histories/2026-04/20260420-2036-remove-private-button.md`
