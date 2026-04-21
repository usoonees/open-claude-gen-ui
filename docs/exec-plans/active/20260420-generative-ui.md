# Generative UI Trusted Mode

## Goal

Add a first generative-UI slice that behaves like the Claude-style reference flow inside the existing chat app: guideline loading, a streamed widget tool call, inline live widget rendering, and a widget-to-chat callback bridge.

## Scope

- In scope: agent tool additions, typed chat message updates, inline widget rendering, trusted-mode flagging, documentation, and verification.
- Out of scope: hardened production isolation, authentication, uploads, persistence redesign, and non-local trust guarantees.

## Context

- Relevant docs: `docs/ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/SECURITY.md`
- Relevant code paths: `lib/chat-agent.ts`, `lib/chat-tools.ts`, `components/chat-shell.tsx`, `components/generative-widget.tsx`
- Constraints: keep the existing chat flow intact, gate the feature behind a flag, and preserve real-time UI message streaming.

## Risks

- Risk: same-document widget execution can affect the host page.
- Mitigation: keep the feature explicitly trusted/local only, expose only the narrow `window.sendPrompt` and sanitized `window.openLink` host bridges, and restrict external script execution to a narrow allowlist.

## Milestones

1. Vendor guideline source and define new tool contracts.
2. Add inline widget rendering with streamed HTML patching and final script execution.
3. Document the trust model, config flag, and verification flow.

## Validation

- Commands: `pnpm check`, `pnpm build`
- Manual checks: trusted-mode on/off behavior, widget streaming, and widget callback prompt submission
- Observability checks: browser console for widget runtime errors during manual smoke testing

## Progress Log

- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

## Decision Log

- 2026-04-20: Use a trusted-mode flag instead of a production-safe default, because direct DOM injection plus a callback bridge is incompatible with hardened-by-default browser isolation.
- 2026-04-20: Vendor the reference guideline source into the repo so generative-UI behavior is versioned and legible locally.
