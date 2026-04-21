## [2026-04-21 11:08] | Task: Preserve widget export size

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local Next.js app with Chrome DevTools comparison`

### User Query

> Explain why a chat-rendered generative UI widget looks different from its downloaded `final-widget.html` file.
>
> Follow-up: reduce the overly large gaps inside the inline widget.

### Changes Overview

- Area: Trusted-mode widget ZIP export.
- Key actions:
  - Compared computed styles between the inline chat widget and downloaded standalone HTML.
  - Found that the standalone wrapper expanded to the full browser width while the chat frame applied the tool-provided preferred width and height.
  - Updated exported `final-widget.html` generation to wrap fragments in a frame that preserves preferred width and minimum height.
  - Reset inline widget whitespace handling to `normal` so generated HTML indentation is not rendered as visible vertical gaps inside assistant messages.
  - Added frontend verification guidance for downloaded widget sizing.

### Design Intent

The downloaded HTML should be a faithful standalone preview of the inline chat widget. Preserving the same sizing hints keeps responsive layouts from changing shape just because the widget was opened outside the chat shell. Inline widgets also need to opt out of chat-message `pre-wrap` inheritance so HTML fragments behave like normal HTML instead of treating source indentation as layout.

### Files Modified

- `components/generative-widget.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
