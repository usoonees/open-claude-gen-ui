## [2026-04-21 10:54] | Task: Add widget HTML download

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Add a widget download button that outputs the HTML/widget code to a file, using a Claude chat as reference. Then change the output to a ZIP containing both the original fragment and a final standalone HTML file.

### Changes Overview

- Area: Chatbot generative UI widgets
- Key actions: Added an icon-only widget download control, generated browser-side ZIP archives with raw and final widget HTML files, and recorded the user-facing behavior in docs.

### Design Intent

The download action lives in the existing widget shell because the browser already has the final streamed widget code. This keeps the feature client-side, avoids expanding API surface area, and disables the action until the rendered widget is ready so partial streaming markup is not exported. The raw widget fragment is preserved separately from the standalone wrapper so callers can inspect or reuse exactly what the model/tool emitted.

### Files Modified

- `components/generative-widget.tsx`
- `app/globals.css`
- `docs/ARCHITECTURE.md`
- `docs/releases/feature-release-notes.md`
