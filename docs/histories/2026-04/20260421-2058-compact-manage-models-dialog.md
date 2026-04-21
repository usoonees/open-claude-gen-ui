## [2026-04-21 20:58] | Task: Make the model management popup more compact and less card-heavy

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> the model managment pop window is ugly, make it more compact, should have so much card style, it should be similar to sidebar items's style, compact and clear, no card surround

### Changes Overview

- Area: chat composer model-management dialog styling.
- Key actions:
  - Reduced the manage-models dialog width and internal spacing so the surface reads as a compact utility popup instead of a large settings panel.
  - Removed the per-provider card wrappers inside `Manage Models` and flattened the provider sections into a simpler grouped list.
  - Restyled provider headers and model rows to borrow from the sidebar item language: tighter spacing, cleaner hover states, and slim left-side status indicators instead of boxed row treatments.
  - Simplified the shown/hidden status treatment so visibility remains clear without pill-heavy cards or bordered chips, and replaced the amber accent with neutral system colors that match the rest of the UI.
  - Disabled scroll anchoring on the collapsible model lists so collapsing a provider keeps the viewport stable and pulls the rows below upward instead of shifting the rows above downward.
  - Removed the remaining warm off-white fills from the model picker and management surfaces so both dialogs and their shared controls now sit on plain white backgrounds.
  - Updated frontend guidance to preserve the flatter, sidebar-like model-management presentation in later UI changes.

### Design Intent

The previous dialog stacked a card inside a card, which made a small visibility-management task feel visually heavy. Flattening the internal structure and borrowing the sidebar row rhythm keeps the dialog easier to scan, more compact, and closer to the rest of the navigation language without removing the shown-versus-hidden distinction. Using neutral shared colors and plain white surfaces instead of warm accents avoids visual drift from the rest of the system, and disabling scroll anchoring makes collapse behavior feel spatially correct inside the scrollable popup.

### Files Modified

- `app/globals.css`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260421-2058-compact-manage-models-dialog.md`
