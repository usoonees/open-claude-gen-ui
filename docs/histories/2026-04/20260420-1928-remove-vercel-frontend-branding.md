## [2026-04-20 19:28] | Task: remove vercel frontend branding

### Execution Context

- Agent ID: `n/a`
- Base Model: `Codex (GPT-5)`
- Runtime: `Codex CLI`

### User Query

> Remove anything in frontend related to Vercel, like deploy with Vercel, Vercel chatbot template, sidebar-footer.

### Changes Overview

- Area: frontend shell and product copy
- Key actions:
  - Removed the Vercel template link from the sidebar header.
  - Removed the deploy CTA from the chat header.
  - Removed the sidebar footer block and its supporting styles.
  - Updated app metadata and README copy to avoid Vercel-branded product wording.

### Design Intent

Remove template branding and deployment affordances from the visible frontend while preserving the existing chat layout and behavior. The sidebar history section now expands to fill the removed footer space so the shell remains balanced without adding a replacement element.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `README.md`
- `docs/histories/2026-04/20260420-1928-remove-vercel-frontend-branding.md`
