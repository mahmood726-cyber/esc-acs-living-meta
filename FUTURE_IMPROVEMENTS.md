# ESC ACS Living Meta-Analysis - Future Improvements Plan

*Created: 2026-01-25*
*Status: Planning Document*

---

## Executive Summary

The ESC ACS Living Meta-Analysis Studio has achieved significant milestones:
- **24 statistical functions** implemented
- **18 R package datasets** available for import
- **GRADE assessment**, **cumulative meta-analysis**, and **NMA inconsistency testing**
- **IndexedDB caching** and **CSV/JSON export**

This document outlines the next phase of improvements organized by impact and complexity.

---

## Phase 1: High Impact / Quick Wins (1-2 weeks) ✅ COMPLETED

### 1.1 PDF Report Generation ✅
**Priority: HIGH | Complexity: MEDIUM | Status: COMPLETED 2026-01-25**

Generate publication-ready PDF reports with:
- [x] Forest plot as embedded image (Canvas → PNG → PDF)
- [x] GRADE Summary of Findings table
- [x] Pairwise comparison table
- [x] Network meta-analysis league table
- [x] Funnel plot and bias diagnostics
- [x] Auto-generated methods section text

### 1.2 R Script Export for Reproducibility ✅
**Priority: HIGH | Complexity: LOW | Status: COMPLETED 2026-01-25**

Export analysis as reproducible R script:
- [x] Generate `meta::metagen()` or `metafor::rma()` calls
- [x] Include data as embedded data frame
- [x] Add forest plot code with `meta::forest()`
- [x] NMA code using `netmeta::netmeta()`

### 1.3 Manual Study Entry Form ✅
**Priority: HIGH | Complexity: MEDIUM | Status: COMPLETED 2026-01-25**

Add UI for manual data entry:
- [x] Study name, year, authors
- [x] Binary outcomes: events/n for each arm
- [x] Continuous outcomes: mean/SD/n for each arm
- [x] Pre-computed effects: HR/OR/RR with CI
- [x] Treatment labels
- [x] Validation and preview before adding

### 1.4 Table Sorting and Filtering ✅
**Priority: MEDIUM | Complexity: LOW | Status: COMPLETED 2026-01-25**

Enhance data tables:
- [x] Click column headers to sort (asc/desc)
- [x] Search/filter input for trial tables
- [x] Pagination for >20 rows
- [ ] Column visibility toggles (deferred)

---

## Phase 2: Statistical Enhancements (2-3 weeks)

### 2.1 Bayesian Meta-Analysis Option
**Priority: MEDIUM | Complexity: HIGH**

Add Bayesian random-effects model:
- [ ] MCMC sampling using jStat or custom implementation
- [ ] Prior specification UI (informative/weakly informative)
- [ ] Posterior summary with credible intervals
- [ ] Bayes factor for heterogeneity
- [ ] Comparison with frequentist results

### 2.2 Risk of Bias Integration (ROB2) ✅
**Priority: HIGH | Complexity: MEDIUM | Status: COMPLETED 2026-01-25**

Integrate Cochrane ROB2 assessments:
- [x] ROB2 domain entry form (5 domains)
- [x] Traffic light visualization
- [x] Weighted analysis by ROB (GRADE integration)
- [x] Sensitivity analysis excluding high-risk studies
- [x] ROB summary figure in Diagnostics tab

**Domains:**
1. Randomization process
2. Deviations from intended interventions
3. Missing outcome data
4. Measurement of outcome
5. Selection of reported result

### 2.3 Advanced Publication Bias Methods ✅ (Partially Completed)
**Priority: MEDIUM | Complexity: HIGH | Status: PARTIAL 2026-01-25**

- [x] Peters test for binary outcomes
- [x] Comparison-adjusted funnel plot for NMA
- [x] Begg's tau-b with proper p-value
- [ ] Contour-enhanced funnel plot
- [ ] Selection model (Copas method)
- [ ] PET-PEESE with conditional estimator
- [ ] P-curve / P-uniform analysis
- [ ] Limit meta-analysis

### 2.6 Methodological Improvements ✅
**Priority: HIGH | Complexity: HIGH | Status: COMPLETED 2026-01-25**

