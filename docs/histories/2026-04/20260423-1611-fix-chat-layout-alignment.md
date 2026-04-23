## [2026-04-23 16:11] | Task: fix sidebar and composer alignment

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js + TypeScript`

### User Query

> Fix three chat layout issues: align `Settings` with the conversation list, give the sidebar header count more breathing room, and align the chat input box with the message column. Verify the result in Chrome and share the screenshot.

### Changes Overview

- Area: chat shell layout polish.
- Key actions:
  - Added shared sidebar and chat-width layout tokens so footer rows, chat rows, and main chat content use the same horizontal rhythm.
  - Restyled the sidebar `Settings` row as a full-width list item with matching inset and hover surface.
  - Increased sidebar header inset so the chat count badge no longer feels cramped against the rail edge.
  - Aligned the message column and composer by narrowing the message list to the same visible width as the composer and reserving a stable scrollbar gutter.
  - Captured a Chrome verification screenshot at `artifacts/chat-layout-fix-20260423.png`.

### Design Intent

These fixes make the app read as one coordinated layout system instead of three adjacent components with slightly different spacing rules. The chosen approach centralizes the relevant widths and insets in CSS variables so future sidebar or composer tweaks stay aligned instead of drifting again.

### Files Modified

- `app/globals.css`
- `docs/histories/2026-04/20260423-1611-fix-chat-layout-alignment.md`
- `artifacts/chat-layout-fix-20260423.png`
