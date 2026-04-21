## [2026-04-21 19:56] | Task: agent-facing generative UI memo

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Research external agent-facing patterns for generative UI and agent-agnostic integration. Focus on Generative-UI-MCP, open-codex-computer-use / open-computer-use portability patterns, and whether cross-agent adoption is best served by MCP only, MCP plus a streaming HTML engine SDK, or another split. Deliver a concise memo with architecture options, tradeoffs, and concrete interface recommendations using web sources.

### Changes Overview

- Area: external architecture research
- Key actions:
  - Added a durable repo-local memo summarizing MCP Apps, `mcp-ui`, FastMCP generative UI, `open-codex-computer-use`, and CodePilot generative UI patterns
  - Framed architecture options and recommended a split model: MCP Apps baseline plus optional advanced renderer profile

### Design Intent

Capture current external patterns in a form the repository can reuse during future architecture decisions, while keeping the recommendation explicit about the tradeoff between ecosystem portability and first-party streaming UX quality.

### Files Modified

- `docs/references/agent-facing-generative-ui-and-portability-memo.md`
- `docs/histories/2026-04/20260421-1956-agent-facing-patterns-memo.md`
