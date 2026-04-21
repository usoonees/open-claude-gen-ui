## [2026-04-21 21:33] | Task: add volcengine coding provider

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Next.js 16 / pnpm`

### User Query

> Add an OpenAI-compatible provider based on a Volcengine coding chat-completions curl example.

### Changes Overview

- Area: chat provider integration
- Key actions:
  - Added a dedicated `volcengine-coding` OpenAI-compatible provider module for the `/api/coding/v3` endpoint with environment-driven base URL, API key, and model defaults.
  - Registered the new provider in the shared chat model catalog and provider registry so it appears in provider selection and can back chat inference.
  - Expanded the coding provider's manual model suggestions to include the supported pinned Coding Plan model names alongside `ark-code-latest`.
  - Documented the new environment variables and Ark alias names in `.env.example`, `README.md`, and `docs/ARCHITECTURE.md`.

### Design Intent

The existing Volcengine provider already targeted the generic ACK/Ark OpenAI-compatible surface. The requested curl uses a different coding-specific endpoint and default model, so this change keeps that path separate as its own provider instead of overloading the ACK configuration. That preserves clear env contracts, avoids mixing incompatible defaults, and keeps provider selection explicit in the UI.

### Files Modified

- `.env.example`
- `README.md`
- `docs/ARCHITECTURE.md`
- `lib/chat-model-config.ts`
- `lib/chat-models.ts`
- `lib/volcengine-coding.ts`
