## [2026-05-07 17:44] | Task: default DeepSeek to V4 Pro

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Default`

### User Query

> now deepseek use deepseek4 pro, please add that model, for the specific name, you can search from the offical doc

### Changes Overview

- Area: chat provider model catalog.
- Key actions: Updated DeepSeek's default model id to `deepseek-v4-pro`, added the current V4 model ids to DeepSeek suggestions, kept legacy compatibility ids available, aligned sample configuration plus release/docs notes, fixed provider fallback normalization so the DeepSeek default cannot appear under Anthropic when DeepSeek is unavailable, and made Anthropic ignore non-Claude `ANTHROPIC_MODEL` values.

### Design Intent

DeepSeek's official API docs list `deepseek-v4-pro` as the V4 Pro model parameter and note that `deepseek-chat` and `deepseek-reasoner` are compatibility names scheduled for deprecation. Making V4 Pro the default keeps new provider selections current while preserving existing manual choices and compatibility entries.

### Files Modified

- `.env.example`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/releases/feature-release-notes.md`
- `components/chat-shell.tsx`
- `lib/chat-models.ts`
- `lib/deepseek.ts`
