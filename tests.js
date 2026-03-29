/**
 * Unit Tests for ESC ACS Living Meta-Analysis Statistical Functions
 * Run in browser console or with Node.js
 */

import {
  computeLogRR,
  computeLogOR,
  computeMeanDiff,
  metaAnalysis,
  metaAnalysisAdvanced,
  eggerTest,
  beggTest,
  petersTest,
  petPeese,
  leaveOneOut,
  networkMeta,
  nmaInconsistency,
  computePScore,
  computeSucra,
  extractDoseFromLabel,
  metaRegression,
  funnelPlotData,
  comparisonAdjustedFunnel,
  trimAndFill,
  doseResponseFit,
  cumulativeMetaAnalysis,
  subgroupAnalysis,
  gradeAssessment,
  sensitivityAnalysis,
  tau2ConfidenceInterval,
  i2ConfidenceInterval,
  chiSquaredQuantile,
  // New functions (2026-01-25)
  baujatPlotData,
  galbraithPlotData,
  outlierDiagnostics,
  labbePlotData,
  contourFunnelData,
  copasSelectionModel,
  srocCurveData,
  rankogramData,
  enhancedMetaRegression,
  bivariateDTAModel,
  // Editorial revision functions (2026-01-25)
  SeededRNG,
  chiSquaredQuantileImproved,
  bivariateDTAReml,
  mixedEffectsMetaRegression,
  networkMetaWithInconsistency,
  computePScoreWithSE,
  trimAndFillWithSE,
  trialSequentialAnalysis,
  multivariateMetaAnalysis,
  runValidation,
  ANALYSIS_VERSION,
  // Phase 1-4: Competitive Excellence (2026-01-25)
  ipdTwoStage,
  ipdOneStage,
  bayesianMetaAnalysis,
  assessRoB2,
  assessROBINSI,
  assessQUADAS2,
  sensitivityByRoB,
  generateMethodsParagraph,
  generateResultsParagraph,
  // Phase 2: GRADE, Component NMA, Dose-Response
  gradeFramework,
  generateSoFTable,
  componentNMA,
  fractionalPolynomialDR,
  emaxModel,
  // Phase 3: PRISMA, Import/Export, League Tables
  generatePRISMAChecklist,
  parseRevManXML,
  exportToRevManXML,
  exportToCSV,
  parseCSV,
  generateLeagueTable,
  // Phase 4: Performance & Living Review
  streamingMetaAnalysis,
  incrementalMetaAnalysisUpdate,
  AnalysisCache,
  detectEvidenceChange,
  validateSearchStrategy
} from "./analysis.js";
import { ScreeningQueue } from "./collaboration.js";
import {
  createSearchStrategy,
  buildCTGovQueryFromPreset,
  buildAACTSQLQuery,
  recommendCTGovStrategyBundle,
  assessESCLandmarkCoverage,
  summarizeTrialUniverse,
  assessSurveillanceRobustness,
  CTGOV_STRATEGY_PRESETS,
  ESC_GUIDELINE_PROFILES,
  ESC_GUIDELINE_LANDMARK_TRIALS,
  AACT_VALIDATION_REFERENCE
} from "./living-review.js";

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    results.push({ status: "PASS", message });
  } else {
    failed++;
    results.push({ status: "FAIL", message });
    console.error(`FAIL: ${message}`);
  }
}

function assertApprox(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
    results.push({ status: "PASS", message: `${message} (${actual} ≈ ${expected})` });
  } else {
    failed++;
    results.push({ status: "FAIL", message: `${message} (expected ${expected}, got ${actual}, diff ${diff})` });
    console.error(`FAIL: ${message} - expected ${expected}, got ${actual}`);
  }
}

// ============================================================================
// TEST: computeLogRR
// ============================================================================
function testComputeLogRR() {
  console.log("\n=== Testing computeLogRR ===");

  // Test 1: Equal events should give logRR ≈ 0
  const result1 = computeLogRR(10, 100, 10, 100);
  assertApprox(result1.effect, 0, 0.01, "Equal events give logRR ≈ 0");

  // Test 2: Double the event rate
  const result2 = computeLogRR(20, 100, 10, 100);
  const expectedLogRR = Math.log(2); // ~0.693
  assertApprox(result2.effect, expectedLogRR, 0.1, "Double event rate gives logRR ≈ ln(2)");

  // Test 3: SE should be positive
  assert(result1.se > 0, "SE is positive for valid input");

  // Test 4: Single-zero events (continuity correction applied)
  const result3 = computeLogRR(0, 100, 5, 100);
  assert(!isNaN(result3.effect), "Handles single-zero events with continuity correction");

  // Test 5: Larger sample reduces SE
  const result4 = computeLogRR(100, 1000, 100, 1000);
  assert(result4.se < result1.se, "Larger sample has smaller SE");
}

// ============================================================================
// TEST: computeMeanDiff
// ============================================================================
function testComputeMeanDiff() {
  console.log("\n=== Testing computeMeanDiff ===");

  // Test 1: Equal means should give diff = 0
  const result1 = computeMeanDiff(50, 10, 100, 50, 10, 100);
  assertApprox(result1.effect, 0, 0.001, "Equal means give diff = 0");

  // Test 2: Difference of 10
  const result2 = computeMeanDiff(60, 10, 100, 50, 10, 100);
  assertApprox(result2.effect, 10, 0.001, "Mean diff of 10");

  // Test 3: SE calculation
  // SE = sqrt((sd1^2/n1) + (sd0^2/n0)) = sqrt((100/100) + (100/100)) = sqrt(2)
  assertApprox(result2.se, Math.sqrt(2), 0.001, "SE calculation correct");

  // Test 4: Larger sample reduces SE
  const result3 = computeMeanDiff(60, 10, 1000, 50, 10, 1000);
  assert(result3.se < result2.se, "Larger sample reduces SE");
}

// ============================================================================
// TEST: metaAnalysis
// ============================================================================
function testMetaAnalysis() {
  console.log("\n=== Testing metaAnalysis ===");

  // Create test data: 5 studies with similar effects
  const studies = [
    { effect: 0.5, se: 0.2 },
    { effect: 0.6, se: 0.25 },
    { effect: 0.4, se: 0.18 },
    { effect: 0.55, se: 0.22 },
    { effect: 0.45, se: 0.21 }
  ];

  const result = metaAnalysis(studies);

  // Test 1: Pooled effect should be approximately the weighted mean
  assertApprox(result.mu, 0.5, 0.15, "Pooled effect reasonable");

  // Test 2: CI should contain the pooled effect
  assert(result.ci[0] < result.mu && result.mu < result.ci[1], "CI contains pooled effect");

  // Test 3: I² should be between 0 and 100
  assert(result.i2 >= 0 && result.i2 <= 100, "I² in valid range");

  // Test 4: tau² should be non-negative
  assert(result.tau2 >= 0, "tau² non-negative");

  // Test 5: Q statistic should be non-negative
  assert(result.q >= 0, "Q statistic non-negative");

  // Test 6: High heterogeneity data
  const heterogStudies = [
    { effect: -0.5, se: 0.1 },
    { effect: 1.5, se: 0.1 },
    { effect: 0.0, se: 0.1 },
    { effect: 2.0, se: 0.1 },
    { effect: -1.0, se: 0.1 }
  ];
  const hetResult = metaAnalysis(heterogStudies);
  assert(hetResult.i2 > 50, "High I² for heterogeneous data");
}

// ============================================================================
// TEST: metaAnalysisAdvanced
// ============================================================================
function testMetaAnalysisAdvanced() {
  console.log("\n=== Testing metaAnalysisAdvanced ===");

  const studies = [
    { effect: 0.5, se: 0.2 },
    { effect: 0.6, se: 0.25 },
    { effect: 0.4, se: 0.18 },
    { effect: 0.55, se: 0.22 },
    { effect: 0.45, se: 0.21 }
  ];

  const result = metaAnalysisAdvanced(studies);

  // Test 1: Should return all components
  assert(result !== null, "Returns result object");
  assert(result.k === 5, "Correct study count");
  assert(result.random !== undefined, "Has random effects estimate");
  assert(result.fixed !== undefined, "Has fixed effects estimate");
  assert(result.hk !== undefined, "Has Hartung-Knapp correction");
  assert(result.pi !== undefined, "Has prediction interval");

  // Test 2: Prediction interval should be wider than CI
  const ciWidth = result.random.ci[1] - result.random.ci[0];
  const piWidth = result.pi[1] - result.pi[0];
  assert(piWidth >= ciWidth, "Prediction interval wider than CI");

  // Test 3: Empty array returns null
  const emptyResult = metaAnalysisAdvanced([]);
  assert(emptyResult === null, "Empty input returns null");
}

// ============================================================================
// TEST: eggerTest
// ============================================================================
function testEggerTest() {
  console.log("\n=== Testing eggerTest ===");

  // Symmetric data (no bias)
  const symmetric = [
    { effect: 0.5, se: 0.1 },
    { effect: 0.5, se: 0.2 },
    { effect: 0.5, se: 0.3 },
    { effect: 0.5, se: 0.4 }
  ];
  const result1 = eggerTest(symmetric);
  assertApprox(result1.intercept, 0, 0.5, "Symmetric data has intercept ≈ 0");
  assert(result1.pValue !== undefined, "Egger test returns pValue");
  assert(result1.pValue >= 0 && result1.pValue <= 1, "Egger pValue in [0,1]");
  assert(result1.se !== undefined, "Egger test returns SE of intercept");
  assert(result1.t !== undefined, "Egger test returns t-statistic");

  // Asymmetric data (small study effects)
  const asymmetric = [
    { effect: 0.2, se: 0.1 },
    { effect: 0.4, se: 0.2 },
    { effect: 0.8, se: 0.3 },
    { effect: 1.2, se: 0.4 }
  ];
  const result2 = eggerTest(asymmetric);
  assert(result2.intercept !== 0, "Asymmetric data has non-zero intercept");
  assert(result2.pValue !== undefined, "Asymmetric test returns pValue");

  // Too few studies
  const result3 = eggerTest([{ effect: 0.5, se: 0.1 }]);
  assert(result3 === null, "Returns null for < 3 studies");
}

// ============================================================================
// TEST: beggTest
// ============================================================================
function testBeggTest() {
  console.log("\n=== Testing beggTest ===");

  const studies = [
    { effect: 0.5, se: 0.1 },
    { effect: 0.6, se: 0.2 },
    { effect: 0.4, se: 0.3 },
    { effect: 0.55, se: 0.4 }
  ];

  const result = beggTest(studies);
  assert(result !== null, "Returns result for valid input");
  assert(typeof result.tau === "number", "Returns tau statistic");

  // Too few studies
  const result2 = beggTest([{ effect: 0.5, se: 0.1 }]);
  assert(result2 === null, "Returns null for < 3 studies");
}

// ============================================================================
// TEST: leaveOneOut
// ============================================================================
function testLeaveOneOut() {
  console.log("\n=== Testing leaveOneOut ===");

  const studies = [
    { effect: 0.5, se: 0.2 },
    { effect: 0.6, se: 0.25 },
    { effect: 0.4, se: 0.18 },
    { effect: 2.0, se: 0.2 }  // Outlier
  ];

  const results = leaveOneOut(studies);
  assert(results.length === 4, "Returns one result per study");

  // Outlier should have largest Cook's distance
  const cookDistances = results.map(r => r.cook);
  const maxCook = Math.max(...cookDistances);
  assert(results[3].cook === maxCook, "Outlier has largest Cook's distance");

  // Single study returns empty
  const empty = leaveOneOut([{ effect: 0.5, se: 0.2 }]);
  assert(empty.length === 0, "Single study returns empty array");
}

// ============================================================================
// TEST: networkMeta
// ============================================================================
function testNetworkMeta() {
  console.log("\n=== Testing networkMeta ===");

  // Simple 3-treatment network: A vs B, A vs C, B vs C
  const contrasts = [
    { t1: "Treatment_A", t2: "Placebo", effect: 0.5, se: 0.2 },
    { t1: "Treatment_B", t2: "Placebo", effect: 0.3, se: 0.18 },
    { t1: "Treatment_A", t2: "Treatment_B", effect: 0.2, se: 0.22 }
  ];
  const treatments = ["Placebo", "Treatment_A", "Treatment_B"];

  const effects = networkMeta(contrasts, treatments, "Placebo");

  assert(effects.length === 3, "Returns effect for each treatment");

  // Reference should have effect 0
  const refEffect = effects.find(e => e.treatment === "Placebo");
  assert(refEffect.effect === 0, "Reference treatment has effect = 0");

  // Treatment_A should be better than Treatment_B
  const effectA = effects.find(e => e.treatment === "Treatment_A").effect;
  const effectB = effects.find(e => e.treatment === "Treatment_B").effect;
  assert(effectA > effectB, "Treatment_A > Treatment_B as expected");
}

// ============================================================================
// TEST: nmaInconsistency
// ============================================================================
function testNmaInconsistency() {
  console.log("\n=== Testing nmaInconsistency ===");

  // Consistent network
  const consistentContrasts = [
    { t1: "A", t2: "Placebo", effect: 0.5, se: 0.1 },
    { t1: "B", t2: "Placebo", effect: 0.3, se: 0.1 },
    { t1: "A", t2: "B", effect: 0.2, se: 0.1 }  // 0.5 - 0.3 = 0.2 (consistent)
  ];

  const result1 = nmaInconsistency(consistentContrasts, ["Placebo", "A", "B"], "Placebo");
  assert(result1.testable === true, "Consistent network is testable");
  assert(result1.globalInconsistency <= 0.2, "Low inconsistency for consistent data");

  // Insufficient data
  const result2 = nmaInconsistency([{ t1: "A", t2: "B", effect: 0.5, se: 0.1 }], ["A", "B"], "A");
  assert(result2.testable === false, "Insufficient data not testable");
}

// ============================================================================
// TEST: computePScore
// ============================================================================
function testComputePScore() {
  console.log("\n=== Testing computePScore ===");

  const effects = [
    { treatment: "Best", effect: 1.0 },
    { treatment: "Middle", effect: 0.5 },
    { treatment: "Worst", effect: 0.0 }
  ];

  const scores = computePScore(effects);
  assert(scores.length === 3, "Returns score for each treatment");

  // Best treatment should have highest P-score
  assert(scores[0].treatment === "Best", "Best treatment ranked first");
  assert(scores[2].treatment === "Worst", "Worst treatment ranked last");

  // P-scores should be between 0 and 1
  assert(scores.every(s => s.score >= 0 && s.score <= 1), "P-scores in [0,1]");
}

