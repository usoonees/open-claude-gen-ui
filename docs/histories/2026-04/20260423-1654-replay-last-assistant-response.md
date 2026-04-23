## [2026-04-23 16:54] | Task: replay last assistant response

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js app router`

### User Query

> Add a replay button next to the copy button after the assistant finishes replying. Only the last assistant message should be replayable, and replay should stream the same backend response again in the frontend.

### Changes Overview

- Area: Chat UI actions and `/api/chat` streaming behavior
- Key actions:
  - Added a replay action beside assistant copy actions for the latest completed assistant turn only.
  - Reused the AI SDK `regenerate` request path, but short-circuited it server-side into a synthetic assistant replay instead of a fresh model generation.
  - Reconstructed replay streams from the latest saved assistant message by splitting saved text into small deltas and re-emitting the final tool states without storing transport-sized trace payloads.
  - Documented the new replay behavior in architecture and frontend verification docs.

### Design Intent

Replay should avoid another model call and stay close to the previous assistant turn without bloating chat storage. Using the existing regenerate transport avoids a second client streaming stack, while reconstructing a synthetic stream from the final saved assistant message keeps replay lightweight and deterministic enough for this UI.

### Files Modified

- `app/api/chat/route.ts`
- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260423-1654-replay-last-assistant-response.md`
- `lib/chat-replay.ts`
- `lib/chat-store.ts`
