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
- `app/api/chat/route.ts` validates the request and delegates chat execution to a Vercel AI SDK `ToolLoopAgent` through `createAgentUIStreamResponse`.
- `lib/chat-agent.ts` defines the agent instructions, step limit, and server-side tools available to the assistant.
- `lib/tavily.ts` calls Tavily's search API so the agent can fetch current web information during a tool loop.
- `lib/langsmith-ai.ts` wraps the AI SDK with LangSmith tracing so the agent loop, child LLM calls, tool calls, and tool results can be inspected when tracing is enabled.
- `lib/volcengine.ts` creates an OpenAI-compatible provider pointed at Volcengine ACK/Ark configuration.

## Configuration

- `VOLCENGINE_ACK_API_KEY` is required at runtime for real inference and is intentionally blank in `.env.example`.
- `VOLCENGINE_ACK_BASE_URL` defaults to the public Ark OpenAI-compatible base URL and can be replaced with an AI acceleration gateway BaseUrl.
- `VOLCENGINE_ACK_MODEL` selects the model or endpoint ID.
- `TAVILY_API_KEY` enables the agent's live web-search tool and is intentionally blank in `.env.example`.
- `LANGSMITH_TRACING=true` enables LangSmith trace capture through `langsmith/experimental/vercel`.
- `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT`, and `LANGSMITH_PROJECT` configure trace ingestion and routing.
- `VOLCENGINE_ARK_*` aliases are accepted for teams using Ark naming directly.

## Boundary Rules

- Keep provider credentials and inference configuration server-side only.
- Keep UI state in React components until persistence is explicitly added.
- Put shared provider logic in `lib/` before spreading it across route handlers.
- Keep infrastructure and runtime orchestration explicit and versioned.
- Keep LangSmith tracing server-side, and redact or disable prompt/tool payload capture before sending sensitive data to external trace backends.
- When the architecture changes, update this file in the same task.

## Deferred Boundaries

- Chat persistence and auth are not implemented yet.
- Tool calling, artifacts, uploads, and conversation sharing are deferred.
- Production observability and deployment infrastructure remain to be defined.
