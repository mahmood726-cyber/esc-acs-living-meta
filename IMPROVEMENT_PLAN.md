# ESC ACS Living Meta-Analysis - Improvement Plan

## Current State Assessment (Updated 2026-01-17)

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Topics | 46 | 47 | 50+ |
| Statistical Functions | 14 | 24 | 25+ |
| ACS Condition Matching Terms | ~10 | 28 | - |
| Topics with Empty Pairwise | Many | Improved | <10% |
| Data Sources | ClinicalTrials.gov only | ClinicalTrials.gov + R Packages | Multi-source |
| R Package Datasets | 0 | 18 | - |
| Export Options | None | CSV, JSON | CSV, PDF, JSON |
| Caching | localStorage (3.5MB) | IndexedDB (50MB+) | - |
| Unit Tests | 16 suites | 20 suites | - |

## ✅ COMPLETED - Priority 1: Critical Improvements

### 1.1 Improve Trial Capture Rate ✅
**Problem:** Only 47.6% of ACS-relevant PubMed NCTs are captured
**Completed:**
- [x] Expanded keyword matching in topics.js (added synonyms, trial names like PLATO, TRITON)
- [x] Enhanced condition matching in worker.js with 28+ ACS terms
- [x] Added secondary matching for cardiovascular + intervention context
- [ ] Add manual NCT ID import functionality (deferred)

### 1.2 Fix Empty Pairwise/Network Tables ✅
**Problem:** Many topics have 0 rows in analysis tabs
**Completed:**
- [x] Improved dispersion parsing (SE→SD, CI→SD conversion for 80/90/95/99% CI)
- [x] Added IQR and range to SD conversion
- [x] Added "debug mode" to show why trials were excluded (visible in Diagnostics tab)
- [x] Enhanced arm matching using intervention descriptions

### 1.3 Increase Cache Capacity ✅
**Problem:** Payloads >3.5MB skip localStorage caching
**Completed:**
- [x] Implemented IndexedDB storage (50MB+ capacity) in cache.js
- [x] Added localStorage fallback for older browsers
- [x] Added cache statistics and migration from localStorage
- [ ] LZ-string compression (deferred - IndexedDB capacity sufficient)

---

## ✅ COMPLETED - Priority 2: Statistical Enhancements

### 2.1 Network Meta-Analysis Improvements ✅
- [x] Add inconsistency testing (node-splitting method) - `nmaInconsistency()` in analysis.js
- [x] Display inconsistency in Network tab with p-values
- [ ] Add confidence intervals for SUCRA/P-scores (Bayesian bootstrap) - future
- [ ] Network geometry assessment (connectivity, efficiency) - future

### 2.2 Publication Bias Enhancements ✅
- [x] Add funnel plot visualization with pseudo-confidence bands - `funnelPlotData()`
- [x] Implement trim-and-fill adjustment - `trimAndFill()`
- [x] Render funnel plot in Diagnostics tab
- [ ] Add contour-enhanced funnel plots - future
- [ ] Selection model methods (Copas, Vevea-Hedges) - future

### 2.3 Additional Statistical Functions ✅
- [x] Subgroup analysis by trial characteristics - `subgroupAnalysis()` in analysis.js
- [x] Cumulative meta-analysis (chronological) - `cumulativeMetaAnalysis()` in analysis.js
- [x] Sensitivity analysis for risk of bias - `sensitivityAnalysis()` in analysis.js
- [ ] Bayesian random-effects model option - future
- [ ] Credible interval calculation for NMA - future

### 2.4 GRADE Assessment ✅
- [x] Automate certainty of evidence assessment - `gradeAssessment()` in analysis.js
- [x] GRADE tab with certainty badge and domain assessments - renderGrade() in app.js
- [x] Cumulative tab with chronological evidence plot - renderCumulative() in app.js
- [ ] Risk of bias integration (ROB2 domains) - future
- [ ] Generate Summary of Findings tables - future

---

## ✅ COMPLETED - Priority 3: Data Source Expansion

### 3.2 R Package Dataset Integration ✅
**Completed 2026-01-25:**
- [x] Created `datasets.js` module with 18 curated datasets
- [x] `metafor` package datasets: BCG vaccine, amlodipine, aspirin MI
- [x] `meta` package datasets: Fleiss93 aspirin, Olkin95 magnesium
- [x] `netmeta` package datasets: Senn2013 antidiabetic, smoking cessation, anticoagulants
- [x] `mada` diagnostic accuracy datasets: AUDIT-C, dementia MMSE, hs-troponin
- [x] ACS-specific datasets: DAPT duration, P2Y12 inhibitors, complete revascularization, colchicine, SGLT2i, PCSK9i
- [x] Added dataset browser modal with filtering by source/type/relevance
- [x] Automatic conversion of datasets to analysis-ready format
- [x] Import datasets as new topics with full meta-analysis support

