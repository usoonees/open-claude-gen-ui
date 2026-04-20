## [2026-04-20 19:15] | Task: auto-collapse completed thinking blocks

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router`

### User Query

> for chat, after thinking, the think should auto collpased

### Changes Overview

- Area: chat message rendering and frontend verification docs
- Key actions:
  - Replaced the always-open reasoning `<details>` with a stateful reasoning block that tracks live streaming status
  - Tightened the collapse trigger to the reasoning part lifecycle so the block closes as soon as reasoning finishes instead of waiting for the full assistant message
  - Updated the frontend verification guide to include the immediate post-reasoning collapse behavior

### Design Intent

This change makes long reasoning traces less noisy as soon as the model stops emitting reasoning, even when it is still streaming answer text or tool results afterward. The reasoning block remains user-controlled after the auto-collapse so prior thoughts can still be inspected on demand.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
