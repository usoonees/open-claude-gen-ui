## [2026-04-21 17:04] | Task: Nudge composer model label away from left edge

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> move the current model name a little bit right from the left corner of input box, it's too near to the corner

### Changes Overview

- Area: composer footer model selector spacing.
- Key actions:
  - Added a small left inset to the closed-state model trigger so the current model name no longer sits flush against the composer's left edge.
  - Kept the change CSS-only so the picker interaction and layout remain unchanged.

### Design Intent

The recent compact trigger cleanup removed the model pill padding entirely, which also pulled the label too close to the composer's left border. This change restores a small amount of horizontal breathing room without reintroducing the old pill treatment or shifting the send button and picker behavior.

### Files Modified

- `app/globals.css`
- `docs/histories/2026-04/20260421-1704-nudge-composer-model-trigger-right.md`
