## [2026-04-21 20:21] | Task: Add timezone references to system prompt

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> add time with time zone to system prompt, in this way, when I say today's ai news, it know the different time happen in china and usa

### Changes Overview

- Area: chat agent prompt construction.
- Key actions:
  - Replaced the single local-server timestamp line with explicit China, U.S. Pacific, and U.S. Eastern time references.
  - Added prompt guidance that relative-time news requests such as `today` and `latest` should account for cross-region day-boundary differences and call out the relevant timezone when needed.

### Design Intent

The earlier hourly timestamp gave the model only one local server time, which is not enough for cross-region news prompts where China and the United States can be on different calendar days. Adding named timezone references directly into the prompt keeps the request simple while making relative-date reasoning more reliable for AI news queries.

### Files Modified

- `docs/histories/2026-04/20260421-2021-add-timezone-references-to-system-prompt.md`
- `lib/chat-agent.ts`
