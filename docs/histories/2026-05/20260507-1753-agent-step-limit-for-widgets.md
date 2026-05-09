## [2026-05-07 17:53] | Task: investigate widget turn stopping after visualizeReadMe

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Default`

### User Query

> for this conversation, why it suddenly stop after call visualizaReadme: http://localhost:3000/chat/4730b48c-0391-464b-85a3-21ee602113bd
> remove the step limitation

### Changes Overview

- Area: chat agent tool-loop completion.
- Key actions: Inspected the saved chat trace and confirmed the assistant reached the configured six-step tool-loop limit immediately after `visualizeReadMe`. Removed the app-level `stepCountIs` stop condition so research-heavy widget turns can still call `showWidget` and finish with visible text.

### Design Intent

The affected turn used several web-search steps before loading generative UI guidelines. Because `visualizeReadMe` consumed the sixth step, the agent stopped cleanly before the required follow-up `showWidget` call. Removing the explicit app-level step condition lets the tool loop continue until the model stops requesting tools, while request-level runtime limits still bound the route.

### Files Modified

- `docs/releases/feature-release-notes.md`
- `lib/chat-agent.ts`
