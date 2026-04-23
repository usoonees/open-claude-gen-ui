## [2026-04-23 16:12] | Task: Tavily transport retries

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Node.js v24.14.0 local repo workspace`

### User Query

> Check a local chat conversation and explain why Tavily search fails first and then succeeds on retry many times.

### Changes Overview

- Area: Tavily reliability and chat-tool failure handling.
- Key actions:
  - Added bounded retry/backoff in `lib/tavily.ts` for transient fetch/connect failures.
  - Retried Tavily upstream responses for HTTP `408`, `429`, and `5xx` statuses.
  - Documented the current timeout/retry rule in `docs/RELIABILITY.md`.

### Design Intent

The observed failure mode was a transport-level connect timeout from Node/undici on the first Tavily request, followed by success on a second model-issued tool call. The fix keeps that transient upstream/network flake inside the Tavily client instead of leaking it into the model loop and depending on the model to retry ad hoc.

### Files Modified

- `lib/tavily.ts`
- `docs/RELIABILITY.md`
