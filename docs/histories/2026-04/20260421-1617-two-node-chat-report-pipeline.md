## [2026-04-21 16:17] | Task: split chat agent into tool-call and report nodes

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> Redefine the agent system so it is split into two nodes: a first agent tool-call node with a `finish(reason)` tool, then another no-tool LLM node whose input is the tool-call trace and whose report summarizes the whole tool-call result.

### Changes Overview

- Area: chat backend pipeline and trace metadata
- Key actions:
  - Added a terminal `finish` tool so the tool-call node ends explicitly with a reason instead of producing the final answer itself.
  - Split chat prompting into a tool-call node prompt and a no-tool report node prompt, plus a serialized tool-trace handoff helper.
  - Replaced the direct single-agent route stream with a merged UI message stream that runs the tool-call `ToolLoopAgent` first and then a second `streamText` report pass.
  - Extended saved chat trace metadata and repository docs to reflect the two-node pipeline.

### Design Intent

The previous chat backend treated one `ToolLoopAgent` as both planner and final reporter. Splitting it into a tool-call node and a report node makes the terminal step explicit, keeps the tool phase legible as a standalone trace, and lets the final answer be generated from a structured summary input instead of whatever incidental context survived the loop.

### Files Modified

- `app/api/chat/route.ts`
- `app/api/chat/history/route.ts`
- `lib/chat-agent.ts`
- `lib/chat-store.ts`
- `lib/chat-tools.ts`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/RELIABILITY.md`
- `docs/exec-plans/active/resumable-chat-streams.md`
