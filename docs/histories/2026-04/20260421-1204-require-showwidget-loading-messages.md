## [2026-04-21 12:04] | Task: require showWidget loading messages

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> `"loadingMessages"` ... it shouldn't be optional, it's a must

### Changes Overview

- Area: generative UI tool contract
- Key actions:
  - Updated the `showWidget` JSON schema to require `loadingMessages`.
  - Tightened the typed tool input so `loadingMessages` is no longer optional.
  - Added a runtime guard that rejects `showWidget` calls missing `loadingMessages` or passing an empty array.
  - Updated frontend verification guidance to reflect the required loading-state input.

### Design Intent

The loading chip is part of the expected widget streaming behavior, so the tool contract should enforce that requirement instead of treating it as best-effort metadata. Making the field mandatory keeps the model, the tool schema, and the UI expectations aligned.

### Files Modified

- `lib/chat-tools.ts`
- `docs/FRONTEND.md`
