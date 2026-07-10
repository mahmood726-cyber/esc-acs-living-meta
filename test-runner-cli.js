#!/usr/bin/env node
/**
 * ESC ACS Living Meta-Analysis - CLI Test Runner
 *
 * Runs all unit tests and R validation tests from command line.
 * Suitable for CI/CD pipelines (GitHub Actions, GitLab CI, etc.)
 *
 * Usage:
 *   node test-runner-cli.js [options]
 *
 * Options:
 *   --unit       Run unit tests only
 *   --validation Run R validation tests only
 *   --edge       Run edge case tests only
 *   --all        Run all tests (default)
 *   --verbose    Show detailed output
 *   --json       Output results as JSON
 *
 * Exit Codes:
 *   0 = All tests passed
 *   1 = Some tests failed
 *   2 = Error running tests
 *
 * @version 1.0.0
 * @date 2026-01-26
 */

// Mock browser globals for Node.js environment
global.DOMParser = class {
  parseFromString(str, type) {
    return { querySelectorAll: () => [] };
  }
};
global.fetch = async () => ({ ok: false, json: async () => ({}) });
global.document = { getElementById: () => null, querySelector: () => null };
global.window = { __escAcs: {} };
global.localStorage = { getItem: () => null, setItem: () => {} };

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

const testResults = {
  suites: [],
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: null,
  endTime: null
};

function describe(name, fn) {
  const suite = { name, tests: [], passed: 0, failed: 0 };
  testResults.suites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = null;
}

let currentSuite = null;

