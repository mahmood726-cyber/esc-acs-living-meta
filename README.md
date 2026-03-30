# ESC ACS Living Meta

Shared analysis and reviewer app for the cardiovascular living meta workflow.

## What Is Here

- `app.js`: main interactive reviewer and analysis UI
- `analysis.js`: meta-analysis, GRADE, and synthesis logic
- `r-validation.js`: validation suites, including topic-context validation
- `r-validation-runner.html`: embedded and standalone validation runner
- `topics.js`: topic configuration consumed by the shared app

## Current State

This repo now includes:

- topic-aware reviewer validation support
- observed-denominator GRADE handling instead of placeholder sample sizes
- an embedded validation runner that can validate the active review context

## Related Repo

- Portfolio generator and emitted topic projects:
  `https://github.com/mahmood726-cyber/cardio-ctgov-living-meta-portfolio`
