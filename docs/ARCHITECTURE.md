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
- `components/chat-shell.tsx` also loads `/api/chat/providers` for provider metadata and frontend key-management mutations, `/api/chat/settings` for Tavily web-search credential state plus the generative-UI trusted-mode toggle, `/api/chat/models` for provider-backed model suggestions plus persisted sync-cache reuse when available, and `/api/chat/preferences` for persisted model-picker visibility preferences, while the last manually chosen provider/model for the next new chat still remains browser-local.
- `components/chat-shell.tsx` keeps an in-memory `Chat` controller per open conversation so sidebar navigation changes the visible subscription without aborting an in-flight stream for another chat.
- `app/api/chat/route.ts` validates the request, normalizes the selected provider/model, injects a server-only hidden reminder into the latest user turn when trusted generative UI is enabled, streams a single Vercel AI SDK `ToolLoopAgent`, stamps the active response model id onto assistant message metadata, and rewrites pre-`showWidget` assistant text chunks into reasoning chunks so widget lead-in prose stays in `Thinking` for both live streams and saved chats.
- `app/api/chat/preferences/route.ts` stores global model-picker preferences such as hidden models in `.data/preferences/` so `Manage Models` survives reloads outside the browser.
- `lib/provider-credentials-store.ts` stores frontend-saved provider API keys in `.data/providers/` with local encryption and masked metadata so new providers can be connected without editing `.env.local` or restarting the app.
- `app/api/chat/settings/route.ts` stores Tavily web-search credential metadata plus the persisted generative-UI trusted-mode override so the sidebar settings dialog can manage `TAVILY_API_KEY` and widget mode without editing local env files.
- `lib/provider-model-cache.ts` stores successful provider model-sync results in `.data/providers/` so server-side model lists can survive reloads and be refreshed explicitly by `Sync`.
- Generative UI trusted mode defaults to enabled. A frontend-saved override in `.data/settings/` takes precedence over `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED`, and when trusted mode resolves to enabled the agent can call `visualizeReadMe` and `showWidget`. `components/generative-widget.tsx` renders streamed widget HTML inline inside assistant messages inside an isolated shadow-root host with a browser-side ZIP download action once rendering is complete. The ZIP includes the raw widget fragment and a standalone wrapped HTML file.
- `lib/chat-agent.ts` defines the single-agent prompt, response-language matching rule, gen-ui behavior bias, and step limit, while `lib/chat-models.ts` owns provider resolution, default selections, and live model-list fetchers.
- `lib/chat-hidden-reminders.ts` owns the trusted-mode per-user-turn reminder plus the shared sanitizer that strips that transport-only reminder back out of visible, copied, titled, and persisted text.
- `lib/starter-prompts.ts` owns backend starter recommendation copy, and `/api/starter-prompts` returns a randomized subset each time the UI enters the empty new-chat composer.
- `lib/chat-title.ts` decides whether a chat title can be generated, saves the first user prompt as the immediate placeholder title, and later resolves a short AI title in the background with the selected chat provider/model when inference is available.
- `lib/chat-tools.ts` defines the shared Tavily and generative-UI tool contracts used by the chat agent and the typed chat UI.
- `lib/deepseek.ts` owns the DeepSeek OpenAI-compatible provider instance and defaults.
- `lib/generative-ui/` contains widget script allowlist and vendored widget guideline source, while `lib/generative-ui-runtime.ts` resolves the effective trusted-mode setting for each server request.
- `lib/chat-store.ts` persists each conversation as a trace record that includes the UI messages and their per-message metadata, the current sidebar title state (`pending` placeholder or ready), the selected provider/model, the resolved system prompt, and the enabled tool manifest captured at save time.
- `lib/langsmith-ai.ts` wraps the AI SDK with LangSmith tracing so the agent loop, child LLM calls, tool calls, and tool results can be inspected when tracing is enabled.
- `lib/minimax.ts` owns the MiniMax OpenAI-compatible provider instance and defaults.
- `lib/openrouter.ts` owns the OpenRouter OpenAI-compatible provider instance and defaults.
- `lib/tavily.ts` calls Tavily's search API so the agent can fetch current web information during a tool loop.
- `lib/tavily-credentials-store.ts` stores a frontend-saved Tavily API key in `.data/settings/` with the same local encryption key material used for provider credentials.
- `lib/volcengine.ts` owns the Volcengine ACK OpenAI-compatible provider instance and env aliases.
- `lib/volcengine-coding.ts` owns the Volcengine coding OpenAI-compatible provider instance and env aliases.

## Configuration

- `VOLCENGINE_ACK_API_KEY` is an env fallback for the Volcengine provider and is intentionally blank in `.env.example`.
- `VOLCENGINE_ACK_BASE_URL` defaults to the public Ark OpenAI-compatible base URL and can be replaced with an AI acceleration gateway BaseUrl.
- `VOLCENGINE_ACK_MODEL` selects the model or endpoint ID.
- `VOLCENGINE_CODING_API_KEY` is an env fallback for the Volcengine coding provider against the `/api/coding/v3` chat-completions surface.
- `VOLCENGINE_CODING_BASE_URL` defaults to the public Volcengine coding OpenAI-compatible base URL.
- `VOLCENGINE_CODING_MODEL` selects the default coding model id.
- `OPENAI_API_KEY` and `OPENAI_MODEL` provide the env fallback and default model for OpenAI in the provider selector.
- `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, and `MINIMAX_MODEL` provide the env fallback and defaults for MiniMax in the provider selector.
- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, and `DEEPSEEK_MODEL` provide the env fallback and defaults for DeepSeek in the provider selector.
- `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, and `OPENROUTER_MODEL` provide the env fallback and defaults for OpenRouter in the provider selector.
- `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` provide the env fallback and default model for Anthropic in the provider selector.
- `GOOGLE_GENERATIVE_AI_API_KEY` and `GOOGLE_MODEL` provide the env fallback and default model for Gemini in the provider selector.
- `PROVIDER_CREDENTIALS_MASTER_KEY` optionally overrides the local encryption key used for frontend-saved provider API keys and the Tavily web-search key. If it is unset, the app creates `.data/providers/provider-credentials.key` on first use.
- `TAVILY_API_KEY` enables the agent's live web-search tool and is intentionally blank in `.env.example`.
- `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=true` is the default trusted-mode fallback for generative UI tools and inline widget rendering unless a frontend-saved override exists in `.data/settings/`.
- `LANGSMITH_TRACING=true` enables LangSmith trace capture through `langsmith/experimental/vercel`.
- `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT`, and `LANGSMITH_PROJECT` configure trace ingestion and routing.
- `VOLCENGINE_ARK_*` aliases are accepted for teams using Ark naming directly, including `VOLCENGINE_ARK_CODING_*` for the coding provider.

## Boundary Rules

- Keep provider credentials and inference configuration server-side only.
- Prefer frontend-saved provider keys over env fallbacks for the same provider so local configuration changes apply immediately without a restart.
- Prefer a frontend-saved Tavily key over the env fallback so web-search configuration can change immediately without a restart.
- Keep UI state in React components until persistence is explicitly added; the remaining browser-local exception today is the last manually chosen provider/model for future new chats, while hidden model-picker entries now persist server-side and each saved chat still persists its own provider/model so reloads keep the same inference target.
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