### 3.1 PubMed Integration
- [ ] Auto-fetch NCT IDs from systematic review PMIDs
- [ ] Import study characteristics from PubMed abstracts
- [ ] Link to full-text where available

### 3.3 External Repository Support
- [x] Zenodo dataset import via API (basic implementation)
- [x] GitHub raw file import (basic implementation)
- [x] CSV parsing utility
- [ ] OSF (Open Science Framework) integration
- [ ] Cochrane CDSR API for reviews

### 3.4 Manual Data Entry
- [x] CSV file parsing support
- [ ] Add study-level data entry form
- [ ] Support Excel import
- [ ] RevMan XML import

---

## Priority 4: Visualization Improvements

### 4.1 Forest Plot Enhancements
- [ ] Add study weights visualization
- [ ] Subgroup headers and summary diamonds
- [ ] Customizable axis labels and scale
- [ ] Interactive hover tooltips

### 4.2 Network Plot Improvements
- [ ] Node size proportional to sample size
- [ ] Edge thickness by number of comparisons
- [ ] Force-directed layout option
- [ ] Interactive drag-and-zoom

### 4.3 Additional Plots
- [ ] Funnel plot with pseudo-confidence bands
- [ ] L'Abbe plot for risk ratios
- [ ] Baujat plot (heterogeneity contributions)
- [ ] Galbraith/radial plot
- [ ] Rankogram for NMA

### 4.4 Dose-Response Improvements
- [ ] Spline models (restricted cubic)
- [ ] Confidence bands visualization
- [ ] Knot selection guidance

---

## ✅ COMPLETED - Priority 5: Export & Reporting

### 5.1 Data Export ✅
- [x] CSV export for trials and comparisons - `exportToCsv()` in app.js
- [x] JSON export with full analysis results - `exportToJson()` in app.js
- [ ] R script generation for reproducibility - future
- [ ] PRISMA flow diagram data - future

### 5.2 Report Generation
- [ ] PDF report with all analyses
- [ ] PRISMA checklist compliance
- [ ] GRADE Summary of Findings
- [ ] Forest plot images (PNG/SVG)

### 5.3 Reproducibility
- [ ] Analysis log with parameters
- [ ] Seed storage for SUCRA simulations
- [ ] Version tracking of data updates

---

## Priority 6: UI/UX Improvements

### 6.1 Navigation & Filtering
- [ ] Search/filter within trial tables
- [ ] Sort by any column
- [ ] Pagination for large datasets
- [ ] Bookmark/favorite topics

### 6.2 Comparison Features
- [ ] Side-by-side topic comparison
- [ ] Temporal trend analysis
- [ ] Evidence gap mapping

### 6.3 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] High contrast mode
- [ ] Mobile responsive design

### 6.4 User Preferences
- [ ] Save analysis settings
- [ ] Custom topic creation
- [ ] Theme selection

---

## ✅ COMPLETED - Priority 7: Validation & Testing

### 7.1 Statistical Validation ✅
- [x] Unit tests for all analysis.js functions - tests.js with 60+ test cases
- [x] Created test-runner.html for browser-based testing
- [ ] Comparison with R meta/metafor/netmeta outputs - future
- [ ] Known dataset benchmarking (e.g., BCG vaccine) - future

### 7.2 Integration Testing
- [ ] Selenium end-to-end tests
- [ ] API response mocking
- [ ] Cross-browser compatibility

### 7.3 Data Quality Checks
- [ ] Automated sanity checks on extracted data
- [ ] Outlier detection for effect sizes
- [ ] Duplicate study identification

---

## Implementation Phases

### Phase 1 (Week 1-2): Critical Fixes
1. Improve outcome extraction for continuous endpoints
2. Expand keyword matching for better coverage
3. Implement IndexedDB caching
4. Add debug mode for exclusion reasons

### Phase 2 (Week 3-4): Statistical Enhancements
1. Add funnel plot visualization
2. Implement NMA inconsistency testing
3. Add cumulative meta-analysis
4. Improve SUCRA confidence intervals

### Phase 3 (Week 5-6): Data Sources
1. PubMed NCT extraction
2. CSV/Excel import
3. R dataset format support
4. Manual data entry form

### Phase 4 (Week 7-8): Export & Polish
1. CSV/JSON export
2. PDF report generation
3. UI filter/sort improvements
4. Mobile responsiveness

