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
- `components/chat-shell.tsx` keeps an in-memory `Chat` controller per open conversation so sidebar navigation changes the visible subscription without aborting an in-flight stream for another chat.
- `app/api/chat/route.ts` validates the request and delegates chat execution to a Vercel AI SDK `ToolLoopAgent` through `createAgentUIStreamResponse`.
- When `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=true`, the agent can call `visualizeReadMe` and `showWidget`, and `components/generative-widget.tsx` renders streamed widget HTML inline inside assistant messages with a browser-side ZIP download action once rendering is complete. The ZIP includes the raw widget fragment and a standalone wrapped HTML file.
- `lib/chat-agent.ts` defines the agent instructions, step limit, and server-side tools available to the assistant.
- `lib/chat-title.ts` decides whether a chat title can be generated, saves the first user prompt as the immediate placeholder title, and later resolves a short AI title in the background when inference is available.
- `lib/chat-tools.ts` defines the shared Tavily and generative-UI tool contracts used by the agent and the typed chat UI.
- `lib/generative-ui/` contains the trusted-mode flag, widget script allowlist, and vendored widget guideline source.
- `lib/chat-store.ts` persists each conversation as a trace record that includes the UI messages, the current sidebar title state (`pending` placeholder or ready), and the resolved system prompt and enabled tool manifest captured at save time.
- `lib/langsmith-ai.ts` wraps the AI SDK with LangSmith tracing so the agent loop, child LLM calls, tool calls, and tool results can be inspected when tracing is enabled.
- `lib/tavily.ts` calls Tavily's search API so the agent can fetch current web information during a tool loop.
- `lib/volcengine.ts` creates an OpenAI-compatible provider pointed at Volcengine ACK/Ark configuration.

## Configuration

- `VOLCENGINE_ACK_API_KEY` is required at runtime for real inference and is intentionally blank in `.env.example`.
- `VOLCENGINE_ACK_BASE_URL` defaults to the public Ark OpenAI-compatible base URL and can be replaced with an AI acceleration gateway BaseUrl.
- `VOLCENGINE_ACK_MODEL` selects the model or endpoint ID.
- `TAVILY_API_KEY` enables the agent's live web-search tool and is intentionally blank in `.env.example`.
- `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=true` enables trusted-mode generative UI tools and inline widget rendering.
- `LANGSMITH_TRACING=true` enables LangSmith trace capture through `langsmith/experimental/vercel`.
- `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT`, and `LANGSMITH_PROJECT` configure trace ingestion and routing.
- `VOLCENGINE_ARK_*` aliases are accepted for teams using Ark naming directly.

## Boundary Rules

- Keep provider credentials and inference configuration server-side only.
- Keep UI state in React components until persistence is explicitly added.
- Put shared provider logic in `lib/` before spreading it across route handlers.
- Keep infrastructure and runtime orchestration explicit and versioned.
- Treat generative UI as a trusted local capability; do not expose privileged browser or server APIs to widget code.
- Persist enough agent configuration with each conversation to analyze saved chats as standalone traces later.
- Keep LangSmith tracing server-side, and redact or disable prompt/tool payload capture before sending sensitive data to external trace backends.
- When the architecture changes, update this file in the same task.

## Deferred Boundaries

- Chat persistence and auth are not implemented yet.
- Uploads and conversation sharing are deferred.
- Production deployment infrastructure remains to be defined.
