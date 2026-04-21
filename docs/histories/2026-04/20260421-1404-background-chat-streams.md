## [2026-04-21 14:04] | Task: keep chat streams alive across navigation

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local repository workspace`

### User Query

> When switching between different chats, the original chat stops rendering. Keep it streaming in the background so switching back shows the partial result and continues with the newest stream.

### Changes Overview

- Area: chat frontend stream state management
- Key actions:
  - Added per-chat AI SDK `Chat` controllers in the chat shell instead of one controller whose request is aborted on sidebar navigation.
  - Changed the chat transport request body to use the controller's chat id, keeping each stream tied to its own conversation.
  - Preserved local in-flight controller messages when reopening a chat, so history loading does not overwrite partial streamed output.
  - Kept explicit deletion as the path that stops and removes a chat controller.

### Design Intent

Switching chats should be a view change, not a generation cancellation. Keeping one controller per conversation lets hidden streams continue to consume server chunks and update their own message state. When the user returns to that chat, the UI subscribes to the existing controller and renders whatever has arrived so far.

### Files Modified

- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/histories/2026-04/20260421-1404-background-chat-streams.md`
