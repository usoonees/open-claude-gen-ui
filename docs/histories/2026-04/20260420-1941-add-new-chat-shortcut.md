## [2026-04-20 19:41] | Task: add new chat shortcut

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Add a new shortcut `Cmd+K` for new chat, and when triggering new chat, the cursor should focus on the input.

### Changes Overview

- Area: chat composer and navigation UX
- Key actions:
  - Added a global `Cmd+K` shortcut in the chat shell to trigger the existing new-chat flow.
  - Focused the composer textarea after any new-chat action so the user can type immediately.
  - Documented the shortcut and focus behavior in the frontend verification guide.

### Design Intent

Reuse the existing `startNewChat` path for both buttons and the keyboard shortcut so chat reset behavior stays consistent. Focus is applied after the UI reset on the next animation frame to ensure the textarea exists and the caret lands correctly.

### Files Modified

- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
