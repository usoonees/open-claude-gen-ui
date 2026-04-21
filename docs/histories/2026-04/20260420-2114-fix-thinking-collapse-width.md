## [2026-04-20 21:14] | Task: fix thinking collapse and width

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router`

### User Query

> Fix the frontend bug where a same-turn reasoning -> tool call -> tool result sequence collapses the `Thinking` block before visible content appears, and make the thinking block render at full assistant-message width.

### Changes Overview

- Area: chat frontend rendering and verification docs
- Key actions:
  - Kept the `Thinking` block open after completed reasoning/tool events until visible assistant output exists
  - Preserved the existing auto-collapse behavior once assistant text or widget output is visible
  - Made assistant turns, message bodies, and reasoning blocks occupy the full assistant message column
  - Updated frontend verification guidance for the revised collapse trigger

### Design Intent

The thinking timeline should remain readable while it is the only visible assistant feedback. Once the assistant starts producing user-facing output, the thinking details can collapse and stay available on demand without leaving an undersized summary.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
