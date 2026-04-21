## [2026-04-21 12:11] | Task: remove widget height and slow loading chip

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> 1. rm height parameter
>
> 2. the loading message is not stick to the bottom of gen-ui content, this is a large blank, and the speed of switching between different loading_messages is too fast, make it slower

### Changes Overview

- Area: generative UI widget tool contract and streaming presentation
- Key actions:
  - Removed the `height` field from the normalized `showWidget` input and from the tool schema.
  - Removed preferred-height handling from the inline widget render path and the downloaded `final-widget.html` wrapper.
  - Nested the streaming loading chip with the live widget content so it anchors to the rendered widget bottom-left edge instead of the larger outer frame.
  - Slowed loading-message rotation from 1.4 seconds to 2.8 seconds per message.
  - Updated frontend verification guidance to reflect the new loading-chip placement and the absence of model-supplied height hints.

### Design Intent

The widget tool should stay minimal and explicit, so model-controlled layout hints that create blank space are better removed than compensated for in CSS. Anchoring the chip to the actual rendered widget content keeps the loading state visually attached to what is streaming, and the slower rotation makes progress labels readable instead of noisy.

### Files Modified

- `lib/generative-ui/show-widget-input.ts`
- `lib/chat-tools.ts`
- `components/chat-shell.tsx`
- `components/generative-widget.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
