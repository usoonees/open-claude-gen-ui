## [2026-04-23 20:20] | Task: clean up old project name leftovers

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Check whether anything still uses the old project name, find it, and fix it.

### Changes Overview

- Area: product naming cleanup
- Key actions:
  - Renamed the README title and intro copy to `Open Claude Gen UI`.
  - Updated the app metadata title to the new project name.
  - Removed the old-name browser storage fallback so runtime localStorage keys only use the `open-claude-gen-ui` namespace.
  - Recorded the cleanup in repository history.

### Design Intent

This cleanup removes stale product naming from user-facing copy and runtime identifiers so the renamed repository no longer carries the previous slug in active code paths.

### Files Modified

- `README.md`
- `app/layout.tsx`
- `components/chat-shell.tsx`
- `docs/histories/2026-04/20260423-2020-clean-up-old-project-name.md`
