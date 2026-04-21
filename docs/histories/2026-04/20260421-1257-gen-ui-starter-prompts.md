## [2026-04-21 12:57] | Task: gen-ui starter prompts

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Rewrite the suggestion prompts above the input box so they are diverse query prompts for generative UI.

### Changes Overview

- Area: chat empty-state starter prompts
- Key actions:
  - Replaced generic starter prompts with prompts that encourage interactive diagrams, visual comparisons, current timelines, and calculator widgets.
  - Updated frontend verification guidance to expect diverse gen-ui-oriented prompt suggestions.

### Design Intent

The starter prompts should teach the product surface by example. Each prompt now points at a different generative UI shape so first-time users are more likely to trigger `visualizeReadMe` and `showWidget` flows.

### Files Modified

- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
