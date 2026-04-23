## [2026-04-23 17:15] | Task: add exported example showcase and read-only chat shell

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js app router workspace`

### User Query

> Make several saved chat pages deployable to Vercel as public read-only examples, then keep the public pages visually identical to the original chat shell while blocking any further sending.

### Changes Overview

- Area: read-only sharing and deployment workflow
- Key actions:
  - Added a repeatable `pnpm export:examples` script that snapshots curated chats from local storage into repo-tracked JSON.
  - Added static `/examples` and `/examples/[slug]` routes that render those snapshots without the live chat transport or composer.
  - Added a `SHOWCASE_ONLY` deployment mode that reuses the normal `/chat/[id]` shell for curated example ids, redirects `/` and unknown ids to the default exported chat, and serves read-only history from the exported snapshots.
  - Locked write actions in showcase mode by returning `405` from send and mutation endpoints, while keeping the composer, sidebar, and chat transcript layout intact.
  - Disabled shell controls that would mutate state in public showcase mode, including send, chat options, settings, and model selection.
  - Updated the README, architecture map, and frontend guide to document the exported-data flow and the read-only chat-shell behavior.

### Design Intent

The chosen tradeoff is to export a small curated set of chats into versioned data inside the repo, then feed that data back through the existing chat shell in showcase mode. That keeps the public surface read-only, Vercel-friendly, and independent from local chat storage without changing the layout people already see in the original app.

### Files Modified

- `scripts/export-example-chats.mjs`
- `lib/example-chats.ts`
- `components/example-chat-viewer.tsx`
- `components/chat-shell.tsx`
- `app/examples/page.tsx`
- `app/examples/[slug]/page.tsx`
- `app/page.tsx`
- `app/chat/[id]/page.tsx`
- `app/api/chat/history/route.ts`
- `app/api/chat/route.ts`
- `app/globals.css`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
