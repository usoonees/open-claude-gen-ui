## [2026-04-21 15:48] | Task: fix collapsed new chat placement

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local repository workspace`

### User Query

> there is a "aria-label="Start a new chat" in top right, but normally it shouldn't appear, it should only appear once we collapse the sidebar, and it should appear near the sidebar icon, so we can click "new chat" even we collpase the sidebar

### Changes Overview

- Area: chat frontend header and sidebar controls
- Key actions:
  - Removed the always-visible top-right header `Start a new chat` icon from the main chat header.
  - Moved the header-level `Start a new chat` action into the leading header control group beside the sidebar toggle.
  - Reused the existing `mobile-only` visibility rule so the header `Start a new chat` icon only appears when the sidebar is collapsed on desktop, while remaining available in the compact mobile header.
  - Documented the expected desktop visibility and placement rule in the frontend verification guide.

### Design Intent

The primary `New Chat` action already lives inside the expanded sidebar, so a second always-visible header icon creates duplicate chrome and pulls attention to the wrong edge of the layout. The header fallback should only appear when the sidebar action is unavailable, and keeping it adjacent to the sidebar toggle makes the collapsed navigation controls read as one compact cluster.

### Files Modified

- `app/globals.css`
- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260421-1548-fix-collapsed-new-chat-placement.md`
