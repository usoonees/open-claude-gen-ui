## [2026-04-21 12:30] | Task: Delay assistant actions until finish

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> the assistant copy / download button should only show if assistant finish the output

### Changes Overview

- Area: Chat assistant message actions.
- Key actions: Delayed the assistant copy and widget download action row until the active assistant turn finishes streaming, and updated frontend verification guidance to check that the actions stay hidden during in-progress output.

### Design Intent

Copying or downloading partial assistant output is misleading because the content can still change while streaming. Hiding the action row for the newest in-progress assistant message keeps the affordances aligned with finalized content and avoids exporting incomplete widget HTML.

### Files Modified

- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
