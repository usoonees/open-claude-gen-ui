## [2026-04-21 17:22] | Task: widget shadow isolation

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Investigate a broken chat render in Chrome DevTools, then fix the case where a large black cross leaked into the sidebar instead of staying inside the widget.

### Changes Overview

- Area: trusted-mode generative widget rendering
- Key actions:
  - moved inline widget rendering into an isolated shadow-root host
  - added shadow-host base styles so widget SVG helper classes still resolve inside the isolated renderer
  - scoped inline widget scripts to the widget root instead of the whole document
  - documented the new renderer boundary in architecture and frontend docs

### Design Intent

The saved chat contained widget-authored global CSS (`svg { ... }`) that leaked into the surrounding app and restyled sidebar icons. Rendering widgets inside a shadow root preserves the same inline-widget behavior while making generated CSS and DOM lookups local to the widget host, which is the safer default for model-authored HTML.

### Files Modified

- `components/generative-widget.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
