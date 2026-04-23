## [2026-04-23 14:48] | Task: hidden gen-ui user reminder

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js app router + pnpm`

### User Query

> If generative UI mode is on, add a hidden per-user-turn reminder that pushes the assistant to call `visualizeReadMe` and `showWidget` as much as possible unless the prompt is just a greeting. Fix the grammar and keep it out of the frontend.

### Changes Overview

- Area: chat transcript hardening and docs
- Key actions:
  - Added shared hidden-reminder helpers so transport-only reminder text can be stripped back out of user-visible content.
  - Routed chat rendering, copied text, sidebar titles, generated titles, and persisted chat cleanup through the same sanitizer.
  - Ensured older saved chats that already contain the reminder are cleaned on read and on rewrite instead of continuing to leak the suffix.

### Design Intent

The reminder is transport-only metadata. Once it reaches any UI, copy, title, or persistence path, it is a bug. Centralizing the sanitizer keeps the rendering and storage layers consistent and also cleans up older saved chats that were already contaminated.

### Files Modified

- `components/chat-shell.tsx`
- `docs/histories/2026-04/20260423-1448-hidden-gen-ui-user-reminder.md`
- `lib/chat-hidden-reminders.ts`
- `lib/chat-store.ts`
- `lib/chat-title.ts`
