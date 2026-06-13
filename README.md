# ESC ACS Living Meta

Shared analysis and reviewer app for the cardiovascular living meta workflow.

## What Is Here

- `app.js`: main interactive reviewer and analysis UI
- `analysis.js`: meta-analysis, GRADE, and synthesis logic
- `r-validation.js`: validation suites, including topic-context validation
- `r-validation-runner.html`: embedded and standalone validation runner
- `topics.js`: topic configuration consumed by the shared app
- `index.html`: the in-browser reviewer + analysis app entry point
- `test-runner-cli.js`: Node CLI test runner for the analysis engine (`npm run test:cli`)
- `tests/test_smoke.py`: Python smoke test for the local AACT SQL gateway (`npm run test:smoke`)
- `aact_local_gateway.py`: local SELECT-only AACT SQL gateway (keeps credentials server-side)

## Current State

This repo now includes:

- topic-aware reviewer validation support
- observed-denominator GRADE handling instead of placeholder sample sizes
- an embedded validation runner that can validate the active review context

## Quick Start

1. Open `index.html` in a browser (serve the directory over a static localhost server so module scripts load).
2. Run `npm run test:cli` to execute the analysis-engine test suite via Node.
3. Run `npm run validate` to run the engine tests plus the Python gateway smoke test (`npm run test:smoke`).

## Related Repo

- Portfolio generator and emitted topic projects:
  `https://github.com/mahmood726-cyber/cardio-ctgov-living-meta-portfolio`

## Methods

`analysis.js` implements the meta-analysis engine in JavaScript with seeded reproducibility:

- **Effect sizes.** `computeLogRR` / `computeLogOR` use Treatment-Arm Continuity Correction (TACC; Sweeting et al. 2004 *Stat Med*) by default for zero-event arms, with `constant` and `empirical` corrections selectable. `computeMeanDiff` covers continuous outcomes.
- **Random-effects pooling.** REML τ² is estimated by Newton–Raphson with the Q-profile confidence interval (metafor-compatible). HKSJ intervals are exposed with the `max(1, Q/(k-1))` variance floor.
- **Network meta-analysis.** Weighted least squares per Rücker (2012), with HKSJ as an option and inconsistency diagnostics (design-by-treatment interaction, node splitting).
- **Diagnostic test accuracy.** Bivariate DTA via iterative scoring (Reitsma 2005, mada-compatible).
- **Trial sequential analysis.** Lan–DeMets spending functions, with the design-effect heterogeneity adjustment `D = 1 + τ² · (Σ(1/v_i²) / (Σ(1/v_i))² · k − 1)`.
- **Reproducibility.** Mulberry32 seeded PRNG so any bootstrap / resampling step is bit-reproducible given the same seed.

`r-validation.js` runs the same fixtures through R-side oracles (`metafor` v4.6, `meta` v7.0, `netmeta` v2.9, `mada` v0.5.11) and reports the JS-vs-R deltas with explicit numerical tolerances per metric.

## Limitations

- **Browser-only execution.** All pooling runs in the analyst's browser. Very large networks (hundreds of treatments, IPD-scale rows) hit memory limits before they hit numerical limits.
- **Lan–DeMets spending requires planned interim look times.** The TSA implementation assumes the user has pre-specified the look schedule; ad-hoc post-hoc TSA is statistically invalid regardless of the tool used.
- **No Bayesian backend.** No Stan / MCMC path; for posterior probabilities of clinically meaningful effects, hand off to a Bayesian R or PyMC pipeline.
- **DTA bivariate convergence fails for k < 5.** The iterative scoring algorithm needs at least 5 studies with non-degenerate sensitivity/specificity; for very small DTA datasets, the engine reports a non-converged result rather than producing a misleading estimate.
- **R-side validation requires a local R install.** `r-validation.js` orchestrates the comparison but the R oracles must be installed on the same machine; the JS side does not embed R.
- **Cardiology-tuned defaults.** Continuity-correction defaults, GRADE templates, and risk-of-bias prompts are tuned for ACS / cardiovascular living MAs. Adapting to other specialties requires updating `topics.js` and the GRADE template, not just the data.

## Conclusions

Use this app for cardiovascular ACS living meta-analysis where (a) the analyst wants a single in-browser reviewer + analysis surface, (b) R-side cross-validation on every release is a non-negotiable, and (c) classic frequentist NMA / DTA / TSA cover the planned outputs. For Bayesian posteriors or very large IPD-NMA networks, drive a Stan or `multinma`-based pipeline downstream and feed the summaries back into this app's reporting surface.
