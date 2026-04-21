## [2026-04-21 14:02] | Task: Hide user role label

### Execution Context

- Agent ID: Codex
- Base Model: GPT-5
- Runtime: Codex CLI

### User Query

> don't need to show the user role in frontend

### Changes Overview

- Area: chat frontend
- Key actions: removed the visible `You` role label from rendered user messages while keeping user message content and copy controls unchanged.

### Design Intent

User messages are already visually distinguished by alignment and bubble styling, so the explicit user role label adds noise without improving scanability.

### Files Modified

- `components/chat-shell.tsx`
