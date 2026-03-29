# PLOS Multi-Person Review Readiness

This project now supports dedicated PLOS and PLOS ONE readiness gates for multi-person screening transparency and traceability.

## What Was Added

- `ScreeningQueue.generatePLOSReadinessReport(criteria)`:
  - Dual-review coverage and inter-rater agreement (Cohen's kappa)
  - Unresolved conflict enforcement
  - Audit trail completeness
  - Decision-rationale coverage (reviewer notes)
  - Adjudicator independence checks
  - Protocol registration/declaration check
  - Data availability statement check

- `ScreeningQueue.exportResults('plos')`:
  - Exports PLOS readiness report as JSON

- `ScreeningQueue.generatePLOSONEReadinessReport(criteria)`:
  - PLOS ONE profile with stricter defaults for reproducibility and transparency
  - Requires protocol + data availability declarations
  - Requires PRISMA checklist declaration, search-strategy appendix, and screening log export

- `ScreeningQueue.exportResults('plos_one')`:
  - Exports PLOS ONE readiness report as JSON

## Default Critical Gates

- Dual-review coverage `>= 95%`
- Cohen's kappa `>= 0.60`
- Unresolved conflicts `<= 0`
- Audit trail completeness `>= 99%`
- Decision rationale coverage `>= 90%`
- Adjudicator independence `>= 100%` of manual adjudications
- Protocol declaration required
- Data availability declaration required

## Example

```js
import { ScreeningQueue } from "./collaboration.js";

const queue = new ScreeningQueue(studies, { requireDualReview: true });

// ... record decisions and resolve conflicts ...

const report = queue.generatePLOSReadinessReport({
  minDualReviewCoverage: 1.0,
  minKappa: 0.60,
  minDecisionNoteCoverage: 1.0,
  protocolRegistrationId: "PROSPERO-CRD42026000001",
  dataAvailabilityStatement: "Screening decisions and adjudication logs will be shared."
});

console.log(report.overall.decision); // PASS or FAIL
console.log(report.actionItems);
```

## PLOS ONE Example

```js
const plosOneReport = queue.generatePLOSONEReadinessReport({
  protocolRegistrationId: "PROSPERO-CRD42026000001",
  dataAvailabilityStatement: "All screening and adjudication records are shared in supplements.",
  prismaChecklistProvided: true,
  searchStrategyAppendixProvided: true,
  screeningLogExported: true
});

console.log(plosOneReport.standard); // PLOS ONE multi-person systematic review readiness
```

## Auto-Recompute Pipeline

Generate a prefilled 15-study screening log template (from `fixtures/esc_acs_fixture.json`) and declarations template:

```bash
node plos_one_review_pipeline.mjs --init
```

This creates:
- `reports/plos_one_screening_log.csv`
- `reports/plos_one_declarations.json`

After reviewers fill decisions/notes, run:

```bash
node plos_one_review_pipeline.mjs --run
```

This writes:
- `reports/plos_one_readiness_from_log.json`

Optional live recompute while editing:

```bash
node plos_one_review_pipeline.mjs --watch
```

## Operational Notes

- Use an independent adjudicator (not primary reviewer) for manual conflict resolution.
- Keep decision notes concise and explicit to satisfy rationale coverage checks.
- Include protocol and data-availability declarations before manuscript freeze.
