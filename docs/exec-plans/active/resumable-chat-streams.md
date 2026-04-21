# Resumable Chat Streams

## Goal

Make active chat generations survive browser refresh, tab close/reopen, and route remounts. A refreshed client should reload the saved conversation, reconnect to the active backend stream when one exists, render the partial assistant result, and continue receiving new chunks until completion.

## Scope

- In scope:
  - Persist active stream metadata on each chat record.
  - Store/replay the outbound AI SDK UI message SSE stream through a resumable stream backend.
  - Add a chat stream resume endpoint.
  - Enable client-side resume for chat controllers.
  - Persist partial message state at meaningful checkpoints so history is useful even if resume is unavailable.
  - Document operational requirements and verification steps.
- Out of scope:
  - Multi-user auth and authorization.
  - Long-term production queue orchestration.
  - Cross-device sync beyond stream replay from the same chat id.

## Context

- Relevant docs:
  - `docs/ARCHITECTURE.md`
  - `docs/RELIABILITY.md`
  - AI SDK `Chatbot Resume Streams`
  - `resumable-stream` package README
- Relevant code paths:
  - `components/chat-shell.tsx`
  - `app/api/chat/route.ts`
  - `app/api/chat/history/route.ts`
  - `lib/chat-store.ts`
- Constraints:
  - The current chat route uses `createAgentUIStreamResponse`, not plain `streamText`.
  - The AI SDK resume path requires `consumeSseStream` and a `GET /api/chat/[id]/stream` reconnect endpoint.
  - Stream resumption is incompatible with normal browser abort semantics; refresh recovery requires the backend producer to keep consuming the stream after client disconnect.
  - File-backed chat JSON can track `activeStreamId` and partial messages, but replaying missed chunks needs a stream buffer/pubsub backend such as Redis.

## Proposed Architecture

1. Add stream metadata to stored chats:
   - `activeStreamId?: string | null`
   - `activeStreamStartedAt?: string`
   - `activeStreamUpdatedAt?: string`
   - optional `activeStreamStatus?: "streaming" | "complete" | "error"`
2. Add a reusable server helper that creates `createResumableStreamContext({ waitUntil: after })`.
3. In `POST /api/chat`:
   - validate `id` and incoming messages;
   - clear stale active stream metadata before starting a new turn;
   - call `createAgentUIStreamResponse`;
   - in `consumeSseStream`, create a new resumable stream id and save it on the chat record;
   - in `onStepFinish`, persist partial messages so `/api/chat/history` can show progress if resume fails;
   - in `onFinish`, persist final messages and clear active stream metadata.
4. Add `GET /api/chat/[id]/stream`:
   - read chat metadata;
   - return `204` if no active stream exists;
   - call `resumeExistingStream(activeStreamId)`;
   - return `UI_MESSAGE_STREAM_HEADERS`.
5. In `components/chat-shell.tsx`:
   - enable `resume` for persisted chat controllers only;
   - set `prepareReconnectToStreamRequest` to `/api/chat/${id}/stream`;
   - avoid `stop()` as a normal navigation cleanup path;
   - treat explicit stop/delete as cancellation, and clear active stream metadata through a dedicated endpoint if needed.

## Open Decisions

- Stream backend:
  - Recommended: Redis-compatible backend with `resumable-stream`.
  - Local-only fallback: no full replay; only partial message persistence. This is less correct for refresh during fast streams.
- Stop behavior:
  - Recommended: when resume is enabled, replace the current client abort button with a server-side cancel action that marks the chat stream canceled and prevents further resume.
  - Alternative: keep client abort, but accept that using it intentionally breaks resumability for that stream.
- Partial persistence cadence:
  - Recommended: persist on each agent step and on finish. This is lower write volume and captures tool-loop progress.
  - Higher fidelity: also persist throttled stream chunks. More accurate after resume failures, but noisier and more complex.

## Risks

- Risk: Redis or pub/sub configuration is missing in local/dev environments.
  - Mitigation: fail gracefully with `204` resume responses and rely on saved partial messages; document required env vars.
- Risk: stale `activeStreamId` leaves the UI trying to resume a completed or expired stream.
  - Mitigation: clear metadata on finish, clear on resume miss/error, and store timestamps for cleanup.
- Risk: duplicate active streams for one chat if a new user turn starts before an old stream finishes.
  - Mitigation: clear old metadata before starting and block sends while the active controller is busy.
- Risk: explicit stop conflicts with resumability.
  - Mitigation: make cancellation a server-recognized state rather than a route-switch side effect.

## Milestones

1. Design alignment and dependency choice.
2. Store schema and chat-store helpers.
3. Resumable stream backend helper and resume endpoint.
4. Chat POST route stream metadata, partial persistence, and cleanup.
5. Client reconnect wiring and cancellation behavior.
6. Verification, docs, and history entry.

## Validation

- Commands:
  - `pnpm check`
  - `pnpm build`
- Manual checks:
  - Start a long response, refresh the active chat page, confirm it reconnects and continues.
  - Start a long response, open another chat, refresh, reopen the original chat, confirm partial output is available.
  - Let a stream finish after refresh, confirm final messages persist and `activeStreamId` clears.
  - Try a resume after stream expiration, confirm the UI falls back to persisted partial/final history without crashing.
- Observability checks:
  - Log stream id creation, resume hit/miss, finish cleanup, and resume errors without logging secrets.

## Progress Log

- [x] Milestone 1: Initial design drafted.
- [ ] Milestone 2
- [ ] Milestone 3
- [ ] Milestone 4
- [ ] Milestone 5
- [ ] Milestone 6

## Decision Log

- 2026-04-21: Draft design uses AI SDK `consumeSseStream` plus `resumable-stream`, because browser memory and final-only chat JSON cannot preserve an active stream across refresh.
