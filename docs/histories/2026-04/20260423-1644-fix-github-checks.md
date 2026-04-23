## [2026-04-23 16:44] | Task: fix failing GitHub checks

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `Codex CLI`

### User Query

> fix the github checks:
>
> Some checks were not successful
> 4 failing, 1 skipped, and 1 successful checks
>
> Supply Chain Security / osv-scan (push) Failing after 2s
> Repo Hygiene / repo-hygiene (push) Failing after 8s
> CI / repository-checks (push) Failing after 7s
> Supply Chain Security / scorecard (push) Failing after 8s
>
> you may test using gh after the fixing

### Changes Overview

- Area: GitHub Actions reliability and repository docs hygiene.
- Key actions:
  - Fixed the committed markdownlint violations in history and reference docs so `CI` and `Repo Hygiene` stop failing on the shared markdown lint step.
  - Switched the OSV scan job from the broken direct action invocation to Google's supported reusable scheduled-scan workflow.
  - Updated the Scorecard job for this private repository by adding the documented extra read permissions and disabling result publishing so the action can run without GitHub Advanced Security.
  - Corrected CI/CD and supply-chain docs to match the actual workflow behavior and private-repo constraints.

### Design Intent

Keep the existing repository gates in place instead of weakening or skipping them. The workflow fixes preserve vulnerability and repository-posture scanning while matching the execution modes that GitHub and the action vendors currently support.

### Files Modified

- `.github/workflows/supply-chain-security.yml`
- `docs/CICD.md`
- `docs/SUPPLY_CHAIN_SECURITY.md`
- `docs/histories/2026-04/20260420-2145-add-generative-ui-trusted-mode.md`
- `docs/histories/2026-04/20260421-1111-inline-widget-download.md`
- `docs/histories/2026-04/20260421-1531-compact-model-picker-style.md`
- `docs/histories/2026-04/20260421-1614-flatten-model-selector-trigger.md`
- `docs/histories/2026-04/20260421-1620-remove-selected-readme-label.md`
- `docs/histories/2026-04/20260423-1134-add-deepseek-provider.md`
- `docs/histories/2026-04/20260423-1157-add-minimax-provider.md`
- `docs/histories/2026-04/20260423-1644-fix-github-checks.md`
- `docs/references/agent-facing-generative-ui-and-portability-memo.md`
