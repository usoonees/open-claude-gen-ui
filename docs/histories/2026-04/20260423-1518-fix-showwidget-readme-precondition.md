## [2026-04-23 15:18] | Task: fix showWidget readme precondition

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Check this conversation trace: `visualizeReadMe` already ran before `showWidget`, but the first `showWidget` tool call still says it did not.

### Changes Overview

- Area: generative UI tool execution, saved-chat sanitization, regression coverage
- Key actions:
  - Recovered malformed embedded `showWidget` parameters such as a title leaking through pseudo-XML fragments.
  - Changed `showWidget` to trust actual prior `visualizeReadMe` tool results in model messages instead of only the model-provided `iHaveSeenReadMe` flag.
  - Sanitized saved assistant messages to strip the specific false precondition error when a completed `visualizeReadMe` already existed and a later `showWidget` succeeded.
  - Added a small regression test covering malformed input recovery and prior-readme detection.

### Design Intent

The bug came from provider-emitted malformed tool arguments, not from the conversation actually skipping `visualizeReadMe`. The fix hardens the tool boundary against partial argument corruption and removes a misleading historical error from saved chats without hiding genuine precondition failures where no prior readme result exists.

### Files Modified

- `lib/generative-ui/show-widget-input.ts`
- `lib/generative-ui/show-widget-validation.ts`
- `lib/chat-tools.ts`
- `lib/chat-store.ts`
- `lib/generative-ui/show-widget-input.test.mjs`
