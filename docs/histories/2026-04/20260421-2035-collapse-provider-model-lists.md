## [2026-04-21 20:35] | Task: Collapse provider model lists and clarify shown vs hidden states

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js App Router with pnpm`

### User Query

> for model selection, if click the provider name, it will collpase all the model it owns, and for model managment, there should have different color for shown and hidden model, the shown model is more brighter, the hidden model is more grey out

### Changes Overview

- Area: chat composer model-picker UX.
- Key actions:
  - Added collapsible provider sections in the `Choose model` view so clicking a provider header toggles the visibility of that provider's model list.
  - Extended the same provider-level collapse control to the `Manage Models` view so long provider catalogs are easier to scan in both picker modes.
  - Replaced the instant open/close behavior with animated collapsible wrappers so expanding and collapsing provider groups feels smoother.
  - Split `Manage Models` into its own modal-style dialog so it is clearly distinct from the inline `Choose model` picker, and added explicit mode headers for the inline selection surfaces.
  - Moved `Connect provider` into its own dialog as well, so the inline popover is reserved for active model selection only.
  - Kept provider badges intact while adding a chevron state so collapsed groups remain legible without removing current-provider context.
  - Reworked the provider and management surfaces into a flat solid-fill style with no gradients and no 3D treatment, and tightened the management rows so shown models stay brighter while hidden models stay quieter.
  - Added the new flat, no-gradient, no-3D rule to the repository design docs and frontend guidance so later UI changes do not drift back toward glossy treatments.
  - Updated frontend verification guidance to cover the new collapse behavior and the brighter-vs-muted visibility treatment.

### Design Intent

The model picker already groups models by provider, so making those headers collapsible reduces scanning when many models are available without changing selection semantics. Adding the same affordance to `Manage Models` keeps the two picker views consistent, and animating the collapsible region avoids the abrupt pop that made the earlier implementation feel unfinished. Splitting both `Manage Models` and `Connect provider` into separate dialogs makes the interaction purpose obvious: the inline surface is for active model selection, while the larger dialogs are for setup and visibility management. For the visual language, the final direction here is flat and solid rather than glossy: no gradients, no 3D treatment, and shown versus hidden contrast coming from clean color and border changes instead of depth effects.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
- `docs/histories/2026-04/20260421-2035-collapse-provider-model-lists.md`
