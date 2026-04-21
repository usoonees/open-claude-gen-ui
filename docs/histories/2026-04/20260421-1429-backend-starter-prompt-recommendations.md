## [2026-04-21 14:29] | Task: backend starter prompt recommendations

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local CLI`

### User Query

> Move the prompt recommendations above the input box to backend-owned prompts, generate more than ten prompts according to the visual widget guidance, fetch them from an API, randomize the recommendations, and animate the frontend rendering.

### Changes Overview

- Area: chat empty-state starter prompts
- Key actions:
  - Added a backend-owned list of visual, interactive starter prompts.
  - Added `/api/starter-prompts` to return a no-store randomized subset.
  - Updated the chat shell to fetch starter recommendations from the API.
  - Added staggered entry animation for fetched starter cards.
  - Updated architecture and frontend verification docs for the new API boundary.

### Design Intent

Starter prompt copy now lives on the server so the frontend renders recommendations through the same API boundary future product logic can extend. The route returns four randomized prompts from a larger list to keep the composer compact while making repeated empty states feel fresher.

### Files Modified

- `app/api/starter-prompts/route.ts`
- `app/globals.css`
- `components/chat-shell.tsx`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `lib/starter-prompts.ts`