### Phase 5 (Ongoing): Validation
1. Statistical function unit tests
2. R package comparison benchmarks
3. Selenium automation

---

## Technical Debt

- [ ] Refactor buildComparisons() for maintainability
- [ ] Add TypeScript definitions
- [ ] Implement proper error boundaries
- [ ] Add service worker for offline mode
- [ ] Optimize Canvas rendering for large datasets

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| PubMed Coverage | 47.6% | 80% | Phase 1 |
| Topics with Pairwise Data | ~50% | 90% | Phase 1 |
| Statistical Functions | 14 | 20 | Phase 2 |
| Export Formats | 0 | 3 | Phase 4 |
| Test Coverage | 0% | 80% | Phase 5 |

---

## ✅ Completed Steps

1. ✅ **Analyzed missing trials** - Reviewed `meta_refs/missing_acs_strict_analysis.json`, expanded condition matching
2. ✅ **Added CI→SD conversion** - Support for 80/90/95/99% CI, IQR, and range
3. ✅ **Implemented IndexedDB** - 50MB+ capacity with localStorage fallback
4. ✅ **Added funnel plot** - With pseudo-confidence bands in Diagnostics tab
5. ✅ **Created CSV/JSON export** - Full analysis export functionality
6. ✅ **Added NMA inconsistency testing** - Node-splitting method with p-values
7. ✅ **Created unit tests** - tests.js with comprehensive test coverage
8. ✅ **Fixed duplicate variable bug** - In renderDiagnostics() function
9. ✅ **Added cumulative meta-analysis** - Chronological evidence accrual with visualization
10. ✅ **Added subgroup analysis** - With Q-between interaction testing
11. ✅ **Added GRADE assessment** - Automated certainty of evidence (5 domains)
12. ✅ **Added sensitivity analysis** - Exclude by risk of bias, sample size, effect thresholds
13. ✅ **Added GRADE & Cumulative tabs** - New UI tabs with styling
14. ✅ **Extended unit tests** - Tests for all 4 new statistical functions
15. ✅ **R Package Dataset Import** - Created datasets.js with 18 curated datasets from metafor/meta/netmeta/mada packages
16. ✅ **Dataset Browser Modal** - Filter by source, type, relevance; preview with statistics; import as topic
17. ✅ **PDF Report Generation** - Export publication-ready PDF reports with jsPDF (forest plot, GRADE table, methods section)
18. ✅ **R Script Export** - Generate reproducible R scripts for meta/metafor/netmeta packages
19. ✅ **Manual Study Entry Form** - Add studies manually with binary, continuous, or pre-computed outcomes
20. ✅ **Table Sorting & Filtering** - Sortable column headers, search/filter, pagination for all tables
21. ✅ **ROB2 Risk of Bias Integration** - Full ROB2 5-domain assessment with traffic light visualization, sensitivity analysis, GRADE integration
22. ✅ **Interactive Forest Plot** - Hover tooltips, click to exclude/include studies, weight-proportional box sizes, real-time pooled effect updates
23. ✅ **Methodological Fixes (Editorial Review Round 1)** - Critical statistical improvements:
    - TACC (Treatment Arm Continuity Correction) for zero-cell handling instead of constant 0.5
    - Begg's test now uses Kendall's tau-b with proper p-value (not Pearson correlation)
    - Newton-Raphson REML estimator with proper convergence
    - I² confidence intervals using Q-profile method
    - τ² confidence intervals using Q-profile method
    - Peters test for publication bias (binary outcomes)
    - Comparison-adjusted funnel plot for NMA
    - NMA now returns standard errors via matrix inversion
    - SUCRA includes credible intervals from Monte Carlo simulation
24. ✅ **Methodological Fixes (Editorial Review Round 2)** - Additional refinements:
    - Egger's test now returns p-value, SE, t-statistic
    - P-score uses proper pooled SE: √(SE_i² + SE_j²)
    - Double-zero studies return NaN effect (not 0)
    - Prediction interval uses median within-study variance
    - Chi-squared quantile lookup table for df ≤ 10
    - NMA HKSJ option for conservative confidence intervals
25. ✅ **R Package Validation Suite** (2026-01-26) - Comprehensive validation against R packages:
    - Created `r-validation.js` with 10 validation suites and 60+ assertions
    - Created `r-validation-runner.html` for interactive browser-based testing
    - BCG vaccine data validation against metafor::dat.bcg
    - Fleiss93 aspirin data validation against meta::Fleiss93
    - Senn2013 NMA validation against netmeta
    - DTA bivariate model validation against mada
    - Publication bias tests (Egger, Begg, trim-and-fill)
    - Chi-squared quantile accuracy verification
    - Effect size calculation verification
    - Cumulative meta-analysis validation
    - Documented R code for each validation suite
    - Tolerance standards: ε < 0.05 for effects, ε < 5% for percentages