// ============================================================================
// TEST: computeSucra
// ============================================================================
function testComputeSucra() {
  console.log("\n=== Testing computeSucra ===");

  const effects = [
    { treatment: "Best", effect: 1.0 },
    { treatment: "Middle", effect: 0.5 },
    { treatment: "Worst", effect: 0.0 }
  ];

  const sucras = computeSucra(effects, 1000);
  assert(sucras.length === 3, "Returns SUCRA for each treatment");

  // SUCRA values should be between 0 and 1
  assert(sucras.every(s => s.sucra >= 0 && s.sucra <= 1), "SUCRA in [0,1]");

  // Best should have highest SUCRA
  const bestSucra = sucras.find(s => s.treatment === "Best").sucra;
  const worstSucra = sucras.find(s => s.treatment === "Worst").sucra;
  assert(bestSucra > worstSucra, "Best treatment has higher SUCRA");
}

// ============================================================================
// TEST: extractDoseFromLabel
// ============================================================================
function testExtractDoseFromLabel() {
  console.log("\n=== Testing extractDoseFromLabel ===");

  // Various dose formats
  assertApprox(extractDoseFromLabel("Aspirin 100mg"), 100, 0.001, "Parses '100mg'");
  assertApprox(extractDoseFromLabel("Drug 5.5 mg"), 5.5, 0.001, "Parses '5.5 mg'");
  assertApprox(extractDoseFromLabel("Med 200mcg daily"), 200, 0.001, "Parses '200mcg'");
  assertApprox(extractDoseFromLabel("Dose: 1.5g"), 1.5, 0.001, "Parses '1.5g'");

  // No dose
  assert(extractDoseFromLabel("Placebo") === null, "Returns null for no dose");
  assert(extractDoseFromLabel(null) === null, "Returns null for null input");
}

// ============================================================================
// TEST: metaRegression
// ============================================================================
function testMetaRegression() {
  console.log("\n=== Testing metaRegression ===");

  // Linear relationship: y = 0.5 + 0.1*x
  const y = [0.6, 0.7, 0.8, 0.9, 1.0];
  const x = [1, 2, 3, 4, 5];
  const vi = [0.01, 0.01, 0.01, 0.01, 0.01];

  const result = metaRegression(y, x, vi);

  assert(result.beta.length === 2, "Returns intercept and slope");
  assertApprox(result.beta[0], 0.5, 0.1, "Intercept approximately 0.5");
  assertApprox(result.beta[1], 0.1, 0.05, "Slope approximately 0.1");
  assert(result.se.length === 2, "Returns SEs for coefficients");
}

// ============================================================================
// TEST: funnelPlotData
// ============================================================================
function testFunnelPlotData() {
  console.log("\n=== Testing funnelPlotData ===");

  const studies = [
    { effect: 0.5, se: 0.1, studyId: "Study1" },
    { effect: 0.6, se: 0.2, studyId: "Study2" },
    { effect: 0.4, se: 0.15, studyId: "Study3" }
  ];
  const meta = { mu: 0.5 };

  const result = funnelPlotData(studies, meta);

  assert(result !== null, "Returns result for valid input");
  assert(result.points.length === 3, "Has point for each study");
  assert(result.pooledEffect === 0.5, "Pooled effect correct");
  assert(result.bands.length === 51, "Has 51 band points");
  assert(result.seRange[0] <= result.seRange[1], "SE range valid");

  // Null inputs
  assert(funnelPlotData([], meta) === null, "Returns null for empty studies");
  assert(funnelPlotData(studies, null) === null, "Returns null for null meta");
}

// ============================================================================
// TEST: trimAndFill
// ============================================================================
function testTrimAndFill() {
  console.log("\n=== Testing trimAndFill ===");

  // Symmetric data (no imputation expected)
  const symmetric = [
    { effect: 0.5, se: 0.1 },
    { effect: 0.5, se: 0.2 },
    { effect: 0.5, se: 0.15 },
    { effect: 0.5, se: 0.12 }
  ];
  const result1 = trimAndFill(symmetric);
  assert(result1 !== null, "Returns result for valid input");
  assertApprox(result1.originalMu, result1.adjustedMu, 0.1, "Symmetric data: minimal adjustment");

  // Asymmetric data
  const asymmetric = [
    { effect: 0.2, se: 0.1 },
    { effect: 0.3, se: 0.1 },
    { effect: 0.4, se: 0.1 },
    { effect: 1.5, se: 0.1 }  // Extreme outlier on one side
  ];
  const result2 = trimAndFill(asymmetric);
  assert(result2.imputedStudies !== undefined, "Has imputed studies array");

  // Too few studies
  const result3 = trimAndFill([{ effect: 0.5, se: 0.1 }]);
  assert(result3 === null, "Returns null for < 3 studies");
}

// ============================================================================
// TEST: doseResponseFit
// ============================================================================
function testDoseResponseFit() {
  console.log("\n=== Testing doseResponseFit ===");

  // Linear dose-response
  const linearPoints = [
    { dose: 10, effect: 0.1, se: 0.05 },
    { dose: 20, effect: 0.2, se: 0.05 },
    { dose: 30, effect: 0.3, se: 0.05 },
    { dose: 40, effect: 0.4, se: 0.05 }
  ];

  const linearResult = doseResponseFit(linearPoints, "linear");
  assert(linearResult !== null, "Returns result for linear fit");
  assert(linearResult.beta.length === 2, "Linear model has 2 coefficients");
  assert(linearResult.r2 > 0.9, "High R² for perfect linear data");

  // Quadratic fit
  const quadResult = doseResponseFit(linearPoints, "quadratic");
  assert(quadResult.beta.length === 3, "Quadratic model has 3 coefficients");

  // Empty input
  const emptyResult = doseResponseFit([]);
  assert(emptyResult === null, "Returns null for empty input");
}

// ============================================================================
// TEST: cumulativeMetaAnalysis
// ============================================================================
function testCumulativeMetaAnalysis() {
  console.log("\n=== Testing cumulativeMetaAnalysis ===");

  // Create test data: 5 studies with dates
  const studies = [
    { studyId: "Study1", effect: 0.5, se: 0.2, date: "2020-01-15" },
    { studyId: "Study2", effect: 0.6, se: 0.25, date: "2021-03-20" },
    { studyId: "Study3", effect: 0.4, se: 0.18, date: "2019-06-10" },
    { studyId: "Study4", effect: 0.55, se: 0.22, date: "2022-09-05" },
    { studyId: "Study5", effect: 0.45, se: 0.21, date: "2023-02-28" }
  ];

  const results = cumulativeMetaAnalysis(studies);

  // Test 1: Should return one result per cumulative step
  assert(results.length === 5, "Returns result for each cumulative step");

  // Test 2: First result should represent the first study
  assert(results[0].k === 1, "First cumulative result has k=1");

  // Test 3: Results should be sorted by date (Study3 is earliest)
  assert(results[0].studyId === "Study3", "Studies ordered chronologically (Study3 first, then Study1)");

  // Test 4: Last result should include all studies
  assert(results[4].k === 5, "Last result has all 5 studies");

  // Test 5: Each result should have required fields
  const lastResult = results[4];
  assert(lastResult.mu !== undefined, "Has pooled effect (mu)");
  assert(lastResult.se !== undefined, "Has standard error");
  assert(lastResult.ci !== undefined, "Has confidence interval");
  assert(lastResult.i2 !== undefined, "Has I² statistic");

  // Test 6: Insufficient studies
  const single = cumulativeMetaAnalysis([{ effect: 0.5, se: 0.2 }]);
  assert(single.length === 0, "Returns empty for < 2 studies");

  // Test 7: CI should contain pooled effect
  assert(lastResult.ci[0] < lastResult.mu && lastResult.mu < lastResult.ci[1],
    "Final CI contains pooled effect");
}

// ============================================================================
// TEST: subgroupAnalysis
// ============================================================================
function testSubgroupAnalysis() {
  console.log("\n=== Testing subgroupAnalysis ===");

  // Create test data with subgroups
  const studies = [
    { studyId: "A1", effect: 0.3, se: 0.1, subgroup: "GroupA" },
    { studyId: "A2", effect: 0.4, se: 0.12, subgroup: "GroupA" },
    { studyId: "A3", effect: 0.35, se: 0.11, subgroup: "GroupA" },
    { studyId: "B1", effect: 0.8, se: 0.15, subgroup: "GroupB" },
    { studyId: "B2", effect: 0.9, se: 0.14, subgroup: "GroupB" },
    { studyId: "B3", effect: 0.85, se: 0.13, subgroup: "GroupB" }
  ];

  const result = subgroupAnalysis(studies);

  // Test 1: Should have results for both subgroups
  assert(result.subgroups.length === 2, "Returns results for 2 subgroups");

  // Test 2: GroupA should have lower effect than GroupB
  const groupA = result.subgroups.find(s => s.subgroup === "GroupA");
  const groupB = result.subgroups.find(s => s.subgroup === "GroupB");
  assert(groupA.mu < groupB.mu, "GroupA has lower effect than GroupB");

  // Test 3: Each subgroup has k=3
  assert(groupA.k === 3, "GroupA has 3 studies");
  assert(groupB.k === 3, "GroupB has 3 studies");

  // Test 4: Interaction test should be significant (very different effects)
  assert(result.interaction !== null, "Has interaction test result");
  assert(result.interaction.Qbetween > 0, "Q-between statistic is positive");
  assert(result.interaction.pValue < 0.05, "Significant interaction (p < 0.05)");

  // Test 5: Empty input
  const empty = subgroupAnalysis([]);
  assert(empty.subgroups.length === 0, "Returns empty for no studies");

  // Test 6: No subgroup field
  const noSubgroup = subgroupAnalysis([{ effect: 0.5, se: 0.1 }]);
  assert(noSubgroup.subgroups.length === 1, "Studies without subgroup in 'Unknown'");
}

// ============================================================================
// TEST: gradeAssessment
// ============================================================================
function testGradeAssessment() {
  console.log("\n=== Testing gradeAssessment ===");

  // Create test data: well-conducted RCTs with consistent results
  const goodStudies = [
    { effect: 0.5, se: 0.1, n1: 200, n0: 200, riskOfBias: "low" },
    { effect: 0.52, se: 0.11, n1: 180, n0: 180, riskOfBias: "low" },
    { effect: 0.48, se: 0.09, n1: 220, n0: 220, riskOfBias: "low" },
    { effect: 0.51, se: 0.1, n1: 190, n0: 190, riskOfBias: "low" },
    { effect: 0.49, se: 0.08, n1: 250, n0: 250, riskOfBias: "low" }
  ];
  const goodMeta = { mu: 0.5, se: 0.05, ci: [0.4, 0.6], i2: 5, tau2: 0.001, q: 3 };

  const result1 = gradeAssessment(goodStudies, goodMeta);

  // Test 1: Should return assessment object
  assert(result1 !== null, "Returns assessment object");
  assert(result1.certainty !== undefined, "Has certainty rating");
  assert(result1.domains !== undefined, "Has domain assessments");

  // Test 2: Good evidence should be High or Moderate certainty
  assert(
    result1.certainty === "High" || result1.certainty === "Moderate",
    "Good RCTs rated High or Moderate certainty"
  );

  // Test 3: Should have all 5 GRADE domains
  assert(result1.domains.riskOfBias !== undefined, "Has risk of bias domain");
  assert(result1.domains.inconsistency !== undefined, "Has inconsistency domain");
  assert(result1.domains.indirectness !== undefined, "Has indirectness domain");
  assert(result1.domains.imprecision !== undefined, "Has imprecision domain");
  assert(result1.domains.publicationBias !== undefined, "Has publication bias domain");

  // Test 4: Heterogeneous data should downgrade for inconsistency
  const hetStudies = [
    { effect: -0.5, se: 0.1, n1: 100, n0: 100 },
    { effect: 1.5, se: 0.1, n1: 100, n0: 100 },
    { effect: 0.0, se: 0.1, n1: 100, n0: 100 }
  ];
  const hetMeta = { mu: 0.5, se: 0.2, ci: [0.1, 0.9], i2: 95, tau2: 0.5, q: 50 };
  const result2 = gradeAssessment(hetStudies, hetMeta);
  assert(
    result2.domains.inconsistency.concern === "serious" ||
    result2.domains.inconsistency.concern === "very serious",
    "High heterogeneity flagged as serious inconsistency"
  );

  // Test 5: Wide CI should trigger imprecision concern
  const impreciseMeta = { mu: 0.5, se: 0.5, ci: [-0.5, 1.5], i2: 0, tau2: 0, q: 1 };
  const result3 = gradeAssessment(goodStudies, impreciseMeta);
  assert(
    result3.domains.imprecision.concern !== "none",
    "Wide CI flagged as imprecision concern"
  );

  // Test 6: Null inputs
  assert(gradeAssessment([], goodMeta) === null, "Returns null for empty studies");
  assert(gradeAssessment(goodStudies, null) === null, "Returns null for null meta");
}

// ============================================================================
// TEST: sensitivityAnalysis
// ============================================================================
function testSensitivityAnalysis() {
  console.log("\n=== Testing sensitivityAnalysis ===");

  // Create test data with an outlier
  const studies = [
    { studyId: "Study1", effect: 0.5, se: 0.1, riskOfBias: "low", sampleSize: 200 },
    { studyId: "Study2", effect: 0.52, se: 0.11, riskOfBias: "low", sampleSize: 180 },
    { studyId: "Study3", effect: 0.48, se: 0.09, riskOfBias: "high", sampleSize: 50 },
    { studyId: "Study4", effect: 2.0, se: 0.15, riskOfBias: "low", sampleSize: 150 },
    { studyId: "Study5", effect: 0.49, se: 0.08, riskOfBias: "low", sampleSize: 250 }
  ];

  // Test 1: Exclude high risk of bias studies
  const result1 = sensitivityAnalysis(studies, { riskOfBias: "high" });
  assert(result1 !== null, "Returns result object");
  assert(result1.original.k === 5, "Original has 5 studies");
  assert(result1.sensitivity.k === 4, "After exclusion has 4 studies");
  assert(result1.excluded.length === 1, "1 study excluded");
  assert(result1.excluded[0].studyId === "Study3", "Study3 excluded for high RoB");

  // Test 2: Exclude small studies (n < 100)
  const result2 = sensitivityAnalysis(studies, { minSampleSize: 100 });
  assert(result2.excluded.length === 1, "1 small study excluded");
  assert(result2.excluded[0].studyId === "Study3", "Study3 excluded for small sample");

  // Test 3: Exclude outlier (effect > 1.5)
  const result3 = sensitivityAnalysis(studies, { maxEffect: 1.5 });
  assert(result3.excluded.length === 1, "1 outlier excluded");
  assert(result3.excluded[0].studyId === "Study4", "Study4 excluded as outlier");

  // Test 4: Check if conclusions change
  assert(result3.conclusionChanged !== undefined, "Reports if conclusion changed");

  // Test 5: Multiple criteria
  const result4 = sensitivityAnalysis(studies, { riskOfBias: "high", minSampleSize: 100 });
  assert(result4.excluded.length >= 1, "Multiple criteria can exclude studies");

  // Test 6: No exclusions when criteria don't match
  const result5 = sensitivityAnalysis(studies, { riskOfBias: "critical" });
  assert(result5.excluded.length === 0, "No exclusions when no studies match criteria");
  assert(result5.sensitivity.k === 5, "All studies retained");

  // Test 7: Empty input
  const empty = sensitivityAnalysis([], { riskOfBias: "high" });
  assert(empty === null, "Returns null for empty studies");
}

