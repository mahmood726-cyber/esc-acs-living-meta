<!-- sentinel:skip-file — hardcoded paths are fixture/registry/audit-narrative data for this repo's research workflow, not portable application configuration. Same pattern as push_all_repos.py and E156 workbook files. -->

# ESC Enterprise Surveillance Upgrade

This upgrade hardens evidence surveillance using:

- Validated CT.gov strategy profiles (`S1`-`S10`) imported from:
  `C:\Users\user\Downloads\ctgov-search-strategies_backup_20260114-110157`
- AACT SQL-query capability through a secure gateway
- Run-level robustness scoring for high-stakes review workflows
- ESC landmark trial coverage checks by guideline area
- ESC guideline-profile routing (cardiology-wide area pack, profile aliases)
- Trial-universe reporting with and without PICO filtering
- Local AACT gateway support (`aact_local_gateway.py`) for on-machine credentials

## New Capabilities

- `buildCTGovQueryFromPreset(criteria, presetId)`
  - Reproducible strategy query builder for `S1`-`S10`
- `searchClinicalTrialsMultiStrategy(criteria, { strategyIds })`
  - Executes multiple profiles and deduplicates by NCT ID
- `buildAACTSQLQuery(criteria, options)`
  - Generates parameterized ESC cardiology SQL query payload
  - Supports direct `nctIds` verification mode
- `recommendCTGovStrategyBundle(criteria, options)`
  - Uses empirical recall/retention evidence from backup validation results
- `assessESCLandmarkCoverage(studies, options)`
  - Verifies landmark NCT coverage across ESC guideline areas
- `summarizeTrialUniverse(studies, { inclusionCriteria })`
  - Reports raw trial universe and PICO-filtered universe side-by-side
- `searchAACT(criteria, { gatewayUrl })`
  - Uses a server-side gateway for AACT execution
- `assessSurveillanceRobustness(results, options)`
  - Returns `PASS`/`FLAG` and remediation actions
  - Can enforce landmark coverage and AACT incremental capture
- `esc_guideline_universe_pipeline.mjs`
  - Executes per-guideline AACT surveillance runs
  - Exports per-area snapshots and aggregate CSV/JSON in `reports/`
  - Includes side-by-side trial universe counts without vs with PICO
- `esc_flagged_remediation_pipeline.mjs`
  - Targets flagged ESC areas from latest summary
  - Applies expanded term bundles and landmark recovery mode
  - Exports a PASS-only final pack

## Recommended ESC Configuration

```js
const strategy = createSearchStrategy({
  name: "ESC ACS Living Review - High Recall",
  guidelineProfile: "esc",
  sources: ["pubmed", "ctgov", "aact"],
  pubmedQuery: "(acute coronary syndrome[Title/Abstract]) AND (randomized[tiab] OR randomised[tiab])",
  ctgovQuery: { condition: "acute coronary syndrome" },
  aactQuery: { guidelineArea: "acute_coronary_syndromes" },
  searchObjective: "max_recall",
  ctgovMode: "multi",
  ctgovStrategyIds: ["S1", "S3", "S10"],
  aactGatewayUrl: "http://127.0.0.1:8787/aact/query",
  requireAACTForFinalReview: true,
  enforceLandmarkCoverage: true,
  minLandmarkCoveragePct: 70,
  landmarkGuidelineAreas: ["acute_coronary_syndromes"]
});
const results = await runSurveillance(strategy, existingStudies);
console.log(results.trialUniverse.withoutPICO.totalStudies);
console.log(results.trialUniverse.withPICO.totalStudies);
```

## Local AACT Gateway (This Computer)

1. Set credentials in terminal:
   - `set AACT_USER=<your_aact_user>`
   - `set AACT_PASSWORD=<your_aact_password>`
2. Start local gateway:
   - `python aact_local_gateway.py`
3. Health check:
   - `http://127.0.0.1:8787/health`
4. Use in strategy:
   - `aactGatewayUrl: "http://127.0.0.1:8787/aact/query"`

Gateway fixes included:
- Converts PostgreSQL placeholders (`$1`, `$2`) to DB driver placeholders automatically
- Serializes date/datetime values safely in JSON responses

## AACT Gateway Contract

`searchAACT` sends:

```json
{
  "queryId": "esc_aact_rct_search",
  "sql": "...parameterized sql...",
  "parameters": ["%acute coronary syndrome%", "COMPLETED", 1000],
  "meta": {
    "guidelineArea": "acute_coronary_syndromes",
    "termsUsed": ["acute coronary syndrome", "myocardial infarction"],
    "nctIds": []
  }
}
```

Expected response:

```json
{
  "rows": [
    {
      "nct_id": "NCT01234567",
      "brief_title": "Trial title",
      "overall_status": "COMPLETED",
      "phase": "PHASE3",
      "study_type": "Interventional"
    }
  ]
}
```

## Operational Notes

- Browser clients should not connect directly to PostgreSQL.
- AACT credentials stay server-side in the gateway.
- For final editorial or guideline updates, enforce:
  - Multi-strategy CT.gov (`S1+S3+S10`)
  - AACT enabled and error-free
  - Landmark coverage check enabled for the target ESC area
  - `assessSurveillanceRobustness(...).decision === "PASS"`

## Pipeline Run (AACT + Trial Universe)

```bash
node esc_guideline_universe_pipeline.mjs --max-results=80
```

Outputs:
- `reports/esc_surveillance_<area>_<timestamp>.json`
- `reports/esc_guideline_universe_summary_<timestamp>.json`
- `reports/esc_guideline_universe_summary_<timestamp>.csv`
- rolling pointers:
  - `reports/esc_guideline_universe_summary_latest.json`
  - `reports/esc_guideline_universe_summary_latest.csv`

Remediate flagged areas and generate PASS-only final pack:

```bash
node esc_flagged_remediation_pipeline.mjs --max-results=200
```

Outputs:
- `reports/esc_flagged_remediation_pack_<timestamp>.json`
- `reports/esc_flagged_remediation_pack_<timestamp>.csv`
- `reports/esc_pass_only_final_pack_latest.json`
- `reports/esc_pass_only_final_pack_latest.csv`
