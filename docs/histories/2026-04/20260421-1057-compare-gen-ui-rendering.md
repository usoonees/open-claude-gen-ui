## [2026-04-21 10:57] | Task: Compare generative UI rendering

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local Next.js app with Chrome DevTools screenshot verification`

### User Query

> Compare the local generative UI result against a Claude generative UI result using screenshots, and determine whether the poor output is caused by frontend or backend behavior.

### Changes Overview

- Area: Trusted-mode generative UI rendering and generation instructions.
- Key actions:
  - Captured screenshots of the local chat and Claude chat for visual comparison.
  - Added the documented widget design tokens to the live app CSS so generated widgets resolve the same variables used in downloaded HTML.
  - Reset global app SVG defaults inside `.widget-host` to avoid breaking generated SVG artifacts.
  - Tightened generative UI agent/tool instructions for compact, valid, data-dense widgets.
  - Documented the live widget token requirement in the frontend guide.

### Design Intent

The comparison showed a frontend token mismatch and CSS leakage in the live widget host, plus weaker backend generation quality. The frontend fix makes existing saved widgets render closer to their authored styles, while the prompt/tool updates make future widgets less likely to become generic oversized article cards.

### Files Modified

- `app/globals.css`
- `lib/chat-agent.ts`
- `lib/chat-tools.ts`
- `docs/FRONTEND.md`
