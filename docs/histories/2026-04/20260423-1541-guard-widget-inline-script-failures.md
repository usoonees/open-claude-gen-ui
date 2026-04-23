## [2026-04-23 15:41] | Task: guard widget inline script failures

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Fix the frontend bug where a widget inline script throws `Unexpected token ')'` from `runScopedInlineClassicScript` in `components/generative-widget.tsx`.

### Changes Overview

- Area: trusted widget runtime
- Key actions:
  - Wrapped inline widget script, callback, and inline-event execution in a shared guarded executor that catches compile and runtime failures.
  - Collected widget execution failures as local runtime errors so malformed widget JavaScript no longer escapes through React and breaks the page.
  - Updated the frontend verification guide to cover widget-local error rendering for malformed inline scripts.

### Design Intent

Trusted widgets are model-generated and can occasionally produce invalid JavaScript. The renderer should isolate those failures to the affected widget, log enough detail for debugging, and keep the rest of the chat surface interactive instead of letting `new Function(...)` exceptions crash the whole UI.

### Files Modified

- `components/generative-widget.tsx`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260423-1541-guard-widget-inline-script-failures.md`
