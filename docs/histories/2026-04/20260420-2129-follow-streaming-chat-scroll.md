## [2026-04-20 21:29] | Task: Follow streaming chat output

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `local CLI`

### User Query

> When the AI is streaming a message, the chat should auto-scroll to the bottom unless or until the user interrupts.

### Changes Overview

- Area: chat UI streaming behavior
- Key actions: added bottom-follow state for the message scroll pane, refreshed it on each streamed content signature change, and disabled it when the user scrolls away from the bottom.

### Design Intent

The chat view should keep the newest assistant output visible during active generation without fighting intentional user navigation. The implementation follows the stream by default for each new send, stops following when the user scrolls away, and resumes when the user returns near the bottom or sends another message.

### Files Modified

- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
