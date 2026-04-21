## [2026-04-21 17:47] | Task: fix chart widget script races

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Investigate the many Next.js/chart rendering errors in a saved conversation, verify whether a widget-size limit caused them, and fix the renderer if needed.

### Changes Overview

- Area: trusted-mode widget script execution
- Key actions:
  - prevented raw external widget scripts from becoming live before the controlled widget execution step
  - made inline classic widget scripts inert in the DOM and executed them manually inside widget scope
  - delayed external script `onload` callbacks until widget-scoped inline functions had been registered
  - made the ready-state widget effect idempotent so React dev-mode effect replays do not remount raw scripts over an already initialized chart
  - documented the chart reload regression case in the frontend guide

### Design Intent

The chart failures were not caused by widget length or truncation. The saved widget payload was complete, but the renderer still had two race conditions: external scripts could load before sanitization, and CDN `onload` callbacks could run before later inline init functions were registered. Running both script classes through one controlled widget runtime keeps chart widgets reliable under hard reloads, shadow-root isolation, and React dev-mode effect replays.

### Files Modified

- `components/generative-widget.tsx`
- `docs/FRONTEND.md`
