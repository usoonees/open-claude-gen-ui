## [2026-04-21 16:38] | Task: prioritize richer gen-ui widgets in chat agent

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> Tell the chat agent that we focus on the gen-ui widget generator, that it is really important, and make sure the widget is diverse, has enough information, and tries to surprise the user with an incredible widget experience.

### Changes Overview

- Area: chat-agent prompt and frontend verification guidance
- Key actions:
  - Strengthened the trusted-mode chat-agent prompt so gen-ui widget generation is treated as a primary capability rather than a secondary option.
  - Instructed the assistant to prefer more information-dense, varied, and distinctive widget formats instead of repeating generic card/list outputs.
  - Added frontend verification guidance that checks for richer, more diverse trusted-mode widget behavior across different visual prompts.

### Design Intent

This change biases the chat agent toward using generative UI more aggressively and toward producing widgets that feel materially useful and memorable, while still staying within the repository’s existing widget constraints.

### Files Modified

- `lib/chat-agent.ts`
- `docs/FRONTEND.md`
