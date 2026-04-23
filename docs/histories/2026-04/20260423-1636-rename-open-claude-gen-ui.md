## [2026-04-23 16:36] | Task: rename project to open-claude-gen-ui

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Rename all current `open-visual-layout` project identifiers to `open-claude-gen-ui` and rename the remote GitHub repository if possible.

### Changes Overview

- Area: product naming and local persistence
- Key actions:
  - Renamed the package, LangSmith app metadata, widget runtime log prefix, and browser storage namespace to `open-claude-gen-ui`.
  - Added a legacy localStorage fallback so existing browser model preferences migrate forward from the previous `open-visual-layout` keys.
  - Recorded the rename task in repository history.

### Design Intent

The rename updates visible project identifiers without breaking existing local browser preferences. The compatibility fallback reads the previous storage keys once, writes the new namespace, and removes the legacy keys during the next normal save path.

### Files Modified

- `package.json`
- `components/chat-shell.tsx`
- `components/generative-widget.tsx`
- `lib/langsmith-ai.ts`
- `docs/histories/2026-04/20260423-1636-rename-open-claude-gen-ui.md`