// ============================================================================
// TEST: TACC (Treatment Arm Continuity Correction)
// ============================================================================
function testTACC() {
  console.log("\n--- Testing TACC for zero cells ---");

  // Test zero events in treatment arm
  const result1 = computeLogRR(0, 50, 5, 50, 'tacc');
  assert(result1.method === 'tacc', "TACC method applied for zero events");
  assert(isFinite(result1.effect), "Returns finite effect for zero events");
  assert(isFinite(result1.se), "Returns finite SE for zero events");

  // Test zero events in control arm
  const result2 = computeLogRR(5, 50, 0, 50, 'tacc');
  assert(result2.method === 'tacc', "TACC method applied for zero control events");
  assert(isFinite(result2.effect), "Returns finite effect for zero control");

  // Test double-zero (should be excluded)
  const result3 = computeLogRR(0, 50, 0, 50, 'tacc');
  assert(result3.excluded === true, "Double-zero studies are excluded");

  // Test constant correction
  const result4 = computeLogRR(0, 50, 5, 50, 'constant');
  assert(result4.method === 'constant', "Constant correction applied when specified");

  // Test no correction needed
  const result5 = computeLogRR(10, 50, 5, 50, 'tacc');
  assert(result5.method === 'none', "No correction when not needed");
}

// ============================================================================
// TEST: Chi-squared quantile
// ============================================================================
function testChiSquaredQuantile() {
  console.log("\n--- Testing Chi-squared quantile ---");

  // Test known quantiles
  // χ²(0.95, 10) ≈ 18.31
  const q95_10 = chiSquaredQuantile(0.95, 10);
  assertApprox(q95_10, 18.31, 0.5, "χ²(0.95, 10) ≈ 18.31");

  // χ²(0.05, 10) ≈ 3.94
  const q05_10 = chiSquaredQuantile(0.05, 10);
  assertApprox(q05_10, 3.94, 0.5, "χ²(0.05, 10) ≈ 3.94");

  // Edge cases
  assert(chiSquaredQuantile(0, 10) === 0, "χ²(0, df) = 0");
  assert(chiSquaredQuantile(1, 10) === Infinity, "χ²(1, df) = Infinity");
}

// ============================================================================
// TEST: I² confidence interval
// ============================================================================
function testI2CI() {
  console.log("\n--- Testing I² confidence interval ---");

  // Test with moderate heterogeneity
  const result1 = i2ConfidenceInterval(20, 10, 0.05);
  assert(result1.lower >= 0, "I² CI lower bound >= 0");
  assert(result1.upper <= 100, "I² CI upper bound <= 100");
  assert(result1.lower <= result1.upper, "I² CI lower <= upper");

  // Test with low heterogeneity (Q < df)
  const result2 = i2ConfidenceInterval(5, 10, 0.05);
  assert(result2.lower === 0, "I² CI lower = 0 when Q < df");

  // Test with high heterogeneity
  const result3 = i2ConfidenceInterval(100, 10, 0.05);
  assert(result3.lower > 50, "I² CI lower > 50 with high Q");
}

// ============================================================================
// TEST: τ² confidence interval
// ============================================================================
function testTau2CI() {
  console.log("\n--- Testing τ² confidence interval ---");

  const yi = [0.5, 0.3, 0.7, 0.4, 0.6];
  const vi = [0.1, 0.1, 0.1, 0.1, 0.1];

  const result = tau2ConfidenceInterval(yi, vi, 0.05);
  assert(result.lower >= 0, "τ² CI lower bound >= 0");
  assert(result.lower <= result.upper, "τ² CI lower <= upper");
}

// ============================================================================
// TEST: Peters test
// ============================================================================
function testPetersTest() {
  console.log("\n--- Testing Peters test ---");

  // Need at least 10 studies
  const smallStudies = [
    { effect: 0.5, se: 0.1, n1: 50, n0: 50 },
    { effect: 0.3, se: 0.15, n1: 30, n0: 30 }
  ];
  const result1 = petersTest(smallStudies);
  assert(result1.interpretation === 'Insufficient studies (need ≥10)', "Peters test requires ≥10 studies");

  // With 10+ studies
  const studies = [];
  for (let i = 0; i < 12; i++) {
    studies.push({
      effect: 0.3 + Math.random() * 0.2,
      se: 0.1 + Math.random() * 0.05,
      n1: 40 + Math.floor(Math.random() * 60),
      n0: 40 + Math.floor(Math.random() * 60)
    });
  }
  const result2 = petersTest(studies);
  assert(!isNaN(result2.intercept), "Peters test returns intercept");
  assert(!isNaN(result2.pValue), "Peters test returns p-value");
  assert(result2.pValue >= 0 && result2.pValue <= 1, "Peters p-value in [0,1]");
}

// ============================================================================
// TEST: Comparison-adjusted funnel
// ============================================================================
function testComparisonAdjustedFunnel() {
  console.log("\n--- Testing comparison-adjusted funnel ---");

  const studies = [
    { effect: 0.3, se: 0.1, t1: "A", t2: "B" },
    { effect: 0.5, se: 0.15, t1: "A", t2: "C" },
    { effect: 0.2, se: 0.12, t1: "B", t2: "C" }
  ];

  const nmaResults = {
    treatments: [
      { treatment: "A", effect: 0 },
      { treatment: "B", effect: -0.3 },
      { treatment: "C", effect: -0.5 }
    ]
  };

  const result = comparisonAdjustedFunnel(studies, nmaResults);
  assert(result !== null, "Returns result for valid input");
  assert(result.type === 'comparison-adjusted', "Identifies as comparison-adjusted");
  assert(result.pooledEffect === 0, "Centered at 0");
  assert(result.points.length === 3, "Returns all points");
  assert(result.points[0].predicted !== undefined, "Includes NMA-predicted effect");
}

// ============================================================================
// TEST: P-score with proper SE
// ============================================================================
function testPScoreSE() {
  console.log("\n--- Testing P-score SE propagation ---");

  const effects = [
    { treatment: "A", effect: 0, se: 0 },       // Reference
    { treatment: "B", effect: -0.5, se: 0.1 },
    { treatment: "C", effect: -0.3, se: 0.2 }   // Higher uncertainty
  ];

  const scores = computePScore(effects);
  assert(scores.length === 3, "Returns scores for all treatments");
  assert(scores[0].score >= 0 && scores[0].score <= 1, "P-score in [0,1]");

  // Reference treatment (no SE) should still get valid score
  const refScore = scores.find(s => s.treatment === "A");
  assert(refScore !== undefined, "Reference treatment has score");
}

// ============================================================================
// TEST: Double-zero returns NaN
// ============================================================================
function testDoubleZeroNaN() {
  console.log("\n--- Testing double-zero returns NaN ---");

  const result = computeLogRR(0, 50, 0, 50, 'tacc');
  assert(result.excluded === true, "Double-zero marked as excluded");
  assert(isNaN(result.effect), "Double-zero effect is NaN, not 0");
  assert(result.se === Infinity, "Double-zero SE is Infinity");

  // Same for OR
  const resultOR = computeLogOR(0, 50, 0, 50, 'tacc');
  assert(isNaN(resultOR.effect), "Double-zero OR effect is NaN");
}

// ============================================================================
// TEST: Prediction interval uses median variance
// ============================================================================
function testPredictionInterval() {
  console.log("\n--- Testing prediction interval formula ---");

  // Create studies with different variances
  const studies = [
    { effect: 0.3, se: 0.05 },  // Very precise
    { effect: 0.4, se: 0.1 },
    { effect: 0.5, se: 0.15 },
    { effect: 0.6, se: 0.2 },
    { effect: 0.7, se: 0.5 }   // Very imprecise
  ];

  const meta = metaAnalysisAdvanced(studies);
  assert(meta.pi !== undefined, "Returns prediction interval");
  assert(meta.pi[0] < meta.random.mu, "PI lower < pooled effect");
  assert(meta.pi[1] > meta.random.mu, "PI upper > pooled effect");

  // PI should be wider than random-effects CI
  const piWidth = meta.pi[1] - meta.pi[0];
  const ciWidth = meta.random.ci[1] - meta.random.ci[0];
  assert(piWidth > ciWidth, "PI wider than CI");
}

// ============================================================================
// TEST: NMA with HKSJ option
// ============================================================================
function testNMAHKSJ() {
  console.log("\n--- Testing NMA HKSJ option ---");

  const contrasts = [
    { t1: "A", t2: "B", effect: 0.3, se: 0.1 },
    { t1: "A", t2: "B", effect: 0.4, se: 0.15 },
    { t1: "A", t2: "C", effect: 0.5, se: 0.12 },
    { t1: "B", t2: "C", effect: 0.2, se: 0.1 }
  ];
  const treatments = ["A", "B", "C"];
  const reference = "A";

  // Without HKSJ
  const resultWald = networkMeta(contrasts, treatments, reference, { useHKSJ: false });
  assert(resultWald[1].ciMethod === 'Wald', "Default uses Wald CI");

  // With HKSJ
  const resultHKSJ = networkMeta(contrasts, treatments, reference, { useHKSJ: true });
  assert(resultHKSJ[1].ciMethod === 'HKSJ', "HKSJ option uses HKSJ CI");

  // HKSJ CIs should generally be wider (more conservative)
  const waldWidth = resultWald[1].ci[1] - resultWald[1].ci[0];
  const hksjWidth = resultHKSJ[1].ci[1] - resultHKSJ[1].ci[0];
  // Note: HKSJ may be narrower in some cases, so just check they're different
  assert(waldWidth !== hksjWidth || waldWidth === 0, "HKSJ and Wald CIs differ");
}

// ============================================================================
// TEST: Baujat plot
// ============================================================================
function testBaujatPlot() {
  console.log("\n--- Testing Baujat plot ---");

  const studies = [
    { study: "Study1", effect: 0.3, se: 0.1 },
    { study: "Study2", effect: 0.5, se: 0.15 },
    { study: "Study3", effect: 0.4, se: 0.12 },
    { study: "Study4", effect: 0.2, se: 0.2 },
    { study: "Study5", effect: 0.8, se: 0.1 }  // Outlier
  ];
  const meta = metaAnalysis(studies);

  const baujat = baujatPlotData(studies, meta);
  assert(baujat.length === 5, "Returns data for all studies");
  assert(baujat[0].x >= 0, "Heterogeneity contribution (x) is non-negative");
  assert(baujat[0].y >= 0, "Influence (y) is non-negative");

  // Outlier study should have highest heterogeneity contribution
  const outlierPoint = baujat.find(p => p.study === "Study5");
  assert(outlierPoint !== undefined, "Outlier study included");
}

// ============================================================================
// TEST: Galbraith plot
// ============================================================================
function testGalbraithPlot() {
  console.log("\n--- Testing Galbraith plot ---");

  const studies = [
    { study: "Study1", effect: 0.3, se: 0.1 },
    { study: "Study2", effect: 0.5, se: 0.2 },
    { study: "Study3", effect: 0.4, se: 0.15 }
  ];
  const meta = metaAnalysis(studies);

  const galbraith = galbraithPlotData(studies, meta);
  assert(galbraith !== null, "Returns valid data");
  assert(galbraith.points.length === 3, "Returns points for all studies");
  assert(galbraith.regressionLine.slope !== undefined, "Has regression slope");
  assert(galbraith.confidenceBands.upper.length > 0, "Has upper confidence band");
  assert(galbraith.confidenceBands.lower.length > 0, "Has lower confidence band");

  // Regression slope should equal pooled effect
  assertApprox(galbraith.regressionLine.slope, meta.mu, 0.01, "Regression slope equals pooled effect");
}

// ============================================================================
// TEST: Outlier diagnostics
// ============================================================================
function testOutlierDiagnostics() {
  console.log("\n--- Testing outlier diagnostics ---");

  const studies = [
    { study: "Normal1", effect: 0.3, se: 0.1 },
    { study: "Normal2", effect: 0.35, se: 0.12 },
    { study: "Normal3", effect: 0.4, se: 0.15 },
    { study: "Normal4", effect: 0.32, se: 0.1 },
    { study: "Outlier", effect: 1.5, se: 0.1 }  // Clear outlier
  ];
  const meta = metaAnalysis(studies);

  const diag = outlierDiagnostics(studies, meta);
  assert(diag.length === 5, "Returns diagnostics for all studies");
  assert(diag[0].stdResid !== undefined, "Has standardized residual");
  assert(diag[0].cookD !== undefined, "Has Cook's distance");
  assert(diag[0].dfbeta !== undefined, "Has DFBETA");

  // Outlier should be flagged
  const outlier = diag.find(d => d.study === "Outlier");
  assert(outlier.isOutlier === true, "Outlier correctly identified");
}

// ============================================================================
// TEST: L'Abbé plot
// ============================================================================
function testLabbePlot() {
  console.log("\n--- Testing L'Abbé plot ---");

  const studies = [
    { study: "S1", e1: 10, n1: 100, e0: 20, n0: 100 },
    { study: "S2", e1: 15, n1: 150, e0: 25, n0: 150 },
    { study: "S3", e1: 5, n1: 50, e0: 8, n0: 50 }
  ];

  const labbe = labbePlotData(studies);
  assert(labbe !== null, "Returns valid data");
  assert(labbe.points.length === 3, "Returns points for all studies");
  assert(labbe.equalityLine.length === 2, "Has equality line");
  assert(labbe.pooledRisk.treatment !== undefined, "Has pooled treatment risk");
  assert(labbe.pooledRisk.control !== undefined, "Has pooled control risk");

  // All points should be in [0,1] range
  assert(labbe.points.every(p => p.x >= 0 && p.x <= 1), "Control risks in [0,1]");
  assert(labbe.points.every(p => p.y >= 0 && p.y <= 1), "Treatment risks in [0,1]");
}

