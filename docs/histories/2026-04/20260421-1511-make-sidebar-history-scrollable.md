## [2026-04-21 15:11] | Task: make sidebar history scrollable

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local repository workspace`

### User Query

> looks like the sidebar item can't scroll, make it scrollable, I may have many conversation list

### Changes Overview

- Area: chat frontend sidebar layout
- Key actions:
  - Added missing `min-height: 0` constraints to the sidebar flex stack so the history region can shrink within the viewport.
  - Split the chat history into its own `.sidebar-history-list` scroll container, keeping the section header outside the scrolling region.
  - Moved the conversation row rendering into the new scrollable wrapper without changing chat actions or navigation behavior.
  - Refined the history scrollbar so it stays visually hidden at rest and only appears on hover or keyboard focus, using muted neutral tones that match the sidebar surface.
  - Raised the sidebar `New Chat` button to a firmer 44px control height with stronger padding so it reads as a primary sidebar action.
  - Reworked sidebar rows so the title can use the full line width at rest, and only yields space to the options trigger on hover or focus.
  - Extended only the scroll region to the sidebar edge so the scrollbar sits flush right while row content stays inside the visible column.
  - Retuned the hovered scrollbar track and thumb border to use the sidebar’s own neutral surface color instead of a separate white lane.

### Design Intent

The conversation history should remain usable when the saved chat count grows, but the scrolling affordance should not dominate the sidebar when idle. Constraining the flex ancestors and isolating the list as the scrollable region makes overflow behavior explicit, while the hover-only scrollbar keeps the panel visually calm and visually merged with the sidebar surface. The row layout now prioritizes title readability first and treats the options trigger as overlay chrome, and the larger `New Chat` button restores balance in the sidebar control stack.

### Files Modified

- `app/globals.css`
- `components/chat-shell.tsx`
- `docs/histories/2026-04/20260421-1511-make-sidebar-history-scrollable.md`
