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
| Product surface | C | A bootable chat UI now exists with streaming transport and clear empty/error states. | Add persisted chat history and a real configured model key for end-to-end testing. |
| Architecture docs | B | Runtime topology, provider boundary, and deferred scope are documented. | Extend once persistence, auth, or deployment topology is added. |
| Testing | C | `pnpm check` and `pnpm build` validate the first app surface. | Add browser automation for the chat happy path after credentials or a mock provider are available. |
| Observability | D | No local logs, metrics, traces, or request inspection workflow beyond route errors. | Add structured request logging and documented runtime diagnostics. |
| Security | C | API keys are server-only and blank in examples; no auth or persistence is present. | Add auth, rate limiting, and production secret handling before public deployment. |
