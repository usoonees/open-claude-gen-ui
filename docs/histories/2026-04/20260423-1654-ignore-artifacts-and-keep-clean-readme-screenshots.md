## [2026-04-23 16:54] | Task: Ignore artifacts and keep clean README screenshots

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Put `artifacts` in `.gitignore`. Only keep the no-sidebar, vertical screenshot style for README captures.

### Changes Overview

- Area: repository hygiene
- Key actions:
  - Ignored the local `artifacts/` screenshot output directory.
  - Recorded the screenshot-style decision for this repository change.

### Design Intent

README screenshots are local working assets during capture and iteration, not repository source of truth. Ignoring `artifacts/` keeps ad hoc exports out of version control while preserving the cleaner no-sidebar vertical composition as the preferred capture style.

### Files Modified

- `.gitignore`
- `docs/histories/2026-04/20260423-1654-ignore-artifacts-and-keep-clean-readme-screenshots.md`
