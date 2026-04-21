## [2026-04-21 11:58] | Task: increase widget and markdown spacing

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `Codex CLI`

### User Query

> Increase the margin between the `widget-shell` section and `markdown-body` a little.

### Changes Overview

- Area: assistant message layout spacing
- Key actions:
  - Added a targeted adjacent-sibling rule for `widget-shell` and `markdown-body`.
  - Kept the change scoped to the widget/markdown pairing instead of changing all message-body spacing.

### Design Intent

This change slightly increases separation when rendered assistant output mixes markdown text and generative widgets. The CSS targets only the widget/markdown adjacency so existing spacing in other message layouts stays unchanged.

### Files Modified

- `app/globals.css`
- `docs/histories/2026-04/20260421-1158-widget-markdown-spacing.md`
