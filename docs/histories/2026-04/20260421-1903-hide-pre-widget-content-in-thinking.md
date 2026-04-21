## [2026-04-21 19:03] | Task: hide pre-widget assistant content in thinking

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Before the `show_widget` tool content appears, keep the agent's reasoning, content, and tool-call output inside the Thinking area instead of rendering it in the main message body. Only content that arrives after `showWidget` should render in the main area.

### Changes Overview

- Area: chat streaming, saved-chat normalization, and frontend verification guidance
- Key actions:
  - Rewrote pre-`showWidget` assistant `text` chunks into `reasoning` chunks on the server stream once widget intent is confirmed.
  - Normalized saved assistant messages so pre-widget prose reloads as reasoning without any client-side special handling.
  - Reverted the frontend-only part reclassification so the UI remains a pure renderer.
  - Added frontend verification guidance for the pre-widget/post-widget split.
  - Follow-up hardening: kept text-part ids in "converted to reasoning" state until their matching `text-end` arrives, even if `showWidget` starts mid-part.

### Design Intent

Widget-first turns should not show leading assistant prose above the widget when that prose is part of the same in-flight build-up. The chosen approach moves that logic into the backend stream and saved-message normalization so the frontend only renders message parts as received, while post-widget explanation still renders normally after the first widget appears.

The follow-up fix preserves stream validity for mixed widget turns where a pre-widget text part starts before `showWidget` but ends after the widget tool call begins. Without that tracking, the client could receive `reasoning-start` for a part and later a raw `text-end` for the same id, which breaks the AI SDK stream parser.

### Files Modified

- `app/api/chat/route.ts`
- `components/chat-shell.tsx`
- `lib/chat-store.ts`
- `lib/chat-widget-stream.ts`
- `docs/FRONTEND.md`
- `docs/ARCHITECTURE.md`
