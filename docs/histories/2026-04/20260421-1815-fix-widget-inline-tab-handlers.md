## [2026-04-21 18:15] | Task: fix widget inline tab handlers

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> `switchTab is not defined`
>
> for this conversation: `http://localhost:3000/chat/aa6404ef-bb74-450c-b148-f7117169505b`, there is a widget contains switch tab, but when I click tab, it raise above error

### Changes Overview

- Area: trusted-mode widget event execution
- Key actions:
  - converted non-script inline widget event attributes such as `onclick` into inert `data-widget-event-*` attributes before DOM mount
  - rebound those handlers as widget-scoped event listeners so names declared in inline widget scripts resolve without leaking into page-global scope
  - expanded inline function-name capture to include variable-assigned function expressions and arrow functions
  - documented manual verification for saved widgets that use inline tab switching

### Design Intent

Shadow-root isolation and scoped script execution fixed earlier global leakage bugs, but raw DOM event attributes still resolved identifiers like `switchTab(...)` against the page global scope. Rebinding inline handlers into the same per-widget runtime restores tabbed and button-driven widgets without reopening cross-widget name collisions.

### Files Modified

- `components/generative-widget.tsx`
- `docs/FRONTEND.md`
