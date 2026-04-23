# Security

Use this document to make secure defaults explicit and legible to agents.

## Generative UI Trusted Mode

The repository now supports a trusted local generative UI mode behind `NEXT_PUBLIC_GENERATIVE_UI_TRUSTED=true`.

- Treat this mode as local/dev-only. Generated widget HTML and JavaScript run in the same browser document as the chat surface.
- Never expose server secrets, authenticated browser capabilities, or privileged host APIs to widget code.
- The supported host bridges are `window.sendPrompt(text)`, which appends a new user prompt into the current chat, and `window.openLink(url)`, which only opens sanitized `http(s)` URLs in a new tab.
- Widget script execution only permits external script URLs from the allowlist in `lib/generative-ui/index.ts`.
- If broader deployment safety is required later, move away from same-document injection before enabling the feature by default.

## Trace Data

- LangSmith tracing is disabled by default in `.env.example`.
- Do not commit LangSmith API keys or paste active keys into shared logs, tickets, docs, or history files.
- Treat traced prompts, tool inputs, tool outputs, Tavily results, and generated widget HTML as potentially sensitive.
- Before enabling tracing for production or shared users, add redaction for sensitive tool payloads and review LangSmith retention/workspace access.

Repository-wide dependency, SBOM, and provenance defaults live in `docs/SUPPLY_CHAIN_SECURITY.md`.

## Provider Credentials

- Provider API keys can now be saved from the frontend, but they must still stay server-side only.
- Frontend-saved provider keys are written to `.data/providers/provider-credentials.json` with local encryption and a machine-local key file unless `PROVIDER_CREDENTIALS_MASTER_KEY` is set.
- The UI should only receive masked metadata such as configured state, source, and key preview. Never return raw provider keys to the browser after save.
- This storage is suitable for local development, but it is not a replacement for per-user auth, multi-tenant secret storage, or production access control.
