# Reliability

Define the operational bar for the repository here.

## Tracing

- The chat route can emit LangSmith traces when `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY` is configured.
- `lib/langsmith-ai.ts` wraps the Vercel AI SDK so `ToolLoopAgent` runs include agent, LLM, tool-call, and tool-result spans.
- `app/api/chat/route.ts` calls `awaitPendingTraceBatches()` through Next.js `after()` so traces flush after streamed responses in serverless-style runtimes.
- Keep local verification simple: start the app with LangSmith env vars, send a chat request to `/api/chat`, then confirm the run appears in the configured LangSmith project.

Suggested areas:

- Startup and health expectations.
- Logging, metrics, and tracing conventions.
- Timeouts, retries, and backoff rules.
- Local and CI validation for critical paths.
- Incident notes, common failure modes, and recovery steps.

CI/CD workflow structure and release automation defaults live in `docs/CICD.md`.