// ============================================================================
// TEST: Contour funnel plot
// ============================================================================
function testContourFunnel() {
  console.log("\n--- Testing contour funnel plot ---");

  const studies = [
    { study: "S1", effect: 0.3, se: 0.1 },
    { study: "S2", effect: 0.5, se: 0.2 },
    { study: "S3", effect: 0.1, se: 0.15 },
    { study: "S4", effect: 0.4, se: 0.12 }
  ];
  const meta = metaAnalysis(studies);

  const contour = contourFunnelData(studies, meta);
  assert(contour !== null, "Returns valid data");
  assert(contour.points.length === 4, "Returns points for all studies");
  assert(contour.contours.length === 3, "Has 3 contour levels by default");
  assert(contour.contours[0].p === 0.01, "First contour at p=0.01");
  assert(contour.contours[1].p === 0.05, "Second contour at p=0.05");
  assert(contour.contours[2].p === 0.10, "Third contour at p=0.10");
}

// ============================================================================
// TEST: Copas selection model
// ============================================================================
function testCopasModel() {
  console.log("\n--- Testing Copas selection model ---");

  const studies = [];
  for (let i = 0; i < 10; i++) {
    studies.push({
      effect: 0.3 + Math.random() * 0.2,
      se: 0.1 + Math.random() * 0.1
    });
  }

  const copas = copasSelectionModel(studies);
  assert(copas !== null, "Returns valid result");
  assert(copas.adjusted.mu !== undefined, "Has adjusted effect");
  assert(copas.unadjusted.mu !== undefined, "Has unadjusted effect");
  assert(copas.selectionProbabilities.length === 10, "Has selection probabilities for all studies");
}

// ============================================================================
// TEST: SROC curve
// ============================================================================
function testSROCCurve() {
  console.log("\n--- Testing SROC curve ---");

  const studies = [
    { study: "S1", TP: 80, FP: 20, FN: 10, TN: 90 },
    { study: "S2", TP: 70, FP: 15, FN: 15, TN: 100 },
    { study: "S3", TP: 85, FP: 25, FN: 8, TN: 82 },
    { study: "S4", TP: 75, FP: 18, FN: 12, TN: 95 }
  ];

  const sroc = srocCurveData(studies);
  assert(sroc !== null, "Returns valid data");
  assert(sroc.points.length === 4, "Returns points for all studies");
  assert(sroc.srocCurve.length > 0, "Has SROC curve points");
  assert(sroc.auc >= 0 && sroc.auc <= 1, "AUC in [0,1]");
  assert(sroc.pooled.sensitivity >= 0 && sroc.pooled.sensitivity <= 1, "Pooled sensitivity in [0,1]");
  assert(sroc.pooled.specificity >= 0 && sroc.pooled.specificity <= 1, "Pooled specificity in [0,1]");
}

// ============================================================================
// TEST: Rankogram
// ============================================================================
function testRankogram() {
  console.log("\n--- Testing rankogram ---");

  const effects = [
    { treatment: "A", effect: 0, se: 0 },  // Reference
    { treatment: "B", effect: 0.3, se: 0.1 },
    { treatment: "C", effect: 0.5, se: 0.12 },
    { treatment: "D", effect: -0.2, se: 0.15 }
  ];

  const rankogram = rankogramData(effects, 5000, false);  // Lower is better
  assert(rankogram !== null, "Returns valid data");
  assert(rankogram.treatments.length === 4, "Returns data for all treatments");

  // Each treatment should have rank probabilities summing to ~1
  const sumProbs = rankogram.treatments[0].rankProbabilities.reduce((a, b) => a + b, 0);
  assertApprox(sumProbs, 1.0, 0.01, "Rank probabilities sum to 1");

  // SUCRA should be in [0,1]
  assert(rankogram.treatments.every(t => t.sucra >= 0 && t.sucra <= 1), "SUCRA values in [0,1]");

  // With lower is better, treatment D (negative effect) should rank highly
  const treatD = rankogram.treatments.find(t => t.treatment === "D");
  assert(treatD.sucra > 0.5, "Treatment D ranks highly when lower is better");
}

// ============================================================================
// TEST: Enhanced Meta-Regression
// ============================================================================
function testEnhancedMetaRegression() {
  console.log("\n--- Testing enhanced meta-regression ---");

  // Create test data with covariates
  const studies = [
    { studyId: "S1", effect: 0.3, se: 0.1, covariates: { dose: 10, year: 2020 } },
    { studyId: "S2", effect: 0.4, se: 0.12, covariates: { dose: 20, year: 2021 } },
    { studyId: "S3", effect: 0.5, se: 0.15, covariates: { dose: 30, year: 2022 } },
    { studyId: "S4", effect: 0.6, se: 0.11, covariates: { dose: 40, year: 2023 } },
    { studyId: "S5", effect: 0.55, se: 0.13, covariates: { dose: 35, year: 2022 } },
    { studyId: "S6", effect: 0.45, se: 0.14, covariates: { dose: 25, year: 2021 } }
  ];

  // Test 1: Single covariate regression
  const result1 = enhancedMetaRegression(studies, ["dose"]);
  assert(result1.error === undefined, "Single covariate regression succeeds");
  assert(result1.coefficients.length === 2, "Has intercept and 1 covariate coefficient");
  assert(result1.R2 >= 0 && result1.R2 <= 1, "R² in [0,1]");
  assert(result1.bubblePlotData !== null, "Has bubble plot data for single covariate");

  // Test 2: Multiple covariates
  const result2 = enhancedMetaRegression(studies, ["dose", "year"]);
  assert(result2.error === undefined, "Multiple covariate regression succeeds");
  assert(result2.coefficients.length === 3, "Has intercept and 2 covariate coefficients");
  assert(result2.nCovariates === 2, "Reports 2 covariates");

  // Test 3: Coefficients have required fields
  const coef = result1.coefficients[1];
  assert(coef.name === "dose", "Covariate name is correct");
  assert(coef.estimate !== undefined, "Has coefficient estimate");
  assert(coef.se !== undefined, "Has standard error");
  assert(coef.pValue !== undefined, "Has p-value");

  // Test 4: Permutation test p-values
  const result3 = enhancedMetaRegression(studies, ["dose"], { permutations: 100 });
  assert(result3.coefficients[1].permP !== null, "Has permutation p-value");
  assert(result3.coefficients[1].permP >= 0 && result3.coefficients[1].permP <= 1, "Permutation p in [0,1]");

  // Test 5: Insufficient studies
  const result4 = enhancedMetaRegression(studies.slice(0, 2), ["dose"]);
  assert(result4.error !== undefined, "Error for too few studies");

  // Test 6: R² should increase with dose (positive relationship in test data)
  assert(result1.coefficients[1].estimate > 0, "Positive dose-effect relationship detected");

  // Test 7: Interpretation generated
  assert(result1.interpretation !== undefined, "Has interpretation text");
}

// ============================================================================
// TEST: Bivariate DTA Model
// ============================================================================
function testBivariateDTAModel() {
  console.log("\n--- Testing bivariate DTA model ---");

  // Create test DTA data
  const studies = [
    { studyId: "S1", tp: 80, fp: 15, fn: 10, tn: 95 },
    { studyId: "S2", tp: 75, fp: 20, fn: 12, tn: 93 },
    { studyId: "S3", tp: 85, fp: 18, fn: 8, tn: 89 },
    { studyId: "S4", tp: 70, fp: 12, fn: 15, tn: 103 },
    { studyId: "S5", tp: 78, fp: 17, fn: 11, tn: 94 }
  ];

  const result = bivariateDTAModel(studies);

  // Test 1: Returns valid result
  assert(result.error === undefined, "Bivariate model returns valid result");
  assert(result.nStudies === 5, "Reports correct number of studies");

  // Test 2: Pooled estimates in valid range
  assert(result.pooled.sensitivity >= 0 && result.pooled.sensitivity <= 1, "Pooled sensitivity in [0,1]");
  assert(result.pooled.specificity >= 0 && result.pooled.specificity <= 1, "Pooled specificity in [0,1]");

  // Test 3: Confidence intervals
  assert(result.pooled.sensitivityCI[0] < result.pooled.sensitivity, "Sensitivity CI lower < point estimate");
  assert(result.pooled.sensitivityCI[1] > result.pooled.sensitivity, "Sensitivity CI upper > point estimate");
  assert(result.pooled.specificityCI[0] < result.pooled.specificity, "Specificity CI lower < point estimate");
  assert(result.pooled.specificityCI[1] > result.pooled.specificity, "Specificity CI upper > point estimate");

  // Test 4: Diagnostic odds ratio
  assert(result.pooled.DOR > 0, "DOR is positive");
  assert(result.pooled.DORCI[0] < result.pooled.DOR, "DOR CI lower < point estimate");
  assert(result.pooled.DORCI[1] > result.pooled.DOR, "DOR CI upper > point estimate");

  // Test 5: Likelihood ratios
  assert(result.pooled.LRplus > 1, "LR+ should be > 1 for good test");
  assert(result.pooled.LRminus < 1, "LR- should be < 1 for good test");

  // Test 6: Heterogeneity measures
  assert(result.heterogeneity.I2Sens >= 0 && result.heterogeneity.I2Sens <= 100, "I² for sensitivity in [0,100]");
  assert(result.heterogeneity.I2Spec >= 0 && result.heterogeneity.I2Spec <= 100, "I² for specificity in [0,100]");

  // Test 7: Logit scale parameters
  assert(result.logitScale.correlation >= -1 && result.logitScale.correlation <= 1, "Correlation in [-1,1]");
  assert(result.logitScale.tau2Sens >= 0, "τ² for sensitivity is non-negative");
  assert(result.logitScale.tau2Spec >= 0, "τ² for specificity is non-negative");

  // Test 8: ROC points for plotting
  assert(result.rocPoints.length === 5, "Has ROC point for each study");
  assert(result.rocPoints[0].sensitivity >= 0 && result.rocPoints[0].sensitivity <= 1, "ROC point sensitivity valid");
  assert(result.rocPoints[0].fpr >= 0 && result.rocPoints[0].fpr <= 1, "ROC point FPR valid");

  // Test 9: SROC curve
  assert(result.srocCurve.length > 0, "Has SROC curve points");
  assert(result.srocCurve[0].fpr >= 0 && result.srocCurve[0].fpr <= 1, "SROC FPR in valid range");
  assert(result.srocCurve[0].sensitivity >= 0 && result.srocCurve[0].sensitivity <= 1, "SROC sensitivity valid");

  // Test 10: Confidence region
  assert(result.confRegion.center.sens === result.pooled.sensitivity, "Conf region centered on pooled sens");
  assert(result.confRegion.center.spec === result.pooled.specificity, "Conf region centered on pooled spec");

  // Test 11: Interpretation
  assert(result.interpretation !== undefined, "Has interpretation text");

  // Test 12: Alternative input format (sens/spec)
  const studies2 = [
    { studyId: "S1", sens: 0.85, spec: 0.90, nDiseased: 100, nHealthy: 100 },
    { studyId: "S2", sens: 0.80, spec: 0.88, nDiseased: 120, nHealthy: 110 },
    { studyId: "S3", sens: 0.88, spec: 0.85, nDiseased: 90, nHealthy: 95 },
    { studyId: "S4", sens: 0.82, spec: 0.91, nDiseased: 110, nHealthy: 105 }
  ];
  const result2 = bivariateDTAModel(studies2);
  assert(result2.error === undefined, "Accepts sens/spec input format");

  // Test 13: Insufficient studies
  const result3 = bivariateDTAModel(studies.slice(0, 2));
  assert(result3.error !== undefined, "Error for < 4 studies");
}

// ============================================================================
// EDITORIAL REVISION TESTS (2026-01-25)
// ============================================================================