26. ✅ **Editorial Review Final Fixes** (2026-01-26) - Achieved 100/100 score:
    - **NMA τ² estimation**: Random-effects with DerSimonian-Laird τ² estimation, I² calculation
    - **Bivariate DTA REML**: Joint covariance estimation, proper SROC curve, confidence/prediction ellipses
    - **Begg's test variance**: Proper tau-b with tie handling, adjusted variance formula
    - **Prediction interval warning**: Warning for k < 5, note for k < 10
    - **NMA inconsistency**: Full loop-specific testing (Bucher method), global Q-statistic
    - **SE validation**: Added 2 new validation suites (validateStandardErrors, validateNMAStandardErrors)
    - **Reproducibility seeds**: `createSeededRNG()` for computeSucra, rankogramData, permutationTest

## Next Steps (Future Work)

1. ✅ **R package validation** - Compare outputs with meta/metafor/netmeta (COMPLETED 2026-01-26)
2. ✅ **Editorial review 100/100** - All issues resolved (COMPLETED 2026-01-26)
2. **PubMed integration** - Auto-fetch NCT IDs from systematic review PMIDs
3. **Network plot enhancements** - Force-directed layout, interactive drag/zoom
4. **Bayesian meta-analysis** - MCMC sampling with prior specification
5. **Mobile responsive design** - Touch-friendly UI for tablets

---

*Plan created: 2026-01-16*
*Last updated: 2026-01-26*
*Project: ESC ACS Living Meta-Analysis*

## Files Modified/Created

| File | Changes |
|------|---------|
| `app.js` | Added export functions, funnel plot, NMA inconsistency display, IndexedDB integration, GRADE tab rendering, Cumulative tab rendering, R Package Dataset Import, **PDF export** (`exportToPdf()`), **R script export** (`exportToR()`), **manual study entry** (modal, form, validation), **table sorting/filtering** (utilities, pagination), **ROB2 assessment** (modal, traffic light, sensitivity analysis), **interactive forest plot** (hover, click to exclude, weight visualization) |
| `analysis.js` | Added `funnelPlotData()`, `trimAndFill()`, `nmaInconsistency()`, `cumulativeMetaAnalysis()`, `subgroupAnalysis()`, `gradeAssessment()`, `sensitivityAnalysis()`, **updated ROB2 scoring in gradeAssessment**, **TACC correction** (`computeLogRR`, `computeLogOR`), **Begg's tau-b** (`beggTest`), **Newton-Raphson REML** (`remlTau2`), **confidence intervals** (`i2ConfidenceInterval`, `tau2ConfidenceInterval`, `chiSquaredQuantile`), **Peters test** (`petersTest`), **NMA comparison-adjusted funnel** (`comparisonAdjustedFunnel`), **NMA τ² estimation** (random-effects in `networkMeta`), **bivariate DTA improvements** (confidence ellipse, prediction ellipse, seCorrelation), **Begg's variance fix** (tau-b with ties), **PI warning** (`piWarning` field), **loop-specific inconsistency** (Bucher method), **seeded PRNG** (`createSeededRNG`, seeds for `computeSucra`, `rankogramData`, `permutationTest`) |
| `worker.js` | Enhanced condition matching (28+ terms), improved CI→SD conversion |
| `topics.js` | Expanded keywords, added new topics (47 total) |
| `cache.js` | **NEW** - IndexedDB caching module |
| `datasets.js` | **NEW** - R Package Dataset Import module with 18 curated meta-analysis datasets from metafor/meta/netmeta/mada packages |
| `tests.js` | Unit tests for statistical functions (20 test suites, 80+ assertions), R validation reference |
| `test-runner.html` | **NEW** - Browser-based test runner, link to R validation |
| `r-validation.js` | **NEW** - R package validation suite (10 suites, 60+ assertions) against metafor/meta/netmeta/mada |
| `r-validation-runner.html` | **NEW** - Interactive browser-based R validation runner with console output |
| `index.html` | Added jsPDF CDN, export buttons, manual study entry modal, ROB2 modal, forest plot controls/tooltip |
| `styles.css` | Added table sorting/filtering styles, badge styles, ROB2 styles, interactive forest plot styles |
| `styles.css` | Added diagnostics grid, export buttons, inconsistency row styling, GRADE assessment styling, cumulative meta-analysis styling, **Dataset import modal styling** |
| `index.html` | Added funnel plot canvas, export buttons, GRADE tab, Cumulative tab, **Dataset import modal and button** |
