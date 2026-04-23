## [2026-04-21 16:20] | Task: remove selected prefix from visualizeReadMe status

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> For `visualizeReadMe` tool render, just show the result. Do not include the word `Selected`; show `Diagram, Interactive`, not `Selected Diagram, Interactive`.

### Changes Overview

- Area: trusted-mode chat thinking UI
- Key actions:
  - Removed the `Selected` prefix from the visible `visualizeReadMe` tool status line in the thinking card.
  - Updated the frontend verification guide to match the new module-name-only render.

### Design Intent

Keep the trusted-mode thinking timeline compact and literal. The visible README-selection tool card should present only the chosen module names so the status line reads like the result itself instead of a prefixed label.

### Files Modified

- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
