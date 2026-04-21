## [2026-04-21 14:17] | Task: scope widget inline scripts

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local-cli`

### User Query

> Fix the chat page browser error: `Identifier 'tokens' has already been declared` from generative widget script execution.

### Changes Overview

- Area: trusted-mode generative widget rendering
- Key actions:
  - Added classic script type detection for inline widget scripts.
  - Wrapped inline classic widget script bodies in a block before reinserting them so repeated top-level `const` and `let` names do not collide in the page global lexical scope.
  - Left external scripts and non-classic inline scripts unchanged.

### Design Intent

Generated widgets often reuse generic names such as `tokens`. Block-scoping inline classic scripts prevents repeated widget renders from failing on global lexical redeclarations while preserving the existing DOM insertion execution path and CDN script allowlist behavior.

### Files Modified

- `components/generative-widget.tsx`
- `docs/histories/2026-04/20260421-1417-scope-widget-inline-scripts.md`
