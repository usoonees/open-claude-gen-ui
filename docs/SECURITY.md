# Security

Use this document to make secure defaults explicit and legible to agents.

## Generative UI Trusted Mode

The repository now supports a trusted local generative UI mode behind `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=true`.

- Treat this mode as local/dev-only. Generated widget HTML and JavaScript run in the same browser document as the chat surface.
- Never expose server secrets, authenticated browser capabilities, or privileged host APIs to widget code.
- The only supported host bridge is `window.sendPrompt(text)`, which appends a new user prompt into the current chat.
- Widget script execution only permits external script URLs from the allowlist in `lib/generative-ui/index.ts`.
- If broader deployment safety is required later, move away from same-document injection before enabling the feature by default.

## Trace Data

- LangSmith tracing is disabled by default in `.env.example`.
- Do not commit LangSmith API keys or paste active keys into shared logs, tickets, docs, or history files.
- Treat traced prompts, tool inputs, tool outputs, Tavily results, and generated widget HTML as potentially sensitive.
- Before enabling tracing for production or shared users, add redaction for sensitive tool payloads and review LangSmith retention/workspace access.

Repository-wide dependency, SBOM, and provenance defaults live in `docs/SUPPLY_CHAIN_SECURITY.md`.