- [x] TACC (Treatment Arm Continuity Correction) for zero-cell handling
- [x] Newton-Raphson REML estimator with proper convergence
- [x] I² confidence intervals (Q-profile method)
- [x] τ² confidence intervals (Q-profile method)
- [x] Chi-squared quantile function (Wilson-Hilferty)
- [x] NMA standard errors via matrix inversion (X'WX)^-1
- [x] SUCRA credible intervals from Monte Carlo simulation

### 2.4 Network Geometry Assessment
**Priority: MEDIUM | Complexity: MEDIUM**

- [ ] Network connectivity metrics
- [ ] Mean path length
- [ ] Clustering coefficient
- [ ] Identify disconnected subnetworks
- [ ] Contribution matrix visualization

### 2.5 Individual Patient Data (IPD) Support
**Priority: LOW | Complexity: HIGH**

- [ ] IPD import format (CSV with patient-level data)
- [ ] One-stage IPD meta-analysis
- [ ] Two-stage IPD meta-analysis
- [ ] Interaction testing with patient covariates

---

## Phase 3: Data Source Integration (2-3 weeks)

### 3.1 PubMed Integration
**Priority: HIGH | Complexity: MEDIUM**

- [ ] Fetch NCT IDs from systematic review PMIDs
- [ ] Extract study characteristics from abstracts
- [ ] Link to full-text via DOI/PMCID
- [ ] Auto-populate study metadata

**API Endpoint:**
```
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=PMID&retmode=xml
```

### 3.2 Cochrane Library Integration
**Priority: MEDIUM | Complexity: HIGH**

- [ ] Search Cochrane CDSR for existing reviews
- [ ] Import forest plot data from Cochrane reviews
- [ ] RevMan 5 XML import
- [ ] RevMan Web API (if available)

### 3.3 OpenAlex / Semantic Scholar
**Priority: LOW | Complexity: MEDIUM**

- [ ] Search for RCTs by topic keywords
- [ ] Citation network analysis
- [ ] Identify potentially missed studies
- [ ] Author disambiguation

### 3.4 PROSPERO Registration Check
**Priority: LOW | Complexity: LOW**

- [ ] Check if topic has registered protocol
- [ ] Link to PROSPERO record
- [ ] Display registration status badge

---

## Phase 4: Visualization Improvements (2-3 weeks)

### 4.1 Interactive Forest Plot ✅
**Priority: HIGH | Complexity: MEDIUM | Status: COMPLETED 2026-01-25**

- [x] Hover tooltips with study details
- [x] Click to highlight/exclude study
- [ ] Drag to reorder studies (deferred)
- [ ] Zoom and pan for large plots (deferred)
- [ ] Subgroup headers with collapsible sections (deferred)
- [x] Study weight visualization (box size proportional to inverse variance)

### 4.2 Enhanced Network Plot
**Priority: MEDIUM | Complexity: MEDIUM**

- [ ] Force-directed layout (D3.js)
- [ ] Node size = total sample size
- [ ] Edge width = number of direct comparisons
- [ ] Edge color = consistency (green=consistent, red=inconsistent)
- [ ] Interactive drag and zoom
- [ ] Click node to see all comparisons

### 4.3 Additional Plot Types
**Priority: MEDIUM | Complexity: MEDIUM**

| Plot | Purpose |
|------|---------|
| L'Abbé plot | Risk in treatment vs control |
| Baujat plot | Influence on heterogeneity |
| Galbraith/radial plot | Precision vs standardized effect |
| Rankogram | Treatment ranking probabilities |
| SUCRA plot | Cumulative ranking |
| Heat map | League table with colors |

### 4.4 Plot Export Options
**Priority: MEDIUM | Complexity: LOW**

- [ ] Export as PNG (high-res)
- [ ] Export as SVG (vector)
- [ ] Export as PDF
- [ ] Copy to clipboard
- [ ] Customizable dimensions

---

## Phase 5: UI/UX Enhancements (2-3 weeks)

### 5.1 Dashboard View
**Priority: MEDIUM | Complexity: MEDIUM**

Create overview dashboard showing:
- [ ] All topics with evidence status
- [ ] Recent updates timeline
- [ ] Evidence gap matrix
- [ ] Key findings summary cards
- [ ] Quick filters by certainty/direction

### 5.2 Topic Comparison Mode
**Priority: MEDIUM | Complexity: MEDIUM**

- [ ] Side-by-side comparison of 2-3 topics
- [ ] Synchronized scrolling
- [ ] Highlight differences in effect direction
- [ ] Combined evidence map

### 5.3 Mobile Responsive Design
**Priority: LOW | Complexity: MEDIUM**

- [ ] Responsive grid layout
- [ ] Touch-friendly controls
- [ ] Collapsible panels
- [ ] Swipe navigation between tabs
- [ ] Optimized table display

### 5.4 Accessibility (WCAG 2.1)
**Priority: MEDIUM | Complexity: MEDIUM**

- [ ] Keyboard navigation (Tab, Arrow keys)
- [ ] Screen reader labels (ARIA)
- [ ] High contrast mode
- [ ] Focus indicators
- [ ] Skip links

### 5.5 User Preferences & Persistence
**Priority: LOW | Complexity: LOW**

- [ ] Save analysis settings per topic
- [ ] Remember last selected topic
- [ ] Custom default parameters
- [ ] Theme selection (light/dark)
- [ ] Export/import user settings

---

## Phase 6: Validation & Quality (Ongoing)

### 6.1 R Package Benchmarking
**Priority: HIGH | Complexity: MEDIUM**

Validate against R packages:
- [ ] `meta` package comparison
- [ ] `metafor` package comparison
- [ ] `netmeta` package comparison
- [ ] Document any differences with rationale

**Test Cases:**
| Dataset | Expected I² | Expected pooled |
|---------|-------------|-----------------|
| BCG vaccine | 92.1% | RR 0.49 |
| Amlodipine | 0% | MD 15.2 |
| Fleiss aspirin | 0% | OR 0.92 |

### 6.2 Automated Testing
**Priority: MEDIUM | Complexity: MEDIUM**

- [ ] Selenium E2E tests
- [ ] Visual regression tests
- [ ] API mock testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] CI/CD pipeline with GitHub Actions

