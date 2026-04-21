## [2026-04-21 16:39] | Task: Tavily default eight results

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> What's the Tavily tool call? Use 8 results, not just 5.

### Changes Overview

- Area: Tavily search tool defaults
- Key actions:
  - Changed the server-side Tavily client default from `5` results to `8`
  - Updated the Tavily tool input schema description so the agent prefers `8` results by default

### Design Intent

The Tavily tool already allowed up to `8` results, but the runtime default and schema guidance still biased the agent toward `5`. This change aligns the default HTTP payload with the higher result count so broader web lookups return more source coverage without requiring the agent to specify `maxResults` every time.

### Files Modified

- `lib/tavily.ts`
- `lib/chat-tools.ts`
