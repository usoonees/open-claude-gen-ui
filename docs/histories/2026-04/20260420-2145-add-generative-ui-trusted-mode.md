## [2026-04-20 21:45] | Task: add trusted-mode generative UI widgets

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `Codex CLI`

### User Query

> read this article carefully: https://michaellivs.com/blog/reverse-engineering-claude-generative-ui/
>
> here is its reference implementation repo
>
> let's add that feature to our system, let's first deisgn what should be added.
>
> implement the plan

### Changes Overview

- Area: agent tools, streamed UI rendering, and trusted-mode browser execution
- Key actions:
  - Added `visualizeReadMe` and `showWidget` tools plus vendored reference-style widget guidance.
  - Added typed chat UI messages for generative widget tool parts.
  - Added inline widget rendering with streamed DOM patching, final script execution, and a `window.sendPrompt` callback bridge.
  - Added a trusted-mode feature flag and documented its security and verification posture.

### Design Intent

Match the article’s Claude-style generative UI interaction closely enough to evaluate the product shape inside this app, while making the trust boundary explicit. The feature is local/trusted by design rather than pretending to be hardened production-safe.

### Files Modified

- `.env.example`
- `app/api/chat/history/route.ts`
- `app/api/chat/route.ts`
- `app/globals.css`
- `components/chat-shell.tsx`
- `components/generative-widget.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/SECURITY.md`
- `docs/exec-plans/active/20260420-generative-ui.md`
- `docs/histories/2026-04/20260420-2145-add-generative-ui-trusted-mode.md`
- `docs/releases/feature-release-notes.md`
- `lib/chat-agent.ts`
- `lib/chat-message.ts`
- `lib/chat-store.ts`
- `lib/chat-tools.ts`
- `lib/generative-ui/index.ts`
- `lib/generative-ui/reference-guidelines.ts`
- `package.json`
- `pnpm-lock.yaml`
