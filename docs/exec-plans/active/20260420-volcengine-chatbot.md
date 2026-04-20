# Volcengine Chatbot Scaffold

## Goal

Build the repository's first runnable product surface: a Vercel-chatbot-inspired Next.js AI chat UI that streams responses through Volcengine ACK/Ark inference while keeping credentials out of source control.

## Scope

- In scope: Next.js App Router scaffold, AI SDK chat transport, Volcengine OpenAI-compatible provider configuration, environment documentation, and local validation commands.
- Out of scope: persisted chat history, auth, file uploads, tools/artifacts, production deployment automation, and a real API key.

## Context

- Relevant docs: `docs/REPO_COLLAB_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/HISTORY_GUIDE.md`, `docs/QUALITY_SCORE.md`.
- Relevant code paths: `app/`, `components/`, `lib/volcengine.ts`, `.env.example`.
- Constraints: the user requested `vercel/chatbot` as the base template and Volcengine ACK for inference, with the API key left empty first.

## Risks

- Risk: Volcengine account setup varies between direct Ark inference and AI acceleration gateway usage.
- Mitigation: keep base URL, model, and API key configurable through server-only environment variables.

- Risk: importing the full upstream chatbot would add auth, database, blob storage, and tool complexity before credentials exist.
- Mitigation: preserve the Vercel AI SDK streaming/chat transport architecture and defer heavier template features.

## Milestones

1. Discovery and design alignment.
2. Implementation slices.
3. Verification and documentation.

## Validation

- Commands: `pnpm install`, `pnpm check`, `pnpm build`, `make ci`.
- Manual checks: boot the dev server and verify the chat UI renders without an API key.
- Observability checks: API route returns an explicit 503 when `VOLCENGINE_ACK_API_KEY` is empty.

## Progress Log

- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

## Decision Log

- 2026-04-20: Use `@ai-sdk/openai-compatible` instead of a provider-specific SDK because Volcengine Ark and AI acceleration gateway expose OpenAI-compatible model calls, which keeps the route close to Vercel chatbot's AI SDK design.
- 2026-04-20: Start without auth, persistence, or tool artifacts because the repository was a generic harness scaffold and the first useful milestone is a bootable chat loop.
