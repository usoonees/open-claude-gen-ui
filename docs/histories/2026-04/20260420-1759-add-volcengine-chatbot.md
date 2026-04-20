## [2026-04-20 17:59] | Task: Add Volcengine chatbot scaffold

### Execution Context

- Agent ID: `codex`
- Base Model: `gpt-5`
- Runtime: `local shell`

### User Query

> Build an AI chatbot using `https://github.com/vercel/chatbot` as the base template, use Volcengine ACK for LLM inference, and leave the API key empty first.
>
> Follow-up: for the sidebar, show the conversation title only and stop creating sidebar entries when `New Chat` is clicked before a message is sent.
>
> Follow-up: after removing the sidebar ID, tighten the sidebar styling so the list feels compact and polished again.

### Changes Overview

- Area: Product surface, LLM integration, docs
- Key actions:
  - Added a Next.js App Router chat UI inspired by Vercel chatbot's AI SDK streaming architecture.
  - Revised the interface to more closely follow the official Vercel chatbot shell, greeting, suggestions, and composer styling.
  - Added `/api/chat` streaming route using Vercel AI SDK and an OpenAI-compatible Volcengine provider.
  - Added blank-key environment template and runtime aliases for ACK/Ark naming.
  - Updated the default Volcengine model to `doubao-seed-2-0-pro-260215`.
  - Added visible reasoning rendering, markdown rendering, and ignored filesystem chat persistence.
  - Added per-conversation IDs, URL routing under `/chat/:id`, and sidebar history loaded from filesystem chat files.
  - Smoothed New Chat transitions with client-side URL updates and added frontend debug logs for chat navigation, history loading, saving, and render state.
  - Changed `New Chat` to return to `/` as a draft state, only allocating a real conversation ID on first send, and removed sidebar ID subtitles.
  - Refined the sidebar density and visual hierarchy with a compact section header, chat count pill, tighter chat rows, and stronger hover and active states.
  - Removed the idle sidebar row fill so conversation items stay visually quiet until hover or active state.
  - Tightened sidebar row spacing after review by reducing the list gap and idle row height.
  - Fixed the sidebar list layout to keep chat rows packed at the top instead of stretching them across the full column height.
  - Updated architecture, frontend, quality, release, and setup documentation.

### Design Intent

The repository was still a harness scaffold, so the first increment focuses on a bootable chat loop instead of importing upstream auth, database, file upload, and artifact features. The route uses `@ai-sdk/openai-compatible` because Volcengine Ark and AI acceleration gateway can expose OpenAI-compatible model calls.

### Files Modified

- `package.json`
- `.env.example`
- `app/`
- `components/chat-shell.tsx`
- `lib/chat-store.ts`
- `lib/volcengine.ts`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/QUALITY_SCORE.md`
- `docs/releases/feature-release-notes.md`
- `docs/exec-plans/active/20260420-volcengine-chatbot.md`
