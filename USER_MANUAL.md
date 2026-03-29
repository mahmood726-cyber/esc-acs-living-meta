# ESC ACS Living Meta-Analysis Studio
## User Manual v2.5.0

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Data Import](#2-data-import)
3. [Running Meta-Analysis](#3-running-meta-analysis)
4. [Network Meta-Analysis](#4-network-meta-analysis)
5. [Publication Bias Assessment](#5-publication-bias-assessment)
6. [GRADE Assessment](#6-grade-assessment)
7. [Living Review Features](#7-living-review-features)
8. [Collaboration Tools](#8-collaboration-tools)
9. [Export Options](#9-export-options)
10. [Offline Mode](#10-offline-mode)
11. [API Reference](#11-api-reference)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Getting Started

### 1.1 System Requirements

- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- JavaScript enabled
- 4GB RAM recommended for large analyses
- Internet connection (optional with PWA offline mode)

### 1.2 Installation

**Web Version:**
Simply navigate to the application URL. No installation required.

**PWA Installation (Offline Support):**
1. Open the application in Chrome or Edge
2. Click the install icon in the address bar (or menu → "Install app")
3. The app will be available offline

### 1.3 Interface Overview

```
┌─────────────────────────────────────────────────────────┐
│  Header: Controls, Filters, Import/Export               │
├───────────────┬─────────────────────────────────────────┤
│               │                                         │
│  Topic List   │          Analysis Panel                 │
│  (Left)       │  ┌─────────────────────────────────┐   │
│               │  │ Tabs: Overview | Trials | Meta  │   │
│               │  │       | Network | GRADE | Raw   │   │
│               │  └─────────────────────────────────┘   │
│               │                                         │
│               │  [Forest Plot / Network Graph]          │
│               │                                         │
│               │  [Tables and Statistics]                │
│               │                                         │
└───────────────┴─────────────────────────────────────────┘
```

---

## 2. Data Import

### 2.1 ClinicalTrials.gov Import

1. Set the "New RCT window start" date
2. Select study status filters
3. Click "Update from ClinicalTrials.gov"
4. Wait for automatic extraction

### 2.2 R Dataset Import

1. Click "Import R Dataset"
2. Browse datasets by source (metafor, meta, netmeta)
3. Preview data in the modal
4. Click "Import" to add to analysis

**Supported Datasets:**
- `dat.bcg` - BCG vaccine tuberculosis trials
- `Fleiss93` - Aspirin myocardial infarction
- `Senn2013` - Blood pressure network
- And 15+ more validated datasets

### 2.3 Manual Study Entry

1. Select a topic
2. Click "+ Add Study"
3. Choose outcome type (binary/continuous/precomputed)
4. Enter study data:
   - **Binary:** Events and totals per arm
   - **Continuous:** Means, SDs, and sample sizes
   - **Precomputed:** Effect estimate and SE
5. Preview the calculated effect
6. Click "Add Study"

### 2.4 CSV Import

```csv
study,year,e1,n1,e0,n0
Smith 2020,2020,15,100,25,100
Jones 2021,2021,12,80,20,82
```

Upload via the import dialog or drag-and-drop.

---

## 3. Running Meta-Analysis

### 3.1 Pairwise Meta-Analysis

**Automatic Analysis:**
- Select a topic with ≥2 studies
- Navigate to "Pairwise Meta" tab
- Results appear automatically

**Key Statistics:**
| Statistic | Description |
|-----------|-------------|
| Pooled Effect | Random-effects weighted average |
| 95% CI | Wald or HKSJ confidence interval |
| τ² | Between-study variance |
| I² | Percentage of variance due to heterogeneity |
| Q | Cochran's heterogeneity test |
| Prediction Interval | Expected range for new study |

### 3.2 Effect Measures

| Data Type | Default Measure | Options |
|-----------|-----------------|---------|
| Binary | Log Risk Ratio | OR, RR, RD |
| Continuous | Mean Difference | SMD |
| Time-to-Event | Log Hazard Ratio | — |

### 3.3 Heterogeneity Estimators

- **REML** (default): Restricted maximum likelihood
- **DL**: DerSimonian-Laird method of moments
- **PM**: Paule-Mandel
- **ML**: Maximum likelihood

### 3.4 Confidence Interval Methods

- **Wald**: Standard normal approximation
- **HKSJ**: Hartung-Knapp-Sidik-Jonkman (recommended for k < 20)

---

## 4. Network Meta-Analysis

### 4.1 Running NMA

1. Select topic with ≥3 treatments
2. Set reference treatment in header
3. Navigate to "Network" tab

### 4.2 Interpreting Results

**Treatment Effects Table:**
- Effects relative to reference treatment
- 95% CIs with HKSJ adjustment option

**Rankings:**
- **P-scores**: Frequentist ranking (0-1 scale)
- **SUCRA**: Surface Under Cumulative Ranking curve

**Network Graph:**
- Node size = total sample size
- Edge thickness = number of studies/precision

### 4.3 Inconsistency Testing

The platform automatically tests for:
- **Loop inconsistency**: Bucher method for triangular loops
- **Design inconsistency**: Design-by-treatment interaction

```
Interpretation:
- p > 0.10: No evidence of inconsistency
- p < 0.10: Potential inconsistency (investigate)
- p < 0.05: Significant inconsistency (caution)
```

### 4.4 Advanced NMA Features

**Component NMA:**
```javascript
// Decompose multicomponent interventions
const results = componentNMA(contrasts, components, {
  interactions: true // Test for synergy
});
```

**NMA Meta-Regression:**
```javascript
// Adjust for study-level covariates
const results = networkMetaRegression(contrasts, treatments, ['year', 'dose'], {
  interactionType: 'treatment-specific'
});
```

---

## 5. Publication Bias Assessment

### 5.1 Funnel Plot

Visual assessment of asymmetry:
- Symmetric funnel = no bias evidence
- Asymmetric = potential bias or heterogeneity

### 5.2 Statistical Tests

| Test | Best For | Interpretation |
|------|----------|----------------|
| Egger's | Continuous outcomes | p < 0.10 suggests asymmetry |
| Begg's | Ranked correlation | p < 0.10 suggests asymmetry |
| Peters' | Binary outcomes | More powerful for OR |

### 5.3 Trim and Fill

Imputes missing studies and recalculates pooled effect:
- Shows number of imputed studies
- Adjusted effect estimate
- Compare original vs adjusted

### 5.4 PET-PEESE

Regression-based correction:
1. **PET** (Precision Effect Test): If non-significant, use PET estimate
2. **PEESE** (Precision Effect Estimate with SE): If PET significant, use PEESE

---

## 6. GRADE Assessment

### 6.1 Automatic GRADE

Navigate to "GRADE" tab for automated certainty assessment.

**Domains Assessed:**
1. **Risk of Bias**: Based on ROB2 assessments
2. **Inconsistency**: I² thresholds and CI overlap
3. **Indirectness**: Manual input required
4. **Imprecision**: Optimal Information Size
5. **Publication Bias**: Funnel plot + tests

### 6.2 Certainty Levels

| Level | Description |
|-------|-------------|
| High | Very confident effect is close to estimate |
| Moderate | Moderately confident; true effect likely close |
| Low | Limited confidence; true effect may differ |
| Very Low | Very little confidence in estimate |

### 6.3 Summary of Findings Table

Automatically generated with:
- Absolute effects per 1000 patients
- Relative effects with CIs
- Certainty rating with footnotes

---

## 7. Living Review Features

### 7.1 Evidence Surveillance

**Set up monitoring:**
```javascript
const strategy = createSearchStrategy({
  name: 'Colchicine Post-MI',
  sources: ['pubmed', 'ctgov', 'embase'],
  pubmedQuery: 'colchicine AND myocardial infarction AND randomized',
  scheduleEnabled: true,
  interval: 'weekly'
});
```

### 7.2 Multi-Database Search

Supported databases:
- **PubMed**: Free, automatic
- **ClinicalTrials.gov**: Free, automatic
- **Embase**: Requires API key
- **Cochrane Central**: Manual export supported

### 7.3 Evidence Change Detection

Automatic alerts for:
- Significance direction change (positive → negative)
- Effect magnitude change (>20% shift)
- Heterogeneity change (I² increase >25%)
- New large trial (>10% of pooled N)

### 7.4 Scheduling

```javascript
// Schedule weekly checks
scheduleChecks(strategy, {
  interval: 'weekly',
  notifyEmail: 'team@example.com'
});
```

---

## 8. Collaboration Tools

### 8.1 Dual-Reviewer Screening

```javascript
const queue = new ScreeningQueue(studies, {
  requireDualReview: true,
  conflictResolution: 'adjudicator'
});

// Screen studies
queue.recordDecision('study_1', 'reviewer1', 'include', 'Meets all criteria');
queue.recordDecision('study_1', 'reviewer2', 'include', 'Relevant RCT');

// Check for conflicts
const conflicts = queue.getConflicts();
```

### 8.2 TruthCert Validation

Automatic validation checks:
1. **Effect direction**: Label matches sign
2. **Sample size consistency**: Events ≤ N
3. **Units/timepoint**: Consistent across studies
4. **Duplicate detection**: Fuzzy title matching

```javascript
const validator = new TruthCertValidator();
const result = validator.validateStudy(studyData);
// Returns: { verdict: 'PASS'|'FLAG'|'FAIL', issues: [...] }
```

### 8.3 Session Management

Undo/redo support:
- `Ctrl+Z`: Undo last action
- `Ctrl+Shift+Z`: Redo
- Session persists across browser refreshes

### 8.4 Provenance Tracking

```javascript
const tracker = new ProvenanceTracker('my-analysis', '1.0.0');
tracker.recordAction('study_added', { pmid: '12345678' });
tracker.recordAction('analysis_run', { method: 'REML' });

// Export for DOI registration
const jsonLd = tracker.exportJSONLD();
```

---

## 9. Export Options

### 9.1 Data Exports

| Format | Contents | Use Case |
|--------|----------|----------|
| CSV | Study data | Spreadsheet analysis |
| JSON | Full analysis state | Backup/transfer |
| RIS | Bibliography | Reference managers |
| R Script | Reproducible code | Validation |
| PDF Report | Publication-ready | Sharing results |

### 9.2 Visualization Exports

- **SVG**: Vector graphics (scalable)
- **PNG**: Raster graphics
- **Interactive HTML**: Embed in reports

### 9.3 R Script Export

Generates complete R code using:
- `metafor` for pairwise meta-analysis
- `netmeta` for network meta-analysis
- `mada` for diagnostic test accuracy

---

## 10. Offline Mode

### 10.1 PWA Installation

1. Visit the application in Chrome/Edge
2. Click install prompt or use menu
3. App installs to desktop/home screen

### 10.2 Offline Capabilities

**Available Offline:**
- All statistical analyses
- Cached study data
- Visualization rendering
- Export to local files

**Requires Internet:**
- New ClinicalTrials.gov searches
- PubMed queries
- Real-time collaboration

### 10.3 Cache Management

```javascript
// Check cache status
navigator.serviceWorker.controller.postMessage({ action: 'getCacheSize' });

// Clear cache
navigator.serviceWorker.controller.postMessage({ action: 'clearCache' });
```

---

## 11. API Reference

### 11.1 Core Analysis Functions

```javascript
// Basic meta-analysis
const result = metaAnalysisAdvanced(studies, {
  method: 'REML',
  useHKSJ: true,
  alpha: 0.05
});

// Network meta-analysis
const nma = networkMeta(contrasts, treatments, reference, {
  useHKSJ: true,
  tau2Method: 'REML'
});

// Bayesian meta-analysis
const bayes = bayesianMA(studies, priors, {
  method: 'mcmc', // or 'grid'
  mcmcIterations: 10000
});
```

### 11.2 Visualization Functions

```javascript
// Interactive network graph
renderNetworkGraph(container, treatments, contrasts, {
  interactive: true,
  nodeColorBy: 'certainty'
});

// Animated cumulative meta-analysis
renderAnimatedCumulative(container, studies, {
  animationSpeed: 1000,
  showMilestones: true
});
```

### 11.3 Collaboration Classes

```javascript
// Screening workflow
const queue = new ScreeningQueue(studies);
const validator = new TruthCertValidator();
const session = new SessionManager('my-session');
const provenance = new ProvenanceTracker('analysis-id', '1.0.0');
```

---

## 12. Troubleshooting

### 12.1 Common Issues

**"No studies found"**
- Check date range filters
- Verify search terms match ClinicalTrials.gov conventions
- Try broader status filters

**"Analysis failed"**
- Ensure ≥2 studies with valid data
- Check for missing effect sizes or SEs
- Look for zero-cell studies (handled automatically)

**"Offline mode not working"**
- Ensure PWA is installed
- Check service worker registration in DevTools
- Clear cache and reinstall if needed

### 12.2 Validation

Run the built-in validation suite:
1. Open `test-runner.html`
2. Click "Run All Tests"
3. Check for failures

Run R validation:
1. Open `r-validation-runner.html`
2. Compares against metafor, netmeta, mada
3. All tests should pass with ε < 0.05

### 12.3 Getting Help

- GitHub Issues: Report bugs and feature requests
- Documentation: Check CHANGELOG.md for recent changes
- Source Code: All functions have JSDoc comments

---

## Appendix A: Statistical Formulas

### Random-Effects Model

$$\hat{\mu} = \frac{\sum w_i^* y_i}{\sum w_i^*}$$

where $w_i^* = \frac{1}{v_i + \tau^2}$

### I² Statistic

$$I^2 = \max\left(0, \frac{Q - (k-1)}{Q}\right) \times 100\%$$

### Prediction Interval

$$\hat{\mu} \pm t_{k-2, 1-\alpha/2} \sqrt{\tau^2 + \tilde{v}}$$

where $\tilde{v}$ is the median within-study variance.

---

## Appendix B: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save to cache |
| `Ctrl+E` | Export CSV |
| `Ctrl+P` | Export PDF |
| `?` | Show help |
| `D` | Toggle dark mode |

---

## Appendix C: Academic References

1. Borenstein M, et al. Introduction to Meta-Analysis. Wiley, 2009.
2. Schwarzer G, et al. Meta-Analysis with R. Springer, 2015.
3. Dias S, et al. Network Meta-Analysis for Decision Making. Wiley, 2018.
4. Higgins JPT, Thompson SG. Stat Med 2002;21:1539-58.
5. IntHout J, et al. BMC Med Res Methodol 2014;14:25.
6. Guyatt GH, et al. BMJ 2008;336:924-6.

---

*ESC ACS Living Meta-Analysis Studio v2.5.0*
*Last updated: 2026-01-26*
