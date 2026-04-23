# Quality Score

Track quality by product area and architectural layer so agents can prioritize the weakest parts of the system.

## Suggested Scale

- `A`: strong coverage, stable behavior, clear docs, low operational risk.
- `B`: acceptable but still has known gaps.
- `C`: works but needs targeted hardening.
- `D`: fragile or underspecified.

## Initial Template

| Area | Score | Why | Next Step |
| --- | --- | --- | --- |
| Product surface | B | The chat UI now has persisted history, per-chat provider/model selection, and explicit provider-specific configuration errors. | Add browser automation that covers provider switching, manual model entry, and model-list sync. |
| Architecture docs | B | Runtime topology, provider boundary, and multi-provider selection flow are documented. | Extend once auth, deployment topology, or resumable streams land. |
| Testing | C | `pnpm check` and `pnpm build` validate the first app surface. | Add browser automation for the chat happy path after credentials or a mock provider are available. |
| Observability | C | LangSmith tracing can capture chat agent, LLM, tool-call, and tool-result spans when configured. | Add structured local logs and payload redaction before production tracing. |
| Security | C | API keys stay server-only, and local provider keys can now be saved in an encrypted `.data` store for dev use; no auth or multi-user isolation is present. | Add auth, rate limiting, and production secret handling before public deployment. |
