## [2026-04-20 19:50] | Task: add message copy button

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> add copy button to user sent query and response when hover to that message

### Changes Overview

- Area: chat message actions and hover affordances
- Key actions: added hover-revealed clipboard actions for both user and assistant messages, refined the control to an icon-only affordance, moved the user copy icon outside the message bubble on the left, and kept assistant copy below the reply with a short copied confirmation state

### Design Intent

The chat surface should keep message chrome quiet until the user interacts with a specific turn. The copy control now reads as lightweight utility chrome instead of a secondary button, and the user-message action sits outside the bubble so the prompt card stays visually intact while still exposing a fast reuse path.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260420-1950-add-message-copy-button.md`
