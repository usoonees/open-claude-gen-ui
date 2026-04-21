## [2026-04-21 15:14] | Task: fix widget openLink bridge

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Runtime ReferenceError: `openLink is not defined` when clicking an SVG in a trusted-mode widget. Validate the behavior in Chrome and clarify whether the expected action should be `sendPrompt` or link opening.

### Changes Overview

- Area: trusted-mode generative UI widget host
- Key actions:
  - Added a sanitized `window.openLink(url)` bridge for widget SVG handlers.
  - Intercepted widget anchor clicks so `http(s)` links open in a new tab instead of replacing the chat surface.
  - Updated trusted-mode docs and widget guidelines to describe the actual host link behavior.

### Design Intent

`sendPrompt()` and `openLink()` serve different purposes. `sendPrompt()` creates a new user turn when the widget wants more model reasoning. `openLink()` is for source citations and other outbound navigation from widget UI. The fix keeps that separation explicit while limiting `openLink()` to sanitized `http(s)` URLs opened with `noopener,noreferrer`.

### Files Modified

- `components/chat-shell.tsx`
- `components/generative-widget.tsx`
- `lib/generative-ui/browser-links.ts`
- `lib/generative-ui/reference-guidelines.ts`
- `docs/FRONTEND.md`
- `docs/SECURITY.md`
- `docs/exec-plans/active/20260420-generative-ui.md`
