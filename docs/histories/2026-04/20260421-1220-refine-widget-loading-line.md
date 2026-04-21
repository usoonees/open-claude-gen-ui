## [2026-04-21 12:20] | Task: refine widget loading line

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI with Chrome DevTools verification`

### User Query

> 1. it's overlapping with the widget content, don't hide it
>
> 2. the style is not great, the loading message is a card like, you can check how claude render it's loading message, maybe will automatically add ... to the message end
>
> 3. run a end2end test to check whethter the style looks beautiful and compact

### Changes Overview

- Area: generative UI widget streaming state
- Key actions:
  - Replaced the overlay-style loading chip with a compact in-flow loading line rendered below the widget content.
  - Styled the loading state as muted text plus a small animated dot and trailing ellipsis instead of a pill/card treatment.
  - Slowed message rotation further and reset the rotation index when a new widget stream starts.
  - Updated frontend verification guidance to reflect the non-overlapping loading line.
  - Ran a live Chrome end-to-end pass against a real `showWidget` streaming turn and captured the loading state visually.

### Design Intent

The loading state should read like a quiet status annotation, not a floating badge that competes with the widget or obscures content. Moving it into normal flow and reducing it to a lightweight text treatment makes the UI feel closer to Claude's streamed generative UI behavior while keeping the chat surface compact.

### Files Modified

- `components/generative-widget.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
