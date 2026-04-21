## [2026-04-21 17:37] | Task: widget script onload scope

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Investigate repeated `initCalculator is not defined` errors when clicking inside a startup runway planner widget and fix the widget renderer.

### Changes Overview

- Area: trusted-mode widget script execution
- Key actions:
  - added a per-widget function registry for named callbacks declared in inline widget scripts
  - routed external CDN script `onload` handlers through the widget-scoped runtime instead of page-global scope
  - preserved shadow-root isolation while restoring support for patterns like `onload="initCalculator()"`
  - documented browser verification for CDN script widgets with named `onload` callbacks

### Design Intent

Shadow-root isolation fixed CSS leakage, but it also stopped named functions declared inside inline widget scripts from being visible to external script `onload` handlers. The renderer now keeps callback resolution local to each widget so external libraries can initialize safely without reopening global document/style leakage.

### Files Modified

- `components/generative-widget.tsx`
- `docs/FRONTEND.md`
