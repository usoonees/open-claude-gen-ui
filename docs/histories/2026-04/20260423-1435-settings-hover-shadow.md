## [2026-04-23 14:35] | Task: add hover shadow to sidebar settings button

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js + TypeScript`

### User Query

> when hover on settings in top-bottom, there should be a shadow to indicate that user hover to it

### Changes Overview

- Area: sidebar footer hover affordance.
- Key actions:
  - Updated the sidebar `Settings` button styles to render as a full-width hoverable surface.
  - Added a subtle hover shadow, hover background, and slight lift animation so the footer action reads as interactive.

### Design Intent

The previous hover treatment only changed text color and opacity, which was easy to miss in the sidebar footer. This change gives the settings row the same kind of lightweight depth cue already used elsewhere in the sidebar, making hover state clearer without turning the footer into a heavy primary action.

### Files Modified

- `app/globals.css`
