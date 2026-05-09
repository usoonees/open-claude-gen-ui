## [2026-04-24 12:21] | Task: Codex CLI chat runtime

### Execution Context

- Agent ID: Codex
- Base Model: GPT-5
- Runtime: Local Next.js repository

### User Query

> Use `codex exec --json` directly, read Codex results, expose `visualizeReadMe` and `showWidget` as MCP tools to Codex, and render `showWidget` in this system while it streams.

Follow-up: switch the Codex transport to `codex app-server`, matching the richer protocol used by Codex editor integrations, instead of staying on `codex exec --json`.

### Changes Overview

- Area: Chat runtime and generative UI tool transport
- Key actions:
  - Added an opt-in `CHAT_AGENT_RUNTIME=codex` path for `/api/chat`.
  - Added a Codex app-server JSON-RPC to AI SDK UI stream adapter.
  - Persisted Codex thread ids per app chat so later turns resume the same Codex session.
  - Added a repo-local stdio MCP server that exposes `visualizeReadMe` and `showWidget` to Codex CLI.
  - Added a bridge tool-call fallback for Codex CLI sessions where the configured MCP server is listed but the tools are not surfaced to the model.
  - Streamed bridge tool inputs back as `tool-input-delta` chunks so the UI can show intermediate tool arguments before the final tool output.
  - Fixed bridge close-tag boundary handling so split `</CodexToolCall>` tokens do not leak into tool input or attach the next bridge call to the previous tool id.
  - Switched the opt-in Codex runtime from `codex exec --json` to `codex app-server --listen stdio://` after local probes showed app-server emits richer delta notifications.
  - Added compact `showWidget` input previews to the thinking/tool panel.
  - Documented Codex runtime environment variables.

### Design Intent

The change keeps the existing provider-backed `ToolLoopAgent` path as the default and adds Codex CLI as an explicit runtime switch. The adapter emits the same AI SDK tool chunks already consumed by the frontend, so the widget renderer does not need a parallel implementation. The MCP server is configured when launching `codex app-server` to keep the setup repo-local and avoid mutating the user's global Codex config.

Direct Codex CLI probes showed `codex exec --json` emits only item start/completion records for command execution, while `codex app-server` emits delta notifications such as `item/agentMessage/delta` and `item/commandExecution/outputDelta`. The adapter now uses app-server for the chat runtime and still accepts explicit `<CodexToolCall ...>` bridge blocks from Codex, executes the same local tool validation/rendering path, hides those bridge blocks from the final assistant text, and emits normal UI tool chunks.

### Verification

- `pnpm check`
- `pnpm build`
- Raw MCP JSON-RPC `tools/list` smoke test
- `/api/chat` SSE smoke test with `CHAT_AGENT_RUNTIME=codex`
- Browser E2E on `http://localhost:3007`: submitted a widget request, observed streamed `visualizeReadMe` and `showWidget` tool chunks in the `/api/chat` response, and verified the inline SVG widget rendered in the chat.
- Browser streaming E2E on `http://localhost:3007/chat/72ead750-7d10-49b5-82e1-9ca2cacb3a6b`: sampled the live widget DOM during generation and observed the rendered widget HTML grow over multiple samples before final `Done.`; the `/api/chat` response contained a distinct `showWidget` tool id with 388 `tool-input-delta` events.

### Files Modified

- `app/api/chat/route.ts`
- `components/chat-shell.tsx`
- `lib/codex-cli-chat.ts`
- `scripts/codex-gen-ui-mcp.mjs`
- `.env.example`
- `docs/ARCHITECTURE.md`
