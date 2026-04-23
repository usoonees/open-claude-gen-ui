## [2026-04-23 17:56] | Task: rewrite README and track showcase assets

### Execution Context

- Agent ID: `Codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> Move README screenshots out of ignored `artifacts/` and rewrite the README completely.

### Changes Overview

- Area: repository presentation and documentation
- Key actions:
  - Moved the six curated README screenshots into a tracked `docs/readme-assets/` folder with stable filenames.
  - Rewrote `README.md` from scratch around the current product surface, example gallery, quick start, showcase export flow, and repo guide links.

### Design Intent

The README should describe the product as it exists now, not as a generic scaffold. Moving the screenshots into a tracked docs folder keeps GitHub-ready assets versioned with the repo, while the rewrite shifts the page from configuration dump to product-facing overview with a clear demo story.

### Files Modified

- `README.md`
- `docs/readme-assets/ai-news.png`
- `docs/readme-assets/chart.png`
- `docs/readme-assets/nba.png`
- `docs/readme-assets/rag-tradeoffs.png`
- `docs/readme-assets/roadmap.png`
- `docs/readme-assets/svg.png`
- `docs/histories/2026-04/20260423-1756-rewrite-readme-and-track-showcase-assets.md`
