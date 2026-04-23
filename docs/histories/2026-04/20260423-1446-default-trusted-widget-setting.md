## [2026-04-23 14:46] | Task: default trusted widget setting

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js app router + pnpm`

### User Query

> Make `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED === "true"` the default behavior, and add a Settings toggle so users can turn trusted generative UI on or off. Default should be on.

### Changes Overview

- Area: generative UI runtime, settings API, settings dialog, docs
- Key actions:
  - Added a server-only generative UI runtime settings resolver that defaults trusted mode to `on`, honors `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED` as an env fallback, and persists a local override in `.data/settings/generative-ui-settings.json`.
  - Updated chat prompt/tool wiring so each request uses the resolved trusted-mode value and stores the correct enabled tool manifest in saved chat traces.
  - Extended `/api/chat/settings` and the sidebar `Settings` dialog with a new trusted-widget on/off control while preserving Tavily key management.
  - Updated `.env.example`, README, architecture/frontend/security docs, and release notes to reflect the new default-on behavior and local override path.

### Design Intent

The old env-only gate was too easy to misconfigure and too static for a user-facing toggle. This change keeps the default experience widget-capable without requiring setup, while still preserving an explicit off switch for users who want text-only behavior. The server now resolves the setting per request so the prompt, tool availability, and saved trace metadata stay consistent after a toggle.

### Files Modified

- `.env.example`
- `README.md`
- `app/api/chat/history/route.ts`
- `app/api/chat/route.ts`
- `app/api/chat/settings/route.ts`
- `app/globals.css`
- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/SECURITY.md`
- `docs/releases/feature-release-notes.md`
- `lib/chat-agent.ts`
- `lib/chat-settings-config.ts`
- `lib/chat-tools.ts`
- `lib/generative-ui/index.ts`
- `lib/generative-ui-runtime.ts`
