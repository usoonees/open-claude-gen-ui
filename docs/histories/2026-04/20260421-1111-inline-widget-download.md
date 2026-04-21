## [2026-04-21 11:11] | Task: Inline widget download control

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Tweak the gen-ui widget: remove the live button, show the download button only on hover, keep the download control from taking a separate content column, and make widgets look like normal text content rather than nested cards.

> Follow-up: remove the `Building interactive view...` loading text and move the download button to the same assistant message action row as the copy button, showing it only when a gen-ui widget exists.

### Changes Overview

- Area: Chat generative UI widget rendering and message actions.
- Key actions: Removed the visible widget header/status row, changed the ZIP download action to a hover/focus message action beside copy, removed the widget frame border, radius, padding, and default host minimum height, and dropped the fallback `Building interactive view...` text.

### Design Intent

Generated widgets should read as part of the assistant response instead of a nested card. The download action remains available after rendering completes, but it now uses the same quiet per-message action pattern as copying so the widget itself stays visually clean while partial widget streams avoid redundant fallback text.

### Files Modified

- `components/generative-widget.tsx`
- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
- `docs/releases/feature-release-notes.md`
