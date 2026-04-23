## [2026-04-23 12:14] | Task: delete chat dialog white surface

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Change the delete chat window from yellow to white, and write that rule to `design.md`.

### Changes Overview

- Area: chat confirmation dialog styling and design guidance.
- Key actions:
  - Changed the shared dialog card surface from warm off-white to plain white so the delete-chat confirmation no longer reads yellow.
  - Added a stable design rule in `docs/DESIGN.md` requiring in-app confirmation dialogs to use the same white surface family as setup and management dialogs.
  - Mirrored that requirement in `docs/FRONTEND.md` so UI verification guidance stays aligned with the design rule.

### Design Intent

The delete confirmation is a lightweight system dialog, not a separate visual theme. Keeping it on the same white surface family as the provider and management dialogs makes the modal language more consistent and removes the leftover warm tint that felt out of place.

### Files Modified

- `app/globals.css`
- `docs/DESIGN.md`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260423-1214-delete-chat-dialog-white-surface.md`
