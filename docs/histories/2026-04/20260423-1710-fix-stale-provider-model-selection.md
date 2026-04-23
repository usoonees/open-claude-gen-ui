## [2026-04-23 17:10] | Task: fix stale provider model selection

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js + TypeScript`

### User Query

> The model or endpoint `minimax/minimax-m2.7` does not exist or you do not have access to it.
>
> Why did model selection allow choosing it under Volcengine even though it is not available in model management?

### Changes Overview

- Area: model picker state consistency for provider-backed model lists.
- Key actions:
  - Traced the failing chat to a saved `Volcengine ACK` selection using `minimax/minimax-m2.7`.
  - Identified that provider model loads in the browser were merged with prior in-memory state, which let stale synced model ids remain selectable after later refreshes.
  - Changed provider-backed model loading so a successful refresh replaces the previous synced list instead of unioning with it, while still preserving configured suggested models.

### Design Intent

Provider-backed sync results should be treated as authoritative for the picker surface. Keeping old synced ids around makes the UI lie about what is currently selectable for that provider and creates confusing cross-provider leakage when model catalogs change over time.

### Files Modified

- `components/chat-shell.tsx`
- `docs/histories/2026-04/20260423-1710-fix-stale-provider-model-selection.md`
