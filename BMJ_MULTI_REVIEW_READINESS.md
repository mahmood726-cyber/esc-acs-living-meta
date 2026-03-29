# BMJ Multi-Person Review Readiness

This project now includes a formal BMJ-style readiness gate for dual-reviewer screening and adjudication quality.

## What Was Added

- `ScreeningQueue.getReviewerAgreement()`:
  - Builds reviewer-by-reviewer decision matrix
  - Computes observed agreement, expected agreement, and Cohen's kappa
  - Returns a qualitative kappa interpretation

- `ScreeningQueue.getConflictReport()`:
  - Lists unresolved and resolved conflicts
  - Flags missing adjudicator identity
  - Flags missing manual-resolution rationale notes

- `ScreeningQueue.generateBMJReadinessReport(criteria)`:
  - Enforces multi-person review gates with configurable thresholds
  - Produces hard `PASS`/`FAIL` output for critical checks
  - Includes actionable remediation items

- `ScreeningQueue.exportResults('bmj')`:
  - Exports the BMJ readiness report as JSON

## Default Critical Gates

- Dual-review coverage `>= 95%`
- Cohen's kappa `>= 0.60`
- Unresolved conflicts `<= 0`
- Audit trail completeness `>= 99%`
- Conflict resolution documentation complete

## Usage Example

```js
import { ScreeningQueue } from "./collaboration.js";

const queue = new ScreeningQueue(studies, { requireDualReview: true });

// ...record reviewer decisions and adjudications...

const report = queue.generateBMJReadinessReport({
  minDualReviewCoverage: 1.0,
  minKappa: 0.70,
  maxUnresolvedConflicts: 0,
  minAuditTrailCompleteness: 1.0
});

console.log(report.overall.decision); // PASS or FAIL
console.log(report.actionItems);      // remediation list if FAIL
```

## Notes for Editorial Review

- The BMJ gate focuses on screening-process rigor and auditability.
- It complements existing PRISMA/GRADE/ROB tooling in `analysis.js` and `collaboration.js`.
- For submission, include both:
  - BMJ readiness report (`exportResults('bmj')`)
  - PRISMA checklist + flow diagram outputs
