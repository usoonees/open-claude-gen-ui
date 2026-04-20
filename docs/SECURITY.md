# Security

Use this document to make secure defaults explicit and legible to agents.

Suggested areas:

- Authentication and authorization expectations.
- Secret handling and environment variable rules.
- Dependency and supply-chain checks.
- Data classification and retention rules.
- Rules for external APIs, webhooks, file uploads, and sandboxed execution.

## Trace Data

- LangSmith tracing is disabled by default in `.env.example`.
- Do not commit LangSmith API keys or paste active keys into shared logs, tickets, docs, or history files.
- Treat traced prompts, tool inputs, tool outputs, and Tavily results as potentially sensitive.
- Before enabling tracing for production or shared users, add redaction for sensitive tool payloads and review LangSmith retention/workspace access.

Repository-wide dependency, SBOM, and provenance defaults live in `docs/SUPPLY_CHAIN_SECURITY.md`.
