## [2026-04-21 12:54] | Task: camelCase tool badges

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Make tool-call render names consistent by using camelCase for labels such as `tavilySearch`, `visualizeReadMe`, and `showWidget`.

### Changes Overview

- Area: chat frontend thinking/tool-call rendering
- Key actions:
  - Updated tool badge name formatting to preserve canonical camelCase labels and normalize spaced, dashed, underscored, or uppercase variants into camelCase.
  - Removed uppercase text transformation from tool badges so labels render as `tavilySearch`, `visualizeReadMe`, and `showWidget`.
  - Added frontend verification guidance for camelCase tool badge rendering.

### Design Intent

The chat UI should display the tool identity exactly as the agent/tool contract names it. Keeping the normalization in the render layer avoids changing server-side tool contracts while making streamed and completed tool calls visually consistent.

### Files Modified

- `components/chat-shell.tsx`
- `app/globals.css`
- `docs/FRONTEND.md`
