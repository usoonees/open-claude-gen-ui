## [2026-04-21 16:58] | Task: keep loading visible until final assistant finish

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> the loading should always show until final assistant finished, and there two loading style, three dot and loading_message in showWidget, you should only render three dot all the time except the showWidget render the loading_messasge

### Changes Overview

- Area: assistant streaming loading affordances
- Key actions:
  - Changed the assistant-level loading dots to stay visible for the full in-flight assistant turn instead of disappearing as soon as any visible output appears.
  - Suppressed the generic dots only while an in-progress `showWidget` part is actively rendering its own `loadingMessages` status line.
  - Moved the generic dots to the end of the rendered assistant content so they read as a continuation marker for unfinished output.
  - Updated frontend verification guidance to reflect the full-turn dots behavior and the `showWidget` exception.

### Design Intent

The loading affordance should communicate whether the assistant turn is actually finished, not whether some partial output is already on screen. Keeping the three-dot indicator visible until the stream ends makes unfinished assistant turns legible, while deferring to the widget-specific `loadingMessages` during active `showWidget` streaming avoids showing two competing loaders at once.

### Files Modified

- `components/chat-shell.tsx`
- `docs/FRONTEND.md`
