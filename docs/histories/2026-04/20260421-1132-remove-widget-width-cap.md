## [2026-04-21 11:32] | Task: Remove widget width cap

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> Identify whether the inline generative UI widget width cap comes from frontend code or backend/LLM output, then remove the cap so widgets use the same width as message content. Follow-up: remove root widget padding/font-family chrome that appears inside generated widget HTML.

### Changes Overview

- Area: Chat generative UI widget rendering
- Key actions: Removed the model-supplied widget width hint from the showWidget tool schema, chat render path, inline widget frame styles, and downloaded standalone widget wrapper. Added a narrow render/export normalization step that strips generated outer-wrapper `font-family: var(--font-sans)` and its paired padding, and updated generation guidance to avoid that wrapper.

### Design Intent

Inline widgets should behave like normal assistant message content. The frontend still accepts a minimum height hint for loading and layout stability, but horizontal sizing and outer spacing now come from the chat message column instead of model-selected width or generated root padding. The normalization only targets a single generated outer wrapper using the host font token so inner card/list padding remains intact.

### Files Modified

- `components/generative-widget.tsx`
- `components/chat-shell.tsx`
- `lib/chat-tools.ts`
- `lib/chat-agent.ts`
- `lib/generative-ui/reference-guidelines.ts`
- `docs/FRONTEND.md`
