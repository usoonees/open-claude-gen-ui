## [2026-04-21 11:52] | Task: move showWidget loading message to bottom-left

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> Add `loadding_messaegs` to the widget tool and show it at the left-down corner when generating a widget.

### Changes Overview

- Area: generative UI tool contract and widget streaming state
- Key actions:
  - Added shared normalization for the canonical `showWidget` fields so the server and chat UI parse the same input shape.
  - Moved the in-widget streaming loading chip from the bottom-right to the bottom-left.
  - Updated frontend verification guidance for the loading-chip placement behavior.

### Design Intent

The change keeps `showWidget` on one explicit API contract while still sharing parsing logic between the server and the chat UI. That avoids mismatches between validation and rendering without broadening the tool surface with alternate spellings.

### Files Modified

- `lib/generative-ui/show-widget-input.ts`
- `lib/chat-tools.ts`
- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
