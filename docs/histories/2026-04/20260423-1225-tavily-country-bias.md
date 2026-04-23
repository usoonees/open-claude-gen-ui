## [2026-04-23 12:25] | Task: Tavily country bias by user language

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Add a new optional Tavily parameter `country="china"` with a China default, allow `united states`, and have the country chosen from user language: Chinese -> China, English -> United States.

### Changes Overview

- Area: Tavily search tool contract and agent guidance
- Key actions:
  - Added an optional `country` field to the `tavilySearch` tool schema with `china` and `united states` as allowed values
  - Updated the server-side Tavily client to default `country` to `china`
  - Sent `country` to Tavily only for `topic: "general"` because Tavily documents that constraint
  - Updated the chat system prompt so the agent chooses `china` for Chinese user messages and `united states` for English user messages by default

### Design Intent

This change keeps the runtime default conservative and explicit while giving the agent a simple language-based regional bias for general web search. The server omits `country` for news searches so the tool does not send a parameter Tavily does not apply for that topic.

### Files Modified

- `lib/chat-tools.ts`
- `lib/tavily.ts`
- `lib/chat-agent.ts`
- `docs/histories/2026-04/20260423-1225-tavily-country-bias.md`