### 6.3 Data Quality Checks
**Priority: MEDIUM | Complexity: LOW**

- [ ] Outlier detection (effect sizes > 3 SD)
- [ ] Zero-cell handling warnings
- [ ] Duplicate study detection
- [ ] Implausible values flagging
- [ ] Data completeness scoring

---

## Phase 7: Advanced Features (Future)

### 7.1 Living Review Automation
**Priority: HIGH | Complexity: HIGH**

- [ ] Scheduled ClinicalTrials.gov polling
- [ ] Email alerts for new matching trials
- [ ] Auto-update analyses when new data
- [ ] Version history with diff view
- [ ] Audit trail of changes

### 7.2 Collaborative Features
**Priority: LOW | Complexity: HIGH**

- [ ] Share analysis via URL
- [ ] Export/import full project state
- [ ] Comments and annotations
- [ ] Multiple user support (future)

### 7.3 AI-Assisted Features
**Priority: MEDIUM | Complexity: HIGH**

- [ ] Auto-extract outcomes from abstracts (NLP)
- [ ] Suggest relevant studies from PubMed
- [ ] Generate plain-language summaries
- [ ] Identify potential PICO mismatches
- [ ] Smart interpretation of results

### 7.4 Offline Mode (PWA)
**Priority: LOW | Complexity: MEDIUM**

- [ ] Service worker for offline access
- [ ] Cache essential assets
- [ ] Sync when back online
- [ ] Install as desktop app

---

## Technical Debt & Refactoring

### Code Quality
- [ ] Refactor `buildComparisons()` into smaller functions
- [ ] Add TypeScript type definitions
- [ ] Implement error boundaries
- [ ] Add comprehensive JSDoc comments
- [ ] Extract constants to config file

### Performance
- [ ] Lazy load heavy components
- [ ] Web Worker for computations
- [ ] Virtual scrolling for large tables
- [ ] Canvas optimization for plots
- [ ] Bundle size optimization

### Architecture
- [ ] Consider state management (Redux-like)
- [ ] Component-based architecture
- [ ] Unit test coverage > 80%
- [ ] API abstraction layer

---

## Priority Matrix

| Feature | Impact | Effort | Priority | Status |
|---------|--------|--------|----------|--------|
| PDF Report | High | Medium | **P1** | ✅ Done |
| R Script Export | High | Low | **P1** | ✅ Done |
| Manual Entry Form | High | Medium | **P1** | ✅ Done |
| Table Sort/Filter | Medium | Low | **P1** | ✅ Done |
| ROB2 Integration | High | Medium | **P2** | ✅ Done |
| Methodological Fixes | High | High | **P1** | ✅ Done |
| PubMed Integration | High | Medium | **P2** | Pending |
| Interactive Forest | High | Medium | **P2** | ✅ Done |
| R Benchmarking | High | Medium | **P2** | Pending |
| Bayesian Meta | Medium | High | **P3** | Pending |
| Network Enhancements | Medium | Medium | **P3** | Pending |
| Dashboard View | Medium | Medium | **P3** | Pending |
| Mobile Responsive | Low | Medium | **P4** | Pending |
| Offline PWA | Low | Medium | **P4** | Pending |
| AI Features | Medium | High | **Future** | Pending |

---

## Recommended Next Steps (Updated 2026-01-25)

### ✅ Completed This Session
1. **PDF Report Generation** - jsPDF with forest plot, GRADE table, methods section
2. **R Script Export** - meta, metafor, netmeta code generation
3. **Manual Study Entry Form** - Binary, continuous, pre-computed outcomes
4. **Table Sorting/Filtering** - Sortable headers, search, pagination
5. **ROB2 Integration** - 5-domain assessment, traffic light, sensitivity analysis
6. **Interactive Forest Plot** - Tooltips, click to exclude, weight visualization
7. **Methodological Fixes** (Editorial Review):
   - TACC (Treatment Arm Continuity Correction) for zero-cell handling
   - Begg's rank correlation using Kendall's tau-b with p-value
   - Newton-Raphson REML estimator with proper convergence
   - I² and τ² confidence intervals (Q-profile method)
   - Peters test for binary outcome publication bias
   - Comparison-adjusted funnel plot for NMA
   - NMA standard errors via matrix inversion
   - SUCRA credible intervals from Monte Carlo

### Next Priority
8. **PubMed integration** - Expands data sources
9. **R package benchmarking** - Validates accuracy
10. **Dashboard view** - Better overview experience

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Export Formats | 2 (CSV, JSON) | 4 (+PDF, R) | Phase 1 |
| Interactive Plots | 0 | 3 | Phase 4 |
| R Validation | 0% | 100% | Phase 6 |
| Mobile Support | None | Responsive | Phase 5 |
| Test Coverage | ~40% | 80% | Phase 6 |
| Accessibility | Partial | WCAG 2.1 AA | Phase 5 |

---

*Document maintained by: ESC ACS Living Meta-Analysis Team*
*Last updated: 2026-01-25*
