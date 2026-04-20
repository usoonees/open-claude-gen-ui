# Open Visual Layout

## Intro

A Next.js AI chatbot scaffold based on the Vercel chatbot architecture and wired for Volcengine ACK/Ark inference through an OpenAI-compatible endpoint. The chat route now runs through a Vercel AI SDK tool-loop agent, which can call Tavily for live web search when the prompt needs fresh information.

## Quick Start

Install dependencies and copy the environment template:

```sh
corepack prepare pnpm@10.32.1 --activate
pnpm install
cp .env.example .env.local
```

Fill in `VOLCENGINE_ACK_API_KEY` in `.env.local` when you are ready to call the model. Add `TAVILY_API_KEY` if you want the agent to use live web search. Both keys are intentionally blank in source control examples.

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
| `TAVILY_API_KEY` | empty | Server-side Tavily API key used by the agent's web-search tool. |

The runtime also accepts `VOLCENGINE_ARK_API_KEY`, `VOLCENGINE_ARK_BASE_URL`, and `VOLCENGINE_ARK_MODEL` as aliases.

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
