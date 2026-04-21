## [2026-04-21 12:43] | Task: show post-widget reasoning below render

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> no, I mean after the showWidget finish output, not in the streaming process, after it finish, agent will invoke another llm call, when call this llm, it will reason and output final content, in this process, the reasoning content will only show in the collapsed thinkink part, I wanna it show in under the widget too, the raw reasoning content, not just a word "thinking", but the streaming reason content, and it will vanished when the final content start to output.

### Changes Overview

- Area: assistant post-widget reasoning state
- Key actions:
  - Replaced the placeholder hint with the live reasoning markdown that arrives after the last `showWidget` tool part in the same assistant message.
  - Scoped the preview so it only appears while the widget is visible, the turn is still streaming, and final assistant text has not started yet.
  - Updated frontend verification guidance for the post-widget reasoning preview state.

### Design Intent

Once a widget is already visible, users still need to see the follow-up reasoning that happens before the final textual answer starts. Mirroring that live reasoning markdown under the widget keeps the next LLM pass legible without reopening the `Thinking` block or leaving redundant reasoning visible after the final answer begins.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
