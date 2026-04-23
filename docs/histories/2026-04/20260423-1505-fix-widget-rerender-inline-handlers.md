## [2026-04-23 15:05] | Task: fix widget rerender inline handlers

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js dev app with local browser verification`

### User Query

> Fix the `showSwapOptions is not defined` error for the conversation at `/chat/ee87fd58-dbf9-4f63-8443-0ee6f1cacfee`.

### Changes Overview

- Area: trusted widget runtime
- Key actions:
  - Added a widget-host mutation observer that reapplies inline event-handler normalization and scoped binding after widget-side DOM rerenders.
  - Reused the same sync path after initial script execution so saved widgets and later dynamic markup follow one binding path.
  - Updated the frontend guide to document that widget-scoped inline handlers continue working after `innerHTML`-driven rerenders.

### Design Intent

The failing meal-planner widget rebuilt its meal cards with fresh `onclick` attributes after the initial mount pass. Those later nodes never went through the widget runtime's scoped rebinding step, so clicks fell back to unresolved global handler names inside the shadow root. The fix hardens the renderer instead of patching one saved conversation, which keeps existing and future widgets interactive even when they redraw their own DOM.

### Files Modified

- `components/generative-widget.tsx`
- `docs/FRONTEND.md`
