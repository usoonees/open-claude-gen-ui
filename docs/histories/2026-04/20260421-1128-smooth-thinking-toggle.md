## [2026-04-21 11:28] | Task: smooth thinking toggle animation

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> make the thinking collapse and expand more smooth, add animation for it

### Changes Overview

- Area: chat frontend thinking block
- Key actions:
  - Replaced the native `details` thinking disclosure with an accessible button-controlled section.
  - Added CSS grid-row, opacity, transform, and chevron transitions so expand and collapse animate smoothly.
  - Kept reduced-motion users on a non-animated path.
  - Updated frontend verification guidance for smooth auto-collapse.

### Design Intent

Native `details` removes hidden content before the close transition can play. A controlled wrapper keeps the content in layout long enough to animate height, opacity, and position while preserving the existing auto-open and auto-collapse behavior.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
