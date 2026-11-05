# Contributing

1. Start a focused branch from current `main`; check other open PRs for overlapping files.
2. Make the change and update the relevant guide in `docs/` when behavior or setup changes.
3. Run `npm test` and `npm run build`. Add regression tests for meaningful behavior changes.
4. Open a PR with a short description and validation results. Review SonarQube and Trivy findings before merging.
5. Merge through a reviewed PR. Render deploys the configured branch, normally `main`.

Never commit `.env`, API secrets, `node_modules`, or generated builds. Do not delete numbered migrations or coursework reports just because the runtime does not import them. Test helpers are intentionally used only by tests.

Tests use mocked providers. Check live account flows and playback separately with suitable test accounts. Do not repeatedly rebuild mixes or retry catalog requests during a Spotify cooldown; see [catalog recovery](docs/catalog-recovery.md).
