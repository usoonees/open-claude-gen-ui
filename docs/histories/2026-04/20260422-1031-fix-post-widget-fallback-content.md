## [2026-04-22 10:31] | Task: fix post-widget fallback content

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Investigate why a specific saved chat showed a `showWidget` result but no visible follow-up assistant content after the widget.

### Changes Overview

- Area: chat widget turn rendering and agent prompt guidance
- Key actions:
  - Render completed post-widget reasoning as normal markdown fallback when a finished assistant message has widget output but no final `text` parts.
  - Make assistant message copy prefer post-widget reasoning over the full hidden reasoning trace when that fallback path is used.
  - Tighten the trusted-mode prompt so future `showWidget` turns are instructed to end with visible answer text instead of reasoning-only output.
  - Document the fallback case in the frontend browser-verification checklist.

### Design Intent

This repository keeps the whole tool loop inside one assistant message, so the correct fix is not to create a second turn after `showWidget`. The failure mode here was that the final step produced only `reasoning`, which the non-streaming UI treated as hidden state. The chosen fix preserves the single-turn architecture while making completed widget answers legible even when the model fails to emit normal `text` parts, and it nudges future generations toward the intended visible-text ending.

### Files Modified

- `components/chat-shell.tsx`
- `lib/chat-agent.ts`
- `docs/FRONTEND.md`
