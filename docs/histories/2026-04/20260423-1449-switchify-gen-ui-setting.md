## [2026-04-23 14:49] | Task: switchify gen-ui setting

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Next.js app router + pnpm`

### User Query

> The style of turn on/off GenUI in settings is not great, use switch style.

### Changes Overview

- Area: settings dialog UI
- Key actions:
  - Replaced the two-button on/off treatment for trusted widget mode with a single switch-style control.
  - Added dedicated switch track, thumb, and copy styles so the setting reads like a native toggle instead of segmented buttons.

### Design Intent

This setting is a binary mode toggle, so it should look and behave like a switch. Using a single control makes the state clearer, reduces visual noise in the settings card, and aligns the interaction with user expectations for on/off preferences.

### Files Modified

- `app/globals.css`
- `components/chat-shell.tsx`
