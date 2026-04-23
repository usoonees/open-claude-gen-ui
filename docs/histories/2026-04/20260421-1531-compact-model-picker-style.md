## [2026-04-21 15:31] | Task: Restyle model picker to match OpenCode more closely

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> The style is too ugly. Refer to the OpenCode style for the provider and model selector below the input box.
> We only need one option: model selection. When clicking it, users should be able to add a new model or switch/add a provider inside the same picker, and the style should stay close to OpenCode.

### Changes Overview

- Area: chat composer styling and interaction design.
- Key actions:
  - Collapsed the composer footer down to a single model-selection trigger instead of separate provider and model controls.
  - Reworked the floating picker to mirror the OpenCode pattern more closely: search field first, compact icon actions, muted grouped provider headings, and lightweight model rows.
  - Moved provider switching and manual model entry into an inline add panel opened from the picker, so users can add or switch provider/model combinations without extra always-visible chrome.
  - Cleaned the picker styling to use subtler borders, tighter spacing, and a quieter trigger that emphasizes the model name rather than provider admin state.
  - Removed the native browser `datalist` autocomplete from the search input so the picker no longer spawns a second suggestion column outside the custom model list.

### Design Intent

The earlier version still felt like a restyled configuration form. This revision pushes the provider details behind a single compact selector and keeps the popup focused on search and choice, which is much closer to the way OpenCode treats model selection.

### Files Modified

- `app/globals.css`
- `components/chat-shell.tsx`
