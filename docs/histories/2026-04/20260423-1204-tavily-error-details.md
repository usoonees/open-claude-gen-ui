## [2026-04-23 12:04] | Task: Tavily error details in frontend

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> If Tavily search fails, the frontend should show why it failed, not just `fetch failed`; show the detail.

### Changes Overview

- Area: Tavily error handling and chat troubleshooting UX
- Key actions:
  - Wrapped the server-side Tavily `fetch()` call so transport failures now include the request endpoint plus nested error/cause details in the thrown message
  - Preserved common network diagnostics such as `code`, `errno`, `syscall`, `hostname`, `address`, and `port` when available
  - Updated frontend verification guidance so failed tool calls are expected to show detailed error text in the `Thinking` block

### Design Intent

The frontend already renders tool `errorText` directly, so the missing detail was in the server-side Tavily client. This change keeps the existing UI path intact and makes transient network failures diagnosable from the chat itself without requiring local log inspection.

### Files Modified

- `lib/tavily.ts`
- `docs/FRONTEND.md`
