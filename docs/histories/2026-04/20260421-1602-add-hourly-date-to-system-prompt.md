## [2026-04-21 16:02] | Task: Add hourly date to system prompt

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> add today's date to the end of system prompt, precise to hour

### Changes Overview

- Area: chat agent prompt construction and trace capture.
- Key actions:
  - Replaced the static `chatSystemPrompt` export with a runtime prompt builder so the current date does not go stale across requests.
  - Appended a final `Current date and time:` line formatted to the hour with the runtime UTC offset.
  - Updated both chat trace builders to capture the same prompt string and timestamp from a shared `Date` instance.

### Design Intent

The request needs a prompt value that reflects the actual current hour, not the hour when the server process first loaded the module. Building the prompt per request keeps the system prompt accurate while preserving the existing prompt content and saved-trace behavior.

### Files Modified

- `app/api/chat/history/route.ts`
- `app/api/chat/route.ts`
- `docs/histories/2026-04/20260421-1602-add-hourly-date-to-system-prompt.md`
- `lib/chat-agent.ts`
