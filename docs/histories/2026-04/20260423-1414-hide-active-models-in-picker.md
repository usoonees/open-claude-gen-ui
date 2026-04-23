## [2026-04-23 14:14] | Task: Hide active models in picker

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `local CLI`

### User Query

> I already hide gpt-5-mini in openrouter in model mangagement, why in model selection, I can still see it

### Changes Overview

- Area: chat model picker visibility
- Key actions: removed the inline picker's special-case that always kept the active model visible, and updated the frontend verification note so hidden models are expected to disappear from `Choose model` immediately.

### Design Intent

`Manage Models` is documented as controlling which entries appear in `Choose model`, not as a separate advisory state with exceptions for the current selection. Removing the active-model exemption keeps the picker consistent with the visibility settings without silently changing the user's selected model.

### Files Modified

- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
