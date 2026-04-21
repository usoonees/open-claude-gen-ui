## [2026-04-21 12:34] | Task: require visible readme before widget

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> add a limitation to the prompt, don't call visualizeReadMe and show widget together, must call visualizeReadMe first, and don't say it's a silent, it's an obvious call

### Changes Overview

- Area: agent prompt and generative UI tool contract
- Key actions:
  - Updated the trusted-mode agent prompt to require `visualizeReadMe` as an explicit visible tool call before any `showWidget` call.
  - Added a sequencing rule that forbids `visualizeReadMe` and `showWidget` from being called in the same assistant message or tool step.
  - Updated the frontend verification guide so the expected visible tool order matches the prompt and tool descriptions.

### Design Intent

The model should surface the guideline fetch as an obvious part of the reasoning trace and should not collapse guideline loading and widget generation into one combined tool burst. Making the sequence explicit in both the prompt and tool metadata reduces ambiguity and keeps the chat trace legible.

### Files Modified

- `lib/chat-agent.ts`
- `lib/chat-tools.ts`
- `docs/FRONTEND.md`
