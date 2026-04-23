## [2026-04-23 15:26] | Task: plain text thinking block

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Fix the frontend bug so content in `Thinking`, except for tool calls, renders as raw text instead of Markdown.

### Changes Overview

- Area: chat message rendering
- Key actions:
  - Switched reasoning items inside the `Thinking` panel from the shared Markdown renderer to a plain-text renderer.
  - Added preserved line-break and wrapping styles for raw reasoning text.
  - Updated the frontend verification guide to cover the new `Thinking` behavior.

### Design Intent

The `Thinking` panel should present the model's raw reasoning stream without Markdown interpretation so formatting markers do not alter what the user sees. The change keeps the existing structured tool-call cards intact while limiting the raw-text treatment to non-tool reasoning content.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260423-1526-plain-text-thinking-block.md`
