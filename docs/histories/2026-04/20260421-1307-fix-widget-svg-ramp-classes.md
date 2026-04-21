## [2026-04-21 13:07] | Task: fix widget SVG ramp classes

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `local Next.js dev server and Chrome DevTools CLI`

### User Query

> The diagram at a saved chat URL is all black; fix it and verify with Chrome.

### Changes Overview

- Area: trusted-mode generative widget rendering
- Key actions:
  - Added host CSS for documented SVG helper classes used by generated diagrams.
  - Restored ramp fills and strokes for `c-*` SVG shapes, default text classes, arrow lines, leader lines, and clickable node cursor behavior.
  - Documented the widget host SVG helper-class contract in the frontend guide.

### Design Intent

Generated SVG widgets were instructed to use host-provided classes such as `c-blue`, `c-purple`, `arr`, `th`, and `ts`, but the chat page only reset SVG defaults. Missing class definitions let SVG shapes fall back to black fills. Defining the documented classes at the widget host fixes existing saved widgets without rewriting persisted chat data and keeps future generated diagrams aligned with the advertised contract.

### Files Modified

- `app/globals.css`
- `docs/FRONTEND.md`
