# ESC ACS Living Meta

Shared analysis and reviewer app for the cardiovascular living meta workflow.

## What Is Here

- `app.js`: main interactive reviewer and analysis UI
- `analysis.js`: meta-analysis, GRADE, and synthesis logic
- `r-validation.js`: validation suites, including topic-context validation
- `r-validation-runner.html`: embedded and standalone validation runner
- `topics.js`: topic configuration consumed by the shared app
- `open_app.ps1`: local browser launcher with static-server support
- `stop_local_server.ps1`: stops the local launcher server
- `package_release.ps1`: creates a timestamped release zip under `release/`
- `generate_release_notes.ps1`: writes timestamped release notes under `release/`

## Current State

This repo now includes:

- topic-aware reviewer validation support
- observed-denominator GRADE handling instead of placeholder sample sizes
- an embedded validation runner that can validate the active review context

## Quick Start

1. Run `powershell -ExecutionPolicy Bypass -File .\open_app.ps1` to start the local launcher and open the app.
2. Run `powershell -ExecutionPolicy Bypass -File .\run_validation.ps1` for the standard validation path.
3. Run `powershell -ExecutionPolicy Bypass -File .\package_release.ps1` when you need a release snapshot and matching release notes.

## Related Repo

- Portfolio generator and emitted topic projects:
  `https://github.com/mahmood726-cyber/cardio-ctgov-living-meta-portfolio`
