## [2026-04-21 11:39] | Task: render readme tool input in thinking

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> also render visualizeReadMe tool call in thinking part, but only tool call input, no need the output, cause the output is too huge, also think the frontend style, make it looks great

### Changes Overview

- Area: chat frontend thinking block
- Key actions:
  - Stopped treating `visualizeReadMe` as a silent tool in the thinking timeline.
  - Added an input-only preview for `visualizeReadMe` tool calls, capped to a small JSON snippet.
  - Kept the large guideline output hidden from the UI while preserving normal tool status text.
  - Refined tool-card styling with a slimmer bordered trace style and a dedicated readme variant.
  - Updated frontend verification guidance for the new input-only readme trace.

### Design Intent

The guideline fetch is useful context for users debugging visual widget generation, but the returned readme payload is too large for the chat surface. Rendering only the call input keeps the thinking timeline honest and compact while avoiding a noisy output dump.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
