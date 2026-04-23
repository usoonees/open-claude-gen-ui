## [2026-04-23 12:19] | Task: Match response language to user query

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> modify in system prompt, generate all the thing in same language as user query

### Changes Overview

- Area: chat agent prompt construction and architecture docs.
- Key actions:
  - Added a system-prompt rule that replies should use the same language as the user's latest message unless the user asks for a different language.
  - Updated the architecture map so the prompt behavior summary includes the new response-language rule.

### Design Intent

This behavior belongs in the backend-owned system prompt so it applies consistently across providers and saved chat traces instead of depending on frontend wording or model-specific defaults. Using the user's latest message keeps multilingual chats flexible while still making the default behavior predictable.

### Files Modified

- `docs/ARCHITECTURE.md`
- `docs/histories/2026-04/20260423-1219-match-response-language-to-user-query.md`
- `lib/chat-agent.ts`