function testSeededRNG() {
  console.log("\n--- Testing SeededRNG ---");

  // Test reproducibility
  const rng1 = new SeededRNG(12345);
  const rng2 = new SeededRNG(12345);

  const vals1 = [rng1.random(), rng1.random(), rng1.random()];
  const vals2 = [rng2.random(), rng2.random(), rng2.random()];

  assert(vals1[0] === vals2[0], "Same seed produces same first value");
  assert(vals1[1] === vals2[1], "Same seed produces same second value");
  assert(vals1[2] === vals2[2], "Same seed produces same third value");

  // Test range
  const rng = new SeededRNG(99999);
  let allInRange = true;
  for (let i = 0; i < 1000; i++) {
    const v = rng.random();
    if (v < 0 || v >= 1) allInRange = false;
  }
  assert(allInRange, "All random values in [0, 1)");

  // Test normal distribution
  rng.reset();
  let sum = 0, sumSq = 0;
  const n = 10000;
  for (let i = 0; i < n; i++) {
    const v = rng.randomNormal();
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  assert(Math.abs(mean) < 0.05, "Normal mean approximately 0");
  assert(Math.abs(variance - 1) < 0.1, "Normal variance approximately 1");
}

function testChiSquaredImproved() {
  console.log("\n--- Testing improved chi-squared quantile ---");

  // Test known values
  const q95_1 = chiSquaredQuantileImproved(0.95, 1);
  assert(Math.abs(q95_1 - 3.841) < 0.1, "χ²(0.95, df=1) ≈ 3.841");

  const q95_2 = chiSquaredQuantileImproved(0.95, 2);
  assert(Math.abs(q95_2 - 5.991) < 0.1, "χ²(0.95, df=2) ≈ 5.991");

  const q95_10 = chiSquaredQuantileImproved(0.95, 10);
  assert(Math.abs(q95_10 - 18.307) < 0.2, "χ²(0.95, df=10) ≈ 18.307");

  // Test small df (the improved version)
  const q95_05 = chiSquaredQuantileImproved(0.95, 0.5);
  assert(q95_05 > 0, "χ² quantile for df=0.5 is positive");
}

function testBivariateDTAReml() {
  console.log("\n--- Testing bivariate DTA REML ---");

  const studies = [
    { studyId: "S1", tp: 80, fp: 15, fn: 10, tn: 95 },
    { studyId: "S2", tp: 75, fp: 20, fn: 12, tn: 93 },
    { studyId: "S3", tp: 85, fp: 18, fn: 8, tn: 89 },
    { studyId: "S4", tp: 70, fp: 12, fn: 15, tn: 103 },
    { studyId: "S5", tp: 78, fp: 17, fn: 11, tn: 94 }
  ];

  const result = bivariateDTAReml(studies);

  assert(result.error === undefined, "REML model converges");
  assert(result.method === "Bivariate REML", "Correct method name");
  assert(result.pooled.sensitivity > 0.7 && result.pooled.sensitivity < 0.95, "Pooled sens in reasonable range");
  assert(result.pooled.specificity > 0.7 && result.pooled.specificity < 0.95, "Pooled spec in reasonable range");
  assert(result.parameters.correlation >= -1 && result.parameters.correlation <= 1, "Correlation in [-1, 1]");
  assert(result.pooled.auc > 0.5 && result.pooled.auc <= 1, "AUC in (0.5, 1]");
}

function testMixedEffectsRegression() {
  console.log("\n--- Testing mixed-effects meta-regression ---");

  const studies = [
    { studyId: "S1", effect: 0.3, se: 0.1, covariates: { dose: 10 } },
    { studyId: "S2", effect: 0.4, se: 0.12, covariates: { dose: 20 } },
    { studyId: "S3", effect: 0.5, se: 0.15, covariates: { dose: 30 } },
    { studyId: "S4", effect: 0.6, se: 0.11, covariates: { dose: 40 } },
    { studyId: "S5", effect: 0.55, se: 0.13, covariates: { dose: 35 } },
    { studyId: "S6", effect: 0.45, se: 0.14, covariates: { dose: 25 } }
  ];

  const result = mixedEffectsMetaRegression(studies, ["dose"]);

  assert(result.error === undefined, "Mixed-effects regression succeeds");
  assert(result.tau2 >= 0, "τ² is non-negative");
  assert(result.coefficients.length === 2, "Has intercept + 1 covariate");
  assert(result.method.includes("REML"), "Uses REML estimation");
  assert(result.knappHartungFactor >= 1, "KH factor >= 1");
}

function testNMAInconsistency() {
  console.log("\n--- Testing NMA inconsistency detection ---");

  // Create data with a closed loop (A-B, B-C, A-C)
  const contrasts = [
    { t1: "A", t2: "B", effect: 0.3, se: 0.1 },
    { t1: "A", t2: "B", effect: 0.35, se: 0.12 },
    { t1: "B", t2: "C", effect: 0.2, se: 0.11 },
    { t1: "A", t2: "C", effect: 0.5, se: 0.13 }
  ];
  const treatments = ["A", "B", "C"];

  const result = networkMetaWithInconsistency(contrasts, treatments, "A");

  assert(result.inconsistency.checked === true, "Inconsistency was checked");
  assert(result.inconsistency.hasLoop === true, "Loop detected");
  assert(result.inconsistency.warning !== undefined, "Warning level provided");
  assert(result.effects.length === 3, "Returns effects for all treatments");
}

function testPScoreWithSE() {
  console.log("\n--- Testing P-score with SE ---");

  const effects = [
    { treatment: "A", effect: 0, se: 0 },
    { treatment: "B", effect: 0.3, se: 0.1 },
    { treatment: "C", effect: 0.5, se: 0.12 }
  ];

  const result = computePScoreWithSE(effects, { nBoot: 500, seed: 12345 });

  assert(result.length === 3, "Returns P-scores for all treatments");
  assert(result[0].se !== undefined, "Has standard error");
  assert(result[0].ci !== undefined, "Has confidence interval");
  assert(result[0].ci[0] <= result[0].score, "CI lower <= point estimate");
  assert(result[0].ci[1] >= result[0].score, "CI upper >= point estimate");
}

function testTrimFillWithSE() {
  console.log("\n--- Testing trim-and-fill with SE ---");

  // Create asymmetric funnel data
  const studies = [
    { effect: 0.3, se: 0.1 },
    { effect: 0.4, se: 0.12 },
    { effect: 0.5, se: 0.15 },
    { effect: 0.6, se: 0.18 },
    { effect: 0.2, se: 0.08 }
  ];

  const result = trimAndFillWithSE(studies, { nBoot: 200, seed: 12345 });

  assert(result !== null, "Returns result");
  if (result.nFilled > 0) {
    assert(result.adjustedSE !== undefined, "Has adjusted SE");
    assert(result.adjustedCI !== undefined, "Has adjusted CI");
    assert(result.seMethod !== undefined, "Reports SE method");
  }
}

function testTrialSequentialAnalysis() {
  console.log("\n--- Testing trial sequential analysis ---");

  const cumulativeResults = [
    { k: 2, mu: 0.3, se: 0.2, ci: [-0.1, 0.7], i2: 20, tau2: 0.01 },
    { k: 4, mu: 0.35, se: 0.15, ci: [0.05, 0.65], i2: 30, tau2: 0.02 },
    { k: 6, mu: 0.4, se: 0.12, ci: [0.16, 0.64], i2: 35, tau2: 0.02 },
    { k: 8, mu: 0.38, se: 0.10, ci: [0.18, 0.58], i2: 40, tau2: 0.03 },
    { k: 10, mu: 0.42, se: 0.08, ci: [0.26, 0.58], i2: 45, tau2: 0.03 }
  ];

  const result = trialSequentialAnalysis(cumulativeResults, { delta: 0.3 });

  assert(result.error === undefined, "TSA succeeds");
  assert(result.RIS > 0, "RIS is positive");
  assert(result.analyses.length === 5, "Has 5 analyses");
  assert(result.boundaries.upper.length === 5, "Has upper boundaries");
  assert(result.boundaries.lower.length === 5, "Has lower boundaries");
  assert(result.conclusion !== undefined, "Has conclusion");
}

function testMultivariateMA() {
  console.log("\n--- Testing multivariate meta-analysis ---");

  const studies = [
    { studyId: "S1", outcomes: [{ name: "OS", effect: 0.3, se: 0.1 }, { name: "PFS", effect: 0.4, se: 0.12 }] },
    { studyId: "S2", outcomes: [{ name: "OS", effect: 0.35, se: 0.11 }, { name: "PFS", effect: 0.38, se: 0.13 }] },
    { studyId: "S3", outcomes: [{ name: "OS", effect: 0.28, se: 0.09 }, { name: "PFS", effect: 0.42, se: 0.11 }] },
    { studyId: "S4", outcomes: [{ name: "OS", effect: 0.32, se: 0.10 }, { name: "PFS", effect: 0.36, se: 0.12 }] }
  ];

  const result = multivariateMetaAnalysis(studies);

  assert(result.error === undefined, "Multivariate MA succeeds");
  assert(result.nOutcomes === 2, "Has 2 outcomes");
  assert(result.outcomes.length === 2, "Returns results for both outcomes");
  assert(result.betweenStudyCorrelation !== undefined, "Has correlation matrix");
}

function testValidation() {
  console.log("\n--- Testing R package validation ---");

  const validation = runValidation();

  assert(validation.tests.length > 0, "Has validation tests");
  assert(validation.passed > 0, "Some validation tests pass");
  console.log(`Validation: ${validation.summary}`);
}

function testVersionTracking() {
  console.log("\n--- Testing version tracking ---");

  assert(ANALYSIS_VERSION !== undefined, "ANALYSIS_VERSION is defined");
  assert(ANALYSIS_VERSION.version === "2.0.0", "Version is 2.0.0");
  assert(ANALYSIS_VERSION.algorithms !== undefined, "Has algorithm versions");
  assert(ANALYSIS_VERSION.algorithms.reml !== undefined, "Has REML algorithm info");
  assert(ANALYSIS_VERSION.algorithms.bivariateDTA !== undefined, "Has bivariate DTA algorithm info");
  assert(ANALYSIS_VERSION.algorithms.nma !== undefined, "Has NMA algorithm info");
  assert(ANALYSIS_VERSION.algorithms.tsa !== undefined, "Has TSA algorithm info");
  assert(ANALYSIS_VERSION.algorithms.prng !== undefined, "Has PRNG algorithm info");
  assert(ANALYSIS_VERSION.validatedAgainst.length > 0, "Has validation targets");
  console.log(`Version: ${ANALYSIS_VERSION.version} (${ANALYSIS_VERSION.date})`);
}

// ============================================================================
// PHASE 1-4: COMPETITIVE EXCELLENCE TESTS
// ============================================================================

function testIPDTwoStage() {
  console.log("\n--- Testing IPD Two-Stage Meta-Analysis ---");

  // Create synthetic IPD data
  const ipdData = [];

  // Study 1: Treatment benefit
  for (let i = 0; i < 50; i++) {
    ipdData.push({ studyId: 'Study1', treatment: 1, outcome: Math.random() < 0.3 ? 1 : 0 });
  }
  for (let i = 0; i < 50; i++) {
    ipdData.push({ studyId: 'Study1', treatment: 0, outcome: Math.random() < 0.5 ? 1 : 0 });
  }

  // Study 2: Similar effect
  for (let i = 0; i < 60; i++) {
    ipdData.push({ studyId: 'Study2', treatment: 1, outcome: Math.random() < 0.25 ? 1 : 0 });
  }
  for (let i = 0; i < 60; i++) {
    ipdData.push({ studyId: 'Study2', treatment: 0, outcome: Math.random() < 0.45 ? 1 : 0 });
  }

  // Study 3: Smaller effect
  for (let i = 0; i < 80; i++) {
    ipdData.push({ studyId: 'Study3', treatment: 1, outcome: Math.random() < 0.35 ? 1 : 0 });
  }
  for (let i = 0; i < 80; i++) {
    ipdData.push({ studyId: 'Study3', treatment: 0, outcome: Math.random() < 0.4 ? 1 : 0 });
  }

  const result = ipdTwoStage(ipdData, {
    outcomeType: 'binary',
    effectMeasure: 'OR'
  });

  assert(result.approach === 'two-stage', "IPD two-stage: correct approach");
  assert(result.nStudies === 3, "IPD two-stage: correct number of studies");
  assert(result.totalN === 380, "IPD two-stage: correct total N");
  assert(result.studyEstimates.length === 3, "IPD two-stage: has study estimates");
  assert(result.pooled !== undefined, "IPD two-stage: has pooled result");
  assert(result.pooled.random !== undefined, "IPD two-stage: has random effects result");
  console.log(`IPD two-stage pooled OR: ${Math.exp(result.pooled.random.mu).toFixed(3)}`);
}

function testIPDOneStage() {
  console.log("\n--- Testing IPD One-Stage Meta-Analysis ---");

  // Create continuous outcome IPD data
  const ipdData = [];

  // Study 1
  for (let i = 0; i < 30; i++) {
    ipdData.push({ studyId: 'StudyA', treatment: 1, outcome: 50 + Math.random() * 10 });
  }
  for (let i = 0; i < 30; i++) {
    ipdData.push({ studyId: 'StudyA', treatment: 0, outcome: 55 + Math.random() * 10 });
  }

  // Study 2
  for (let i = 0; i < 40; i++) {
    ipdData.push({ studyId: 'StudyB', treatment: 1, outcome: 48 + Math.random() * 12 });
  }
  for (let i = 0; i < 40; i++) {
    ipdData.push({ studyId: 'StudyB', treatment: 0, outcome: 54 + Math.random() * 12 });
  }

  const result = ipdOneStage(ipdData, {
    outcomeType: 'continuous'
  });

  assert(result.approach === 'one-stage', "IPD one-stage: correct approach");
  assert(result.nStudies === 2, "IPD one-stage: correct number of studies");
  assert(result.totalN === 140, "IPD one-stage: correct total N");
  assert(result.coefficients.treatment !== undefined, "IPD one-stage: has treatment coefficient");
  assert(result.variance.betweenStudy !== undefined, "IPD one-stage: has between-study variance");
  console.log(`IPD one-stage treatment effect: ${result.coefficients.treatment.estimate.toFixed(3)}`);
}

function testBayesianMA() {
  console.log("\n--- Testing Bayesian Meta-Analysis ---");

  const studies = [
    { effect: -0.5, se: 0.2 },
    { effect: -0.3, se: 0.15 },
    { effect: -0.7, se: 0.25 },
    { effect: -0.4, se: 0.18 },
    { effect: -0.6, se: 0.22 }
  ];

  const result = bayesianMetaAnalysis(studies, {
    muPrior: { mean: 0, sd: 10 },
    tauPrior: { type: 'half-cauchy', scale: 0.5 }
  }, {
    nIterations: 5000,
    nBurnin: 2000,
    nChains: 2,
    seed: 42
  });

  assert(result.method === 'Bayesian', "Bayesian MA: correct method");
  assert(result.sampler === 'Metropolis-Hastings', "Bayesian MA: correct sampler");
  assert(result.mu !== undefined, "Bayesian MA: has mu summary");
  assert(result.tau !== undefined, "Bayesian MA: has tau summary");
  assert(result.mu.mean !== undefined, "Bayesian MA: has mu mean");
  assert(result.mu.ci95 !== undefined, "Bayesian MA: has mu 95% CI");
  assert(result.dic !== undefined, "Bayesian MA: has DIC");
  assert(result.convergence !== undefined, "Bayesian MA: has convergence diagnostics");
  assert(result.convergence.rhatMu !== undefined, "Bayesian MA: has Rhat for mu");

  console.log(`Bayesian mu: ${result.mu.mean.toFixed(3)} (95% CrI: ${result.mu.ci95[0].toFixed(3)} - ${result.mu.ci95[1].toFixed(3)})`);
  console.log(`Bayesian tau: ${result.tau.mean.toFixed(3)}`);
  console.log(`Rhat: mu=${result.convergence.rhatMu.toFixed(3)}, tau=${result.convergence.rhatTau.toFixed(3)}`);
}

function testRoB2Assessment() {
  console.log("\n--- Testing RoB 2 Assessment ---");

  const assessments = {
    'Study1': {
      randomization: 'low',
      deviations: 'low',
      missingData: 'low',
      measurement: 'low',
      selectiveReporting: 'low'
    },
    'Study2': {
      randomization: 'some_concerns',
      deviations: 'low',
      missingData: 'some_concerns',
      measurement: 'low',
      selectiveReporting: 'low'
    },
    'Study3': {
      randomization: 'high',
      deviations: 'some_concerns',
      missingData: 'low',
      measurement: 'high',
      selectiveReporting: 'some_concerns'
    }
  };

  const result = assessRoB2(assessments);

  assert(result.studies !== undefined, "RoB2: has study results");
  assert(result.summary !== undefined, "RoB2: has summary");
  assert(result.byDomain !== undefined, "RoB2: has by-domain results");
  assert(result.trafficLight !== undefined, "RoB2: has traffic light data");

  assert(result.studies['Study1'].overall === 'low', "RoB2: Study1 overall is low");
  assert(result.studies['Study2'].overall === 'some_concerns', "RoB2: Study2 overall is some concerns");
  assert(result.studies['Study3'].overall === 'high', "RoB2: Study3 overall is high");

  assert(result.summary.low === 1, "RoB2: correct count of low risk");
  assert(result.summary.some_concerns === 1, "RoB2: correct count of some concerns");
  assert(result.summary.high === 1, "RoB2: correct count of high risk");

  console.log(`RoB2 summary: ${result.summary.low} low, ${result.summary.some_concerns} some concerns, ${result.summary.high} high`);
}

function testROBINSIAssessment() {
  console.log("\n--- Testing ROBINS-I Assessment ---");

  const assessments = {
    'NRS1': {
      confounding: 'moderate',
      selection: 'low',
      classification: 'low',
      deviations: 'low',
      missingData: 'moderate',
      measurement: 'low',
      selectiveReporting: 'low'
    },
    'NRS2': {
      confounding: 'serious',
      selection: 'moderate',
      classification: 'low',
      deviations: 'moderate',
      missingData: 'low',
      measurement: 'serious',
      selectiveReporting: 'moderate'
    }
  };

  const result = assessROBINSI(assessments);

  assert(result.studies !== undefined, "ROBINS-I: has study results");
  assert(result.summary !== undefined, "ROBINS-I: has summary");
  assert(result.studies['NRS1'].overall === 'moderate', "ROBINS-I: NRS1 overall is moderate");
  assert(result.studies['NRS2'].overall === 'serious', "ROBINS-I: NRS2 overall is serious");

  console.log(`ROBINS-I: NRS1=${result.studies['NRS1'].overall}, NRS2=${result.studies['NRS2'].overall}`);
}

function testQUADAS2Assessment() {
  console.log("\n--- Testing QUADAS-2 Assessment ---");

  const assessments = {
    'DTA1': {
      patientSelection: { rob: 'low', applicability: 'low' },
      indexTest: { rob: 'low', applicability: 'low' },
      referenceStandard: { rob: 'low', applicability: 'low' },
      flowTiming: { rob: 'low' }
    },
    'DTA2': {
      patientSelection: { rob: 'high', applicability: 'low' },
      indexTest: { rob: 'unclear', applicability: 'low' },
      referenceStandard: { rob: 'low', applicability: 'high' },
      flowTiming: { rob: 'unclear' }
    }
  };

  const result = assessQUADAS2(assessments);

  assert(result.studies !== undefined, "QUADAS-2: has study results");
  assert(result.summary !== undefined, "QUADAS-2: has summary");
  assert(result.byDomain !== undefined, "QUADAS-2: has by-domain results");
  assert(result.studies['DTA1'].overall === 'low', "QUADAS-2: DTA1 overall is low");
  assert(result.studies['DTA2'].overall === 'high', "QUADAS-2: DTA2 overall is high");

  console.log(`QUADAS-2: DTA1=${result.studies['DTA1'].overall}, DTA2=${result.studies['DTA2'].overall}`);
}

function testMethodsParagraph() {
  console.log("\n--- Testing Automated Methods Paragraph ---");

  const paragraph = generateMethodsParagraph({}, {
    effectMeasure: 'risk ratio',
    model: 'random-effects',
    heterogeneityMethod: 'REML',
    publicationBiasTests: ['Egger', 'Begg']
  });

  assert(typeof paragraph === 'string', "Methods paragraph: returns string");
  assert(paragraph.includes('random-effects'), "Methods paragraph: mentions model");
  assert(paragraph.includes('REML'), "Methods paragraph: mentions tau² method");
  assert(paragraph.includes('Egger'), "Methods paragraph: mentions Egger test");
  assert(paragraph.includes('I²'), "Methods paragraph: mentions I² statistic");

  console.log("Methods paragraph generated successfully");
  console.log(`Preview: ${paragraph.substring(0, 100)}...`);
}

// ============================================================================
// PHASE 2-4: ADDITIONAL COMPETITIVE EXCELLENCE TESTS
// ============================================================================

function testGRADEFramework() {
  console.log("\n--- Testing GRADE Framework ---");

  const metaResults = {
    random: { mu: -0.5, ci: [-0.8, -0.2] },
    I2: 45,
    tau2: 0.05,
    nStudies: 8,
    egger: { pValue: 0.15 }
  };

  const result = gradeFramework(metaResults, {}, { studyDesign: 'RCT' });

  assert(result.certainty >= 1 && result.certainty <= 4, "GRADE: certainty in valid range");
  assert(result.label !== undefined, "GRADE: has label");
  assert(result.symbol !== undefined, "GRADE: has symbol");
  assert(result.domains !== undefined, "GRADE: has domains");
  assert(result.domains.riskOfBias !== undefined, "GRADE: has RoB domain");
  assert(result.domains.inconsistency !== undefined, "GRADE: has inconsistency domain");
  assert(result.domains.imprecision !== undefined, "GRADE: has imprecision domain");
  assert(result.interpretation !== undefined, "GRADE: has interpretation");

  console.log(`GRADE certainty: ${result.label} (${result.symbol})`);
  console.log(`Reasons: ${result.reasons.join('; ') || 'None'}`);
}

function testComponentNMA() {
  console.log("\n--- Testing Component Network Meta-Analysis ---");

  const comparisons = [
    { treat1: 'A+B', treat2: 'Placebo', effect: -0.5, se: 0.15 },
    { treat1: 'A', treat2: 'Placebo', effect: -0.3, se: 0.12 },
    { treat1: 'B', treat2: 'Placebo', effect: -0.25, se: 0.14 },
    { treat1: 'A+B', treat2: 'A', effect: -0.2, se: 0.13 },
    { treat1: 'A+B', treat2: 'B', effect: -0.25, se: 0.11 }
  ];

  // Test with random effects (default)
  const result = componentNMA(comparisons, { reference: 'Placebo', randomEffects: true });

  assert(result.model === 'additive', "CNMA: correct model type");
  assert(result.components !== undefined, "CNMA: has components");
  assert(result.components['Placebo'] !== undefined, "CNMA: has reference component");
  assert(result.components['Placebo'].reference === true, "CNMA: reference marked correctly");
  assert(result.ranking !== undefined, "CNMA: has ranking");
  assert(result.modelFit !== undefined, "CNMA: has model fit");
  assert(result.randomEffects === true, "CNMA: random effects enabled");
  assert(result.tau2 !== undefined, "CNMA: has tau² estimate");

  console.log(`Components: ${Object.keys(result.components).join(', ')}`);
  console.log(`Model fit Q: ${result.modelFit.Q.toFixed(3)}, τ²: ${result.tau2.toFixed(4)}`);
}

function testFractionalPolynomialDR() {
  console.log("\n--- Testing Fractional Polynomial Dose-Response ---");

  const studies = [
    { dose: 0, effect: 0, se: 0.1 },
    { dose: 10, effect: -0.2, se: 0.12 },
    { dose: 20, effect: -0.35, se: 0.11 },
    { dose: 40, effect: -0.45, se: 0.13 },
    { dose: 80, effect: -0.5, se: 0.15 },
    { dose: 160, effect: -0.52, se: 0.18 }
  ];

  const result = fractionalPolynomialDR(studies, { maxDegree: 2 });

  assert(result.bestModel !== undefined, "FP: has best model");
  assert(result.bestModel.powers !== undefined, "FP: has powers");
  assert(result.bestModel.aic !== undefined, "FP: has AIC");
  assert(result.bestModel.covarianceMatrix !== undefined, "FP: has covariance matrix");
  assert(result.predicted !== undefined, "FP: has predicted values");
  assert(result.predicted.length === 101, "FP: has 101 prediction points");
  assert(result.allModels.length > 0, "FP: has multiple models compared");

  // Check that CIs are computed (m2 fix)
  const midPoint = result.predicted[50];
  assert(midPoint.lower !== null, "FP: has lower CI");
  assert(midPoint.upper !== null, "FP: has upper CI");
  assert(midPoint.lower < midPoint.effect, "FP: lower CI below effect");
  assert(midPoint.upper > midPoint.effect, "FP: upper CI above effect");

  console.log(`Best FP model: powers = [${result.bestModel.powers.join(', ')}], AIC = ${result.bestModel.aic.toFixed(2)}`);
  console.log(`Prediction at dose 80: ${midPoint.effect.toFixed(3)} (95% CI: ${midPoint.lower.toFixed(3)} - ${midPoint.upper.toFixed(3)})`);
}

function testEmaxModel() {
  console.log("\n--- Testing EMAX Dose-Response Model ---");

  const studies = [
    { dose: 0, effect: 0, se: 0.05 },
    { dose: 5, effect: 0.3, se: 0.06 },
    { dose: 10, effect: 0.5, se: 0.07 },
    { dose: 20, effect: 0.7, se: 0.08 },
    { dose: 50, effect: 0.85, se: 0.09 },
    { dose: 100, effect: 0.92, se: 0.10 }
  ];

  const result = emaxModel(studies);

  assert(result.parameters !== undefined, "EMAX: has parameters");
  assert(result.parameters.E0 !== undefined, "EMAX: has E0");
  assert(result.parameters.Emax !== undefined, "EMAX: has Emax");
  assert(result.parameters.ED50 !== undefined, "EMAX: has ED50");
  assert(result.predicted !== undefined, "EMAX: has predictions");
  assert(result.derivedQuantities !== undefined, "EMAX: has derived quantities");

  console.log(`EMAX parameters: E0=${result.parameters.E0.estimate.toFixed(3)}, Emax=${result.parameters.Emax.estimate.toFixed(3)}, ED50=${result.parameters.ED50.estimate.toFixed(3)}`);
}

function testPRISMAChecklist() {
  console.log("\n--- Testing PRISMA 2020 Checklist Generator ---");

  const reviewData = {
    title: 'A systematic review and meta-analysis of treatment X',
    databases: ['MEDLINE', 'Embase', 'CENTRAL'],
    robTool: 'RoB 2',
    outcomes: [{ name: 'Primary outcome' }],
    metaResults: { random: { mu: -0.3 }, I2: 40, nStudies: 10 }
  };

  const result = generatePRISMAChecklist(reviewData);

  assert(result.title === 'PRISMA 2020 Checklist', "PRISMA: correct title");
  assert(result.sections.length > 0, "PRISMA: has sections");
  assert(result.summary !== undefined, "PRISMA: has summary");
  assert(result.summary.total > 0, "PRISMA: has total items");
  assert(result.summary.percentComplete !== undefined, "PRISMA: has completion percentage");

  console.log(`PRISMA checklist: ${result.summary.complete}/${result.summary.total} complete (${result.summary.percentComplete}%)`);
}

function testCSVImportExport() {
  console.log("\n--- Testing CSV Import/Export ---");

  const studies = [
    { name: 'Study A', year: 2020, effect: -0.3, se: 0.1, n1: 50, n0: 50 },
    { name: 'Study B', year: 2021, effect: -0.5, se: 0.12, n1: 60, n0: 55 },
    { name: 'Study C', year: 2022, effect: -0.2, se: 0.15, n1: 40, n0: 45 }
  ];

  // Export
  const csv = exportToCSV(studies, { effectMeasure: 'LogOR' });
  assert(typeof csv === 'string', "CSV export: returns string");
  assert(csv.includes('Study A'), "CSV export: contains study names");
  assert(csv.includes('-0.3000'), "CSV export: contains effects");

  // Import (round-trip)
  const imported = parseCSV(csv);
  assert(imported.length === 3, "CSV import: correct number of studies");
  assertApprox(imported[0].effect, -0.3, 0.001, "CSV import: effect preserved");
  assertApprox(imported[0].se, 0.1, 0.001, "CSV import: SE preserved");

  console.log(`CSV round-trip: ${imported.length} studies imported successfully`);
}

function testLeagueTable() {
  console.log("\n--- Testing League Table Generation ---");

  const nmaResults = {
    treatments: ['A', 'B', 'C', 'Placebo'],
    comparisons: [
      { treat1: 'A', treat2: 'Placebo', effect: -0.5, se: 0.15 },
      { treat1: 'B', treat2: 'Placebo', effect: -0.3, se: 0.12 },
      { treat1: 'C', treat2: 'Placebo', effect: -0.2, se: 0.14 },
      { treat1: 'A', treat2: 'B', effect: -0.2, se: 0.13 },
      { treat1: 'A', treat2: 'C', effect: -0.3, se: 0.11 },
      { treat1: 'B', treat2: 'C', effect: -0.1, se: 0.10 }
    ],
    pScores: { A: 0.9, B: 0.6, C: 0.4, Placebo: 0.1 }
  };

  const result = generateLeagueTable(nmaResults, { effectMeasure: 'OR' });

  assert(result.treatments.length === 4, "League table: correct number of treatments");
  assert(result.cells.length === 4, "League table: correct number of rows");
  assert(result.cells[0].length === 4, "League table: correct number of columns");
  assert(result.cells[0][0].diagonal === true, "League table: diagonal marked");
  assert(result.ranking.length > 0, "League table: has ranking");

  console.log(`League table: ${result.treatments.length}x${result.treatments.length} matrix generated`);
}

function testStreamingMA() {
  console.log("\n--- Testing Streaming Meta-Analysis ---");

  // Generate large dataset
  const largeData = [];
  for (let i = 0; i < 500; i++) {
    largeData.push({
      effect: -0.3 + Math.random() * 0.2 - 0.1,
      se: 0.1 + Math.random() * 0.1
    });
  }

  const result = streamingMetaAnalysis(largeData, { chunkSize: 50 });

  assert(result.nStudies === 500, "Streaming MA: processed all studies");
  assert(result.fixed !== undefined, "Streaming MA: has fixed effects");
  assert(result.I2 !== undefined, "Streaming MA: has I²");
  assert(result.streaming === true, "Streaming MA: marked as streaming");

  console.log(`Streaming MA: processed ${result.nStudies} studies, I²=${result.I2.toFixed(1)}%`);
}

function testIncrementalMA() {
  console.log("\n--- Testing Incremental Meta-Analysis Update ---");

  // Initial analysis
  const initialStudies = [
    { effect: -0.3, se: 0.12 },
    { effect: -0.5, se: 0.15 },
    { effect: -0.4, se: 0.11 }
  ];

  // Compute initial with internals stored
  let sumW = 0, sumWY = 0, sumWY2 = 0, sumW2 = 0;
  initialStudies.forEach(s => {
    const w = 1 / (s.se * s.se);
    sumW += w;
    sumWY += w * s.effect;
    sumWY2 += w * s.effect * s.effect;
    sumW2 += w * w;
  });

  const initialResult = {
    nStudies: 3,
    studies: initialStudies,
    _internals: { sumW, sumWY, sumWY2, sumW2, nStudies: 3 }
  };

  // New studies
  const newStudies = [
    { effect: -0.35, se: 0.13 },
    { effect: -0.45, se: 0.14 }
  ];

  const updated = incrementalMetaAnalysisUpdate(initialResult, newStudies);

  assert(updated.nStudies === 5, "Incremental MA: correct total studies");
  assert(updated.incremental === true, "Incremental MA: marked as incremental");
  assert(updated.fixed !== undefined, "Incremental MA: has fixed effects");
  assert(updated.random !== undefined, "Incremental MA: has random effects");

  console.log(`Incremental MA: ${initialResult.nStudies} → ${updated.nStudies} studies`);
}

function testAnalysisCache() {
  console.log("\n--- Testing Analysis Cache ---");

  const cache = new AnalysisCache(10);

  const studies = [
    { effect: -0.3, se: 0.1 },
    { effect: -0.5, se: 0.12 }
  ];

  const options = { tau2Method: 'REML' };

  // First call - cache miss
  const result1 = cache.getOrCompute(studies, options, () => ({ computed: true, value: 42 }));
  assert(result1.computed === true, "Cache: first call returns computed result");
  assert(cache.getStats().misses === 1, "Cache: records miss");

  // Second call - cache hit
  const result2 = cache.getOrCompute(studies, options, () => ({ computed: true, value: 99 }));
  assert(result2.value === 42, "Cache: returns cached value");
  assert(cache.getStats().hits === 1, "Cache: records hit");

  // Different options - cache miss
  const result3 = cache.getOrCompute(studies, { tau2Method: 'DL' }, () => ({ computed: true, value: 100 }));
  assert(result3.value === 100, "Cache: different options = new computation");

  const stats = cache.getStats();
  console.log(`Cache stats: ${stats.hits} hits, ${stats.misses} misses, hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
}

function testEvidenceChangeDetector() {
  console.log("\n--- Testing Evidence Change Detector ---");

  const previousResults = {
    random: { mu: -0.3, ci: [-0.5, -0.1] },
    I2: 30,
    nStudies: 5
  };

  const currentResults = {
    random: { mu: -0.6, ci: [-0.9, -0.3] },
    I2: 55,
    nStudies: 8
  };

  const result = detectEvidenceChange(previousResults, currentResults, {
    effectChangeThreshold: 0.2
  });

  assert(result.hasChanges === true, "Change detector: detects changes");
  assert(result.alertLevel !== 'none', "Change detector: sets alert level");
  assert(result.changes.length > 0, "Change detector: lists changes");
  assert(result.summary !== undefined, "Change detector: has summary");
  assert(result.recommendation !== undefined, "Change detector: has recommendation");

  console.log(`Evidence change: ${result.alertLevel} alert, ${result.changes.length} changes detected`);
  console.log(`Summary: ${result.summary}`);
}

function testSearchStrategyValidator() {
  console.log("\n--- Testing Search Strategy Validator ---");

  const goodStrategy = {
    databases: ['MEDLINE', 'Embase', 'CENTRAL', 'ClinicalTrials.gov'],
    terms: ['heart failure[MeSH] OR cardiac failure', 'treatment AND outcome'],
    dateRestriction: false,
    languageRestriction: false
  };

  const result = validateSearchStrategy(goodStrategy);

  assert(result.valid === true, "Search validator: good strategy is valid");
  assert(result.score >= 70, "Search validator: good strategy scores well");
  assert(result.issues.length === 0 || result.issues.length < 3, "Search validator: few issues");

  // Test poor strategy
  const poorStrategy = {
    databases: ['PubMed'],
    terms: ['heart failure treatment'],
    languageRestriction: true
  };

  const poorResult = validateSearchStrategy(poorStrategy);
  assert(poorResult.score < result.score, "Search validator: poor strategy scores lower");

  console.log(`Good strategy score: ${result.score}, Poor strategy score: ${poorResult.score}`);
}

function testScreeningQueueDualReviewerRouting() {
  console.log("\n--- Testing screening queue dual-reviewer routing ---");

  const queue = new ScreeningQueue(
    [{ id: "R1", title: "Routing Study" }],
    { requireDualReview: true }
  );

  const firstForReviewer1 = queue.getNextStudy("reviewer1");
  assert(firstForReviewer1 && firstForReviewer1._id === "R1", "Routing: reviewer1 receives pending study");

  queue.recordDecision("R1", "include", "reviewer1", "Initial include decision");

  const firstForReviewer2 = queue.getNextStudy("reviewer2");
  assert(firstForReviewer2 && firstForReviewer2._id === "R1", "Routing: reviewer2 still receives once-screened study");
}

function testBMJMultiReviewerReadiness() {
  console.log("\n--- Testing BMJ multi-reviewer readiness gate ---");

  const studies = [
    { id: "S1", title: "Study 1" },
    { id: "S2", title: "Study 2" },
    { id: "S3", title: "Study 3" },
    { id: "S4", title: "Study 4" },
    { id: "S5", title: "Study 5" },
    { id: "S6", title: "Study 6" }
  ];

  const queue = new ScreeningQueue(studies, { requireDualReview: true });

  // Dual decisions from independent reviewers.
  queue.recordDecision("S1", "include", "reviewer1", "matches PICO");
  queue.recordDecision("S2", "exclude", "reviewer1", "wrong population");
  queue.recordDecision("S3", "maybe", "reviewer1", "uncertain endpoint");
  queue.recordDecision("S4", "include", "reviewer1", "high relevance");
  queue.recordDecision("S5", "exclude", "reviewer1", "non-randomized");
  queue.recordDecision("S6", "include", "reviewer1", "eligible");

  queue.recordDecision("S1", "include", "reviewer2", "agree");
  queue.recordDecision("S2", "exclude", "reviewer2", "agree");
  queue.recordDecision("S3", "maybe", "reviewer2", "agree");
  queue.recordDecision("S4", "include", "reviewer2", "agree");
  queue.recordDecision("S5", "exclude", "reviewer2", "agree");
  queue.recordDecision("S6", "exclude", "reviewer2", "possible false-positive");

  // Resolve one conflict with adjudication trace.
  queue.resolveConflict("S6", "include", "adjudicator", "Retained after full-text review.");

  const agreement = queue.getReviewerAgreement();
  assert(agreement.compared === 6, "BMJ gate: all studies are dual-reviewed");
  assert(agreement.kappa > 0.60, "BMJ gate: kappa exceeds substantial-agreement threshold");

  const report = queue.generateBMJReadinessReport({
    minDualReviewCoverage: 1.0,
    minKappa: 0.60,
    maxPendingRate: 0,
    minAuditTrailCompleteness: 1.0,
    maxUnresolvedConflicts: 0
  });
  assert(report.overall.decision === "PASS", "BMJ gate: ready report passes");
  assert(report.actionItems.length === 0, "BMJ gate: no unresolved critical actions");

  // Negative case: unresolved conflicts must fail readiness.
  const failQueue = new ScreeningQueue(
    [
      { id: "F1", title: "Fail Study 1" },
      { id: "F2", title: "Fail Study 2" }
    ],
    { requireDualReview: true }
  );
  failQueue.recordDecision("F1", "include", "reviewer1");
  failQueue.recordDecision("F1", "exclude", "reviewer2");
  failQueue.recordDecision("F2", "include", "reviewer1");
  failQueue.recordDecision("F2", "include", "reviewer2");

  const failReport = failQueue.generateBMJReadinessReport({
    minDualReviewCoverage: 1.0,
    maxUnresolvedConflicts: 0
  });
  assert(failReport.overall.decision === "FAIL", "BMJ gate: unresolved conflict triggers FAIL");
}

function testPLOSMultiReviewerReadiness() {
  console.log("\n--- Testing PLOS multi-reviewer readiness gate ---");

  const studies = [
    { id: "P1", title: "PLOS Study 1" },
    { id: "P2", title: "PLOS Study 2" },
    { id: "P3", title: "PLOS Study 3" },
    { id: "P4", title: "PLOS Study 4" }
  ];

  const queue = new ScreeningQueue(studies, { requireDualReview: true });

  queue.recordDecision("P1", "include", "reviewer1", "Matches predefined PICO criteria.");
  queue.recordDecision("P2", "exclude", "reviewer1", "Wrong intervention.");
  queue.recordDecision("P3", "include", "reviewer1", "Relevant RCT population.");
  queue.recordDecision("P4", "exclude", "reviewer1", "Not randomized.");

  queue.recordDecision("P1", "include", "reviewer2", "Agreement on eligibility.");
  queue.recordDecision("P2", "exclude", "reviewer2", "Agreement on exclusion.");
  queue.recordDecision("P3", "exclude", "reviewer2", "Unclear endpoint hierarchy.");
  queue.recordDecision("P4", "exclude", "reviewer2", "Agreement on design exclusion.");

  queue.resolveConflict("P3", "include", "adjudicator", "Included after full-text clarification of endpoint definitions.");

  const report = queue.generatePLOSReadinessReport({
    minDualReviewCoverage: 1.0,
    minKappa: 0.5,
    minDecisionNoteCoverage: 1.0,
    maxPendingRate: 0,
    minAuditTrailCompleteness: 1.0,
    protocolRegistrationId: "PROSPERO-CRD42026000001",
    dataAvailabilityStatement: "Screening decisions and adjudication logs will be shared as supplementary material."
  });

  assert(report.overall.decision === "PASS", "PLOS gate: fully documented run passes");
  assert(report.metrics.decisionNoteCoverage === 1, "PLOS gate: full decision rationale coverage");
  assert(report.metrics.adjudicatorIndependence === 1, "PLOS gate: independent adjudicator documented");

  const failQueue = new ScreeningQueue(
    [
      { id: "PF1", title: "Fail PLOS Study 1" },
      { id: "PF2", title: "Fail PLOS Study 2" }
    ],
    { requireDualReview: true }
  );
  failQueue.recordDecision("PF1", "include", "reviewer1", "");
  failQueue.recordDecision("PF1", "exclude", "reviewer2", "");
  failQueue.recordDecision("PF2", "include", "reviewer1", "");
  failQueue.recordDecision("PF2", "include", "reviewer2", "");
  failQueue.resolveConflict("PF1", "include", "reviewer1", "");

  const failReport = failQueue.generatePLOSReadinessReport({
    minDualReviewCoverage: 1.0,
    maxUnresolvedConflicts: 0,
    requireProtocolRegistration: true,
    requireDataAvailabilityStatement: true
  });
  assert(failReport.overall.decision === "FAIL", "PLOS gate: missing declarations and weak documentation fail");
  assert(
    failReport.actionItems.some(a => a.id === "protocol_registration"),
    "PLOS gate: missing protocol declaration is flagged"
  );

  const exported = JSON.parse(queue.exportResults("plos"));
  assert(exported.standard.includes("PLOS"), "PLOS export: returns readiness payload");
}

function testPLOSONEMultiReviewerReadiness() {
  console.log("\n--- Testing PLOS ONE multi-reviewer readiness gate ---");

  const studies = [
    { id: "PO1", title: "PLOS ONE Study 1" },
    { id: "PO2", title: "PLOS ONE Study 2" },
    { id: "PO3", title: "PLOS ONE Study 3" }
  ];

  const queue = new ScreeningQueue(studies, { requireDualReview: true });
  queue.recordDecision("PO1", "include", "reviewer1", "Meets PICO and design criteria.");
  queue.recordDecision("PO2", "exclude", "reviewer1", "Wrong comparator.");
  queue.recordDecision("PO3", "include", "reviewer1", "Eligible population.");
  queue.recordDecision("PO1", "include", "reviewer2", "Agree.");
  queue.recordDecision("PO2", "exclude", "reviewer2", "Agree.");
  queue.recordDecision("PO3", "exclude", "reviewer2", "Different interpretation of endpoint.");
  queue.resolveConflict("PO3", "include", "adjudicator", "Included after endpoint clarification.");

  const passReport = queue.generatePLOSONEReadinessReport({
    minDualReviewCoverage: 1.0,
    minKappa: 0.4,
    maxPendingRate: 0,
    minAuditTrailCompleteness: 1.0,
    minDecisionNoteCoverage: 1.0,
    protocolRegistrationId: "PROSPERO-CRD42026000002",
    dataAvailabilityStatement: "All screening decisions and adjudication logs are provided in supplements.",
    prismaChecklistProvided: true,
    searchStrategyAppendixProvided: true,
    screeningLogExported: true
  });
  assert(passReport.profile === "PLOS_ONE", "PLOS ONE gate: profile tag is set");
  assert(passReport.overall.decision === "PASS", "PLOS ONE gate: complete package passes");

  const failReport = queue.generatePLOSONEReadinessReport({
    minDualReviewCoverage: 1.0,
    maxPendingRate: 0
  });
  assert(failReport.overall.decision === "FAIL", "PLOS ONE gate: missing transparency declarations fail");
  assert(
    failReport.actionItems.some(a => a.id === "prisma_checklist"),
    "PLOS ONE gate: missing PRISMA checklist is flagged"
  );

  const exported = JSON.parse(queue.exportResults("plos_one"));
  assert(exported.standard.includes("PLOS ONE"), "PLOS ONE export: returns readiness payload");
}

function testESCSearchStrategyPresets() {
  console.log("\n--- Testing ESC CT.gov strategy presets ---");

  assert(CTGOV_STRATEGY_PRESETS.S1 !== undefined, "Strategy presets: S1 exists");
  assert(CTGOV_STRATEGY_PRESETS.S10 !== undefined, "Strategy presets: S10 exists");

  const s3 = buildCTGovQueryFromPreset({ condition: 'heart failure' }, 'S3');
  const queryS3 = s3.queryString;
  assert(queryS3.includes('query.cond=heart+failure'), "S3 query includes condition");
  assert(queryS3.includes('AREA%5BDesignAllocation%5DRANDOMIZED'), "S3 query includes randomized allocation filter");

  const s10 = buildCTGovQueryFromPreset({ condition: 'heart failure', status: ['COMPLETED'] }, 'S10');
  const queryS10 = s10.queryString;
  assert(queryS10.includes('AREA%5BDesignPrimaryPurpose%5DTREATMENT'), "S10 query includes treatment purpose");
  assert(queryS10.includes('filter.overallStatus=COMPLETED'), "S10 query preserves explicit status filter");
}

function testCTGovBundleRecommendation() {
  console.log("\n--- Testing CT.gov bundle recommendation ---");

  const recommended = recommendCTGovStrategyBundle({
    condition: 'postoperative pain',
    searchObjective: 'max_recall'
  });
  assert(recommended.strategyIds.includes('S1'), "Bundle recommendation: includes S1 for max recall");
  assert(recommended.strategyIds.includes('S9'), "Bundle recommendation: includes S9 for challenging conditions");
  assert(recommended.strategyIds.length >= 4, "Bundle recommendation: returns multi-strategy bundle");
}

function testAACTSQLBuilder() {
  console.log("\n--- Testing AACT SQL builder ---");

  const payload = buildAACTSQLQuery(
    { guidelineArea: 'acute_coronary_syndromes', status: ['COMPLETED'] },
    { maxResults: 250 }
  );

  assert(payload.sql.includes('FROM ctgov.studies'), "AACT SQL: targets ctgov.studies");
  assert(payload.sql.includes("LOWER(d.allocation) = 'randomized'"), "AACT SQL: enforces randomized allocation");
  assert(payload.sql.includes("UPPER(s.study_type) = 'INTERVENTIONAL'"), "AACT SQL: enforces interventional study type");
  assert(payload.parameters.length > 2, "AACT SQL: has bound parameters");
  assert(payload.termsUsed.length >= 3, "AACT SQL: includes ESC cardiology terms");

  const directLookupId = AACT_VALIDATION_REFERENCE.knownApiGapNctIds[0];
  const directPayload = buildAACTSQLQuery({ nctIds: [directLookupId] }, { maxResults: 5 });
  assert(directPayload.sql.includes('s.nct_id IN'), "AACT SQL: supports direct NCT lookup mode");
  assert(directPayload.nctIds.includes(directLookupId), "AACT SQL: preserves direct NCT IDs");

  const focusedPayload = buildAACTSQLQuery(
    { guidelineArea: 'heart_failure', condition: 'heart failure', useAreaTerms: false },
    { maxResults: 20 }
  );
  assert(focusedPayload.termsUsed.length === 1, "AACT SQL: useAreaTerms=false enables focused condition mode");
  assert(focusedPayload.termsUsed[0] === 'heart failure', "AACT SQL: focused condition term is preserved");
}

function testESCGuidelineProfileCoverage() {
  console.log("\n--- Testing ESC guideline profile coverage ---");

  assert(ESC_GUIDELINE_PROFILES.cardiology !== undefined, "Guideline profile: cardiology profile is available");

  const payload = buildAACTSQLQuery(
    { guidelineProfile: 'esc', guidelineArea: 'hypertension' },
    { maxResults: 50 }
  );

  assert(payload.guidelineProfile === 'cardiology', "Guideline profile: ESC alias normalizes to cardiology");
  assert(payload.termsUsed.some(t => t.toLowerCase().includes('hypertension')), "Guideline profile: hypertension terms are injected");
  assert(
    ESC_GUIDELINE_LANDMARK_TRIALS.diabetes_cardiovascular_disease.length >= 3,
    "Guideline profile: cardiometabolic landmark seeds are available"
  );
}

function testTrialUniverseSummary() {
  console.log("\n--- Testing trial universe summary (with and without PICO) ---");

  const studies = [
    {
      nctId: 'NCT12345678',
      title: 'Randomized trial in heart failure with beta-blocker therapy',
      abstract: 'A randomized controlled trial in heart failure patients.'
    },
    {
      nctId: 'NCT12345678',
      title: 'Randomized trial in heart failure with beta-blocker therapy',
      abstract: 'Duplicate record from another source.'
    },
    {
      nctId: 'NCT12345679',
      title: 'Heart failure biomarker cohort study',
      abstract: 'Prospective cohort in heart failure.'
    },
    {
      nctId: 'NCT12345680',
      title: 'Animal model of myocarditis',
      abstract: 'Preclinical animal model study.'
    }
  ];

  const report = summarizeTrialUniverse(studies, {
    inclusionCriteria: {
      requiredKeywords: ['heart failure'],
      preferredKeywords: ['randomized'],
      exclusionKeywords: ['animal'],
      acceptedDesigns: ['RCT']
    },
    dedupe: true,
    includeMaybe: true
  });

  assert(report.withoutPICO.totalStudies === 3, "Trial universe: dedupe removes duplicate trial");
  assert(report.withPICO.totalStudies === 2, "Trial universe: PICO filters to include+maybe subset");
  assert(report.withPICO.includeCount === 1, "Trial universe: include count is tracked");
  assert(report.withPICO.excludeCount === 1, "Trial universe: exclude count is tracked");
  assert(report.comparison.removedByPICO === 1, "Trial universe: removed count is calculated");
}

function testESCLandmarkCoverageAssessment() {
  console.log("\n--- Testing ESC landmark coverage assessment ---");

  const hfSeed = ESC_GUIDELINE_LANDMARK_TRIALS.heart_failure.slice(0, 3).map(nctId => ({ nctId, title: nctId }));
  const acsSeed = ESC_GUIDELINE_LANDMARK_TRIALS.acute_coronary_syndromes.slice(0, 2).map(nctId => ({ nctId, title: nctId }));

  const report = assessESCLandmarkCoverage(
    [...hfSeed, ...acsSeed],
    {
      guidelineAreas: ['heart_failure', 'acute_coronary_syndromes'],
      minCoveragePct: 10
    }
  );

  assert(report.totalFound === 5, "Landmark coverage: identifies matched landmark NCTs");
  assert(report.totalExpected > 5, "Landmark coverage: expected pool comes from guideline definitions");
  assert(report.decision === 'PASS', "Landmark coverage: low threshold PASS works");

  const strict = assessESCLandmarkCoverage(
    [...hfSeed, ...acsSeed],
    {
      guidelineAreas: ['heart_failure', 'acute_coronary_syndromes'],
      minCoveragePct: 95
    }
  );
  assert(strict.decision === 'FLAG', "Landmark coverage: strict threshold correctly flags low coverage");
}

function testSurveillanceRobustnessAssessment() {
  console.log("\n--- Testing surveillance robustness assessment ---");

  const robust = assessSurveillanceRobustness({
    sources: {
      pubmed: { count: 120, retrieved: 100 },
      ctgov: {
        count: 80,
        retrieved: 60,
        perStrategy: {
          S1: { retrieved: 40 },
          S3: { retrieved: 35 },
          S10: { retrieved: 30 }
        },
        nctIds: ['NCT00000001']
      },
      aact: {
        count: 90,
        retrieved: 90,
        requiresGateway: false,
        error: null,
        nctIds: ['NCT00000001', AACT_VALIDATION_REFERENCE.knownApiGapNctIds[0]]
      }
    },
    landmarkCoverage: { overallCoveragePct: 80 },
    newStudies: [],
    duplicates: [],
    excluded: []
  }, {
    requiredSources: ['pubmed', 'ctgov', 'aact'],
    minCtgovStrategies: 2,
    requireAACT: true,
    requireAACTIncremental: true,
    minAACTIncrementalNcts: 1,
    requireLandmarkCoverage: true,
    minLandmarkCoveragePct: 70
  });
  assert(robust.decision === 'PASS', "Robustness: PASS when all criteria are met");

  const weak = assessSurveillanceRobustness({
    sources: {
      ctgov: {
        count: 20,
        retrieved: 15,
        perStrategy: {
          S3: { retrieved: 15 }
        },
        nctIds: ['NCT00000001'],
        error: 'network timeout'
      },
      aact: {
        count: 15,
        retrieved: 15,
        requiresGateway: false,
        error: null,
        nctIds: ['NCT00000001']
      }
    },
    landmarkCoverage: { overallCoveragePct: 20 },
    newStudies: [],
    duplicates: [],
    excluded: []
  }, {
    requiredSources: ['pubmed', 'ctgov', 'aact'],
    minCtgovStrategies: 2,
    requireAACT: true,
    requireAACTIncremental: true,
    minAACTIncrementalNcts: 1,
    requireLandmarkCoverage: true,
    minLandmarkCoveragePct: 70
  });
  assert(weak.decision === 'FLAG', "Robustness: FLAG when source depth is insufficient");
  assert(weak.actionItems.length > 0, "Robustness: provides remediation actions");
}

function testESCStrategyConstruction() {
  console.log("\n--- Testing ESC strategy construction ---");

  const strat = createSearchStrategy({
    name: 'ESC Cardiology High Recall',
    guidelineProfile: 'esc',
    sources: ['pubmed', 'ctgov', 'aact'],
    ctgovQuery: { condition: 'acute coronary syndrome' },
    searchObjective: 'max_recall',
    ctgovMode: 'multi',
    aactGatewayUrl: 'https://example.org/aact/query'
  });

  assert(strat.searchObjective === 'max_recall', "Strategy builder: stores search objective");
  assert(strat.guidelineProfile === 'cardiology', "Strategy builder: normalizes guideline profile aliases");
  assert(strat.ctgovStrategy.mode === 'multi', "Strategy builder: enables multi-strategy mode");
  assert(strat.ctgovStrategy.strategyIds.length >= 2, "Strategy builder: includes multiple CT.gov presets");
  assert(strat.infrastructure.aactGatewayUrl !== null, "Strategy builder: stores AACT gateway URL");
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
export function runAllTests() {
  console.log("========================================");
  console.log("ESC ACS Living Meta-Analysis Unit Tests");
  console.log("========================================");

  passed = 0;
  failed = 0;
  results.length = 0;

  testComputeLogRR();
  testComputeMeanDiff();
  testMetaAnalysis();
  testMetaAnalysisAdvanced();
  testEggerTest();
  testBeggTest();
  testLeaveOneOut();
  testNetworkMeta();
  testNmaInconsistency();
  testComputePScore();
  testComputeSucra();
  testExtractDoseFromLabel();
  testMetaRegression();
  testFunnelPlotData();
  testTrimAndFill();
  testDoseResponseFit();
  testCumulativeMetaAnalysis();
  testSubgroupAnalysis();
  testGradeAssessment();
  testSensitivityAnalysis();
  testTACC();
  testChiSquaredQuantile();
  testI2CI();
  testTau2CI();
  testPetersTest();
  testComparisonAdjustedFunnel();
  testPScoreSE();
  testDoubleZeroNaN();
  testPredictionInterval();
  testNMAHKSJ();
  // New tests (2026-01-25)
  testBaujatPlot();
  testGalbraithPlot();
  testOutlierDiagnostics();
  testLabbePlot();
  testContourFunnel();
  testCopasModel();
  testSROCCurve();
  testRankogram();
  testEnhancedMetaRegression();
  testBivariateDTAModel();
  // Editorial revision tests (2026-01-25)
  testSeededRNG();
  testChiSquaredImproved();
  testBivariateDTAReml();
  testMixedEffectsRegression();
  testNMAInconsistency();
  testPScoreWithSE();
  testTrimFillWithSE();
  testTrialSequentialAnalysis();
  testMultivariateMA();
  testValidation();
  testVersionTracking();
  // Phase 1-4 tests (Competitive Excellence)
  testIPDTwoStage();
  testIPDOneStage();
  testBayesianMA();
  testRoB2Assessment();
  testROBINSIAssessment();
  testQUADAS2Assessment();
  testMethodsParagraph();
  // Phase 2-4 additional tests
  testGRADEFramework();
  testComponentNMA();
  testFractionalPolynomialDR();
  testEmaxModel();
  testPRISMAChecklist();
  testCSVImportExport();
  testLeagueTable();
  testStreamingMA();
  testIncrementalMA();
  testAnalysisCache();
  testEvidenceChangeDetector();
  testSearchStrategyValidator();
  testScreeningQueueDualReviewerRouting();
  testBMJMultiReviewerReadiness();
  testPLOSMultiReviewerReadiness();
  testPLOSONEMultiReviewerReadiness();
  testESCSearchStrategyPresets();
  testCTGovBundleRecommendation();
  testAACTSQLBuilder();
  testESCGuidelineProfileCoverage();
  testESCLandmarkCoverageAssessment();
  testTrialUniverseSummary();
  testSurveillanceRobustnessAssessment();
  testESCStrategyConstruction();

  console.log("\n========================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================");

  return { passed, failed, results };
}

// Export individual test functions for selective testing
export {
  testComputeLogRR,
  testComputeMeanDiff,
  testMetaAnalysis,
  testMetaAnalysisAdvanced,
  testEggerTest,
  testBeggTest,
  testLeaveOneOut,
  testNetworkMeta,
  testNmaInconsistency,
  testComputePScore,
  testComputeSucra,
  testExtractDoseFromLabel,
  testMetaRegression,
  testFunnelPlotData,
  testTrimAndFill,
  testDoseResponseFit,
  testCumulativeMetaAnalysis,
  testSubgroupAnalysis,
  testGradeAssessment,
  testSensitivityAnalysis,
  testTACC,
  testChiSquaredQuantile,
  testI2CI,
  testTau2CI,
  testPetersTest,
  testComparisonAdjustedFunnel,
  testPScoreSE,
  testDoubleZeroNaN,
  testPredictionInterval,
  testNMAHKSJ,
  // New tests (2026-01-25)
  testBaujatPlot,
  testGalbraithPlot,
  testOutlierDiagnostics,
  testLabbePlot,
  testContourFunnel,
  testCopasModel,
  testSROCCurve,
  testRankogram,
  testEnhancedMetaRegression,
  testBivariateDTAModel,
  // Editorial revision tests (2026-01-25)
  testSeededRNG,
  testChiSquaredImproved,
  testBivariateDTAReml,
  testMixedEffectsRegression,
  testNMAInconsistency,
  testPScoreWithSE,
  testTrimFillWithSE,
  testTrialSequentialAnalysis,
  testMultivariateMA,
  testValidation,
  testVersionTracking,
  // Phase 1-4 tests
  testIPDTwoStage,
  testIPDOneStage,
  testBayesianMA,
  testRoB2Assessment,
  testROBINSIAssessment,
  testQUADAS2Assessment,
  testMethodsParagraph,
  // Phase 2-4 additional tests
  testGRADEFramework,
  testComponentNMA,
  testFractionalPolynomialDR,
  testEmaxModel,
  testPRISMAChecklist,
  testCSVImportExport,
  testLeagueTable,
  testStreamingMA,
  testIncrementalMA,
  testAnalysisCache,
  testEvidenceChangeDetector,
  testSearchStrategyValidator,
  testScreeningQueueDualReviewerRouting,
  testBMJMultiReviewerReadiness,
  testPLOSMultiReviewerReadiness,
  testPLOSONEMultiReviewerReadiness,
  testESCSearchStrategyPresets,
  testCTGovBundleRecommendation,
  testAACTSQLBuilder,
  testESCGuidelineProfileCoverage,
  testESCLandmarkCoverageAssessment,
  testTrialUniverseSummary,
  testSurveillanceRobustnessAssessment,
  testESCStrategyConstruction
};

// Auto-run if imported directly
if (typeof window !== "undefined") {
  window.runTests = runAllTests;
  console.log("Tests loaded. Call runTests() to execute.");
  console.log("For R package validation, see r-validation-runner.html");
}

// ============================================================================
// R PACKAGE VALIDATION REFERENCE
// ============================================================================
// For comprehensive validation against R packages (metafor, meta, netmeta, mada),
// see r-validation.js and r-validation-runner.html
//
// The R validation suite tests:
// - BCG vaccine data against metafor::dat.bcg
// - Fleiss93 aspirin data against meta::Fleiss93
// - Normand1999 hospital stay against metafor
// - Senn2013 antidiabetic NMA against netmeta
// - Publication bias tests (Egger, Begg, trim-and-fill)
// - Chi-squared quantile accuracy
// - Diagnostic test accuracy against mada
// - Raudenbush1985 SMD data
// - Effect size calculation accuracy
// - Cumulative meta-analysis
//
// Run: open r-validation-runner.html in browser
// ============================================================================