function it(name, fn) {
  const test = { name, passed: false, error: null };
  if (currentSuite) {
    currentSuite.tests.push(test);
  }
  try {
    fn();
    test.passed = true;
    testResults.passed++;
    if (currentSuite) currentSuite.passed++;
    if (verbose) console.log(`  ✓ ${name}`);
  } catch (e) {
    test.passed = false;
    test.error = e.message;
    testResults.failed++;
    if (currentSuite) currentSuite.failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeCloseTo(expected, tolerance = 0.0001) {
      if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`Expected ~${expected}, got ${actual} (diff: ${Math.abs(actual - expected)})`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected > ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (actual < expected) {
        throw new Error(`Expected >= ${expected}, got ${actual}`);
      }
    },
    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected < ${expected}, got ${actual}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (actual > expected) {
        throw new Error(`Expected <= ${expected}, got ${actual}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy, got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy, got ${actual}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
      }
    },
    toBeNaN() {
      if (!Number.isNaN(actual)) {
        throw new Error(`Expected NaN, got ${actual}`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${actual}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected to contain ${expected}`);
      }
    },
    toHaveLength(expected) {
      if (actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${actual.length}`);
      }
    },
    toThrow() {
      let threw = false;
      try {
        actual();
      } catch (e) {
        threw = true;
      }
      if (!threw) {
        throw new Error('Expected function to throw');
      }
    }
  };
}

// ============================================================================
// PARSE CLI ARGUMENTS
// ============================================================================

const args = process.argv.slice(2);
const runUnit = args.includes('--unit') || args.includes('--all') || args.length === 0;
const runValidation = args.includes('--validation') || args.includes('--all') || args.length === 0;
const runEdge = args.includes('--edge') || args.includes('--all') || args.length === 0;
const verbose = args.includes('--verbose');
const jsonOutput = args.includes('--json');

// ============================================================================
// IMPORT ANALYSIS FUNCTIONS
// ============================================================================

console.log('Loading analysis module...');

import('./analysis.js').then(analysis => {
  const {
    computeLogRR,
    computeLogOR,
    computeMeanDiff,
    metaAnalysis,
    metaAnalysisAdvanced,
    eggerTest,
    beggTest,
    petersTest,
    networkMeta,
    computePScore,
    computeSucra,
    nmaInconsistency,
    i2ConfidenceInterval,
    tau2ConfidenceInterval,
    chiSquaredQuantile,
    bayesianMA,
    bivariateDTAModel,
    trimAndFill
  } = analysis;

  testResults.startTime = Date.now();
  console.log('\n' + '='.repeat(70));
  console.log('ESC ACS Living Meta-Analysis - Test Suite');
  console.log('='.repeat(70) + '\n');

  // ============================================================================
  // UNIT TESTS
  // ============================================================================

  if (runUnit) {
    console.log('UNIT TESTS');
    console.log('-'.repeat(40));

    describe('Effect Size Calculations', () => {
      it('computes log RR correctly', () => {
        const result = computeLogRR(10, 100, 20, 100);
        expect(result.effect).toBeCloseTo(Math.log(0.5), 0.01);
      });

      it('computes log OR correctly', () => {
        const result = computeLogOR(10, 100, 20, 100);
        expect(result.effect).toBeCloseTo(Math.log((10*80)/(90*20)), 0.01);
      });

      it('handles zero cells with TACC', () => {
        const result = computeLogRR(0, 50, 5, 50, 'tacc');
        expect(result.method).toBe('tacc');
        expect(Number.isFinite(result.effect)).toBeTruthy();
      });

      it('returns NaN for double-zero studies', () => {
        const result = computeLogRR(0, 50, 0, 50);
        expect(result.effect).toBeNaN();
        expect(result.excluded).toBeTruthy();
      });
    });

    describe('Meta-Analysis', () => {
      const studies = [
        { effect: -0.5, se: 0.2 },
        { effect: -0.3, se: 0.15 },
        { effect: -0.7, se: 0.25 },
        { effect: -0.4, se: 0.18 }
      ];

      it('computes pooled effect', () => {
        const result = metaAnalysisAdvanced(studies);
        expect(result.random.mu).toBeCloseTo(-0.45, 0.1);
      });

      it('computes heterogeneity (I²)', () => {
        const result = metaAnalysisAdvanced(studies);
        expect(result.i2).toBeGreaterThanOrEqual(0);
        expect(result.i2).toBeLessThanOrEqual(100);
      });

      it('computes confidence interval', () => {
        const result = metaAnalysisAdvanced(studies);
        expect(result.random.ci[0]).toBeLessThan(result.random.mu);
        expect(result.random.ci[1]).toBeGreaterThan(result.random.mu);
      });

      it('computes prediction interval', () => {
        const result = metaAnalysisAdvanced(studies);
        expect(result.pi[0]).toBeLessThan(result.random.ci[0]);
        expect(result.pi[1]).toBeGreaterThan(result.random.ci[1]);
      });

      it('prediction interval matches mu +/- t_{k-2}*sqrt(tau2 + se^2) (metafor/IntHout)', () => {
        // Anchored regression test for the PI variance term.
        // Dataset chosen so DL tau2 = 0 (Q < df), making se(mu)^2 the whole
        // variance term. Expected values derived from the IntHout 2014 formula
        // PI = mu +/- t_{k-2} * sqrt(tau2 + SE(mu)^2), independent of the code.
        // The prior (buggy) median-within-study-variance formula gives
        // PI = [-1.083, 0.181] which would FAIL both bounds below.
        const anchorStudies = [
          { effect: -0.5, se: 0.2 },
          { effect: -0.3, se: 0.15 },
          { effect: -0.7, se: 0.25 },
          { effect: -0.4, se: 0.18 },
          { effect: -0.6, se: 0.22 }
        ];
        const r = metaAnalysisAdvanced(anchorStudies, { tau2Method: 'DL' });
        expect(r.tau2).toBeCloseTo(0, 1e-9);
        expect(r.pi[0]).toBeCloseTo(-0.72093774, 1e-3);
        expect(r.pi[1]).toBeCloseTo(-0.18109624, 1e-3);
        // The correct (narrower) PI excludes 0; the buggy PI (upper ~0.181) would not.
        expect(r.pi[1]).toBeLessThan(0);
      });

      it('provides I² confidence interval', () => {
        const result = metaAnalysisAdvanced(studies);
        expect(result.i2CI).toBeTruthy();
        expect(result.i2CI.lower).toBeLessThan(result.i2CI.upper);
      });

      it('metaAnalysis returns null on empty input (fails closed, no NaN/Infinity)', () => {
        // Regression: empty input previously returned a schema-valid object with
        // NaN tau2 and Infinity se instead of failing closed.
        expect(metaAnalysis([])).toBeNull();
      });

      it('metaAnalysis produces finite fields for a single study (k=1)', () => {
        const result = metaAnalysis([{ effect: -0.4, se: 0.18 }]);
        expect(result).toBeTruthy();
        expect(Number.isFinite(result.mu)).toBeTruthy();
        expect(Number.isFinite(result.se)).toBeTruthy();
      });
    });

    describe('Heterogeneity Statistics', () => {
      it('computes chi-squared quantile correctly for df=5, p=0.95', () => {
        const q = chiSquaredQuantile(0.95, 5);
        expect(q).toBeCloseTo(11.07, 0.1);
      });

      it('computes chi-squared quantile for large df', () => {
        const q = chiSquaredQuantile(0.95, 50);
        expect(q).toBeCloseTo(67.5, 1);
      });
    });

    describe('Publication Bias Tests', () => {
      const studies = [
        { effect: -0.5, se: 0.2 },
        { effect: -0.3, se: 0.15 },
        { effect: -0.7, se: 0.25 },
        { effect: -0.4, se: 0.18 },
        { effect: -0.6, se: 0.22 }
      ];

      it('computes Egger test', () => {
        const result = eggerTest(studies);
        expect(result).toBeTruthy();
        expect(result.pValue).toBeGreaterThan(0);
        expect(result.pValue).toBeLessThan(1);
      });

      it('computes Begg test', () => {
        const result = beggTest(studies);
        expect(result).toBeTruthy();
        expect(result.pValue).toBeGreaterThan(0);
      });
    });

    describe('Network Meta-Analysis', () => {
      const contrasts = [
        { t1: 'A', t2: 'B', effect: -0.5, se: 0.2 },
        { t1: 'A', t2: 'C', effect: -0.3, se: 0.25 },
        { t1: 'B', t2: 'C', effect: 0.2, se: 0.22 }
      ];

      it('computes network effects', () => {
        const result = networkMeta(contrasts, ['A', 'B', 'C'], 'A');
        expect(result.length).toBe(3);
        expect(result[0].effect).toBe(0); // Reference
      });

      it('supports REML tau2 estimation', () => {
        const result = networkMeta(contrasts, ['A', 'B', 'C'], 'A', { tau2Method: 'REML' });
        expect(result[0].tau2).toBeGreaterThan(-0.001);
      });

      it('computes P-scores', () => {
        const nma = networkMeta(contrasts, ['A', 'B', 'C'], 'A');
        const pscores = computePScore(nma);
        expect(pscores.length).toBe(3);
        pscores.forEach(p => {
          expect(p.pscore).toBeGreaterThan(-0.01);
          expect(p.pscore).toBeLessThan(1.01);
        });
      });
    });
  }

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  if (runEdge) {
    console.log('\nEDGE CASE TESTS');
    console.log('-'.repeat(40));

    describe('Extreme Values', () => {
      it('handles very large effect sizes', () => {
        const studies = [
          { effect: 5, se: 0.5 },
          { effect: 4.5, se: 0.6 }
        ];
        const result = metaAnalysisAdvanced(studies);
        expect(Number.isFinite(result.random.mu)).toBeTruthy();
      });

      it('handles very small standard errors', () => {
        const studies = [
          { effect: 0.5, se: 0.001 },
          { effect: 0.6, se: 0.001 }
        ];
        const result = metaAnalysisAdvanced(studies);
        expect(Number.isFinite(result.random.mu)).toBeTruthy();
      });

      it('handles very large tau² (extreme heterogeneity)', () => {
        const studies = [
          { effect: -2, se: 0.1 },
          { effect: 2, se: 0.1 },
          { effect: 0, se: 0.1 }
        ];
        const result = metaAnalysisAdvanced(studies);
        expect(result.i2).toBeGreaterThan(90);
        expect(Number.isFinite(result.tau2)).toBeTruthy();
      });

      it('handles zero heterogeneity (identical effects)', () => {
        const studies = [
          { effect: 0.5, se: 0.2 },
          { effect: 0.5, se: 0.25 },
          { effect: 0.5, se: 0.18 }
        ];
        const result = metaAnalysisAdvanced(studies);
        expect(result.tau2).toBeCloseTo(0, 0.01);
      });
    });

    describe('Small Sample Sizes', () => {
      it('handles k=2 studies (PI disabled)', () => {
        const studies = [
          { effect: 0.5, se: 0.2 },
          { effect: 0.3, se: 0.25 }
        ];
        const result = metaAnalysisAdvanced(studies);
        expect(result.piDisabled).toBeTruthy();
        expect(result.piWarning).toContain('DISABLED');
      });

      it('handles single study', () => {
        const studies = [{ effect: 0.5, se: 0.2 }];
        const result = metaAnalysisAdvanced(studies);
        expect(result.k).toBe(1);
        expect(result.random.mu).toBeCloseTo(0.5, 0.01);
      });

      it('returns null for empty input', () => {
        const result = metaAnalysisAdvanced([]);
        expect(result).toBeNull();
      });
    });

    describe('NMA Edge Cases', () => {
      it('handles disconnected network', () => {
        const contrasts = [
          { t1: 'A', t2: 'B', effect: 0.5, se: 0.2 },
          { t1: 'C', t2: 'D', effect: 0.3, se: 0.25 }
        ];
        // Should still compute what it can
        const result = networkMeta(contrasts, ['A', 'B', 'C', 'D'], 'A');
        expect(result.length).toBeGreaterThan(0);
      });

      it('handles single comparison', () => {
        const contrasts = [
          { t1: 'A', t2: 'B', effect: 0.5, se: 0.2 }
        ];
        const result = networkMeta(contrasts, ['A', 'B'], 'A');
        expect(result.length).toBe(2);
      });
    });

    describe('Bayesian Edge Cases', () => {
      it('handles grid approximation with few studies', () => {
        const studies = [
          { effect: 0.5, se: 0.2 },
          { effect: 0.3, se: 0.25 }
        ];
        const result = bayesianMA(studies, {}, { method: 'grid', gridPoints: 50 });
        expect(result.method).toBe('Grid approximation');
        expect(Number.isFinite(result.posteriorMean)).toBeTruthy();
      });

      it('handles MCMC with default settings', () => {
        const studies = [
          { effect: 0.5, se: 0.2 },
          { effect: 0.3, se: 0.25 },
          { effect: 0.4, se: 0.22 }
        ];
        const result = bayesianMA(studies, {}, { method: 'mcmc', mcmcIterations: 1000, mcmcBurnin: 200 });
        expect(result.method).toContain('MCMC');
        expect(result.mcmcDiagnostics).toBeTruthy();
      });
    });

    describe('Publication Bias Edge Cases', () => {
      it('Egger returns null for k < 3', () => {
        const studies = [
          { effect: 0.5, se: 0.2 },
          { effect: 0.3, se: 0.25 }
        ];
        const result = eggerTest(studies);
        expect(result).toBeNull();
      });

      it('handles all studies on same side of funnel', () => {
        const studies = [
          { effect: 0.5, se: 0.2 },
          { effect: 0.6, se: 0.15 },
          { effect: 0.55, se: 0.18 },
          { effect: 0.7, se: 0.22 }
        ];
        const result = eggerTest(studies);
        expect(result).toBeTruthy();
        expect(Number.isFinite(result.pValue)).toBeTruthy();
      });
    });
  }

  // ============================================================================
  // R VALIDATION TESTS
  // ============================================================================

  if (runValidation) {
    console.log('\nR VALIDATION TESTS');
    console.log('-'.repeat(40));

    describe('metafor::dat.bcg Validation', () => {
      // BCG vaccine data - expected from R metafor
      const bcgData = [
        { e1: 4, n1: 123, e0: 11, n0: 139 },
        { e1: 6, n1: 306, e0: 29, n0: 303 },
        { e1: 3, n1: 231, e0: 11, n0: 220 },
        { e1: 62, n1: 13598, e0: 248, n0: 12867 },
        { e1: 33, n1: 5069, e0: 47, n0: 5808 },
        { e1: 180, n1: 1541, e0: 372, n0: 1451 },
        { e1: 8, n1: 2545, e0: 10, n0: 629 },
        { e1: 505, n1: 88391, e0: 499, n0: 88391 },
        { e1: 29, n1: 7499, e0: 45, n0: 7277 },
        { e1: 17, n1: 1716, e0: 65, n0: 1665 },
        { e1: 186, n1: 50634, e0: 141, n0: 27338 },
        { e1: 5, n1: 2498, e0: 3, n0: 2341 },
        { e1: 27, n1: 16913, e0: 29, n0: 17854 }
      ];

      const studies = bcgData.map(d => {
        const rr = computeLogRR(d.e1, d.n1, d.e0, d.n0);
        return { effect: rr.effect, se: rr.se };
      }).filter(s => !Number.isNaN(s.effect));

      it('pooled log RR matches metafor (ε < 0.05)', () => {
        const result = metaAnalysisAdvanced(studies);
        const expected = -0.7145; // From R metafor
        expect(result.random.mu).toBeCloseTo(expected, 0.05);
      });

      it('tau² matches metafor (ε < 0.05)', () => {
        const result = metaAnalysisAdvanced(studies);
        const expected = 0.3088; // From R metafor REML
        expect(result.tau2).toBeCloseTo(expected, 0.05);
      });

      it('I² matches metafor (ε < 5%)', () => {
        const result = metaAnalysisAdvanced(studies);
        const expected = 92.22; // From R metafor
        expect(Math.abs(result.i2 - expected)).toBeLessThan(5);
      });
    });

    describe('netmeta::Senn2013 Validation', () => {
      // Simplified Senn2013 blood pressure NMA
      const contrasts = [
        { t1: 'Placebo', t2: 'Amlodipine', effect: -11.5, se: 3.2 },
        { t1: 'Placebo', t2: 'Atenolol', effect: -10.2, se: 2.8 },
        { t1: 'Placebo', t2: 'Lisinopril', effect: -9.8, se: 3.0 },
        { t1: 'Amlodipine', t2: 'Atenolol', effect: 1.3, se: 2.5 },
        { t1: 'Amlodipine', t2: 'Lisinopril', effect: 1.7, se: 2.7 }
      ];

      it('NMA computes all treatment effects', () => {
        const result = networkMeta(contrasts, ['Placebo', 'Amlodipine', 'Atenolol', 'Lisinopril'], 'Placebo');
        expect(result.length).toBe(4);
      });

      it('reference treatment has zero effect', () => {
        const result = networkMeta(contrasts, ['Placebo', 'Amlodipine', 'Atenolol', 'Lisinopril'], 'Placebo');
        const placebo = result.find(r => r.treatment === 'Placebo');
        expect(placebo.effect).toBe(0);
      });
    });
  }

  // ============================================================================
  // RESULTS SUMMARY
  // ============================================================================

  testResults.endTime = Date.now();
  const duration = testResults.endTime - testResults.startTime;

  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`Passed:  ${testResults.passed}`);
  console.log(`Failed:  ${testResults.failed}`);
  console.log(`Skipped: ${testResults.skipped}`);
  console.log(`Time:    ${duration}ms`);
  console.log('='.repeat(70));

  if (jsonOutput) {
    console.log('\nJSON Output:');
    console.log(JSON.stringify(testResults, null, 2));
  }

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);

}).catch(err => {
  console.error('Failed to load analysis module:', err);
  process.exit(2);
});
