## [2026-04-21 12:27] | Task: add loading dots after tool-only assistant turns

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> after a turn like reasong + tool_call(content), there should a three dot loading too, similar to loading_message way, but only dot, no messages, which indicate that llm is still generating, user need to wait for a little

### Changes Overview

- Area: chat frontend streaming state
- Key actions:
  - Added a dot-only assistant streaming indicator inside the active assistant message when the model is still generating but no text or widget output is visible yet.
  - Scoped the indicator to the currently streaming assistant turn so completed assistant messages do not show stale loading chrome.
  - Documented the expected browser behavior for reasoning and tool-only streaming phases.

### Design Intent

Tool activity in the `Thinking` block can look final even when the model is still composing the next visible answer. A compact three-dot indicator keeps that state legible without reintroducing extra loading copy or a separate fake assistant row.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
