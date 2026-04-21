## [2026-04-21 17:11] | Task: suppress html hydration warning

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Fix the React hydration warning where the server-rendered `<html>` attributes do not match the client.

### Changes Overview

- Area: app shell hydration
- Key actions:
  - Added `suppressHydrationWarning` to the root `<html>` element in the Next.js app layout
  - Verified the repository does not set conflicting `html` classes and that typecheck and production build still pass

### Design Intent

The reported mismatch is on the root `<html>` node, while the app itself does not render dynamic classes there. Suppressing hydration warnings at that boundary avoids noisy false positives caused by extension-injected attributes without masking ordinary component-level hydration problems deeper in the tree.

### Files Modified

- `app/layout.tsx`
- `docs/histories/2026-04/20260421-1711-suppress-html-hydration-warning.md`
