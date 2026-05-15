# CI/CD Guide

This repository uses a single project CI workflow instead of the original
template's split repository-scaffold jobs.

## GitHub Actions

- `.github/workflows/ci.yml` runs on pull requests and pushes to `main`.
- The workflow checks out the repo, installs Node 22 and pnpm 10.32.1, installs
  dependencies with the lockfile, runs repository hygiene scripts, type-checks,
  builds the Next.js app, and lints Markdown.

All GitHub Actions in workflows are pinned to commit SHAs. Keep that property
when updating actions.

## Local Verification

Run the same high-signal checks before pushing CI changes:

```sh
corepack prepare pnpm@10.32.1 --activate
corepack pnpm install --frozen-lockfile
make ci
corepack pnpm check
corepack pnpm build
```

`make ci` covers documentation scaffold checks, repository hygiene checks,
GitHub Action pinning, and shell syntax validation.

## Deferred Release Automation

The template release, supply-chain, and duplicate docs/hygiene workflows were
removed because this app does not yet have a real release or deployment target.
Add release, SBOM, provenance, dependency review, or deployment workflows back
when they are tied to an actual product delivery path.
