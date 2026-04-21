## [2026-04-21 18:35] | Task: revert chat back to a single agent

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> revert the two stage tool call and report node, just use one

### Changes Overview

- Area: chat backend flow and matching docs
- Key actions:
  - Removed the two-stage tool-call/report pipeline and restored a single `ToolLoopAgent` chat route.
  - Removed the terminal `finish` tool and the extra report-prompt/trace-shape plumbing that only existed for the split flow.
  - Kept the stronger gen-ui widget bias in the remaining single-agent system prompt.
  - Updated architecture, reliability, frontend, and resumable-stream docs to describe the restored single-agent behavior.

### Design Intent

The two-stage pipeline added extra orchestration and trace complexity without being required for the current product behavior. This revert keeps the richer generative-widget prompting improvements while returning the runtime to one explicit agent loop, which is simpler to reason about, stream, and document.

### Files Modified

- `lib/chat-agent.ts`
- `app/api/chat/history/route.ts`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/exec-plans/active/resumable-chat-streams.md`
