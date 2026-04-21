## [2026-04-21 20:49] | Task: tighten markdown list spacing

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> The gap between markdown list items is too large. Tighten it on the local chat page and keep it visually pleasant.

### Changes Overview

- Area: chat markdown presentation
- Key actions:
  - Set the base `.markdown-body ul, .markdown-body ol` line-height to `1` per follow-up request.
  - Reduced markdown list-item line-height to make ordered and unordered lists read more compactly.
  - Tightened vertical spacing between sibling list items.
  - Reduced the left padding and top offset for nested lists inside list items.
  - Generalized the custom markdown list-item renderer so nested lists that arrive as inline content plus `ul/ol` now also get compact lead-in spacing, not just `p + ul` shapes.
  - Tightened nested list typography further so second-level bullets use a denser line-height and smaller between-item gap than top-level bullets.
  - Verified the result on `http://localhost:3000/chat/91772330-b309-4562-b776-ce755d4bc443`.

### Design Intent

The previous spacing was technically readable but visually loose, especially for ordered items that contained nested bullets. This change keeps the lists legible while making the rhythm denser and cleaner so assistant markdown feels more intentional in chat.

### Files Modified

- `app/globals.css`
- `components/chat-shell.tsx`
