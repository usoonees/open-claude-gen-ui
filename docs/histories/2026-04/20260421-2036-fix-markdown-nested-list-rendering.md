## [2026-04-21 20:36] | Task: fix markdown nested list rendering

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Fix markdown list rendering on the local chat page where nested bullets under ordered items were not displaying correctly.

### Changes Overview

- Area: chat markdown rendering
- Key actions:
  - Updated markdown list CSS to stop using grid layout on `ol` and `ul`, which interfered with native list-item marker layout.
  - Added a custom `ReactMarkdown` list-item renderer that unwraps leading paragraph nodes inside list items into inline content so nested ordered lists render on a single line with their markers.
  - Verified the fix on `http://localhost:3000/chat/b3b7752c-76a0-4bba-ae9b-2d429c6d8b6f`.

### Design Intent

The rendered markdown was structurally correct, but browser layout for `li > p + ul` produced awkward ordered-list markers and broken nesting. The fix keeps markdown parsing unchanged and normalizes only the presentation layer so saved chat content renders predictably without altering message data.

### Files Modified

- `app/globals.css`
- `components/chat-shell.tsx`
