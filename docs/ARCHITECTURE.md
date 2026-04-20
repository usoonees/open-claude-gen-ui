# Architecture

This file is the top-level map for the repository.

## Intended Repository Shape

- `app/`: Next.js App Router entry points, pages, layouts, and route handlers.
- `components/`: reusable React components for the chat surface.
- `lib/`: server-side integration and shared application helpers.
- `scripts/`: repository automation that agents can run directly.
- `docs/`: repository knowledge base and system of record.

## Runtime Topology

- Browser users load `app/page.tsx`, which renders `components/chat-shell.tsx`.
- The chat client uses Vercel AI SDK's `useChat` hook with `DefaultChatTransport` to POST conversation state to `/api/chat`.
- `app/api/chat/route.ts` validates the request, converts UI messages to model messages, and streams text back with `streamText`.
- `lib/volcengine.ts` creates an OpenAI-compatible provider pointed at Volcengine ACK/Ark configuration.

## Configuration

- `VOLCENGINE_ACK_API_KEY` is required at runtime for real inference and is intentionally blank in `.env.example`.
- `VOLCENGINE_ACK_BASE_URL` defaults to the public Ark OpenAI-compatible base URL and can be replaced with an AI acceleration gateway BaseUrl.
- `VOLCENGINE_ACK_MODEL` selects the model or endpoint ID.
- `VOLCENGINE_ARK_*` aliases are accepted for teams using Ark naming directly.

## Boundary Rules

- Keep provider credentials and inference configuration server-side only.
- Keep UI state in React components until persistence is explicitly added.
- Put shared provider logic in `lib/` before spreading it across route handlers.
- Keep infrastructure and runtime orchestration explicit and versioned.
- When the architecture changes, update this file in the same task.

## Deferred Boundaries

- Chat persistence and auth are not implemented yet.
- Tool calling, artifacts, uploads, and conversation sharing are deferred.
- Production observability and deployment infrastructure remain to be defined.
