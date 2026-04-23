## [2026-04-23 14:27] | Task: add sidebar settings for Tavily and model management

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js + TypeScript`

### User Query

> `TAVILY_API_KEY is empty`
>
> add a settings in left-bottom, in that place, user can manage tavily api key and can also open model mangement window

### Changes Overview

- Area: sidebar settings UX, Tavily credential storage, and frontend configuration flow.
- Key actions:
  - Added a new left-bottom sidebar `Settings` launcher that opens a dedicated settings dialog.
  - Refined that sidebar launcher into a minimal icon-plus-label row by removing the extra helper description and boxed visual treatment.
  - Tightened the sidebar launcher spacing further so the footer row reads closer to a compact sidebar item than a utility button.
  - Added a settings dialog section for saving and removing a local Tavily API key, with masked status text that distinguishes frontend-saved keys from env-backed configuration.
  - Added a settings dialog shortcut that closes the settings surface and opens the existing `Manage Models` dialog.
  - Added `/api/chat/settings` plus a frontend-safe Tavily settings payload so the UI can read and mutate Tavily credential state.
  - Added an encrypted Tavily credential store under `.data/settings/`, reusing the existing local credential key material so saved secrets take effect immediately without a restart.
  - Updated Tavily runtime resolution so frontend-saved keys override the env fallback and the missing-key error now points users to `Settings` as well as `.env.local`.
  - Updated architecture, frontend, security, and quality docs to describe the new settings flow and local-secret behavior.

### Design Intent

The change keeps Tavily configuration in the same local-first, server-only pattern already used for provider keys, so users can fix the missing-key error directly inside the app instead of editing env files or restarting the server. The sidebar footer entry was chosen as the single home for cross-cutting configuration so model management and web-search setup stay discoverable without overloading the inline composer picker.

### Files Modified

- `app/api/chat/settings/route.ts`
- `app/globals.css`
- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/QUALITY_SCORE.md`
- `docs/SECURITY.md`
- `lib/chat-settings-config.ts`
- `lib/local-credential-utils.ts`
- `lib/provider-credentials-store.ts`
- `lib/tavily-credentials-store.ts`
- `lib/tavily-settings.ts`
- `lib/tavily.ts`
