# Open Visual Layout

## Intro

A Next.js AI chatbot scaffold with a working provider and model selector for Volcengine ACK/Ark, Volcengine Coding, OpenAI, Anthropic, and Google Gemini. The chat route runs through an AI SDK tool-loop agent, which can call Tavily for live web search when the prompt needs fresh information.

## Quick Start

Install dependencies and copy the environment template:

```sh
corepack prepare pnpm@10.32.1 --activate
pnpm install
cp .env.example .env.local
```

Fill in one or more provider keys in `.env.local` when you are ready to call models. `VOLCENGINE_ACK_API_KEY`, `VOLCENGINE_CODING_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GOOGLE_GENERATIVE_AI_API_KEY` are all supported. The composer lets you switch providers per chat, sync a provider model list when that provider exposes one, or manually type any model id the provider accepts. Add `TAVILY_API_KEY` if you want the agent to use live web search. Set `LANGSMITH_TRACING=true` and add `LANGSMITH_API_KEY` if you want LangSmith traces for the agent loop, LLM calls, tool calls, and tool results. Keys are intentionally blank in source control examples.

Run the app:

```sh
pnpm dev
```

Open <http://localhost:3000>.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VOLCENGINE_ACK_API_KEY` | empty | Server-side Volcengine API key. |
| `VOLCENGINE_ACK_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` | OpenAI-compatible Volcengine endpoint. Override this for an AI acceleration gateway BaseUrl. |
| `VOLCENGINE_ACK_MODEL` | `doubao-seed-2-0-pro-260215` | Volcengine model or endpoint ID used by the chat route. |
| `VOLCENGINE_CODING_API_KEY` | empty | Server-side Volcengine coding API key. |
| `VOLCENGINE_CODING_BASE_URL` | `https://ark.cn-beijing.volces.com/api/coding/v3` | OpenAI-compatible Volcengine coding endpoint used for Ark Code chat completions. |
| `VOLCENGINE_CODING_MODEL` | `ark-code-latest` | Default Volcengine coding model shown when a new chat selects the coding provider. Suggested pinned models include `doubao-seed-2.0-code`, `doubao-seed-2.0-pro`, `doubao-seed-2.0-lite`, `doubao-seed-code`, `glm-4.7`, `deepseek-v3.2`, `kimi-k2.5`, and `minimax-m2.5`. |
| `OPENAI_API_KEY` | empty | Server-side OpenAI API key. |
| `OPENAI_MODEL` | `gpt-5-mini` | Default OpenAI model shown when a new chat selects OpenAI. |
| `ANTHROPIC_API_KEY` | empty | Server-side Anthropic API key. |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Default Anthropic model shown when a new chat selects Anthropic. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | empty | Server-side Google Generative AI API key. |
| `GOOGLE_MODEL` | `gemini-2.5-flash` | Default Google model shown when a new chat selects Google. |
| `TAVILY_API_KEY` | empty | Server-side Tavily API key used by the agent's web-search tool. |
| `LANGSMITH_TRACING` | `false` | Enables LangSmith tracing when set to `true`. |
| `LANGSMITH_ENDPOINT` | `https://api.smith.langchain.com` | LangSmith API endpoint. |
| `LANGSMITH_API_KEY` | empty | Server-side LangSmith API key used for trace ingestion. |
| `LANGSMITH_PROJECT` | `gen-ui` | LangSmith project name for chat traces. |

The runtime also accepts `VOLCENGINE_ARK_API_KEY`, `VOLCENGINE_ARK_BASE_URL`, and `VOLCENGINE_ARK_MODEL` as aliases for the ACK provider, plus `VOLCENGINE_ARK_CODING_API_KEY`, `VOLCENGINE_ARK_CODING_BASE_URL`, and `VOLCENGINE_ARK_CODING_MODEL` for the coding provider.

## Validation

```sh
pnpm check
pnpm build
make ci
```

## License

[MIT](LICENSE)

## Note

The repository keeps the agent-first documentation discipline from the original harness template. See `docs/` for architecture, quality, and change-history guidance.
