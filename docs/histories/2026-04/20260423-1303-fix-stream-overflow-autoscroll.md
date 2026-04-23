## [2026-04-23 13:03] | Task: Fix stream overflow autoscroll

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `local CLI`

### User Query

> when thinking content is exceed the height of window, it won't automatically scroll to the end

### Changes Overview

- Area: chat UI streaming behavior
- Key actions: observed rendered message-list height changes during active streaming, kept the chat pane pinned to the bottom when overflow begins mid-stream, and updated the frontend verification note for first-overflow behavior.

### Design Intent

The existing auto-scroll logic followed streamed message-part updates but could miss later layout growth once the transcript became taller than the viewport. Observing rendered message-list resizing keeps the viewport pinned to the newest output until the user intentionally scrolls away, which matches the chat surface’s existing follow-stream contract.

### Files Modified

- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
