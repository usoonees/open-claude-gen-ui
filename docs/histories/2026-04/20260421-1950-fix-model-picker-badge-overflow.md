## [2026-04-21 19:50] | Task: fix model picker badge overflow

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> looks like the model selection the current indication tag is out of width

### Changes Overview

- Area: model picker layout styling
- Key actions:
  - let provider and model picker title rows wrap when space gets tight
  - allow badge rows and title text to shrink within the picker width
  - keep `Current` and related badges inside the picker card on narrow viewports
  - constrain picker grids to a single `minmax(0, 1fr)` column so long model lists cannot widen the header row beyond the popup
  - add an explicit shrinkable `model-group-title` flex item so the current-selection badge stays inside the model-list header for wide OpenRouter lists

### Design Intent

This change keeps the existing picker structure intact and fixes the overflow at the layout boundary instead of changing picker behavior. The final fix combines wrapping with explicit single-column grid constraints, because implicit CSS grid sizing let long model lists widen the header row beyond the popup even when the badge row itself could wrap.

### Files Modified

- `app/globals.css`
- `components/chat-shell.tsx`
