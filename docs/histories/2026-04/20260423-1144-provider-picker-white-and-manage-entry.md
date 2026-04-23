## [2026-04-23 11:44] | Task: unify provider picker styling and move provider entry into manage models

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Make the connect-provider page colors consistent and white, remove the add button from model selection, and move the add-provider action into model management.

### Changes Overview

- Area: chat provider/model picker UI
- Key actions:
  - Removed the inline add-provider icon from the compact `Choose model` picker so that surface only handles model search and selection.
  - Added an `Add provider` action to the `Manage Models` toolbar that opens the existing provider dialog.
  - Restyled the `Connect provider` dialog and provider rows to use the same white flat surface treatment as the management dialog.
  - Updated frontend verification guidance to reflect the new interaction path and white modal surface requirement.

### Design Intent

The inline picker works best when it stays focused on active model choice. Moving provider setup into `Manage Models` reduces extra chrome in the smallest surface while still keeping provider configuration one click away. Making the provider dialog white removes the leftover blue-tinted modal styling so the provider and management flows read as one consistent system.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260423-1144-provider-picker-white-and-manage-entry.md`
