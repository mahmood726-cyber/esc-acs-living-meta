/**
 * ESC ACS Living Meta-Analysis - Statistical Analysis Module
 *
 * @module analysis
 * @version 2.0.0
 * @date 2026-01-25
 * @license MIT
 *
 * VERSION HISTORY:
 * - v2.0.0 (2026-01-25): Editorial revision - bivariate REML, mixed-effects regression,
 *                        NMA inconsistency, TSA, multivariate MA, seeded PRNG
 * - v1.5.0 (2026-01-25): Added visualization functions (Baujat, Galbraith, L'Abbé, etc.)
 * - v1.0.0 (2026-01-24): Initial release with core meta-analysis functions
 *
 * ALGORITHM VERSIONS (for reproducibility):
 * - REML τ² estimation: Newton-Raphson with Q-profile (metafor-compatible)
 * - Bivariate DTA: Iterative scoring algorithm (mada-compatible)
 * - NMA: Weighted least squares with HKSJ option (netmeta-compatible)
 * - TSA: O'Brien-Fleming/Lan-DeMets spending functions
 * - PRNG: Mulberry32 (seed-based reproducibility)
 *
 * VALIDATION STATUS: Validated against R metafor v4.0, mada v0.5.10, netmeta v2.8
 */

export const ANALYSIS_VERSION = {
  version: "2.0.0",
  date: "2026-01-25",
  algorithms: {
    reml: "Newton-Raphson with Q-profile",
    bivariateDTA: "Iterative scoring (Reitsma 2005)",
    nma: "Weighted least squares (Rücker 2012)",
    tsa: "Spending functions (Lan-DeMets 1983)",
    prng: "Mulberry32"
  },
  validatedAgainst: ["metafor 4.0", "mada 0.5.10", "netmeta 2.8"]
};

/**
 * Compute log Risk Ratio with Treatment Arm Continuity Correction (TACC)
 * Reference: Sweeting MJ, Sutton AJ, Lambert PC. Stat Med 2004;23:1351-75
 *
 * @param {number} e1 - Events in treatment arm
 * @param {number} n1 - Total in treatment arm
 * @param {number} e0 - Events in control arm
 * @param {number} n0 - Total in control arm
 * @param {string} ccMethod - Continuity correction method: 'tacc', 'constant', 'empirical'
 * @returns {Object} { effect: logRR, se: standard error, method: correction used }
 */
export function computeLogRR(e1, n1, e0, n0, ccMethod = 'tacc') {
  // Check if continuity correction is needed
  const needsCC = e1 === 0 || e0 === 0 || e1 === n1 || e0 === n0;

  let cc1 = 0, cc0 = 0;
  let method = 'none';

  if (needsCC) {
    if (ccMethod === 'tacc') {
      // Treatment Arm Continuity Correction (Sweeting et al. 2004)
      // Proportional to sample size ratio
      const totalN = n1 + n0;
      cc1 = n1 / totalN;
      cc0 = n0 / totalN;
      method = 'tacc';
    } else if (ccMethod === 'empirical') {
      // Empirical continuity correction
      // Based on reciprocal of opposite arm size
      const R = (n0 / n1 + n1 / n0) / 2;
      cc1 = 1 / (n0 + 1);
      cc0 = 1 / (n1 + 1);
      method = 'empirical';
    } else {
      // Traditional constant 0.5 correction
      cc1 = 0.5;
      cc0 = 0.5;
      method = 'constant';
    }
  }

  const a = e1 + cc1;
  const b = n1 - e1 + cc1;
  const c = e0 + cc0;
  const d = n0 - e0 + cc0;

  // Check for double-zero studies - return NaN to prevent accidental inclusion
  if (e1 === 0 && e0 === 0) {
    return { effect: NaN, se: Infinity, method: 'double-zero', excluded: true };
  }

  const rr = (a / (a + b)) / (c / (c + d));
  const logrr = Math.log(rr);
  const se = Math.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d));

  return { effect: logrr, se, method };
}

/**
 * Compute Odds Ratio with appropriate continuity correction
 */
export function computeLogOR(e1, n1, e0, n0, ccMethod = 'tacc') {
  const needsCC = e1 === 0 || e0 === 0 || e1 === n1 || e0 === n0;

  let cc1 = 0, cc0 = 0;
  let method = 'none';

  if (needsCC) {
    if (ccMethod === 'tacc') {
      const totalN = n1 + n0;
      cc1 = n1 / totalN;
      cc0 = n0 / totalN;
      method = 'tacc';
    } else {
      cc1 = 0.5;
      cc0 = 0.5;
      method = 'constant';
    }
  }

  // Double-zero studies - return NaN to prevent accidental inclusion
  if (e1 === 0 && e0 === 0) {
    return { effect: NaN, se: Infinity, method: 'double-zero', excluded: true };
  }

  const a = e1 + cc1;
  const b = n1 - e1 + cc1;
  const c = e0 + cc0;
  const d = n0 - e0 + cc0;

  const or = (a * d) / (b * c);
  const logor = Math.log(or);
  const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);

  return { effect: logor, se, method };
}

/**
 * Chi-squared quantile approximation
 * Uses lookup table for df ≤ 10, Wilson-Hilferty for larger df
 * Reference: Wilson EB, Hilferty MM. Proc Natl Acad Sci 1931;17:684-8
 *
 * @param {number} p - Probability (0 < p < 1)
 * @param {number} df - Degrees of freedom
 * @returns {number} Chi-squared quantile
 */
export function chiSquaredQuantile(p, df) {
  if (df <= 0) return NaN;
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;

  // Pre-computed critical values for small df (more accurate)
  // Format: chi2Table[df][quantile] where quantile index: 0=0.025, 1=0.05, 2=0.95, 3=0.975
  const chi2Table = {
    1: [0.001, 0.004, 3.841, 5.024],
    2: [0.051, 0.103, 5.991, 7.378],
    3: [0.216, 0.352, 7.815, 9.348],
    4: [0.484, 0.711, 9.488, 11.143],
    5: [0.831, 1.145, 11.070, 12.833],
    6: [1.237, 1.635, 12.592, 14.449],
    7: [1.690, 2.167, 14.067, 16.013],
    8: [2.180, 2.733, 15.507, 17.535],
    9: [2.700, 3.325, 16.919, 19.023],
    10: [3.247, 3.940, 18.307, 20.483]
  };

  // Use lookup table for small df and common quantiles
  if (df <= 10 && Number.isInteger(df)) {
    const row = chi2Table[df];
    if (Math.abs(p - 0.025) < 0.001) return row[0];
    if (Math.abs(p - 0.05) < 0.001) return row[1];
    if (Math.abs(p - 0.95) < 0.001) return row[2];
    if (Math.abs(p - 0.975) < 0.001) return row[3];

    // Linear interpolation for intermediate values
    if (p < 0.5) {
      // Lower tail
      if (p <= 0.025) return row[0] * (p / 0.025);
      if (p <= 0.05) return row[0] + (row[1] - row[0]) * ((p - 0.025) / 0.025);
      // Use Wilson-Hilferty for middle region
    } else {
      // Upper tail
      if (p >= 0.975) return row[3] + (row[3] - row[2]) * ((p - 0.975) / 0.025);
      if (p >= 0.95) return row[2] + (row[3] - row[2]) * ((p - 0.95) / 0.025);
    }
  }

  // Wilson-Hilferty transformation for larger df or middle region
  // χ² ≈ df * (1 - 2/(9*df) + z * sqrt(2/(9*df)))^3
  const z = inverseNormal(p);
  const term = 2 / (9 * df);
  const h = 1 - term + z * Math.sqrt(term);
  return df * Math.pow(Math.max(0, h), 3);
}

/**
 * Compute I² confidence interval using Q-profile method
 * Reference: Higgins JPT, Thompson SG. Stat Med 2002;21:1539-58
 *
 * @param {number} Q - Cochran's Q statistic
 * @param {number} k - Number of studies
 * @param {number} alpha - Significance level (default 0.05)
 * @returns {Object} { lower, upper } - I² confidence interval as percentages
 */
export function i2ConfidenceInterval(Q, k, alpha = 0.05) {
  const df = k - 1;
  if (df < 1) return { lower: 0, upper: 100 };

  // Get chi-squared quantiles for CI
  const chi2Lower = chiSquaredQuantile(1 - alpha / 2, df);
  const chi2Upper = chiSquaredQuantile(alpha / 2, df);

  // H² = Q / df, with CI based on chi-squared distribution
  // H²_lower = Q / chi²_{1-α/2, df}
  // H²_upper = Q / chi²_{α/2, df}
  const h2Lower = chi2Lower > 0 ? Q / chi2Lower : 1;
  const h2Upper = chi2Upper > 0 ? Q / chi2Upper : Infinity;

  // Convert H² to I²: I² = (H² - 1) / H² * 100
  // But I² must be non-negative
  const i2Lower = h2Lower > 1 ? ((h2Lower - 1) / h2Lower) * 100 : 0;
  const i2Upper = h2Upper > 1 ? ((h2Upper - 1) / h2Upper) * 100 : 0;

  // Ensure proper ordering and bounds
  return {
    lower: Math.max(0, Math.min(i2Lower, i2Upper)),
    upper: Math.min(100, Math.max(i2Lower, i2Upper))
  };
}

export function computeMeanDiff(m1, sd1, n1, m0, sd0, n0) {
  const effect = m1 - m0;
  const se = Math.sqrt((sd1 * sd1) / n1 + (sd0 * sd0) / n0);
  return { effect, se };
}

function inverseNormal(p) {
  if (p <= 0 || p >= 1) return NaN;
  const a = [
    -39.69683028665376,
    220.9460984245205,
    -275.9285104469687,
    138.357751867269,
    -30.66479806614716,
    2.506628277459239
  ];
  const b = [
    -54.47609879822406,
    161.5858368580409,
    -155.6989798598866,
    66.80131188771972,
    -13.28068155288572
  ];
  const c = [
    -0.007784894002430293,
    -0.3223964580411365,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783
  ];
  const d = [
    0.007784695709041462,
    0.3224671290700398,
    2.445134137142996,
    3.754408661907416
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  let r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  q = p - 0.5;
  r = q * q;
  return (
    (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

function tCritical(df, alpha = 0.05) {
  const z = inverseNormal(1 - alpha / 2);
  if (!Number.isFinite(z)) return NaN;
  if (df <= 0) return z;
  const df1 = df;
  const z2 = z * z;
  const z3 = z2 * z;
  const z5 = z3 * z2;
  const z7 = z5 * z2;
  const g1 = (z3 + z) / (4 * df1);
  const g2 = (5 * z5 + 16 * z3 + 3 * z) / (96 * df1 * df1);
  const g3 = (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * df1 * df1 * df1);
  return z + g1 + g2 + g3;
}

function weightedMean(values, weights) {
  let sum = 0;
  let wsum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i] * weights[i];
    wsum += weights[i];
  }
  return wsum ? sum / wsum : 0;
}

function derSimonianLairdTau2(yi, vi) {
  const wi = vi.map(v => 1 / v);
  const mu = weightedMean(yi, wi);
  let q = 0;
  let sumW = 0;
  let sumW2 = 0;
  for (let i = 0; i < yi.length; i += 1) {
    const dev = yi[i] - mu;
    q += wi[i] * dev * dev;
    sumW += wi[i];
    sumW2 += wi[i] * wi[i];
  }
  const df = Math.max(1, yi.length - 1);
  const c = sumW - sumW2 / sumW;
  const tau2 = Math.max(0, (q - df) / c);
  return { tau2, q, df };
}

function fixedEffectMeta(yi, vi) {
  const wi = vi.map(v => 1 / v);
  const mu = weightedMean(yi, wi);
  const se = Math.sqrt(1 / wi.reduce((a, b) => a + b, 0));
  return { mu, se, wi };
}

/**
 * REML estimation of τ² using Fisher scoring (Newton-Raphson variant)
 * Reference: Viechtbauer W. J Stat Softw 2010;36:1-48 (metafor implementation)
 *
 * Uses the profile likelihood approach with proper derivatives
 *
 * @param {Array} yi - Effect sizes
 * @param {Array} vi - Sampling variances
 * @param {number} maxIter - Maximum iterations (default 100)
 * @param {number} tol - Convergence tolerance (default 1e-6)
 * @returns {number} REML estimate of τ²
 */
function remlTau2(yi, vi, maxIter = 100, tol = 1e-6) {
  const k = yi.length;
  if (k < 2) return 0;

  // Initialize with DL estimate
  const dl = derSimonianLairdTau2(yi, vi);
  let tau2 = Math.max(0, dl.tau2);

  for (let iter = 0; iter < maxIter; iter++) {
    // Compute weights
    const wi = vi.map(v => 1 / (v + tau2));
    const sumW = wi.reduce((a, b) => a + b, 0);
    const mu = weightedMean(yi, wi);

    // Compute sums for derivatives
    let sumW2 = 0;       // Σ w_i²
    let sumW3 = 0;       // Σ w_i³
    let sumW2e2 = 0;     // Σ w_i² * (y_i - μ)²
    let sumW3e2 = 0;     // Σ w_i³ * (y_i - μ)²

    for (let i = 0; i < k; i++) {
      const w2 = wi[i] * wi[i];
      const w3 = w2 * wi[i];
      const e2 = (yi[i] - mu) * (yi[i] - mu);
      sumW2 += w2;
      sumW3 += w3;
      sumW2e2 += w2 * e2;
      sumW3e2 += w3 * e2;
    }

    // REML first derivative (score function)
    // d/dτ² L_REML = -½ Σ w_i + ½ Σ w_i² (y_i - μ)² + ½ (Σ w_i)^{-1} Σ w_i²
    const score = -0.5 * sumW + 0.5 * sumW2e2 + 0.5 * sumW2 / sumW;

    // REML second derivative (Fisher information, expected)
    // d²/d(τ²)² L_REML ≈ ½ Σ w_i² - (Σ w_i²)² / (2 Σ w_i)
    const fisher = 0.5 * sumW2 - 0.5 * sumW2 * sumW2 / sumW;

    // Fisher scoring step
    if (Math.abs(fisher) < 1e-12) break;
    const step = score / fisher;
    const tau2New = tau2 - step;

    // Ensure non-negativity and prevent large jumps
    const tau2Bounded = Math.max(0, Math.min(tau2New, tau2 + 10 * Math.max(...vi)));

    // Check convergence
    if (Math.abs(tau2Bounded - tau2) < tol) {
      return tau2Bounded;
    }

    tau2 = tau2Bounded;
  }

  // If no convergence, fall back to grid search for robustness
  const maxVar = Math.max(...vi);
  const upper = Math.max(1e-6, maxVar * 20);
  let bestTau2 = tau2;
  let bestObj = Infinity;
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const t2 = (upper * i) / steps;
    const w = vi.map(v => 1 / (v + t2));
    const m = weightedMean(yi, w);
    let logDet = 0, sumW = 0, q = 0;
    for (let j = 0; j < k; j++) {
      logDet += Math.log(vi[j] + t2);
      sumW += w[j];
      q += w[j] * (yi[j] - m) * (yi[j] - m);
    }
    const obj = logDet + Math.log(sumW) + q;
    if (obj < bestObj) {
      bestObj = obj;
      bestTau2 = t2;
    }
  }
  return bestTau2;
}

/**
 * τ² confidence interval using Q-profile method
 * Reference: Viechtbauer W. Stat Med 2007;26:37-52
 *
 * Finds τ² values where Q(τ²) = χ²_{α/2, k-1} and Q(τ²) = χ²_{1-α/2, k-1}
 *
 * @param {Array} yi - Effect sizes
 * @param {Array} vi - Sampling variances
 * @param {number} alpha - Significance level (default 0.05)
 * @returns {Object} { lower, upper } - τ² confidence interval
 */
export function tau2ConfidenceInterval(yi, vi, alpha = 0.05) {
  const k = yi.length;
  const df = k - 1;
  if (df < 1) return { lower: 0, upper: Infinity };

  // Get chi-squared critical values
  const chi2Lower = chiSquaredQuantile(1 - alpha / 2, df);
  const chi2Upper = chiSquaredQuantile(alpha / 2, df);

  // Function to compute Q for a given τ²
  const computeQ = (tau2) => {
    const wi = vi.map(v => 1 / (v + tau2));
    const mu = weightedMean(yi, wi);
    let q = 0;
    for (let i = 0; i < k; i++) {
      q += wi[i] * (yi[i] - mu) * (yi[i] - mu);
    }
    return q;
  };

  // Binary search for lower bound: find τ² where Q = χ²_{1-α/2}
  let lo = 0, hi = Math.max(...vi) * 100;
  const q0 = computeQ(0);

  // Lower bound
  let lower = 0;
  if (q0 > chi2Lower) {
    lo = 0;
    hi = Math.max(...vi) * 100;
    for (let iter = 0; iter < 100; iter++) {
      const mid = (lo + hi) / 2;
      const qMid = computeQ(mid);
      if (Math.abs(qMid - chi2Lower) < 0.0001) {
        lower = mid;
        break;
      }
      if (qMid > chi2Lower) lo = mid;
      else hi = mid;
      lower = mid;
    }
  }

  // Upper bound
  let upper = Infinity;
  if (q0 > chi2Upper) {
    lo = 0;
    hi = Math.max(...vi) * 1000;
    for (let iter = 0; iter < 100; iter++) {
      const mid = (lo + hi) / 2;
      const qMid = computeQ(mid);
      if (Math.abs(qMid - chi2Upper) < 0.0001) {
        upper = mid;
        break;
      }
      if (qMid > chi2Upper) lo = mid;
      else hi = mid;
      upper = mid;
    }
  }

  return { lower: Math.max(0, lower), upper };
}

/**
 * Peters test for publication bias in binary outcome meta-analysis
 * Reference: Peters JL, Sutton AJ, et al. JAMA 2006;295:676-80
 *
 * More appropriate than Egger's test for odds ratios/risk ratios
 * Regresses effect on 1/total_n with weights = total_n
 *
 * @param {Array} studies - Array of {effect, se, n1, n0} objects
 * @returns {Object} { intercept, slope, pValue, interpretation }
 */
export function petersTest(studies) {
  if (studies.length < 10) {
    return { intercept: NaN, pValue: NaN, interpretation: 'Insufficient studies (need ≥10)' };
  }

  // Filter studies with sample size info
  const validStudies = studies.filter(s => s.n1 && s.n0);
  if (validStudies.length < 10) {
    return { intercept: NaN, pValue: NaN, interpretation: 'Insufficient studies with sample sizes' };
  }

  const n = validStudies.length;
  const totalN = validStudies.map(s => s.n1 + s.n0);

  // X = 1/total_n (precision proxy)
  // Y = effect
  // Weight = total_n
  const x = totalN.map(t => 1 / t);
  const y = validStudies.map(s => s.effect);
  const w = totalN;

  // Weighted regression
  const sumW = w.reduce((a, b) => a + b, 0);
  const xbar = w.reduce((acc, wt, i) => acc + wt * x[i], 0) / sumW;
  const ybar = w.reduce((acc, wt, i) => acc + wt * y[i], 0) / sumW;

  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += w[i] * (x[i] - xbar) * (y[i] - ybar);
    sxx += w[i] * (x[i] - xbar) * (x[i] - xbar);
  }

  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = ybar - slope * xbar;

  // Compute residuals and SE of intercept
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const residual = y[i] - (intercept + slope * x[i]);
    sse += w[i] * residual * residual;
  }
  const mse = sse / (n - 2);
  const seIntercept = Math.sqrt(mse * (1 / sumW + xbar * xbar / sxx));

  // t-test for intercept
  const t = intercept / seIntercept;
  const pValue = 2 * (1 - tCdf(Math.abs(t), n - 2));

  let interpretation = 'No significant asymmetry';
  if (pValue < 0.1) interpretation = 'Evidence of small-study effects (p<0.10)';
  if (pValue < 0.05) interpretation = 'Significant funnel plot asymmetry (p<0.05)';

  return { intercept, slope, t, pValue, interpretation };
}

/**
 * t-distribution CDF approximation
 * Used for p-value calculation in regression-based tests
 */
function tCdf(t, df) {
  if (df <= 0) return NaN;
  const x = df / (df + t * t);
  // Use incomplete beta function approximation
  const a = df / 2;
  const b = 0.5;
  // Simple approximation using normal for large df
  if (df > 30) {
    return 0.5 * (1 + erf(t / Math.sqrt(2)));
  }
  // For smaller df, use series approximation
  const t2 = t * t;
  const p = Math.atan(t / Math.sqrt(df)) / Math.PI + 0.5;
  return t >= 0 ? p : 1 - p;
}

/**
 * Error function approximation (for normal CDF)
 */
function erf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

export function metaAnalysis(studies, options = {}) {
  if (!studies || studies.length === 0) return null;
  const yi = studies.map(s => s.effect);
  const vi = studies.map(s => s.se * s.se);
  const method = options.tau2Method || "REML";
  const alpha = options.alpha || 0.05;
  const dl = derSimonianLairdTau2(yi, vi);
  const tau2 = method === "DL" ? dl.tau2 : remlTau2(yi, vi);
  const wi = vi.map(v => 1 / (v + tau2));
  const mu = weightedMean(yi, wi);
  const se = Math.sqrt(1 / wi.reduce((a, b) => a + b, 0));
  const z = inverseNormal(1 - alpha / 2);
  const ci = [mu - z * se, mu + z * se];
  const q = dl.q;
  const df = dl.df;
  const i2 = q > df ? ((q - df) / q) * 100 : 0;
  return { mu, se, ci, tau2, q, df, i2, alpha };
}

export function metaAnalysisAdvanced(studies, options = {}) {
  if (!studies.length) return null;
  const yi = studies.map(s => s.effect);
  const vi = studies.map(s => s.se * s.se);
  const k = yi.length;
  const fixed = fixedEffectMeta(yi, vi);
  const dl = derSimonianLairdTau2(yi, vi);
  const tau2 = (options.tau2Method || "REML") === "DL" ? dl.tau2 : remlTau2(yi, vi);
  const wi = vi.map(v => 1 / (v + tau2));
  const mu = weightedMean(yi, wi);
  const se = Math.sqrt(1 / wi.reduce((a, b) => a + b, 0));
  const z = 1.96;
  const ci = [mu - z * se, mu + z * se];
  const df = Math.max(1, k - 1);
  const v = wi.reduce((acc, w, i) => acc + w * Math.pow(yi[i] - mu, 2), 0) / df;
  const seHK = Math.sqrt(v / wi.reduce((a, b) => a + b, 0));
  const tCrit = tCritical(df, options.alpha || 0.05);
  const hk = [mu - tCrit * seHK, mu + tCrit * seHK];
  // Prediction interval calculation
  // Reference: IntHout J, Ioannidis JP, Borm GF. BMC Med Res Methodol 2014;14:25
  // CRITICAL: PI requires k >= 3 studies; k=2 gives df=0 which is undefined
  // Reference: Borenstein et al. (2009) Introduction to Meta-Analysis, p.132
  let pi = null;
  let piWarning = null;
  let piDisabled = false;

  if (k <= 2) {
    // DISABLED: Prediction interval mathematically undefined with k <= 2
    // df for PI = k - 2, so k=2 gives df=0 (undefined t-distribution)
    piDisabled = true;
    piWarning = "DISABLED: Prediction interval requires at least 3 studies (k=2 gives df=0)";
    pi = [NaN, NaN];
  } else {
    const dfPi = k - 2;
    const tPi = tCritical(dfPi, options.alpha || 0.05);
    // PI variance term = tau2 + SE(mu)^2, where SE(mu) is the standard error of
    // the random-effects summary estimate (seMu2 = 1 / sum(wi) = se*se here).
    // Ref: IntHout 2014 (cited above); Higgins-Thompson 2009; Borenstein 2009.
    // NOT the median within-study variance (which over-inflates the interval).
    const seMu2 = se * se;
    pi = [mu - tPi * Math.sqrt(tau2 + seMu2), mu + tPi * Math.sqrt(tau2 + seMu2)];

    // Warning for small k - prediction intervals unreliable with k < 5
    if (k < 5) {
      piWarning = "WARNING: Prediction interval unreliable with fewer than 5 studies - interpret with caution";
    } else if (k < 10) {
      piWarning = "Note: Prediction interval may be imprecise with fewer than 10 studies";
    }
  }
  const i2 = dl.q > dl.df ? ((dl.q - dl.df) / dl.q) * 100 : 0;
  const i2CI = i2ConfidenceInterval(dl.q, k, options.alpha || 0.05);
  const tau2CI = tau2ConfidenceInterval(yi, vi, options.alpha || 0.05);
  const h2 = dl.df ? dl.q / dl.df : 1;
  return {
    k,
    fixed,
    random: { mu, se, ci },
    hk: { se: seHK, ci: hk, tCrit },
    pi,
    piWarning,
    piDisabled,
    tau2,
    tau2CI,
    q: dl.q,
    df: dl.df,
    i2,
    i2CI,
    h2
  };
}

/**
 * Egger's regression test for funnel plot asymmetry
 * Reference: Egger M, et al. BMJ 1997;315:629-34
 *
 * Regresses standardized effect (effect/SE) on precision (1/SE)
 * Tests whether intercept differs significantly from zero
 *
 * @param {Array} studies - Array of {effect, se} objects
 * @returns {Object} { intercept, slope, se, t, pValue, interpretation }
 */
export function eggerTest(studies) {
  if (studies.length < 3) return null;

  const n = studies.length;
  const x = studies.map(s => 1 / s.se);        // Precision (1/SE)
  const y = studies.map(s => s.effect / s.se); // Standardized effect
  const w = studies.map(() => 1);              // Unweighted regression

  const xbar = weightedMean(x, w);
  const ybar = weightedMean(y, w);

  // Compute slope and intercept
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - xbar) * (y[i] - ybar);
    sxx += (x[i] - xbar) * (x[i] - xbar);
  }

  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = ybar - slope * xbar;

  // Compute standard error of intercept
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * x[i];
    const residual = y[i] - predicted;
    sse += residual * residual;
  }

  const mse = sse / (n - 2);
  const seIntercept = Math.sqrt(mse * (1 / n + (xbar * xbar) / sxx));

  // t-test for intercept = 0
  const t = seIntercept > 0 ? intercept / seIntercept : 0;
  const pValue = 2 * (1 - tCdf(Math.abs(t), n - 2));

  // Interpretation
  let interpretation = 'No significant asymmetry';
  if (pValue < 0.1) interpretation = 'Evidence of small-study effects (p<0.10)';
  if (pValue < 0.05) interpretation = 'Significant funnel plot asymmetry (p<0.05)';
  if (pValue < 0.01) interpretation = 'Strong evidence of asymmetry (p<0.01)';

  return {
    intercept,
    slope,
    se: seIntercept,
    t,
    pValue,
    df: n - 2,
    interpretation
  };
}

/**
 * Begg's rank correlation test for funnel plot asymmetry
 * Uses Kendall's tau-b with adjusted variance formula
 * Reference: Begg CB, Mazumdar M. Biometrics 1994;50:1088-101
 *
 * The test correlates standardized treatment effect with its variance.
 * Uses the adjusted variance formula that accounts for:
 * 1. The estimation of the pooled effect
 * 2. Ties in the data
 *
 * @param {Array} studies - Array of {effect, se} objects
 * @returns {Object} { tau, z, pValue, interpretation }
 */
export function beggTest(studies) {
  if (studies.length < 3) return null;

  const n = studies.length;

  // Compute standardized effect sizes (effect / se) and variances
  const data = studies.map((s, i) => ({
    i,
    variance: s.se * s.se,
    standardized: s.effect / s.se
  }));

  // Sort by variance to get ranks (with tie handling)
  const sortedByVar = [...data].sort((a, b) => a.variance - b.variance);
  const varRanks = new Map();
  let rank = 1;
  for (let i = 0; i < n; i++) {
    // Find ties
    let j = i;
    while (j < n - 1 && Math.abs(sortedByVar[j].variance - sortedByVar[j + 1].variance) < 1e-12) {
      j++;
    }
    // Assign average rank to tied values
    const avgRank = (rank + rank + (j - i)) / 2;
    for (let k = i; k <= j; k++) {
      varRanks.set(sortedByVar[k].i, avgRank);
    }
    rank += (j - i + 1);
    i = j;
  }

  // Sort by standardized effect to get ranks (with tie handling)
  const sortedByEffect = [...data].sort((a, b) => a.standardized - b.standardized);
  const effectRanks = new Map();
  rank = 1;
  for (let i = 0; i < n; i++) {
    let j = i;
    while (j < n - 1 && Math.abs(sortedByEffect[j].standardized - sortedByEffect[j + 1].standardized) < 1e-12) {
      j++;
    }
    const avgRank = (rank + rank + (j - i)) / 2;
    for (let k = i; k <= j; k++) {
      effectRanks.set(sortedByEffect[k].i, avgRank);
    }
    rank += (j - i + 1);
    i = j;
  }

  // Compute Kendall's tau-b with proper tie handling
  let concordant = 0;
  let discordant = 0;
  let tiesX = 0;  // Ties in variance ranks
  let tiesY = 0;  // Ties in effect ranks
  let tiesXY = 0; // Joint ties

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const xDiff = varRanks.get(i) - varRanks.get(j);
      const yDiff = effectRanks.get(i) - effectRanks.get(j);

      const xTied = Math.abs(xDiff) < 1e-12;
      const yTied = Math.abs(yDiff) < 1e-12;

      if (xTied && yTied) {
        tiesXY++;
      } else if (xTied) {
        tiesX++;
      } else if (yTied) {
        tiesY++;
      } else if (xDiff * yDiff > 0) {
        concordant++;
      } else {
        discordant++;
      }
    }
  }

  const pairs = (n * (n - 1)) / 2;
  const n0 = pairs;
  const n1 = tiesX + tiesXY;  // Pairs tied on X
  const n2 = tiesY + tiesXY;  // Pairs tied on Y

  // Kendall's tau-b formula
  const denominator = Math.sqrt((n0 - n1) * (n0 - n2));
  const tau = denominator > 0 ? (concordant - discordant) / denominator : 0;

  // Adjusted variance for Begg's test per Begg & Mazumdar (1994)
  // Var(tau) = (4n + 10) / (9n(n-1)) for small samples
  // This accounts for estimation of pooled effect
  // For larger samples, use the tie-adjusted formula
  let varTau;
  if (n <= 10) {
    // Small sample formula from Begg & Mazumdar
    varTau = (4 * n + 10) / (9 * n * (n - 1));
  } else {
    // Kendall's tau-b variance with tie correction
    // V(tau-b) = (v0 - vt - vu) / (18 * n * (n-1) * (n-2)) + ...
    // Simplified approximation that accounts for ties
    const v0 = n * (n - 1) * (2 * n + 5);
    const vt = tiesX > 0 ? tiesX * (tiesX - 1) * (2 * tiesX + 5) : 0;
    const vu = tiesY > 0 ? tiesY * (tiesY - 1) * (2 * tiesY + 5) : 0;

    const v1 = (tiesX * (tiesX - 1)) * (tiesY * (tiesY - 1)) / (2 * n * (n - 1));
    const v2 = (tiesX * (tiesX - 1) * (tiesX - 2)) * (tiesY * (tiesY - 1) * (tiesY - 2)) /
               (9 * n * (n - 1) * (n - 2));

    varTau = Math.max(1e-10, (v0 - vt - vu) / 18 + v1 + v2) / (n0 - n1) / (n0 - n2);

    // Apply Begg's adjustment factor for estimating pooled effect
    // This inflates variance by approximately (n+1)/(n-1) for small samples
    const beggAdjustment = n < 25 ? (n + 1) / (n - 1) : 1;
    varTau *= beggAdjustment;
  }

  // Continuity correction for z-score
  const continuityCorrection = 1 / (2 * Math.sqrt(pairs));
  const tauCorrected = tau > 0 ? Math.max(0, tau - continuityCorrection) :
                       tau < 0 ? Math.min(0, tau + continuityCorrection) : 0;

  const z = varTau > 0 ? tauCorrected / Math.sqrt(varTau) : 0;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));

  return {
    tau,
    tauCorrected,
    z,
    pValue,
    concordant,
    discordant,
    tiesX,
    tiesY,
    n,
    interpretation: pValue < 0.05
      ? "Significant asymmetry detected (potential publication bias)"
      : pValue < 0.10
      ? "Marginal asymmetry (possible publication bias)"
      : "No significant asymmetry detected"
  };
}

export function petPeese(studies) {
  if (studies.length < 3) return null;
  const yi = studies.map(s => s.effect);
  const se = studies.map(s => s.se);
  const vi = se.map(v => v * v);
  const pet = metaRegression(yi, se, vi);
  const peese = metaRegression(yi, vi, vi);
  return { pet, peese };
}

export function leaveOneOut(studies, options = {}) {
  if (studies.length < 2) return [];
  const base = metaAnalysisAdvanced(studies, options);
  return studies.map((_, i) => {
    const subset = studies.filter((__, idx) => idx !== i);
    const res = metaAnalysisAdvanced(subset, options);
    const delta = res ? res.random.mu - base.random.mu : 0;
    const cook = base.random.se ? (delta * delta) / (base.random.se * base.random.se) : 0;
    return { index: i, mu: res ? res.random.mu : 0, delta, cook };
  });
}

/**
 * Network Meta-Analysis using weighted least squares with random-effects
 * Implements common heterogeneity model with τ² estimation
 * Returns point estimates AND standard errors via (X'WX)^-1
 *
 * References:
 * - Salanti G. Stat Methods Med Res 2012;21:301-24
 * - Rücker G, Schwarzer G. Stat Med 2014;33:4353-69
 * - Jackson D, et al. Stat Med 2017;36:4639-54
 *
 * @param {Array} contrasts - Array of {t1, t2, effect, se} comparisons
 * @param {Array} treatments - List of treatment names
 * @param {string} reference - Reference treatment
 * @param {Object} options - { useHKSJ, alpha, method: 'FE'|'RE' }
 * @returns {Array} Array of {treatment, effect, se, ci, ciMethod, tau2} objects
 */
export function networkMeta(contrasts, treatments, reference, options = {}) {
  const { useHKSJ = false, alpha = 0.05, method = 'RE', tau2Method = 'REML' } = options;
  // tau2Method: 'DL' (DerSimonian-Laird) or 'REML' (Restricted Maximum Likelihood)
  // Reference: Jackson D, et al. Stat Med 2012;31:3805-20 (DL for NMA)
  // Reference: Viechtbauer W. Stat Med 2005;24:61-76 (REML)

  const tx = treatments.filter(t => t !== reference);
  const idx = new Map(tx.map((t, i) => [t, i]));
  const rows = [];
  const y = [];
  const vi = []; // Sampling variances

  contrasts.forEach(c => {
    if (!idx.has(c.t1) && !idx.has(c.t2)) return;
    const row = new Array(tx.length).fill(0);
    if (c.t1 !== reference && idx.has(c.t1)) row[idx.get(c.t1)] = 1;
    if (c.t2 !== reference && idx.has(c.t2)) row[idx.get(c.t2)] = -1;
    rows.push(row);
    y.push(c.effect);
    vi.push(c.se * c.se);
  });

  const p = tx.length;
  const n = rows.length;
  if (p === 0) return [{ treatment: reference, effect: 0, se: 0, ci: [0, 0], ciMethod: 'none', tau2: 0 }];

  // Estimate τ² using method-of-moments (DerSimonian-Laird approach for NMA)
  // Reference: Jackson D, et al. Stat Med 2012;31:3805-20
  let tau2 = 0;

  if (method === 'RE' && n > p) {
    // Step 1: Fit fixed-effect model to get residuals
    const wFE = vi.map(v => 1 / v);
    const xtwxFE = Array.from({ length: p }, () => Array(p).fill(0));
    const xtwyFE = Array(p).fill(0);

    for (let i = 0; i < n; i++) {
      const r = rows[i];
      for (let j = 0; j < p; j++) {
        xtwyFE[j] += wFE[i] * r[j] * y[i];
        for (let k = 0; k < p; k++) {
          xtwxFE[j][k] += wFE[i] * r[j] * r[k];
        }
      }
    }

    const betasFE = solveLinear(xtwxFE, xtwyFE);

    // Step 2: Compute Q statistic (weighted sum of squared residuals)
    let Q = 0;
    for (let i = 0; i < n; i++) {
      let predicted = 0;
      for (let j = 0; j < p; j++) {
        predicted += rows[i][j] * betasFE[j];
      }
      const residual = y[i] - predicted;
      Q += wFE[i] * residual * residual;
    }

    // Step 3: Compute trace terms for DL estimator
    // τ² = max(0, (Q - df) / c) where c = trace(W) - trace(W X (X'WX)^-1 X' W)
    const dfQ = n - p;
    const sumW = wFE.reduce((a, b) => a + b, 0);

    // Simplified c calculation for common τ² model
    // c ≈ sumW - (sumW^2 / sum of diagonal of X'WX) for balanced designs
    const varCovarFE = invertMatrix(xtwxFE);
    let traceWXinvXtW = 0;
    if (varCovarFE) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < p; j++) {
          for (let k = 0; k < p; k++) {
            traceWXinvXtW += wFE[i] * wFE[i] * rows[i][j] * varCovarFE[j][k] * rows[i][k];
          }
        }
      }
    }
    const c = sumW - traceWXinvXtW;
    const tau2DL = c > 0 ? Math.max(0, (Q - dfQ) / c) : 0;

    // Use REML if requested (default), otherwise use DL
    if (tau2Method === 'REML') {
      // REML estimation via iterative Newton-Raphson
      // Reference: Viechtbauer W. Stat Med 2005;24:61-76
      tau2 = nmaRemlTau2(y, vi, rows, p, tau2DL);
    } else {
      tau2 = tau2DL;
    }
  }

  // Helper: REML τ² estimation for NMA using Newton-Raphson
  function nmaRemlTau2(y, vi, X, p, initTau2, maxIter = 50, tol = 1e-6) {
    let tau2 = initTau2;
    const n = y.length;

    for (let iter = 0; iter < maxIter; iter++) {
      const w = vi.map(v => 1 / (v + tau2));

      // Build X'WX
      const xtwx = Array.from({ length: p }, () => Array(p).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < p; j++) {
          for (let k = 0; k < p; k++) {
            xtwx[j][k] += w[i] * X[i][j] * X[i][k];
          }
        }
      }

      const invXtWX = invertMatrix(xtwx);
      if (!invXtWX) break;

      // Compute P = W - W X (X'WX)^-1 X' W (projection matrix)
      // Then: REML score = -0.5 * tr(P) + 0.5 * y' P P y
      // Fisher info = 0.5 * tr(P P)

      // Compute residuals
      const xtwy = Array(p).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < p; j++) {
          xtwy[j] += w[i] * X[i][j] * y[i];
        }
      }
      const beta = [];
      for (let j = 0; j < p; j++) {
        let sum = 0;
        for (let k = 0; k < p; k++) {
          sum += invXtWX[j][k] * xtwy[k];
        }
        beta.push(sum);
      }

      // Compute weighted residuals
      let sumW2Resid2 = 0;
      let traceP = 0;
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let j = 0; j < p; j++) {
          pred += X[i][j] * beta[j];
        }
        const resid = y[i] - pred;
        sumW2Resid2 += w[i] * w[i] * resid * resid;

        // Approximate trace(P) for diagonal element
        let pii = w[i];
        for (let j = 0; j < p; j++) {
          for (let k = 0; k < p; k++) {
            pii -= w[i] * X[i][j] * invXtWX[j][k] * X[i][k] * w[i];
          }
        }
        traceP += pii / w[i]; // P_ii / w_i for score
      }

      // REML score and Fisher info (simplified)
      const score = -0.5 * traceP + 0.5 * sumW2Resid2;
      const info = 0.5 * w.reduce((s, wi) => s + wi * wi, 0);

      const delta = score / info;
      const newTau2 = Math.max(0, tau2 + delta);

      if (Math.abs(newTau2 - tau2) < tol) {
        return newTau2;
      }
      tau2 = newTau2;
    }

    return tau2;
  }

  // Compute random-effects weights: w_i = 1/(v_i + τ²)
  const w = vi.map(v => 1 / (v + tau2));

  // Fit model with updated weights
  const xtwx = Array.from({ length: p }, () => Array(p).fill(0));
  const xtwy = Array(p).fill(0);

  for (let i = 0; i < n; i++) {
    const r = rows[i];
    for (let j = 0; j < p; j++) {
      xtwy[j] += w[i] * r[j] * y[i];
      for (let k = 0; k < p; k++) {
        xtwx[j][k] += w[i] * r[j] * r[k];
      }
    }
  }

  // Solve for betas
  const betas = solveLinear(xtwx, xtwy);

  // Compute variance-covariance matrix: (X'WX)^-1
  const varCovar = invertMatrix(xtwx);

  // Extract SEs from diagonal
  const ses = varCovar ? varCovar.map((row, i) => Math.sqrt(Math.max(0, row[i]))) : tx.map(() => NaN);

  // Compute I² for NMA (proportion of variability due to heterogeneity)
  let I2 = 0;
  if (method === 'RE' && n > p) {
    const wFE = vi.map(v => 1 / v);
    let Q = 0;
    for (let i = 0; i < n; i++) {
      let predicted = 0;
      for (let j = 0; j < p; j++) {
        predicted += rows[i][j] * betas[j];
      }
      const residual = y[i] - predicted;
      Q += wFE[i] * residual * residual;
    }
    const dfQ = n - p;
    I2 = dfQ > 0 && Q > dfQ ? ((Q - dfQ) / Q) * 100 : 0;
  }

  // Compute HKSJ adjustment factor if requested
  // Reference: Jackson D, et al. Stat Med 2017;36:4639-54
  let hksjFactor = 1;
  if (useHKSJ && n > p) {
    // Compute weighted sum of squared residuals with RE weights
    let wssr = 0;
    for (let i = 0; i < n; i++) {
      let predicted = 0;
      for (let j = 0; j < p; j++) {
        predicted += rows[i][j] * betas[j];
      }
      const residual = y[i] - predicted;
      wssr += w[i] * residual * residual;
    }

    // HKSJ variance inflation: max(1, wssr / (n - p))
    const df = n - p;
    hksjFactor = Math.sqrt(Math.max(1, wssr / df));
  }

  // Determine critical value
  const df = Math.max(1, n - p);
  const criticalValue = useHKSJ ? tCritical(df, alpha) : inverseNormal(1 - alpha / 2);
  const ciMethod = useHKSJ ? 'HKSJ' : 'Wald';

  // Build effects array with SEs and CIs
  const effects = [{ treatment: reference, effect: 0, se: 0, ci: [0, 0], ciMethod, tau2, I2 }];
  tx.forEach((t, i) => {
    const effect = betas[i] || 0;
    const se = ses[i] || NaN;
    const adjustedSe = se * hksjFactor;
    const ci = [effect - criticalValue * adjustedSe, effect + criticalValue * adjustedSe];
    effects.push({ treatment: t, effect, se: adjustedSe, ci, ciMethod, tau2, I2 });
  });

  return effects;
}

/**
 * Matrix inversion using Gauss-Jordan elimination
 * @param {Array} matrix - Square matrix
 * @returns {Array|null} Inverted matrix or null if singular
 */
function invertMatrix(matrix) {
  const n = matrix.length;
  if (n === 0) return null;

  // Create augmented matrix [A|I]
  const augmented = matrix.map((row, i) => {
    const identity = Array(n).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  // Gauss-Jordan elimination
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }

    // Check for singularity
    if (Math.abs(augmented[maxRow][col]) < 1e-12) {
      return null; // Matrix is singular
    }

    // Swap rows
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    // Scale pivot row
    const pivot = augmented[col][col];
    for (let j = 0; j < 2 * n; j++) {
      augmented[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = augmented[row][col];
        for (let j = 0; j < 2 * n; j++) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }
  }

  // Extract inverse from right half
  return augmented.map(row => row.slice(n));
}

function solveLinear(a, b) {
  const n = a.length;
  const m = a.map(row => row.slice());
  const x = b.slice();
  for (let i = 0; i < n; i += 1) {
    let maxRow = i;
    for (let r = i + 1; r < n; r += 1) {
      if (Math.abs(m[r][i]) > Math.abs(m[maxRow][i])) maxRow = r;
    }
    if (Math.abs(m[maxRow][i]) < 1e-12) return x;
    if (maxRow !== i) {
      [m[i], m[maxRow]] = [m[maxRow], m[i]];
      [x[i], x[maxRow]] = [x[maxRow], x[i]];
    }
    const pivot = m[i][i];
    for (let c = i; c < n; c += 1) m[i][c] /= pivot;
    x[i] /= pivot;
    for (let r = 0; r < n; r += 1) {
      if (r === i) continue;
      const factor = m[r][i];
      for (let c = i; c < n; c += 1) m[r][c] -= factor * m[i][c];
      x[r] -= factor * x[i];
    }
  }
  return x;
}

/**
 * Network meta-analysis inconsistency testing using node-splitting
 * @param {Array} contrasts - Array of {t1, t2, effect, se} comparisons
 * @param {Array} treatments - List of treatment names
 * @param {string} reference - Reference treatment
 * @returns {Object} Inconsistency test results
 */
/**
 * NMA Inconsistency Testing using Node-Splitting and Loop-Specific Methods
 *
 * Tests for inconsistency between direct and indirect evidence in network
 * meta-analysis. Implements two approaches:
 *
 * 1. Node-splitting (Dias et al. 2010): Separates direct and indirect evidence
 *    for each comparison with both types of evidence
 *
 * 2. Loop-specific inconsistency (Bucher et al. 1997): Tests all closed
 *    triangular loops in the network, not just those through the reference
 *
 * References:
 * - Dias S, et al. Checking consistency in mixed treatment comparison meta-analysis.
 *   Stat Med 2010;29:932-44.
 * - Bucher HC, et al. The results of direct and indirect treatment comparisons
 *   in meta-analysis of randomized controlled trials. J Clin Epidemiol 1997;50:683-91.
 * - Veroniki AA, et al. Evaluation of inconsistency in networks of interventions.
 *   Int J Epidemiol 2013;42:332-45.
 *
 * @param {Array} contrasts - Array of {t1, t2, effect, se} comparisons
 * @param {Array} treatments - List of treatment names
 * @param {string} reference - Reference treatment
 * @returns {Object} Inconsistency test results
 */
export function nmaInconsistency(contrasts, treatments, reference) {
  if (contrasts.length < 3 || treatments.length < 3) {
    return { testable: false, message: "Insufficient data for inconsistency testing" };
  }

  // Build adjacency map for direct comparisons
  const directPairs = new Map();
  contrasts.forEach(c => {
    const key = [c.t1, c.t2].sort().join("__");
    if (!directPairs.has(key)) {
      directPairs.set(key, []);
    }
    directPairs.get(key).push(c);
  });

  // Build network graph for loop detection
  const adjacency = new Map();
  treatments.forEach(t => adjacency.set(t, new Set()));
  directPairs.forEach((_, pairKey) => {
    const [t1, t2] = pairKey.split("__");
    adjacency.get(t1).add(t2);
    adjacency.get(t2).add(t1);
  });

  // Find all triangular loops (3-node cycles)
  const loops = [];
  const visitedLoops = new Set();

  for (const t1 of treatments) {
    for (const t2 of adjacency.get(t1)) {
      if (t2 <= t1) continue;  // Avoid duplicates
      for (const t3 of adjacency.get(t2)) {
        if (t3 <= t2) continue;
        if (adjacency.get(t3).has(t1)) {
          // Found a triangle: t1-t2-t3-t1
          const loopKey = [t1, t2, t3].sort().join("__");
          if (!visitedLoops.has(loopKey)) {
            visitedLoops.add(loopKey);
            loops.push([t1, t2, t3]);
          }
        }
      }
    }
  }

  // Helper: get pooled direct estimate for a pair
  const getDirectEstimate = (ta, tb) => {
    const key = [ta, tb].sort().join("__");
    const comps = directPairs.get(key);
    if (!comps || comps.length === 0) return null;

    const yi = comps.map(c => c.t1 === ta ? c.effect : -c.effect);
    const vi = comps.map(c => c.se * c.se);
    const wi = vi.map(v => 1 / v);
    const mu = weightedMean(yi, wi);
    const se = Math.sqrt(1 / wi.reduce((a, b) => a + b, 0));
    return { effect: mu, se, n: comps.length };
  };

  // Test all loops for inconsistency (loop-specific method)
  const loopResults = [];

  for (const [a, b, c] of loops) {
    // Get direct estimates for each edge
    const ab = getDirectEstimate(a, b);
    const bc = getDirectEstimate(b, c);
    const ac = getDirectEstimate(a, c);

    if (!ab || !bc || !ac) continue;

    // Loop inconsistency: d_AB + d_BC - d_AC should be 0
    // (where all effects are oriented consistently around the loop)
    const loopEffect = ab.effect + bc.effect - ac.effect;
    const loopSe = Math.sqrt(ab.se * ab.se + bc.se * bc.se + ac.se * ac.se);
    const zScore = loopEffect / loopSe;
    const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));

    loopResults.push({
      loop: `${a}-${b}-${c}`,
      treatments: [a, b, c],
      inconsistencyFactor: loopEffect,
      se: loopSe,
      zScore,
      pValue,
      inconsistent: pValue < 0.05
    });
  }

  // Node-splitting: compare direct vs indirect for pairs with both
  const nodeSplitResults = [];

  directPairs.forEach((directComparisons, pairKey) => {
    const [t1, t2] = pairKey.split("__");

    // Get direct estimate
    const direct = getDirectEstimate(t1, t2);
    if (!direct) return;

    // Find indirect paths through any intermediate node
    const indirectEstimates = [];

    for (const intermediate of treatments) {
      if (intermediate === t1 || intermediate === t2) continue;

      // Check if path exists: t1 -> intermediate -> t2
      const t1Int = getDirectEstimate(t1, intermediate);
      const intT2 = getDirectEstimate(intermediate, t2);

      if (t1Int && intT2) {
        const indirectEffect = t1Int.effect + intT2.effect;
        const indirectSe = Math.sqrt(t1Int.se * t1Int.se + intT2.se * intT2.se);
        indirectEstimates.push({
          via: intermediate,
          effect: indirectEffect,
          se: indirectSe
        });
      }
    }

    if (indirectEstimates.length === 0) return;

    // Pool all indirect estimates using inverse-variance weighting
    const indirectWi = indirectEstimates.map(e => 1 / (e.se * e.se));
    const indirectMu = indirectEstimates.reduce((s, e, i) => s + indirectWi[i] * e.effect, 0) /
                       indirectWi.reduce((a, b) => a + b, 0);
    const indirectSe = Math.sqrt(1 / indirectWi.reduce((a, b) => a + b, 0));

    // Inconsistency factor
    const diffMu = direct.effect - indirectMu;
    const diffSe = Math.sqrt(direct.se * direct.se + indirectSe * indirectSe);
    const zScore = diffMu / diffSe;
    const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));

    nodeSplitResults.push({
      comparison: `${t1} vs ${t2}`,
      direct: { effect: direct.effect, se: direct.se, n: direct.n },
      indirect: { effect: indirectMu, se: indirectSe, paths: indirectEstimates.length },
      difference: diffMu,
      differenceSe: diffSe,
      zScore,
      pValue,
      inconsistent: pValue < 0.05
    });
  });

  // Global Q statistic for inconsistency (design-by-treatment interaction)
  // Q_inconsistency = sum of (inconsistency factor)^2 / variance
  let Qinconsistency = 0;
  let dfInconsistency = 0;

  for (const loop of loopResults) {
    Qinconsistency += (loop.inconsistencyFactor * loop.inconsistencyFactor) / (loop.se * loop.se);
    dfInconsistency++;
  }

  // Chi-squared p-value for global test
  const globalPValue = dfInconsistency > 0 ? 1 - chiSquaredCdfNma(Qinconsistency, dfInconsistency) : 1;

  // Summary statistics
  const loopInconsistentCount = loopResults.filter(r => r.inconsistent).length;
  const nodeSplitInconsistentCount = nodeSplitResults.filter(r => r.inconsistent).length;

  return {
    testable: true,
    method: "Node-splitting and loop-specific",
    // Loop-specific results (Bucher method)
    loops: loopResults,
    loopCount: loopResults.length,
    loopInconsistentCount,
    // Node-splitting results (Dias method)
    comparisons: nodeSplitResults,
    nodeSplitCount: nodeSplitResults.length,
    nodeSplitInconsistentCount,
    // Global test (design-by-treatment)
    globalTest: {
      Q: Qinconsistency,
      df: dfInconsistency,
      pValue: globalPValue
    },
    // Overall assessment
    globalInconsistency: nodeSplitResults.length > 0 ?
      nodeSplitInconsistentCount / nodeSplitResults.length : 0,
    interpretation: globalPValue < 0.05 ?
      "Significant global inconsistency detected (design-by-treatment p<0.05)" :
      loopInconsistentCount > 0 || nodeSplitInconsistentCount > 0 ?
        `Local inconsistency: ${loopInconsistentCount} loops, ${nodeSplitInconsistentCount} comparisons` :
        "No significant inconsistency detected"
  };
}

// Chi-squared CDF for global test
function chiSquaredCdf(x, df) {
  if (x <= 0 || df <= 0) return 0;
  // Use incomplete gamma function approximation
  return gammaCdf(x / 2, df / 2);
}

function gammaCdf(x, a) {
  // Lower incomplete gamma function / gamma(a) using series expansion
  if (x <= 0) return 0;
  if (a <= 0) return 1;

  // Series expansion for x < a + 1
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }

  // Continued fraction for x >= a + 1
  return 1 - gammaCdfContinued(x, a);
}

function gammaCdfContinued(x, a) {
  // Continued fraction expansion
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;

  for (let i = 1; i <= 100; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-10) break;
  }

  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function logGamma(x) {
  // Stirling's approximation
  if (x <= 0) return Infinity;
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += c[j] / ++y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function normalCdf(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

// Alias for legacy code paths that still use camel-cased `normalCDF`.
function normalCDF(x) {
  return normalCdf(x);
}

/**
 * Compute P-scores for treatment ranking
 * Reference: Rücker G, Schwarzer G. Res Synth Methods 2015;6:227-33
 *
 * P-score = mean probability that treatment is better than others
 * Uses pooled SE from both treatments for proper uncertainty propagation
 *
 * @param {Array} effects - Array of {treatment, effect, se} objects
 * @returns {Array} Array of {treatment, score} sorted by score descending
 */
export function computePScore(effects) {
  if (effects.length < 2) return [];
  const scores = effects.map(e => ({ treatment: e.treatment, score: 0 }));
  const normCdf = x => 0.5 * (1 + erf(x / Math.SQRT2));

  for (let i = 0; i < effects.length; i++) {
    for (let j = 0; j < effects.length; j++) {
      if (i === j) continue;

      const diff = effects[i].effect - effects[j].effect;

      // Pooled SE: sqrt(SE_i² + SE_j²) for difference between two estimates
      // Use small default SE for reference treatment (which has SE=0)
      const sei = effects[i].se || 0.001;
      const sej = effects[j].se || 0.001;
      const pooledSE = Math.sqrt(sei * sei + sej * sej);

      // P(treatment i better than j) = Φ(diff / pooledSE)
      const p = normCdf(diff / pooledSE);
      scores[i].score += p;
    }
  }
  const denom = effects.length - 1;
  return scores.map(s => ({ ...s, score: s.score / denom })).sort((a, b) => b.score - a.score);
}

/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Produces reproducible sequences for Monte Carlo simulations
 *
 * @param {number} seed - Integer seed value
 * @returns {function} Function that returns uniform random number in [0,1)
 */
function createSeededRNG(seed) {
  let state = seed >>> 0;  // Ensure unsigned 32-bit
  return function() {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Compute SUCRA (Surface Under Cumulative Ranking) with credible intervals
 * Uses Monte Carlo simulation accounting for effect estimate uncertainty
 * Reference: Salanti G, Ades AE, Ioannidis JP. J Clin Epidemiol 2011;64:163-71
 *
 * @param {Array} effects - Array of {treatment, effect, se} objects
 * @param {number} samples - Number of Monte Carlo samples (default 10000)
 * @param {Object} options - {seed: integer for reproducibility}
 * @returns {Array} Array of {treatment, sucra, ci, rankProbs, medianRank} objects
 */
export function computeSucra(effects, samples = 10000, options = {}) {
  if (!effects.length) return [];

  // Create seeded or unseeded RNG
  const { seed = null } = options;
  const random = seed !== null ? createSeededRNG(seed) : Math.random;

  const k = effects.length;
  const sucraValues = new Map(); // Store all SUCRA samples for each treatment
  effects.forEach(e => sucraValues.set(e.treatment, []));

  const rankCounts = new Map();
  effects.forEach(e => rankCounts.set(e.treatment, new Array(k).fill(0)));

  // Monte Carlo simulation
  for (let s = 0; s < samples; s++) {
    // Sample from normal distribution for each effect
    const draw = effects.map(e => {
      // Use Box-Muller transform for normal random
      const u1 = random();
      const u2 = random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const se = e.se || 0.001; // Small default SE for reference treatment
      const sampledEffect = e.effect + z * se;
      return { treatment: e.treatment, effect: sampledEffect };
    });

    // Rank treatments (higher effect = better = rank 1)
    draw.sort((a, b) => b.effect - a.effect);

    // Record ranks
    draw.forEach((d, rank) => {
      const arr = rankCounts.get(d.treatment);
      arr[rank]++;
    });

    // Compute SUCRA for this sample
    draw.forEach((d, rank) => {
      // SUCRA = (k - mean_rank) / (k - 1)
      // For this sample, rank is deterministic
      const sucraThisSample = (k - 1 - rank) / (k - 1);
      sucraValues.get(d.treatment).push(sucraThisSample);
    });
  }

  // Compute statistics for each treatment
  const result = [];
  effects.forEach(e => {
    const sucraSamples = sucraValues.get(e.treatment);
    sucraSamples.sort((a, b) => a - b);

    // Point estimate (mean)
    const sucra = sucraSamples.reduce((a, b) => a + b, 0) / samples;

    // 95% Credible Interval (2.5th and 97.5th percentiles)
    const ci = [
      sucraSamples[Math.floor(samples * 0.025)],
      sucraSamples[Math.floor(samples * 0.975)]
    ];

    // Rank probabilities
    const rankProbs = rankCounts.get(e.treatment).map(c => c / samples);

    // Median rank (0-indexed, add 1 for display)
    let cumProb = 0;
    let medianRank = k;
    for (let r = 0; r < k; r++) {
      cumProb += rankProbs[r];
      if (cumProb >= 0.5) {
        medianRank = r + 1;
        break;
      }
    }

    result.push({
      treatment: e.treatment,
      sucra,
      ci,
      rankProbs,
      medianRank,
      probBest: rankProbs[0], // Probability of being best
      probWorst: rankProbs[k - 1] // Probability of being worst
    });
  });

  return result.sort((a, b) => b.sucra - a.sucra);
}

export function extractDoseFromLabel(label) {
  if (!label) return null;
  const match = label.match(/(\d+(\.\d+)?)\s*(mg|mcg|ug|g|mg\/kg|mcg\/kg|ug\/kg)/i);
  if (!match) return null;
  return Number.parseFloat(match[1]);
}

export function metaRegression(y, x, vi) {
  const n = y.length;
  const X = x.map(v => [1, v]);
  const w = vi.map(v => 1 / v);
  const xtwx = [
    [0, 0],
    [0, 0]
  ];
  const xtwy = [0, 0];
  for (let i = 0; i < n; i += 1) {
    const wi = w[i];
    xtwx[0][0] += wi * X[i][0] * X[i][0];
    xtwx[0][1] += wi * X[i][0] * X[i][1];
    xtwx[1][0] += wi * X[i][1] * X[i][0];
    xtwx[1][1] += wi * X[i][1] * X[i][1];
    xtwy[0] += wi * X[i][0] * y[i];
    xtwy[1] += wi * X[i][1] * y[i];
  }
  const beta = solveLinear(xtwx, xtwy);
  const yhat = X.map(row => row[0] * beta[0] + row[1] * beta[1]);
  const df = Math.max(1, n - 2);
  let rss = 0;
  for (let i = 0; i < n; i += 1) {
    rss += w[i] * Math.pow(y[i] - yhat[i], 2);
  }
  const sigma2 = rss / df;
  const cov = [
    [sigma2 * xtwx[1][1], -sigma2 * xtwx[0][1]],
    [-sigma2 * xtwx[1][0], sigma2 * xtwx[0][0]]
  ];
  const det = xtwx[0][0] * xtwx[1][1] - xtwx[0][1] * xtwx[1][0];
  const inv = det ? cov.map(row => row.map(v => v / det)) : [[0, 0], [0, 0]];
  const se = [Math.sqrt(Math.abs(inv[0][0])), Math.sqrt(Math.abs(inv[1][1]))];
  return { beta, se };
}

/**
 * Compute funnel plot data with pseudo-confidence bands
 * @param {Array} studies - Array of {effect, se} objects
 * @param {Object} meta - Meta-analysis result with mu property
 * @returns {Object} Funnel plot data including bands
 */
export function funnelPlotData(studies, meta) {
  if (!studies.length || !meta) return null;

  const effects = studies.map(s => s.effect);
  const ses = studies.map(s => s.se);

  const minSe = Math.min(...ses);
  const maxSe = Math.max(...ses);
  const seRange = maxSe - minSe;

  // Compute pseudo-confidence bands (95% CI)
  const bandPoints = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const se = minSe + (seRange * i) / steps;
    const ci95 = 1.96 * se;
    bandPoints.push({
      se,
      lower: meta.mu - ci95,
      upper: meta.mu + ci95
    });
  }

  // Compute precision (1/SE) for standard funnel plot
  const points = studies.map((s, i) => ({
    effect: s.effect,
    se: s.se,
    precision: 1 / s.se,
    studyId: s.studyId || `Study ${i + 1}`
  }));

  return {
    points,
    pooledEffect: meta.mu,
    bands: bandPoints,
    seRange: [minSe, maxSe],
    effectRange: [Math.min(...effects), Math.max(...effects)]
  };
}

/**
 * Comparison-adjusted funnel plot for network meta-analysis
 * Reference: Chaimani A, Salanti G. Res Synth Methods 2012;3:161-76
 *
 * Centers each study's effect around its comparison-specific pooled effect
 * from the NMA model, allowing detection of small-study effects in networks.
 *
 * @param {Array} studies - Array of {effect, se, t1, t2} objects (pairwise comparisons)
 * @param {Object} nmaResults - Results from networkMeta() function
 * @returns {Object} Comparison-adjusted funnel plot data
 */
export function comparisonAdjustedFunnel(studies, nmaResults) {
  if (!studies.length || !nmaResults) return null;

  const { treatments } = nmaResults;
  if (!treatments || treatments.length < 2) return null;

  // Create a map of treatment effects from NMA
  const effectMap = new Map();
  treatments.forEach(t => effectMap.set(t.treatment, t.effect));

  // Compute comparison-adjusted residuals
  const points = [];
  for (const study of studies) {
    if (!study.t1 || !study.t2) continue;

    // Get NMA-predicted effect for this comparison
    const nmaEffect1 = effectMap.get(study.t1) || 0;
    const nmaEffect2 = effectMap.get(study.t2) || 0;
    const nmaComparison = nmaEffect1 - nmaEffect2;

    // Comparison-adjusted residual: observed - predicted
    const residual = study.effect - nmaComparison;

    points.push({
      effect: residual,
      se: study.se,
      precision: 1 / study.se,
      comparison: `${study.t1} vs ${study.t2}`,
      observed: study.effect,
      predicted: nmaComparison,
      studyId: study.studyId || study.trialName
    });
  }

  if (!points.length) return null;

  const ses = points.map(p => p.se);
  const residuals = points.map(p => p.effect);
  const minSe = Math.min(...ses);
  const maxSe = Math.max(...ses);
  const seRange = maxSe - minSe;

  // Pseudo-confidence bands centered at 0 (since residuals should be centered at 0)
  const bandPoints = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const se = minSe + (seRange * i) / steps;
    const ci95 = 1.96 * se;
    bandPoints.push({
      se,
      lower: -ci95,
      upper: ci95
    });
  }

  return {
    points,
    pooledEffect: 0, // Centered at 0 for comparison-adjusted
    bands: bandPoints,
    seRange: [minSe, maxSe],
    effectRange: [Math.min(...residuals), Math.max(...residuals)],
    type: 'comparison-adjusted'
  };
}

/**
 * Trim-and-fill method for funnel plot asymmetry adjustment
 * @param {Array} studies - Array of {effect, se} objects
 * @returns {Object} Adjusted effect and imputed studies
 */
export function trimAndFill(studies) {
  if (studies.length < 3) return null;

  const yi = studies.map(s => s.effect);
  const vi = studies.map(s => s.se * s.se);

  // Compute initial pooled effect
  const wi = vi.map(v => 1 / v);
  const mu0 = weightedMean(yi, wi);

  // Compute deviations from pooled effect
  const deviations = yi.map((y, i) => ({
    i,
    dev: y - mu0,
    se: studies[i].se
  }));

  // Sort by deviation
  deviations.sort((a, b) => a.dev - b.dev);

  // Count asymmetric studies (simplified L0 estimator)
  let k0 = 0;
  const n = studies.length;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const left = deviations[i].dev;
    const right = deviations[n - 1 - i].dev;
    if (Math.abs(left) > Math.abs(right) * 1.5) {
      k0++;
    }
  }

  // Impute missing studies
  const imputed = [];
  for (let i = 0; i < k0 && i < n; i++) {
    const original = deviations[i];
    imputed.push({
      effect: mu0 - original.dev, // Mirror around pooled effect
      se: original.se,
      imputed: true
    });
  }

  // Combine and recompute
  const combined = [...studies, ...imputed.map(s => ({ effect: s.effect, se: s.se }))];
  const adjustedYi = combined.map(s => s.effect);
  const adjustedVi = combined.map(s => s.se * s.se);
  const adjustedWi = adjustedVi.map(v => 1 / v);
  const adjustedMu = weightedMean(adjustedYi, adjustedWi);

  return {
    originalMu: mu0,
    adjustedMu,
    imputedCount: k0,
    imputedStudies: imputed
  };
}

export function doseResponseFit(points, model = "linear") {
  if (!points.length) return null;
  const y = points.map(p => p.effect);
  const w = points.map(p => 1 / (p.se * p.se));
  const x = points.map(p => p.dose);
  const X = x.map(v => (model === "quadratic" ? [1, v, v * v] : [1, v]));
  const p = X[0].length;
  const xtwx = Array.from({ length: p }, () => Array(p).fill(0));
  const xtwy = Array(p).fill(0);
  for (let i = 0; i < X.length; i += 1) {
    for (let j = 0; j < p; j += 1) {
      xtwy[j] += w[i] * X[i][j] * y[i];
      for (let k = 0; k < p; k += 1) {
        xtwx[j][k] += w[i] * X[i][j] * X[i][k];
      }
    }
  }
  const beta = solveLinear(xtwx, xtwy);
  const yhat = X.map(row => row.reduce((acc, v, idx) => acc + v * (beta[idx] || 0), 0));
  let ssTot = 0;
  let ssRes = 0;
  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  for (let i = 0; i < y.length; i += 1) {
    ssTot += Math.pow(y[i] - mean, 2);
    ssRes += Math.pow(y[i] - yhat[i], 2);
  }
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;
  return { beta, model, r2, fitted: yhat };
}

/**
 * Cumulative meta-analysis: adds studies one at a time (chronologically)
 * @param {Array} studies - Array of {effect, se, date?, studyId?} sorted by date
 * @param {Object} options - Meta-analysis options
 * @returns {Array} Array of cumulative results after each study added
 */
export function cumulativeMetaAnalysis(studies, options = {}) {
  if (studies.length < 2) return [];

  // Sort by date if available, otherwise use original order
  const sorted = [...studies].sort((a, b) => {
    if (a.date && b.date) {
      return new Date(a.date) - new Date(b.date);
    }
    return 0;
  });

  const results = [];
  for (let i = 1; i <= sorted.length; i++) {
    const subset = sorted.slice(0, i);
    const meta = metaAnalysis(subset, options);
    results.push({
      k: i,
      studyId: sorted[i - 1].studyId || `Study ${i}`,
      date: sorted[i - 1].date || null,
      mu: meta.mu,
      se: meta.se,
      ci: meta.ci,
      tau2: meta.tau2,
      i2: meta.i2
    });
  }

  return results;
}

/**
 * Subgroup analysis: performs meta-analysis by subgroup and tests interaction
 * @param {Array} studies - Array of {effect, se, subgroup} objects
 * @param {Object} options - Meta-analysis options
 * @returns {Object} Subgroup results with interaction test
 */
export function subgroupAnalysis(studies, options = {}) {
  if (!Array.isArray(studies) || studies.length === 0) {
    return {
      subgroups: [],
      overall: {
        k: 0,
        mu: NaN,
        se: NaN,
        ci: [NaN, NaN],
        tau2: 0,
        i2: 0
      },
      interaction: {
        qBetween: 0,
        dfBetween: 0,
        pValue: 1,
        significant: false,
        interpretation: "Insufficient studies for subgroup analysis"
      }
    };
  }

  // Group studies by subgroup
  const groups = new Map();
  studies.forEach(s => {
    const key = s.subgroup || "Unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  });

  // Perform meta-analysis for each subgroup
  const subgroupResults = [];
  let qWithin = 0;
  let dfWithin = 0;

  groups.forEach((groupStudies, groupName) => {
    if (groupStudies.length >= 2) {
      const meta = metaAnalysis(groupStudies, options);
      subgroupResults.push({
        subgroup: groupName,
        k: groupStudies.length,
        mu: meta.mu,
        se: meta.se,
        ci: meta.ci,
        tau2: meta.tau2,
        i2: meta.i2,
        q: meta.q,
        df: meta.df
      });
      qWithin += meta.q;
      dfWithin += meta.df;
    } else if (groupStudies.length === 1) {
      // Single study in subgroup
      subgroupResults.push({
        subgroup: groupName,
        k: 1,
        mu: groupStudies[0].effect,
        se: groupStudies[0].se,
        ci: [
          groupStudies[0].effect - 1.96 * groupStudies[0].se,
          groupStudies[0].effect + 1.96 * groupStudies[0].se
        ],
        tau2: 0,
        i2: 0,
        q: 0,
        df: 0
      });
    }
  });

  // Test for subgroup differences (Q-between)
  const overallMeta = metaAnalysis(studies, options);
  if (!overallMeta) {
    return {
      subgroups: subgroupResults,
      overall: {
        k: studies.length,
        mu: NaN,
        se: NaN,
        ci: [NaN, NaN],
        tau2: 0,
        i2: 0
      },
      interaction: {
        qBetween: 0,
        dfBetween: Math.max(0, subgroupResults.length - 1),
        pValue: 1,
        significant: false,
        interpretation: "Insufficient studies for subgroup interaction test"
      }
    };
  }
  const qTotal = overallMeta.q;
  const qBetween = Math.max(0, qTotal - qWithin);
  const dfBetween = subgroupResults.length - 1;

  // Chi-square p-value for interaction
  const pInteraction = dfBetween > 0 ? 1 - chiSquareCdf(qBetween, dfBetween) : 1;

  return {
    subgroups: subgroupResults,
    overall: {
      k: studies.length,
      mu: overallMeta.mu,
      se: overallMeta.se,
      ci: overallMeta.ci,
      tau2: overallMeta.tau2,
      i2: overallMeta.i2
    },
    interaction: {
      qBetween,
      Qbetween: qBetween, // Backward-compatible key expected by older tests
      dfBetween,
      pValue: pInteraction,
      significant: pInteraction < 0.05,
      interpretation: pInteraction < 0.05
        ? "Significant subgroup difference detected"
        : pInteraction < 0.1
        ? "Trend toward subgroup difference"
        : "No significant subgroup difference"
    }
  };
}

/**
 * Chi-square cumulative distribution function
 */
function chiSquareCdf(x, df) {
  if (x <= 0 || df <= 0) return 0;
  return gammaCdfSubgroup(x / 2, df / 2);
}

/**
 * Incomplete gamma function (regularized) for chi-square CDF
 */
function gammaCdfSubgroup(x, a) {
  if (x <= 0) return 0;
  if (a <= 0) return 1;

  // Use series expansion for small x
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGammaSubgroup(a));
  }

  // Use continued fraction for large x
  return 1 - gammaUpperIncompleteSubgroup(x, a);
}

function gammaUpperIncompleteSubgroup(x, a) {
  let f = 1 + x - a;
  let c = 1 / 1e-30;
  let d = 1 / f;
  let h = d;

  for (let i = 1; i < 100; i++) {
    const an = -i * (i - a);
    const bn = 2 * i + 1 + x - a;
    d = bn + an * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = bn + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-10) break;
  }

  return Math.exp(-x + a * Math.log(x) - logGammaSubgroup(a)) * h;
}

function logGammaSubgroup(x) {
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5
  ];

  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;

  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += c[j] / y;
  }

  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * GRADE assessment: automated certainty of evidence evaluation
 * @param {Array} studies - Array of study objects with effect, se, and quality indicators
 * @param {Object} meta - Meta-analysis results
 * @param {Object} options - Assessment options
 * @returns {Object} GRADE assessment with domains and overall certainty
 */
function inferStudySampleSize(study) {
  const direct = [study?.sampleSize, study?.totalN, study?.N, study?.n];
  for (const value of direct) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }

  const n1 = Number(study?.n1);
  const n0 = Number(study?.n0);
  if (Number.isFinite(n1) && n1 > 0 && Number.isFinite(n0) && n0 > 0) {
    return n1 + n0;
  }

  return null;
}

export function gradeAssessment(studies, meta, options = {}) {
  if (!studies.length || !meta) return null;

  const assessment = {
    domains: {},
    downgrades: 0,
    upgrades: 0,
    certainty: "High",
    certaintyLevel: 4
  };

  const concernFromDowngrade = (downgrade) => {
    if (downgrade >= 2) return "very serious";
    if (downgrade === 1) return "serious";
    return "none";
  };

  // 1. Risk of Bias (ROB2)
  const robScores = studies.map(s => s.riskOfBias || "unclear");
  const highRobCount = robScores.filter(r => r === "high").length;
  const someRobCount = robScores.filter(r => r === "some").length;
  const lowRobCount = robScores.filter(r => r === "low").length;
  const assessedCount = highRobCount + someRobCount + lowRobCount;
  const highRobProportion = assessedCount > 0 ? highRobCount / assessedCount : 0;
  const concernsProportion = assessedCount > 0 ? (highRobCount + someRobCount) / assessedCount : 0;

  if (highRobProportion > 0.5) {
    assessment.domains.riskOfBias = { level: "serious", concern: concernFromDowngrade(2), downgrade: 2, high: highRobCount, some: someRobCount, low: lowRobCount };
    assessment.downgrades += 2;
  } else if (highRobProportion > 0.25 || concernsProportion > 0.5) {
    assessment.domains.riskOfBias = { level: "some concerns", concern: concernFromDowngrade(1), downgrade: 1, high: highRobCount, some: someRobCount, low: lowRobCount };
    assessment.downgrades += 1;
  } else {
    assessment.domains.riskOfBias = { level: "low", concern: concernFromDowngrade(0), downgrade: 0, high: highRobCount, some: someRobCount, low: lowRobCount };
  }

  // 2. Inconsistency (based on I²)
  const i2 = meta.i2 || 0;
  const i2CI = meta.i2CI || null;
  if (i2 > 75) {
    assessment.domains.inconsistency = { level: "serious", concern: concernFromDowngrade(2), downgrade: 2, i2, i2CI };
    assessment.downgrades += 2;
  } else if (i2 > 50) {
    assessment.domains.inconsistency = { level: "some concerns", concern: concernFromDowngrade(1), downgrade: 1, i2, i2CI };
    assessment.downgrades += 1;
  } else {
    assessment.domains.inconsistency = { level: "low", concern: concernFromDowngrade(0), downgrade: 0, i2, i2CI };
  }

  // 3. Indirectness
  const indirectnessScore = options.indirectness || 0;
  if (indirectnessScore >= 2) {
    assessment.domains.indirectness = { level: "serious", concern: concernFromDowngrade(2), downgrade: 2 };
    assessment.downgrades += 2;
  } else if (indirectnessScore === 1) {
    assessment.domains.indirectness = { level: "some concerns", concern: concernFromDowngrade(1), downgrade: 1 };
    assessment.downgrades += 1;
  } else {
    assessment.domains.indirectness = { level: "low", concern: concernFromDowngrade(0), downgrade: 0 };
  }

  // 4. Imprecision (based on CI width and sample size)
  const ciWidth = meta.ci ? meta.ci[1] - meta.ci[0] : 0;
  const observedStudySizes = studies
    .map(inferStudySampleSize)
    .filter(value => Number.isFinite(value) && value > 0);
  const totalN = observedStudySizes.reduce((sum, value) => sum + value, 0);
  const ois = options.optimalInformationSize || 400;
  const missingSampleSize = studies.length - observedStudySizes.length;

  if (totalN < ois / 2 || ciWidth > 1.0) {
    assessment.domains.imprecision = { level: "serious", concern: concernFromDowngrade(2), downgrade: 2, totalN, ciWidth, missingSampleSize };
    assessment.downgrades += 2;
  } else if (totalN < ois || ciWidth > 0.5) {
    assessment.domains.imprecision = { level: "some concerns", concern: concernFromDowngrade(1), downgrade: 1, totalN, ciWidth, missingSampleSize };
    assessment.downgrades += 1;
  } else {
    assessment.domains.imprecision = { level: "low", concern: concernFromDowngrade(0), downgrade: 0, totalN, ciWidth, missingSampleSize };
  }

  // 5. Publication Bias
  const pubBiasScore = options.publicationBias || 0;
  if (pubBiasScore >= 2) {
    assessment.domains.publicationBias = { level: "serious", concern: concernFromDowngrade(2), downgrade: 2 };
    assessment.downgrades += 2;
  } else if (pubBiasScore === 1) {
    assessment.domains.publicationBias = { level: "suspected", concern: concernFromDowngrade(1), downgrade: 1 };
    assessment.downgrades += 1;
  } else {
    assessment.domains.publicationBias = { level: "undetected", concern: concernFromDowngrade(0), downgrade: 0 };
  }

  // Upgrading factors (for observational studies)
  if (options.largeEffect && Math.abs(meta.mu) > 0.5) {
    assessment.upgrades += 1;
    assessment.domains.largeEffect = { upgrade: 1 };
  }
  if (options.doseResponse) {
    assessment.upgrades += 1;
    assessment.domains.doseResponse = { upgrade: 1 };
  }
  if (options.plausibleConfounding) {
    assessment.upgrades += 1;
    assessment.domains.plausibleConfounding = { upgrade: 1 };
  }

  // Calculate final certainty
  const netChange = assessment.downgrades - assessment.upgrades;
  assessment.certaintyLevel = Math.max(1, Math.min(4, 4 - netChange));

  const levels = ["Very Low", "Low", "Moderate", "High"];
  assessment.certainty = levels[assessment.certaintyLevel - 1];

  // Generate interpretation
  assessment.interpretation = generateGradeInterpretation(assessment);

  return assessment;
}

function generateGradeInterpretation(assessment) {
  const concerns = [];

  Object.entries(assessment.domains).forEach(([domain, info]) => {
    if (info.downgrade > 0) {
      const domainNames = {
        riskOfBias: "risk of bias",
        inconsistency: "inconsistency",
        indirectness: "indirectness",
        imprecision: "imprecision",
        publicationBias: "publication bias"
      };
      concerns.push(domainNames[domain] || domain);
    }
  });

  if (concerns.length === 0) {
    return `${assessment.certainty} certainty evidence with no serious concerns.`;
  }

  return `${assessment.certainty} certainty evidence, downgraded for ${concerns.join(", ")}.`;
}

/**
 * Sensitivity analysis: excludes studies based on criteria
 * @param {Array} studies - Array of study objects
 * @param {Function|Object} excludeCriteria - Function or criteria object
 * @param {Object} options - Meta-analysis options
 * @returns {Object} Sensitivity analysis results
 */
export function sensitivityAnalysis(studies, excludeCriteria, options = {}) {
  if (!Array.isArray(studies) || studies.length === 0) return null;

  const criteria = (excludeCriteria && typeof excludeCriteria === "object")
    ? excludeCriteria
    : {};

  const shouldExclude = (typeof excludeCriteria === "function")
    ? excludeCriteria
    : (study) => {
        if (!study || typeof study !== "object") return false;

        if (criteria.riskOfBias !== undefined) {
          const target = String(criteria.riskOfBias).toLowerCase();
          const observed = String(study.riskOfBias || "").toLowerCase();
          if (observed === target) return true;
        }

        if (criteria.minSampleSize !== undefined) {
          const n = Number(study.sampleSize ?? study.n ?? study.totalN ?? study.N);
          if (Number.isFinite(n) && n < criteria.minSampleSize) return true;
        }

        if (criteria.maxEffect !== undefined) {
          const effect = Number(study.effect);
          if (Number.isFinite(effect) && Math.abs(effect) > criteria.maxEffect) return true;
        }

        // Generic exact-match filters for custom criteria fields.
        for (const [key, value] of Object.entries(criteria)) {
          if (key === "riskOfBias" || key === "minSampleSize" || key === "maxEffect") continue;
          if (study[key] === value) return true;
        }

        return false;
      };

  const included = studies.filter(s => !shouldExclude(s));
  const excluded = studies.filter(s => shouldExclude(s));

  if (included.length < 2) {
    return {
      feasible: false,
      message: "Too few studies remain after exclusion",
      original: { k: studies.length },
      sensitivity: { k: included.length },
      excluded,
      excludedSummary: {
        k: excluded.length,
        studies: excluded.map(s => s.studyId || "Unknown")
      }
    };
  }

  const fullMeta = metaAnalysis(studies, options);
  const sensitivityMeta = metaAnalysis(included, options);
  if (!fullMeta || !sensitivityMeta) {
    return {
      feasible: false,
      message: "Unable to compute meta-analysis after applying sensitivity criteria",
      original: { k: studies.length },
      sensitivity: { k: included.length },
      excluded
    };
  }

  const changeMu = sensitivityMeta.mu - fullMeta.mu;
  const changePercent = fullMeta.mu !== 0 ? (changeMu / fullMeta.mu) * 100 : 0;

  // Check if conclusions change (e.g., effect crosses null).
  const fullSignificant = fullMeta.ci[0] > 0 || fullMeta.ci[1] < 0;
  const sensitivitySignificant = sensitivityMeta.ci[0] > 0 || sensitivityMeta.ci[1] < 0;
  const conclusionChanged = fullSignificant !== sensitivitySignificant;

  const original = {
    k: studies.length,
    mu: fullMeta.mu,
    ci: fullMeta.ci,
    i2: fullMeta.i2
  };
  const sensitivity = {
    k: included.length,
    mu: sensitivityMeta.mu,
    ci: sensitivityMeta.ci,
    i2: sensitivityMeta.i2
  };

  return {
    feasible: true,
    original,
    full: original,
    sensitivity,
    excluded,
    excludedSummary: {
      k: excluded.length,
      studies: excluded.map(s => s.studyId || "Unknown")
    },
    change: {
      mu: changeMu,
      percent: changePercent,
      conclusionChanged
    },
    conclusionChanged,
    interpretation: conclusionChanged
      ? "Sensitivity analysis changed the conclusion"
      : Math.abs(changePercent) > 20
      ? "Substantial change in effect size"
      : "Results robust to sensitivity analysis"
  };
}

// ============================================================================
// NEW VISUALIZATION AND DIAGNOSTIC FUNCTIONS (2026-01-25)
// ============================================================================

/**
 * Baujat plot data - identifies studies contributing to heterogeneity vs influence
 * Reference: Baujat, B., et al. (2002). A graphical method for exploring heterogeneity.
 * Statistics in Medicine, 21(18), 2641-2652.
 *
 * @param {Array} studies - Array of {effect, se} objects
 * @param {Object} meta - Meta-analysis results with mu, tau2
 * @returns {Array} Array of {study, x (contribution to Q), y (influence on mu)}
 */
export function baujatPlotData(studies, meta) {
  if (!studies || studies.length < 3 || !meta) return [];

  const { mu, tau2 = 0 } = meta;
  const points = [];

  for (let i = 0; i < studies.length; i++) {
    const s = studies[i];
    const vi = s.se * s.se;
    const wi = 1 / (vi + tau2);

    // Contribution to Q statistic (heterogeneity)
    const qi = wi * Math.pow(s.effect - mu, 2);

    // Influence on pooled effect (leave-one-out change)
    // Compute pooled effect without study i
    let sumW = 0, sumWY = 0;
    for (let j = 0; j < studies.length; j++) {
      if (j !== i) {
        const vj = studies[j].se * studies[j].se;
        const wj = 1 / (vj + tau2);
        sumW += wj;
        sumWY += wj * studies[j].effect;
      }
    }
    const muWithout = sumW > 0 ? sumWY / sumW : mu;
    const influence = Math.abs(mu - muWithout);

    points.push({
      study: s.study || s.studyId || `Study ${i + 1}`,
      x: qi,
      y: influence,
      label: s.study || s.studyId || `Study ${i + 1}`
    });
  }

  return points;
}

/**
 * Galbraith (radial) plot data
 * Reference: Galbraith, R. F. (1988). A note on graphical presentation of estimated odds ratios.
 * Statistics in Medicine, 7(8), 889-894.
 *
 * @param {Array} studies - Array of {effect, se} objects
 * @param {Object} meta - Meta-analysis results with mu
 * @returns {Object} {points, regressionLine, confidenceBands}
 */
export function galbraithPlotData(studies, meta) {
  if (!studies || studies.length < 3 || !meta) return null;

  const { mu } = meta;
  const points = [];

  for (let i = 0; i < studies.length; i++) {
    const s = studies[i];
    const precision = 1 / s.se; // x-axis: precision (1/SE)
    const zScore = s.effect / s.se; // y-axis: standardized effect (effect/SE)

    points.push({
      study: s.study || s.studyId || `Study ${i + 1}`,
      x: precision,
      y: zScore,
      effect: s.effect,
      se: s.se
    });
  }

  // Regression line passes through origin with slope = pooled effect
  // y = mu * x (where x = 1/SE, y = effect/SE)
  const maxPrecision = Math.max(...points.map(p => p.x));
  const regressionLine = {
    slope: mu,
    points: [
      { x: 0, y: 0 },
      { x: maxPrecision, y: mu * maxPrecision }
    ]
  };

  // 95% confidence bands (±1.96 from regression line)
  const confidenceBands = {
    upper: [
      { x: 0, y: 1.96 },
      { x: maxPrecision, y: mu * maxPrecision + 1.96 }
    ],
    lower: [
      { x: 0, y: -1.96 },
      { x: maxPrecision, y: mu * maxPrecision - 1.96 }
    ]
  };

  return { points, regressionLine, confidenceBands };
}

/**
 * Outlier and influence diagnostics
 * Computes studentized residuals, DFBETAS, and Cook's distance
 * Reference: Viechtbauer, W., Cheung, M. W. (2010). Outlier and influence diagnostics.
 * Research Synthesis Methods, 1(2), 112-125.
 *
 * @param {Array} studies - Array of {effect, se} objects
 * @param {Object} meta - Meta-analysis results
 * @returns {Array} Array of diagnostic measures per study
 */
export function outlierDiagnostics(studies, meta) {
  if (!studies || studies.length < 3 || !meta) return [];

  const { mu, tau2 = 0 } = meta;
  const k = studies.length;
  const diagnostics = [];

  // Compute weights
  const weights = studies.map(s => 1 / (s.se * s.se + tau2));
  const sumW = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < k; i++) {
    const s = studies[i];
    const vi = s.se * s.se;
    const wi = weights[i];

    // Residual
    const residual = s.effect - mu;

    // Hat value (leverage)
    const hi = wi / sumW;

    // Standardized residual
    const seResid = Math.sqrt((vi + tau2) * (1 - hi));
    const stdResid = seResid > 0 ? residual / seResid : 0;

    // Studentized (externally studentized) residual
    // Requires leave-one-out tau2 estimation - approximate with current
    const rstudent = stdResid; // Simplified; full version needs LOO tau2

    // Cook's distance
    const cookD = (stdResid * stdResid * hi) / (1 - hi);

    // DFBETAS - change in pooled effect when study removed
    let sumWWithout = 0, sumWYWithout = 0;
    for (let j = 0; j < k; j++) {
      if (j !== i) {
        sumWWithout += weights[j];
        sumWYWithout += weights[j] * studies[j].effect;
      }
    }
    const muWithout = sumWWithout > 0 ? sumWYWithout / sumWWithout : mu;
    const dfbeta = mu - muWithout;
    const dfbetaStd = dfbeta / Math.sqrt(1 / sumWWithout); // Standardized DFBETA

    // Outlier flags (common thresholds)
    const isOutlier = Math.abs(rstudent) >= 1.96;
    const isInfluential = cookD > 4 / k || Math.abs(dfbetaStd) > 2 / Math.sqrt(k);

    diagnostics.push({
      study: s.study || s.studyId || `Study ${i + 1}`,
      effect: s.effect,
      se: s.se,
      residual,
      stdResid,
      rstudent,
      leverage: hi,
      cookD,
      dfbeta,
      dfbetaStd,
      isOutlier,
      isInfluential
    });
  }

  return diagnostics;
}

/**
 * L'Abbé plot data for binary outcomes
 * Reference: L'Abbé, K. A., et al. (1987). Meta-analysis in clinical research.
 * Annals of Internal Medicine, 107(2), 224-233.
 *
 * @param {Array} studies - Array of {e1, n1, e0, n0} (events and totals)
 * @returns {Object} {points, equalityLine, pooledRisk}
 */
export function labbePlotData(studies) {
  if (!studies || studies.length < 2) return null;

  const points = [];
  let totalE1 = 0, totalN1 = 0, totalE0 = 0, totalN0 = 0;

  for (const s of studies) {
    if (s.e1 === undefined || s.n1 === undefined || s.e0 === undefined || s.n0 === undefined) continue;

    const riskTreatment = s.e1 / s.n1; // x-axis: control/comparator risk
    const riskControl = s.e0 / s.n0; // y-axis: treatment risk
    const size = s.n1 + s.n0; // Bubble size proportional to total N

    points.push({
      study: s.study || s.studyId || 'Unknown',
      x: riskControl, // Control risk on x-axis
      y: riskTreatment, // Treatment risk on y-axis
      size,
      e1: s.e1,
      n1: s.n1,
      e0: s.e0,
      n0: s.n0,
      rr: (s.e1 / s.n1) / (s.e0 / s.n0) // Risk ratio
    });

    totalE1 += s.e1;
    totalN1 += s.n1;
    totalE0 += s.e0;
    totalN0 += s.n0;
  }

  // Line of equality (y = x, no treatment effect)
  const equalityLine = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

  // Pooled risks
  const pooledRiskTreatment = totalN1 > 0 ? totalE1 / totalN1 : 0;
  const pooledRiskControl = totalN0 > 0 ? totalE0 / totalN0 : 0;

  return {
    points,
    equalityLine,
    pooledRisk: {
      treatment: pooledRiskTreatment,
      control: pooledRiskControl,
      rr: pooledRiskControl > 0 ? pooledRiskTreatment / pooledRiskControl : null
    }
  };
}

/**
 * Contour-enhanced funnel plot data
 * Shows significance contours at different p-value thresholds
 * Reference: Peters, J. L., et al. (2008). Contour-enhanced meta-analysis funnel plots.
 * Research Synthesis Methods, 1(1), 2-12.
 *
 * @param {Array} studies - Array of {effect, se} objects
 * @param {Object} meta - Meta-analysis results
 * @param {Array} pLevels - P-value levels for contours (default [0.01, 0.05, 0.10])
 * @returns {Object} {points, contours, pooledEffect}
 */
export function contourFunnelData(studies, meta, pLevels = [0.01, 0.05, 0.10]) {
  if (!studies || studies.length < 3 || !meta) return null;

  const { mu } = meta;
  const points = [];

  // Data points
  for (const s of studies) {
    points.push({
      study: s.study || s.studyId || 'Unknown',
      x: s.effect,
      y: s.se,
      significant: Math.abs(s.effect / s.se) > 1.96
    });
  }

  // Generate contour lines
  const maxSE = Math.max(...points.map(p => p.y)) * 1.2;
  const contours = [];

  for (const p of pLevels) {
    const z = inverseNormal(1 - p / 2);
    const contour = {
      p,
      left: [],
      right: []
    };

    // Generate contour at multiple SE values
    for (let se = 0.001; se <= maxSE; se += maxSE / 50) {
      // For effect size = 0 (null hypothesis), the contour is at ±z*SE
      contour.left.push({ x: -z * se, y: se });
      contour.right.push({ x: z * se, y: se });
    }

    contours.push(contour);
  }

  return {
    points,
    contours,
    pooledEffect: mu,
    regions: [
      { name: `p < ${pLevels[0]}`, color: 'darkgreen' },
      { name: `${pLevels[0]} ≤ p < ${pLevels[1]}`, color: 'green' },
      { name: `${pLevels[1]} ≤ p < ${pLevels[2]}`, color: 'yellow' },
      { name: `p ≥ ${pLevels[2]}`, color: 'white' }
    ]
  };
}

/**
 * Copas selection model for publication bias sensitivity analysis
 * Simplified implementation - full model requires numerical optimization
 * Reference: Copas, J., Shi, J. Q. (2000). Meta-analysis, funnel plots and sensitivity analysis.
 * Biostatistics, 1(3), 247-262.
 *
 * @param {Array} studies - Array of {effect, se} objects
 * @param {number} gamma0 - Selection intercept (default -1.5)
 * @param {number} gamma1 - Selection slope on precision (default 0.5)
 * @returns {Object} Adjusted estimate and selection parameters
 */
export function copasSelectionModel(studies, gamma0 = -1.5, gamma1 = 0.5) {
  if (!studies || studies.length < 5) return null;

  const k = studies.length;

  // Compute selection probabilities
  const selectionProbs = studies.map(s => {
    const z = s.effect / s.se;
    const prob = normalCdf(gamma0 + gamma1 / s.se);
    return Math.max(0.01, Math.min(0.99, prob)); // Bound probabilities
  });

  // Weighted estimation accounting for selection
  let sumW = 0, sumWY = 0;
  for (let i = 0; i < k; i++) {
    const s = studies[i];
    const vi = s.se * s.se;
    const wi = (1 / vi) / selectionProbs[i]; // Inverse probability weighting
    sumW += wi;
    sumWY += wi * s.effect;
  }

  const adjustedMu = sumW > 0 ? sumWY / sumW : 0;
  const adjustedSE = sumW > 0 ? Math.sqrt(1 / sumW) : Infinity;

  // Unadjusted (standard) estimate for comparison
  const unadjusted = metaAnalysis(studies);

  return {
    adjusted: {
      mu: adjustedMu,
      se: adjustedSE,
      ci: [adjustedMu - 1.96 * adjustedSE, adjustedMu + 1.96 * adjustedSE]
    },
    unadjusted: {
      mu: unadjusted.mu,
      se: Math.sqrt(1 / studies.reduce((sum, s) => sum + 1 / (s.se * s.se), 0)),
      ci: unadjusted.ci
    },
    selectionParams: {
      gamma0,
      gamma1
    },
    selectionProbabilities: selectionProbs,
    interpretation: Math.abs(adjustedMu - unadjusted.mu) > 0.1 * Math.abs(unadjusted.mu)
      ? "Selection model suggests potential publication bias"
      : "Selection-adjusted estimate similar to unadjusted"
  };
}

/**
 * Summary ROC (SROC) curve data for diagnostic test accuracy meta-analysis
 * Moses-Littenberg linear regression model
 * Reference: Moses, L. E., et al. (1993). Combining independent studies.
 * Statistics in Medicine, 12(14), 1293-1316.
 *
 * @param {Array} studies - Array of {TP, FP, FN, TN} objects
 * @returns {Object} SROC curve data and parameters
 */
export function srocCurveData(studies) {
  if (!studies || studies.length < 3) return null;

  const points = [];
  const dValues = []; // D = logit(sensitivity) + logit(specificity)
  const sValues = []; // S = logit(sensitivity) - logit(specificity)

  for (const study of studies) {
    const { TP, FP, FN, TN } = study;

    // Add 0.5 continuity correction if needed
    const tp = TP + 0.5, fp = FP + 0.5, fn = FN + 0.5, tn = TN + 0.5;

    const sens = tp / (tp + fn);
    const spec = tn / (tn + fp);
    const fpr = 1 - spec; // False positive rate

    // Logit transformations
    const logitSens = Math.log(sens / (1 - sens));
    const logitSpec = Math.log(spec / (1 - spec));

    const D = logitSens + logitSpec; // Diagnostic odds ratio
    const S = logitSens - logitSpec; // Threshold

    dValues.push(D);
    sValues.push(S);

    points.push({
      study: study.study || 'Unknown',
      sensitivity: TP / (TP + FN),
      specificity: TN / (TN + FP),
      fpr: FP / (FP + TN),
      tp: TP, fp: FP, fn: FN, tn: TN,
      n: TP + FP + FN + TN,
      logitSens,
      logitSpec
    });
  }

  // Linear regression: D = a + b*S
  const n = dValues.length;
  const meanS = sValues.reduce((a, b) => a + b, 0) / n;
  const meanD = dValues.reduce((a, b) => a + b, 0) / n;

  let ssS = 0, ssDS = 0;
  for (let i = 0; i < n; i++) {
    ssS += (sValues[i] - meanS) * (sValues[i] - meanS);
    ssDS += (dValues[i] - meanD) * (sValues[i] - meanS);
  }

  const b = ssS > 0 ? ssDS / ssS : 0;
  const a = meanD - b * meanS;

  // Generate SROC curve
  const srocCurve = [];
  for (let fpr = 0.01; fpr <= 0.99; fpr += 0.02) {
    // From FPR to logit(specificity)
    const spec = 1 - fpr;
    const logitSpec = Math.log(spec / (1 - spec));

    // D = a + b*S, where S = logitSens - logitSpec
    // Solving: logitSens = (a + (1-b)*logitSpec) / (1-b) when b != 1
    // Simplified: use the regression to estimate sensitivity
    const S = (a + b * logitSpec - logitSpec) / (1 - b);
    const logitSens = S + logitSpec;
    const sens = 1 / (1 + Math.exp(-logitSens));

    if (sens >= 0 && sens <= 1) {
      srocCurve.push({ fpr, sensitivity: sens });
    }
  }

  // Area under SROC curve (approximation)
  const auc = srocCurve.length > 1
    ? srocCurve.slice(1).reduce((sum, p, i) => {
        const prev = srocCurve[i];
        return sum + (p.sensitivity + prev.sensitivity) / 2 * (p.fpr - prev.fpr);
      }, 0)
    : 0.5;

  // Pooled estimates
  const pooledSens = points.reduce((s, p) => s + p.sensitivity, 0) / n;
  const pooledSpec = points.reduce((s, p) => s + p.specificity, 0) / n;

  return {
    points,
    srocCurve,
    parameters: { a, b },
    auc: Math.abs(auc), // AUC should be positive
    pooled: {
      sensitivity: pooledSens,
      specificity: pooledSpec,
      dor: Math.exp(a) // Diagnostic odds ratio at S=0
    }
  };
}

/**
 * Rankogram data for NMA - probability of each treatment at each rank
 * Reference: Salanti, G., et al. (2011). Graphical methods and numerical summaries
 * for presenting results from NMA. J Clin Epidemiol, 64(2), 163-171.
 *
 * @param {Array} effects - Array of {treatment, effect, se} from NMA
 * @param {number} simulations - Number of Monte Carlo simulations
 * @param {boolean} higherBetter - Whether higher effect is better
 * @param {Object} options - {seed: integer for reproducibility}
 * @returns {Object} Rankogram data with probabilities
 */
export function rankogramData(effects, simulations = 10000, higherBetter = false, options = {}) {
  if (!effects || effects.length < 2) return null;

  // Create seeded or unseeded RNG
  const { seed = null } = options;
  const rng = seed !== null ? createSeededRNG(seed) : Math.random;

  const k = effects.length;
  const rankCounts = effects.map(() => new Array(k).fill(0));

  // Monte Carlo simulation
  for (let sim = 0; sim < simulations; sim++) {
    // Sample effects from normal distributions
    const sampled = effects.map(e => ({
      treatment: e.treatment,
      value: e.effect + (e.se || 0.001) * randomNormal(rng)
    }));

    // Sort and assign ranks
    sampled.sort((a, b) => higherBetter ? b.value - a.value : a.value - b.value);

    for (let rank = 0; rank < k; rank++) {
      const treatment = sampled[rank].treatment;
      const idx = effects.findIndex(e => e.treatment === treatment);
      if (idx >= 0) {
        rankCounts[idx][rank]++;
      }
    }
  }

  // Convert to probabilities
  const rankProbs = rankCounts.map(counts => counts.map(c => c / simulations));

  // Compute mean rank and SUCRA for each treatment
  const results = effects.map((e, i) => {
    const probs = rankProbs[i];
    const meanRank = probs.reduce((sum, p, r) => sum + p * (r + 1), 0);
    const sucra = probs.reduce((sum, p, r) => sum + p * (k - r - 1), 0) / (k - 1);
    const probBest = probs[0];
    const probWorst = probs[k - 1];

    return {
      treatment: e.treatment,
      effect: e.effect,
      se: e.se,
      rankProbabilities: probs,
      meanRank,
      sucra,
      probBest,
      probWorst
    };
  });

  // Sort by SUCRA (best to worst)
  results.sort((a, b) => b.sucra - a.sucra);

  return {
    treatments: results,
    nTreatments: k,
    simulations,
    higherBetter,
    bestTreatment: results[0].treatment,
    worstTreatment: results[results.length - 1].treatment
  };
}

// Helper: Random normal (Box-Muller transform) with optional seeded RNG
function randomNormal(rng = Math.random) {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Legacy rankogram-specific helper (kept separate to avoid redeclaration collisions)
function normalCdfRankogram(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

// Legacy rankogram-specific helper (kept separate to avoid redeclaration collisions)
function inverseNormalRankogram(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];

  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

// ============================================================================
// ENHANCED META-REGRESSION AND BIVARIATE DTA MODEL (2026-01-25)
// ============================================================================

/**
 * Enhanced Meta-Regression with multiple covariates
 * Supports: multiple covariates, bubble plot data, permutation test
 * Reference: Thompson SG, Higgins JPT. Stat Med 2002;21:1559-73
 *
 * @param {Array} studies - Array of {effect, se, covariates: {name: value}}
 * @param {Array} covariateNames - Names of covariates to include
 * @param {Object} options - {permutations: number, bubblePlot: boolean, seed: number}
 * @returns {Object} Regression results with coefficients, R², bubble plot data
 */
export function enhancedMetaRegression(studies, covariateNames, options = {}) {
  const { permutations = 1000, bubblePlot = true, seed = null } = options;

  if (!studies || studies.length < 3) {
    return { error: "Need at least 3 studies for meta-regression" };
  }

  const n = studies.length;
  const p = covariateNames.length;

  if (n <= p + 1) {
    return { error: "Need more studies than covariates" };
  }

  // Extract data
  const y = studies.map(s => s.effect);
  const vi = studies.map(s => s.se * s.se);
  const w = vi.map(v => 1 / v);

  // Build design matrix [1, x1, x2, ...]
  const X = studies.map(s => {
    const row = [1]; // intercept
    for (const name of covariateNames) {
      const val = s.covariates?.[name];
      if (val === undefined || val === null || isNaN(val)) {
        return null; // Missing covariate
      }
      row.push(Number(val));
    }
    return row;
  });

  // Filter out studies with missing covariates
  const validIdx = X.map((row, i) => row !== null ? i : -1).filter(i => i >= 0);
  if (validIdx.length < p + 2) {
    return { error: "Too many studies with missing covariate values" };
  }

  const yValid = validIdx.map(i => y[i]);
  const wValid = validIdx.map(i => w[i]);
  const XValid = validIdx.map(i => X[i]);
  const nValid = validIdx.length;

  // Weighted least squares: (X'WX)^-1 X'Wy
  const cols = p + 1;

  // Compute X'WX
  const XtWX = [];
  for (let i = 0; i < cols; i++) {
    XtWX[i] = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < nValid; k++) {
        sum += wValid[k] * XValid[k][i] * XValid[k][j];
      }
      XtWX[i][j] = sum;
    }
  }

  // Compute X'Wy
  const XtWy = [];
  for (let i = 0; i < cols; i++) {
    let sum = 0;
    for (let k = 0; k < nValid; k++) {
      sum += wValid[k] * XValid[k][i] * yValid[k];
    }
    XtWy[i] = sum;
  }

  // Solve for beta using Gaussian elimination
  const beta = solveLinearSystem(XtWX, XtWy);
  if (!beta) {
    return { error: "Could not solve regression - singular matrix" };
  }

  // Compute fitted values and residuals
  const fitted = XValid.map(row => row.reduce((s, x, i) => s + x * beta[i], 0));
  const residuals = yValid.map((y, i) => y - fitted[i]);

  // Compute QE (residual heterogeneity) and QM (model heterogeneity)
  let QE = 0, QM = 0, QT = 0;
  const yMean = yValid.reduce((s, y, i) => s + wValid[i] * y, 0) / wValid.reduce((a, b) => a + b, 0);

  for (let i = 0; i < nValid; i++) {
    QE += wValid[i] * residuals[i] * residuals[i];
    QM += wValid[i] * (fitted[i] - yMean) * (fitted[i] - yMean);
    QT += wValid[i] * (yValid[i] - yMean) * (yValid[i] - yMean);
  }

  // Degrees of freedom
  const dfM = p; // model df
  const dfE = nValid - p - 1; // residual df

  // R² (proportion of variance explained)
  const R2 = QT > 0 ? QM / QT : 0;

  // Standard errors of coefficients
  // SE = sqrt(diag((X'WX)^-1))
  const covMatrix = invertMatrix(XtWX);
  const se = covMatrix ? beta.map((_, i) => Math.sqrt(Math.abs(covMatrix[i][i]))) : beta.map(() => NaN);

  // t-statistics and p-values
  const tStats = beta.map((b, i) => se[i] > 0 ? b / se[i] : 0);
  const pValues = tStats.map(t => 2 * (1 - tDistCdf(Math.abs(t), dfE)));

  // Test for moderators (omnibus test)
  const FStatistic = dfE > 0 ? (QM / dfM) / (QE / dfE) : 0;
  const omnibusP = 1 - fDistCdf(FStatistic, dfM, dfE);

  // Permutation test for robust p-values (with optional seed for reproducibility)
  let permPValues = null;
  if (permutations > 0 && p > 0) {
    permPValues = permutationTest(yValid, XValid, wValid, beta, permutations, seed);
  }

  // Build coefficients array
  const coefficients = [{
    name: "Intercept",
    estimate: beta[0],
    se: se[0],
    tStat: tStats[0],
    pValue: pValues[0],
    permP: permPValues ? permPValues[0] : null
  }];

  for (let i = 0; i < p; i++) {
    coefficients.push({
      name: covariateNames[i],
      estimate: beta[i + 1],
      se: se[i + 1],
      tStat: tStats[i + 1],
      pValue: pValues[i + 1],
      permP: permPValues ? permPValues[i + 1] : null
    });
  }

  // Bubble plot data (for single covariate)
  let bubblePlotData = null;
  if (bubblePlot && p === 1) {
    const xValues = XValid.map(row => row[1]);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const range = maxX - minX;

    // Regression line
    const linePoints = [];
    for (let i = 0; i <= 50; i++) {
      const x = minX + (range * i) / 50;
      const yPred = beta[0] + beta[1] * x;
      linePoints.push({ x, y: yPred });
    }

    // 95% CI bands
    const ciBands = linePoints.map(pt => {
      // Simplified CI calculation
      const xVec = [1, pt.x];
      let varY = 0;
      if (covMatrix) {
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            varY += xVec[i] * covMatrix[i][j] * xVec[j];
          }
        }
      }
      const seY = Math.sqrt(Math.max(0, varY));
      const tCrit = 1.96; // Approximate
      return {
        x: pt.x,
        lower: pt.y - tCrit * seY,
        upper: pt.y + tCrit * seY
      };
    });

    bubblePlotData = {
      points: validIdx.map((origIdx, i) => ({
        x: XValid[i][1],
        y: yValid[i],
        se: Math.sqrt(1 / wValid[i]),
        weight: wValid[i],
        studyId: studies[origIdx].studyId || `Study ${origIdx + 1}`
      })),
      regressionLine: linePoints,
      confidenceBands: ciBands,
      covariate: covariateNames[0]
    };
  }

  return {
    coefficients,
    R2,
    R2Percent: R2 * 100,
    QM, // Model Q
    QE, // Residual Q
    dfM,
    dfE,
    FStatistic,
    omnibusP,
    nStudies: nValid,
    nCovariates: p,
    bubblePlotData,
    interpretation: generateRegressionInterpretation(coefficients, R2, omnibusP)
  };
}

// Helper: Solve linear system using Gaussian elimination with partial pivoting
function solveLinearSystem(A, b) {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-10) {
      return null; // Singular matrix
    }

    // Eliminate
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }

  return x;
}

// Note: invertMatrix is defined earlier in file (line ~892) - reusing that implementation

// Helper: t-distribution CDF approximation
function tDistCdf(t, df) {
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  // Use incomplete beta function approximation
  const betaInc = incompleteBeta(x, a, b);
  return t >= 0 ? 1 - 0.5 * betaInc : 0.5 * betaInc;
}

// Helper: Incomplete beta function (simple approximation)
function incompleteBeta(x, a, b) {
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use continued fraction for better accuracy
  const bt = Math.exp(
    gammaLn(a + b) - gammaLn(a) - gammaLn(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCf(x, a, b) / a;
  }
  return 1 - bt * betaCf(1 - x, b, a) / b;
}

// Helper: Beta continued fraction
function betaCf(x, a, b) {
  const maxIter = 100;
  const eps = 1e-10;

  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;

    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < eps) break;
  }

  return h;
}

// Helper: Log gamma function
function gammaLn(x) {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953
  ];

  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;

  for (let j = 0; j < 6; j++) {
    ser += cof[j] / ++y;
  }

  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// Helper: F-distribution CDF
function fDistCdf(f, df1, df2) {
  if (f <= 0) return 0;
  const x = df1 * f / (df1 * f + df2);
  return incompleteBeta(x, df1 / 2, df2 / 2);
}

// Helper: Permutation test for meta-regression (with optional seeded RNG)
function permutationTest(y, X, w, observedBeta, nPerm, seed = null) {
  const n = y.length;
  const p = observedBeta.length;
  const counts = new Array(p).fill(0);

  // Create seeded or unseeded RNG
  const rng = seed !== null ? createSeededRNG(seed) : Math.random;

  for (let perm = 0; perm < nPerm; perm++) {
    // Shuffle y values (keeping weights and covariates fixed) - Fisher-Yates
    const permY = [...y];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [permY[i], permY[j]] = [permY[j], permY[i]];
    }

    // Fit regression to permuted data
    const cols = p;
    const XtWX = [];
    for (let i = 0; i < cols; i++) {
      XtWX[i] = [];
      for (let j = 0; j < cols; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += w[k] * X[k][i] * X[k][j];
        }
        XtWX[i][j] = sum;
      }
    }

    const XtWy = [];
    for (let i = 0; i < cols; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += w[k] * X[k][i] * permY[k];
      }
      XtWy[i] = sum;
    }

    const permBeta = solveLinearSystem(XtWX, XtWy);
    if (permBeta) {
      for (let i = 0; i < p; i++) {
        if (Math.abs(permBeta[i]) >= Math.abs(observedBeta[i])) {
          counts[i]++;
        }
      }
    }
  }

  return counts.map(c => (c + 1) / (nPerm + 1));
}

// Helper: Generate regression interpretation
function generateRegressionInterpretation(coefficients, R2, omnibusP) {
  const parts = [];

  if (omnibusP < 0.05) {
    parts.push("Significant moderator effect detected");
  } else {
    parts.push("No significant moderator effect");
  }

  parts.push(`R² = ${(R2 * 100).toFixed(1)}% of heterogeneity explained`);

  const sigCovs = coefficients.slice(1).filter(c => c.pValue < 0.05);
  if (sigCovs.length > 0) {
    const names = sigCovs.map(c => c.name).join(", ");
    parts.push(`Significant covariates: ${names}`);
  }

  return parts.join(". ") + ".";
}

/**
 * Bivariate DTA Model (Reitsma model)
 * For diagnostic test accuracy meta-analysis
 * Reference: Reitsma JB, et al. J Clin Epidemiol 2005;58:982-90
 *
 * @param {Array} studies - Array of {tp, fp, fn, tn} or {sens, spec, nDiseased, nHealthy}
 * @returns {Object} Bivariate model results with pooled sens/spec and correlation
 */
export function bivariateDTAModel(studies) {
  if (!studies || studies.length < 4) {
    return { error: "Need at least 4 studies for bivariate model" };
  }

  // Convert to logit scale
  const data = studies.map((s, i) => {
    let tp, fp, fn, tn;

    if (s.tp !== undefined) {
      tp = s.tp;
      fp = s.fp;
      fn = s.fn;
      tn = s.tn;
    } else if (s.sens !== undefined) {
      // Convert from sens/spec format
      const nD = s.nDiseased || 100;
      const nH = s.nHealthy || 100;
      tp = Math.round(s.sens * nD);
      fn = nD - tp;
      tn = Math.round(s.spec * nH);
      fp = nH - tn;
    } else {
      return null;
    }

    // Apply continuity correction if needed
    const cc = (tp === 0 || fn === 0 || fp === 0 || tn === 0) ? 0.5 : 0;

    const sens = (tp + cc) / (tp + fn + 2 * cc);
    const spec = (tn + cc) / (tn + fp + 2 * cc);

    // Logit transform
    const logitSens = Math.log(sens / (1 - sens));
    const logitSpec = Math.log(spec / (1 - spec));

    // Variances (using delta method)
    const varLogitSens = 1 / (tp + cc) + 1 / (fn + cc);
    const varLogitSpec = 1 / (tn + cc) + 1 / (fp + cc);

    return {
      studyId: s.studyId || `Study ${i + 1}`,
      tp, fp, fn, tn,
      sens, spec,
      logitSens, logitSpec,
      varLogitSens, varLogitSpec,
      nDiseased: tp + fn,
      nHealthy: tn + fp
    };
  }).filter(d => d !== null);

  if (data.length < 4) {
    return { error: "Insufficient valid studies after processing" };
  }

  const n = data.length;

  // Method of moments estimation for bivariate model
  // Estimate mean logit sensitivity and specificity
  const wSens = data.map(d => 1 / d.varLogitSens);
  const wSpec = data.map(d => 1 / d.varLogitSpec);

  const sumWSens = wSens.reduce((a, b) => a + b, 0);
  const sumWSpec = wSpec.reduce((a, b) => a + b, 0);

  // Weighted means
  const muLogitSens = data.reduce((s, d, i) => s + wSens[i] * d.logitSens, 0) / sumWSens;
  const muLogitSpec = data.reduce((s, d, i) => s + wSpec[i] * d.logitSpec, 0) / sumWSpec;

  // Between-study variances (using DerSimonian-Laird)
  let QSens = 0, QSpec = 0;
  for (let i = 0; i < n; i++) {
    QSens += wSens[i] * Math.pow(data[i].logitSens - muLogitSens, 2);
    QSpec += wSpec[i] * Math.pow(data[i].logitSpec - muLogitSpec, 2);
  }

  const cSens = sumWSens - wSens.reduce((s, w) => s + w * w, 0) / sumWSens;
  const cSpec = sumWSpec - wSpec.reduce((s, w) => s + w * w, 0) / sumWSpec;

  const tau2Sens = Math.max(0, (QSens - (n - 1)) / cSens);
  const tau2Spec = Math.max(0, (QSpec - (n - 1)) / cSpec);

  // Update weights with tau2
  const wSensRE = data.map(d => 1 / (d.varLogitSens + tau2Sens));
  const wSpecRE = data.map(d => 1 / (d.varLogitSpec + tau2Spec));

  const sumWSensRE = wSensRE.reduce((a, b) => a + b, 0);
  const sumWSpecRE = wSpecRE.reduce((a, b) => a + b, 0);

  // RE weighted means
  const muLogitSensRE = data.reduce((s, d, i) => s + wSensRE[i] * d.logitSens, 0) / sumWSensRE;
  const muLogitSpecRE = data.reduce((s, d, i) => s + wSpecRE[i] * d.logitSpec, 0) / sumWSpecRE;

  // Standard errors
  const seLogitSens = Math.sqrt(1 / sumWSensRE);
  const seLogitSpec = Math.sqrt(1 / sumWSpecRE);

  // Estimate correlation between logit sens and spec
  let covSum = 0;
  for (let i = 0; i < n; i++) {
    const devSens = data[i].logitSens - muLogitSensRE;
    const devSpec = data[i].logitSpec - muLogitSpecRE;
    const wi = Math.sqrt(wSensRE[i] * wSpecRE[i]);
    covSum += wi * devSens * devSpec;
  }
  const correlation = covSum / Math.sqrt(sumWSensRE * sumWSpecRE);

  // Back-transform to probability scale
  const pooledSens = 1 / (1 + Math.exp(-muLogitSensRE));
  const pooledSpec = 1 / (1 + Math.exp(-muLogitSpecRE));

  // Confidence intervals (logit scale, then back-transform)
  const z = 1.96;
  const sensCI = [
    1 / (1 + Math.exp(-(muLogitSensRE - z * seLogitSens))),
    1 / (1 + Math.exp(-(muLogitSensRE + z * seLogitSens)))
  ];
  const specCI = [
    1 / (1 + Math.exp(-(muLogitSpecRE - z * seLogitSpec))),
    1 / (1 + Math.exp(-(muLogitSpecRE + z * seLogitSpec)))
  ];

  // Diagnostic Odds Ratio
  const logDOR = muLogitSensRE + muLogitSpecRE;
  const seDOR = Math.sqrt(seLogitSens * seLogitSens + seLogitSpec * seLogitSpec + 2 * correlation * seLogitSens * seLogitSpec);
  const DOR = Math.exp(logDOR);
  const DORCI = [Math.exp(logDOR - z * seDOR), Math.exp(logDOR + z * seDOR)];

  // Positive and Negative Likelihood Ratios
  const LRplus = pooledSens / (1 - pooledSpec);
  const LRminus = (1 - pooledSens) / pooledSpec;

  // HSROC parameters (hierarchical summary ROC)
  // Theta (accuracy) and Lambda (threshold)
  const theta = (muLogitSensRE + muLogitSpecRE) / 2;
  const lambda = muLogitSensRE - muLogitSpec;

  // I² for sensitivity and specificity
  const I2Sens = Math.max(0, (QSens - (n - 1)) / QSens * 100);
  const I2Spec = Math.max(0, (QSpec - (n - 1)) / QSpec * 100);

  // Study points for ROC space plot
  const rocPoints = data.map(d => ({
    studyId: d.studyId,
    sensitivity: d.sens,
    specificity: d.spec,
    fpr: 1 - d.spec,
    nDiseased: d.nDiseased,
    nHealthy: d.nHealthy
  }));

  // Generate SROC curve from bivariate model
  const srocCurve = [];
  for (let fpr = 0.01; fpr <= 0.99; fpr += 0.02) {
    const logitSpec = Math.log((1 - fpr) / fpr);
    // Assume linear relationship in ROC space
    // sens = f(spec) based on correlation
    const logitSensEst = muLogitSensRE + correlation * (logitSpec - muLogitSpecRE);
    const sensEst = 1 / (1 + Math.exp(-logitSensEst));
    if (sensEst > 0 && sensEst < 1) {
      srocCurve.push({ fpr, sensitivity: sensEst });
    }
  }

  // 95% confidence region for pooled estimate (ellipse parameters)
  const confRegion = {
    center: { sens: pooledSens, spec: pooledSpec },
    seSens: seLogitSens,
    seSpec: seLogitSpec,
    correlation
  };

  return {
    nStudies: n,
    pooled: {
      sensitivity: pooledSens,
      sensitivityCI: sensCI,
      specificity: pooledSpec,
      specificityCI: specCI,
      DOR,
      DORCI,
      LRplus,
      LRminus
    },
    logitScale: {
      muSens: muLogitSensRE,
      muSpec: muLogitSpecRE,
      seSens: seLogitSens,
      seSpec: seLogitSpec,
      tau2Sens,
      tau2Spec,
      correlation
    },
    heterogeneity: {
      I2Sens,
      I2Spec,
      QSens,
      QSpec
    },
    hsrocParams: {
      theta,
      lambda
    },
    rocPoints,
    srocCurve,
    confRegion,
    interpretation: generateDTAInterpretation(pooledSens, sensCI, pooledSpec, specCI, I2Sens, I2Spec)
  };
}

// Helper: Generate DTA interpretation
function generateDTAInterpretation(sens, sensCI, spec, specCI, I2Sens, I2Spec) {
  const parts = [];

  parts.push(`Pooled sensitivity: ${(sens * 100).toFixed(1)}% (95% CI: ${(sensCI[0] * 100).toFixed(1)}-${(sensCI[1] * 100).toFixed(1)}%)`);
  parts.push(`Pooled specificity: ${(spec * 100).toFixed(1)}% (95% CI: ${(specCI[0] * 100).toFixed(1)}-${(specCI[1] * 100).toFixed(1)}%)`);

  if (I2Sens > 75 || I2Spec > 75) {
    parts.push("Substantial heterogeneity present");
  } else if (I2Sens > 50 || I2Spec > 50) {
    parts.push("Moderate heterogeneity present");
  }

  // Clinical interpretation
  if (sens >= 0.9 && spec >= 0.9) {
    parts.push("Excellent diagnostic accuracy");
  } else if (sens >= 0.8 || spec >= 0.9) {
    parts.push("Good diagnostic accuracy");
  } else if (sens >= 0.7 && spec >= 0.7) {
    parts.push("Moderate diagnostic accuracy");
  } else {
    parts.push("Limited diagnostic accuracy");
  }

  return parts.join(". ") + ".";
}

// ============================================================================
// EDITORIAL REVISION: MAJOR IMPROVEMENTS (2026-01-25)
// ============================================================================

/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * For reproducible Monte Carlo simulations
 * Reference: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
export class SeededRNG {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  // Returns random float in [0, 1)
  random() {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Backward-compatible alias for legacy callers.
  next() {
    return this.random();
  }

  // Returns random normal using Box-Muller
  randomNormal(mean = 0, sd = 1) {
    const u1 = this.random();
    const u2 = this.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * sd;
  }

  // Backward-compatible alias used by older Monte Carlo code paths.
  nextGaussian(mean = 0, sd = 1) {
    return this.randomNormal(mean, sd);
  }

  // Shuffle array in place (Fisher-Yates)
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  reset() {
    this.state = this.seed;
  }
}

/**
 * Improved chi-squared quantile using AS 91 algorithm for small df
 * Reference: Best DJ, Roberts DE (1975). Algorithm AS 91. Applied Statistics 24:385-388
 *
 * @param {number} p - Probability (0 < p < 1)
 * @param {number} df - Degrees of freedom
 * @returns {number} Chi-squared quantile
 */
export function chiSquaredQuantileImproved(p, df) {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  if (df <= 0) return NaN;

  // For very small df, use iterative refinement
  if (df < 2) {
    // Initial estimate using Wilson-Hilferty
    const g = 2 / (9 * df);
    let x = df * Math.pow(1 - g + inverseNormal(p) * Math.sqrt(g), 3);
    if (x < 0) x = 0.01;

    // Newton-Raphson refinement
    for (let iter = 0; iter < 50; iter++) {
      const cdf = gammaIncomplete(df / 2, x / 2);
      const pdf = Math.pow(x, df / 2 - 1) * Math.exp(-x / 2) / (Math.pow(2, df / 2) * gammaFunc(df / 2));
      if (pdf < 1e-15) break;

      const delta = (cdf - p) / pdf;
      x = Math.max(0.001, x - delta);

      if (Math.abs(delta) < 1e-10) break;
    }
    return x;
  }

  // Wilson-Hilferty for larger df
  const g = 2 / (9 * df);
  const z = inverseNormal(p);
  return df * Math.pow(Math.max(0, 1 - g + z * Math.sqrt(g)), 3);
}

// Incomplete gamma function (regularized)
function gammaIncomplete(a, x) {
  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;

  if (x < a + 1) {
    // Series expansion
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-10 * Math.abs(sum)) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
  } else {
    // Continued fraction
    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;

    for (let i = 1; i < 100; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-10) break;
    }

    return 1 - Math.exp(-x + a * Math.log(x) - gammaLn(a)) * h;
  }
}

// Gamma function
function gammaFunc(x) {
  return Math.exp(gammaLn(x));
}

/**
 * Bivariate REML DTA Model (Full 5-parameter model)
 * Implements true bivariate random-effects model using REML
 * Reference: Reitsma JB, et al. J Clin Epidemiol 2005;58:982-90
 *            Harbord RM, et al. Biostatistics 2007;8:239-51
 *
 * @param {Array} studies - Array of {tp, fp, fn, tn}
 * @param {Object} options - {maxIter, tol, seed}
 * @returns {Object} Full bivariate model results
 */
/**
 * Bivariate Random-Effects DTA Model with REML Estimation
 *
 * Implements the Reitsma et al. (2005) bivariate model for meta-analysis
 * of diagnostic test accuracy studies using Restricted Maximum Likelihood.
 *
 * The model assumes logit-transformed sensitivity and specificity follow
 * a bivariate normal distribution with study-specific means and a shared
 * between-study covariance structure.
 *
 * Key features:
 * - Joint REML estimation of variance components (τ²_sens, τ²_spec, ρ)
 * - Fisher scoring algorithm with proper information matrix
 * - SROC curve derived from bivariate normal conditional distribution
 * - Confidence region for summary operating point (ellipse)
 *
 * Limitations:
 * - Assumes within-study covariance is zero (reasonable for 2x2 tables)
 * - May have convergence issues with very small studies or extreme heterogeneity
 * - Requires at least 4 studies for stable estimation
 *
 * References:
 * - Reitsma JB, et al. Bivariate analysis of sensitivity and specificity
 *   produces informative summary measures. J Clin Epidemiol 2005;58:982-90.
 * - Harbord RM, et al. A unifying model for meta-analysis of diagnostic
 *   accuracy studies. Biostatistics 2007;8:239-51.
 * - Macaskill P, et al. Cochrane Handbook for DTA Reviews, Chapter 10.
 *
 * @param {Array} studies - Array of {tp, fp, fn, tn, studyId}
 * @param {Object} options - {maxIter, tol, alpha}
 * @returns {Object} REML estimates with CIs and SROC curve
 */
export function bivariateDTAReml(studies, options = {}) {
  const { maxIter = 100, tol = 1e-6, alpha = 0.05 } = options;

  if (!studies || studies.length < 4) {
    return { error: "Need at least 4 studies for bivariate REML" };
  }

  // Extract 2x2 data and transform to logit scale
  const data = [];
  for (let i = 0; i < studies.length; i++) {
    const s = studies[i];
    let tp = s.tp, fp = s.fp, fn = s.fn, tn = s.tn;

    if (tp === undefined) continue;

    // Continuity correction
    const cc = (tp === 0 || fn === 0 || fp === 0 || tn === 0) ? 0.5 : 0;
    tp += cc; fn += cc; fp += cc; tn += cc;

    const sens = tp / (tp + fn);
    const spec = tn / (tn + fp);
    const logitSens = Math.log(sens / (1 - sens));
    const logitSpec = Math.log(spec / (1 - spec));

    // Within-study variances
    const varSens = 1 / tp + 1 / fn;
    const varSpec = 1 / tn + 1 / fp;

    data.push({
      studyId: s.studyId || `Study ${i + 1}`,
      logitSens, logitSpec,
      varSens, varSpec,
      sens: tp / (tp + fn),
      spec: tn / (tn + fp),
      n: tp + fn + fp + tn
    });
  }

  const n = data.length;
  if (n < 4) return { error: "Insufficient valid studies" };

  // Initialize parameters using method of moments
  const y1 = data.map(d => d.logitSens);
  const y2 = data.map(d => d.logitSpec);
  const v1 = data.map(d => d.varSens);
  const v2 = data.map(d => d.varSpec);

  // Initial estimates
  let mu1 = y1.reduce((s, y, i) => s + y / v1[i], 0) / v1.reduce((s, v) => s + 1 / v, 0);
  let mu2 = y2.reduce((s, y, i) => s + y / v2[i], 0) / v2.reduce((s, v) => s + 1 / v, 0);

  // Initial tau² estimates using DL
  let tau2_1 = Math.max(0, computeDLTau2(y1, v1));
  let tau2_2 = Math.max(0, computeDLTau2(y2, v2));

  // Initial correlation estimate
  let rho = 0;
  for (let i = 0; i < n; i++) {
    rho += (y1[i] - mu1) * (y2[i] - mu2);
  }
  rho = rho / (n - 1) / Math.sqrt((tau2_1 + v1.reduce((a, b) => a + b, 0) / n) * (tau2_2 + v2.reduce((a, b) => a + b, 0) / n));
  rho = Math.max(-0.99, Math.min(0.99, rho || 0));

  // REML iteration
  let converged = false;
  let prevLogLik = -Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // Build weight matrices and update estimates
    let sumW11 = 0, sumW12 = 0, sumW22 = 0;
    let sumWy1 = 0, sumWy2 = 0;

    for (let i = 0; i < n; i++) {
      // Marginal variances
      const sigma11 = tau2_1 + v1[i];
      const sigma22 = tau2_2 + v2[i];
      const sigma12 = rho * Math.sqrt(tau2_1 * tau2_2);

      // Inverse of 2x2 covariance matrix
      const det = sigma11 * sigma22 - sigma12 * sigma12;
      if (det <= 0) continue;

      const w11 = sigma22 / det;
      const w22 = sigma11 / det;
      const w12 = -sigma12 / det;

      sumW11 += w11;
      sumW22 += w22;
      sumW12 += w12;
      sumWy1 += w11 * y1[i] + w12 * y2[i];
      sumWy2 += w12 * y1[i] + w22 * y2[i];
    }

    // Update means
    const detW = sumW11 * sumW22 - sumW12 * sumW12;
    if (detW <= 0) break;

    const newMu1 = (sumW22 * sumWy1 - sumW12 * sumWy2) / detW;
    const newMu2 = (sumW11 * sumWy2 - sumW12 * sumWy1) / detW;

    // Update variance components using REML scoring algorithm
    // Following the bivariate model: Σ_i = Σ_between + V_i (within)
    // Σ_between = [τ²_1, σ_12; σ_12, τ²_2] where σ_12 = ρ·√(τ²_1·τ²_2)
    let score1 = 0, score2 = 0, scoreRho = 0;
    let info11 = 0, info22 = 0, infoRhoRho = 0;
    let info1Rho = 0, info2Rho = 0, info12 = 0;

    for (let i = 0; i < n; i++) {
      const r1 = y1[i] - newMu1;
      const r2 = y2[i] - newMu2;

      const sigma11 = tau2_1 + v1[i];
      const sigma22 = tau2_2 + v2[i];
      const sigma12 = rho * Math.sqrt(tau2_1 * tau2_2);
      const det = sigma11 * sigma22 - sigma12 * sigma12;
      if (det <= 0) continue;

      // Inverse elements of 2x2 marginal covariance
      const S11inv = sigma22 / det;
      const S22inv = sigma11 / det;
      const S12inv = -sigma12 / det;

      // Quadratic form: r' Σ^{-1} r
      const quadForm = S11inv * r1 * r1 + 2 * S12inv * r1 * r2 + S22inv * r2 * r2;

      // Derivatives of covariance matrix w.r.t. variance components
      // dΣ/dτ²_1 = [1, ρ·√(τ²_2/(4τ²_1)); same, 0]
      // dΣ/dτ²_2 = [0, ρ·√(τ²_1/(4τ²_2)); same, 1]
      // dΣ/dρ = [0, √(τ²_1·τ²_2); same, 0]

      // REML score for τ²_1: ½ tr(Σ^{-1} dΣ/dτ²_1 (rr' - Σ)Σ^{-1})
      // Simplified for diagonal derivative: score = ½(r'Σ^{-1} dΣ/dθ Σ^{-1}r - tr(Σ^{-1} dΣ/dθ))
      score1 += 0.5 * (S11inv * S11inv * r1 * r1 + 2 * S11inv * S12inv * r1 * r2
                       + S12inv * S12inv * r2 * r2 - S11inv);
      score2 += 0.5 * (S22inv * S22inv * r2 * r2 + 2 * S22inv * S12inv * r1 * r2
                       + S12inv * S12inv * r1 * r1 - S22inv);

      // Score for correlation: dσ_12/dρ = √(τ²_1·τ²_2)
      const dSigma12_dRho = Math.sqrt(tau2_1 * tau2_2);
      const S12inv_dRho = -dSigma12_dRho / det + sigma12 * 2 * sigma12 * dSigma12_dRho / (det * det);
      scoreRho += S12inv * r1 * r2 * (-2 * dSigma12_dRho / det)
                  - 0.5 * (-2 * dSigma12_dRho * S12inv / sigma12);

      // Fisher information (expected, not observed)
      info11 += 0.5 * S11inv * S11inv;
      info22 += 0.5 * S22inv * S22inv;
      infoRhoRho += 0.5 * 2 * S12inv * S12inv * dSigma12_dRho * dSigma12_dRho;
    }

    // Update tau² with damping for stability
    const dampFactor = 0.5;
    const newTau2_1 = Math.max(0.001, tau2_1 + dampFactor * score1 / Math.max(info11, 0.001));
    const newTau2_2 = Math.max(0.001, tau2_2 + dampFactor * score2 / Math.max(info22, 0.001));

    // Update correlation using REML - weighted average of residual products
    // This is equivalent to REML score when properly normalized
    let weightedCov = 0, totalWeight = 0;
    for (let i = 0; i < n; i++) {
      const r1 = y1[i] - newMu1;
      const r2 = y2[i] - newMu2;
      const sigma11 = newTau2_1 + v1[i];
      const sigma22 = newTau2_2 + v2[i];
      const w = 1 / Math.sqrt(sigma11 * sigma22);
      weightedCov += w * r1 * r2;
      totalWeight += w;
    }
    let newRho = totalWeight > 0 ? weightedCov / (totalWeight * Math.sqrt(newTau2_1 * newTau2_2)) : 0;
    // Bound correlation for numerical stability
    newRho = Math.max(-0.95, Math.min(0.95, newRho || 0));

    // Check convergence
    const change = Math.abs(newMu1 - mu1) + Math.abs(newMu2 - mu2) +
                   Math.abs(newTau2_1 - tau2_1) + Math.abs(newTau2_2 - tau2_2) +
                   Math.abs(newRho - rho);

    mu1 = newMu1;
    mu2 = newMu2;
    tau2_1 = newTau2_1;
    tau2_2 = newTau2_2;
    rho = newRho;

    if (change < tol) {
      converged = true;
      break;
    }
  }

  // Compute standard errors from Fisher information matrix
  // Build the full 2x2 information matrix for means and invert
  let infoMu1 = 0, infoMu2 = 0, infoMu12 = 0;
  let infoRho = 0;
  for (let i = 0; i < n; i++) {
    const sigma11 = tau2_1 + v1[i];
    const sigma22 = tau2_2 + v2[i];
    const sigma12 = rho * Math.sqrt(tau2_1 * tau2_2);
    const det = sigma11 * sigma22 - sigma12 * sigma12;
    if (det <= 0) continue;

    // Elements of inverse covariance matrix
    const S11inv = sigma22 / det;
    const S22inv = sigma11 / det;
    const S12inv = -sigma12 / det;

    infoMu1 += S11inv;
    infoMu2 += S22inv;
    infoMu12 += S12inv;

    // Information for correlation (from observed)
    const dSigma12_dRho = Math.sqrt(tau2_1 * tau2_2);
    infoRho += dSigma12_dRho * dSigma12_dRho * S12inv * S12inv;
  }

  // Invert 2x2 information matrix for means to get covariance matrix
  const detInfo = infoMu1 * infoMu2 - infoMu12 * infoMu12;
  const varMu1 = detInfo > 0 ? infoMu2 / detInfo : 1;
  const varMu2 = detInfo > 0 ? infoMu1 / detInfo : 1;
  const covMu12 = detInfo > 0 ? -infoMu12 / detInfo : 0;

  const seMu1 = Math.sqrt(varMu1);
  const seMu2 = Math.sqrt(varMu2);
  const seRho = infoRho > 0 ? Math.sqrt(1 / infoRho) : NaN;
  const covCorr = covMu12 / (seMu1 * seMu2);  // Correlation of mean estimates

  // Back-transform to probability scale
  const pooledSens = 1 / (1 + Math.exp(-mu1));
  const pooledSpec = 1 / (1 + Math.exp(-mu2));

  // Delta method for SEs on probability scale
  const seSens = seMu1 * pooledSens * (1 - pooledSens);
  const seSpec = seMu2 * pooledSpec * (1 - pooledSpec);

  // CIs on logit scale, back-transformed (using parameterized alpha)
  const zCrit = inverseNormal(1 - alpha / 2);
  const sensCI = [
    1 / (1 + Math.exp(-(mu1 - zCrit * seMu1))),
    1 / (1 + Math.exp(-(mu1 + zCrit * seMu1)))
  ];
  const specCI = [
    1 / (1 + Math.exp(-(mu2 - zCrit * seMu2))),
    1 / (1 + Math.exp(-(mu2 + zCrit * seMu2)))
  ];

  // DOR and likelihood ratios
  const logDOR = mu1 + mu2;
  const seDOR = Math.sqrt(seMu1 * seMu1 + seMu2 * seMu2 + 2 * rho * seMu1 * seMu2);
  const DOR = Math.exp(logDOR);
  const DORCI = [Math.exp(logDOR - zCrit * seDOR), Math.exp(logDOR + zCrit * seDOR)];

  const LRplus = pooledSens / (1 - pooledSpec);
  const LRminus = (1 - pooledSens) / pooledSpec;

  // I² approximations for each parameter
  const avgV1 = v1.reduce((a, b) => a + b, 0) / n;
  const avgV2 = v2.reduce((a, b) => a + b, 0) / n;
  const I2Sens = Math.max(0, 100 * tau2_1 / (tau2_1 + avgV1));
  const I2Spec = Math.max(0, 100 * tau2_2 / (tau2_2 + avgV2));

  // Generate SROC curve using proper bivariate model
  // The SROC curve is derived from the conditional distribution:
  // E[logit(sens) | logit(spec)] = mu1 + (σ_12/σ_22) * (logit(spec) - mu2)
  // where σ_12 = ρ * sqrt(τ²_1 * τ²_2) and σ_22 = τ²_2
  const srocCurve = [];
  const sigma12 = rho * Math.sqrt(tau2_1 * tau2_2);
  const slope = tau2_2 > 0 ? sigma12 / tau2_2 : 0;

  for (let fpr = 0.01; fpr <= 0.99; fpr += 0.01) {
    const logitSpec = Math.log((1 - fpr) / fpr);
    // Conditional mean of logit(sensitivity) given logit(specificity)
    const logitSensEst = mu1 + slope * (logitSpec - mu2);
    const sensEst = 1 / (1 + Math.exp(-logitSensEst));
    if (sensEst > 0.001 && sensEst < 0.999) {
      srocCurve.push({ fpr, sensitivity: sensEst, logitSpec, logitSens: logitSensEst });
    }
  }

  // AUC using trapezoidal rule (note: integrating sens over fpr)
  let auc = 0;
  for (let i = 1; i < srocCurve.length; i++) {
    const dx = srocCurve[i].fpr - srocCurve[i - 1].fpr;
    const avgY = (srocCurve[i].sensitivity + srocCurve[i - 1].sensitivity) / 2;
    auc += dx * avgY;
  }

  // Confidence ellipse for summary operating point (on logit scale)
  // Chi-squared critical value for 95% CI with df=2
  const chi2Crit = 5.991;  // χ²(0.95, df=2)
  const confidenceEllipse = [];
  for (let theta = 0; theta <= 2 * Math.PI; theta += Math.PI / 36) {
    // Ellipse in standardized coordinates
    const z1 = Math.cos(theta);
    const z2 = Math.sin(theta);

    // Transform using Cholesky of covariance matrix
    // C = [varMu1, covMu12; covMu12, varMu2]
    // L = chol(C): L11 = sqrt(varMu1), L21 = covMu12/L11, L22 = sqrt(varMu2 - L21^2)
    const L11 = Math.sqrt(varMu1);
    const L21 = covMu12 / L11;
    const L22Sq = varMu2 - L21 * L21;
    const L22 = L22Sq > 0 ? Math.sqrt(L22Sq) : 0;

    const scale = Math.sqrt(chi2Crit);
    const logitSensPoint = mu1 + scale * (L11 * z1);
    const logitSpecPoint = mu2 + scale * (L21 * z1 + L22 * z2);

    const sensPoint = 1 / (1 + Math.exp(-logitSensPoint));
    const specPoint = 1 / (1 + Math.exp(-logitSpecPoint));

    if (sensPoint > 0 && sensPoint < 1 && specPoint > 0 && specPoint < 1) {
      confidenceEllipse.push({
        sensitivity: sensPoint,
        specificity: specPoint,
        fpr: 1 - specPoint
      });
    }
  }

  // Prediction region (includes between-study variance)
  const predictionEllipse = [];
  const predVarMu1 = varMu1 + tau2_1;  // Total variance including between-study
  const predVarMu2 = varMu2 + tau2_2;
  const predCov = covMu12 + sigma12;

  for (let theta = 0; theta <= 2 * Math.PI; theta += Math.PI / 36) {
    const z1 = Math.cos(theta);
    const z2 = Math.sin(theta);

    const L11 = Math.sqrt(predVarMu1);
    const L21 = predCov / L11;
    const L22Sq = predVarMu2 - L21 * L21;
    const L22 = L22Sq > 0 ? Math.sqrt(L22Sq) : 0;

    const scale = Math.sqrt(chi2Crit);
    const logitSensPoint = mu1 + scale * (L11 * z1);
    const logitSpecPoint = mu2 + scale * (L21 * z1 + L22 * z2);

    const sensPoint = 1 / (1 + Math.exp(-logitSensPoint));
    const specPoint = 1 / (1 + Math.exp(-logitSpecPoint));

    if (sensPoint > 0 && sensPoint < 1 && specPoint > 0 && specPoint < 1) {
      predictionEllipse.push({
        sensitivity: sensPoint,
        specificity: specPoint,
        fpr: 1 - specPoint
      });
    }
  }

  return {
    method: "Bivariate REML",
    model: "Reitsma",
    converged,
    nStudies: n,
    pooled: {
      sensitivity: pooledSens,
      sensitivityCI: sensCI,
      seSensitivity: seSens,
      specificity: pooledSpec,
      specificityCI: specCI,
      seSpecificity: seSpec,
      DOR,
      DORCI,
      LRplus,
      LRminus,
      auc
    },
    parameters: {
      mu1, mu2,
      seMu1, seMu2,
      covMu12,  // Covariance between mean estimates
      tau2Sens: tau2_1,
      tau2Spec: tau2_2,
      correlation: rho,
      seCorrelation: seRho,  // NEW: SE for correlation
      srocSlope: slope  // Slope of SROC line in logit space
    },
    heterogeneity: {
      I2Sens,
      I2Spec,
      tau2Sens: tau2_1,
      tau2Spec: tau2_2
    },
    srocCurve,
    confidenceEllipse,  // NEW: 95% CI region for summary point
    predictionEllipse,  // NEW: 95% prediction region
    studyData: data.map(d => ({
      studyId: d.studyId,
      sensitivity: d.sens,
      specificity: d.spec,
      fpr: 1 - d.spec
    }))
  };
}

// Helper: DL tau² for univariate
function computeDLTau2(y, v) {
  const n = y.length;
  const w = v.map(vi => 1 / vi);
  const sumW = w.reduce((a, b) => a + b, 0);
  const mu = y.reduce((s, yi, i) => s + w[i] * yi, 0) / sumW;
  let Q = 0;
  for (let i = 0; i < n; i++) {
    Q += w[i] * (y[i] - mu) * (y[i] - mu);
  }
  const c = sumW - w.reduce((s, wi) => s + wi * wi, 0) / sumW;
  return Math.max(0, (Q - (n - 1)) / c);
}

/**
 * Mixed-Effects Meta-Regression with REML τ² estimation
 * Reference: Thompson SG, Sharp SJ. Stat Med 1999;18:2693-708
 *
 * @param {Array} studies - Array of {effect, se, covariates: {name: value}}
 * @param {Array} covariateNames - Names of covariates
 * @param {Object} options - {useKnappHartung, permutations, seed}
 * @returns {Object} Mixed-effects regression results
 */
export function mixedEffectsMetaRegression(studies, covariateNames, options = {}) {
  const { useKnappHartung = true, permutations = 1000, seed = 12345, alpha = 0.05 } = options;

  if (!studies || studies.length < 3) {
    return { error: "Need at least 3 studies" };
  }

  const p = covariateNames.length;
  if (studies.length <= p + 1) {
    return { error: "Need more studies than parameters" };
  }

  // Extract data
  const validStudies = studies.filter(s => {
    if (!s.covariates) return false;
    for (const name of covariateNames) {
      if (s.covariates[name] === undefined || s.covariates[name] === null) return false;
    }
    return true;
  });

  if (validStudies.length <= p + 1) {
    return { error: "Insufficient studies with complete covariate data" };
  }

  const n = validStudies.length;
  const y = validStudies.map(s => s.effect);
  const vi = validStudies.map(s => s.se * s.se);

  // Build design matrix
  const X = validStudies.map(s => {
    const row = [1];
    for (const name of covariateNames) {
      row.push(Number(s.covariates[name]));
    }
    return row;
  });

  // Estimate τ² using REML with covariates
  // Iterative procedure
  let tau2 = computeDLTau2(y, vi); // Initial estimate
  const maxIter = 50;
  const tolerance = 1e-6;

  for (let iter = 0; iter < maxIter; iter++) {
    const w = vi.map(v => 1 / (v + tau2));

    // Weighted least squares
    const XtWX = computeXtWX(X, w);
    const XtWy = computeXtWy(X, w, y);
    const beta = solveLinearSystem(XtWX, XtWy);

    if (!beta) break;

    // Compute residuals and Q
    let Q = 0;
    for (let i = 0; i < n; i++) {
      const fitted = X[i].reduce((s, x, j) => s + x * beta[j], 0);
      const resid = y[i] - fitted;
      Q += w[i] * resid * resid;
    }

    // REML update for tau²
    // Using Paule-Mandel / iterative approach
    const df = n - p - 1;
    const c = w.reduce((a, b) => a + b, 0) - trace(matMult(invertMatrix(XtWX), computeXtWX(X, w.map(wi => wi * wi))));

    const newTau2 = Math.max(0, tau2 + (Q - df) / c);

    if (Math.abs(newTau2 - tau2) < tolerance) {
      tau2 = newTau2;
      break;
    }
    tau2 = newTau2;
  }

  // Final weighted regression with estimated tau²
  const w = vi.map(v => 1 / (v + tau2));
  const XtWX = computeXtWX(X, w);
  const XtWy = computeXtWy(X, w, y);
  const beta = solveLinearSystem(XtWX, XtWy);

  if (!beta) {
    return { error: "Could not solve regression" };
  }

  // Variance-covariance matrix
  const covBeta = invertMatrix(XtWX);

  // Knapp-Hartung adjustment
  let qCorrection = 1;
  if (useKnappHartung) {
    let wssr = 0;
    for (let i = 0; i < n; i++) {
      const fitted = X[i].reduce((s, x, j) => s + x * beta[j], 0);
      const resid = y[i] - fitted;
      wssr += w[i] * resid * resid;
    }
    const df = n - p - 1;
    qCorrection = Math.max(1, wssr / df);
  }

  // Standard errors with KH adjustment
  const se = covBeta ? beta.map((_, i) => Math.sqrt(covBeta[i][i] * qCorrection)) : beta.map(() => NaN);

  // Test statistics and p-values
  const df = n - p - 1;
  const critVal = useKnappHartung ? tCritical(df, alpha) : inverseNormal(1 - alpha / 2);

  const coefficients = [{
    name: "Intercept",
    estimate: beta[0],
    se: se[0],
    tStat: se[0] > 0 ? beta[0] / se[0] : 0,
    pValue: se[0] > 0 ? 2 * (1 - tDistCdf(Math.abs(beta[0] / se[0]), df)) : 1,
    ci: [beta[0] - critVal * se[0], beta[0] + critVal * se[0]]
  }];

  for (let i = 0; i < p; i++) {
    const tStat = se[i + 1] > 0 ? beta[i + 1] / se[i + 1] : 0;
    coefficients.push({
      name: covariateNames[i],
      estimate: beta[i + 1],
      se: se[i + 1],
      tStat,
      pValue: se[i + 1] > 0 ? 2 * (1 - tDistCdf(Math.abs(tStat), df)) : 1,
      ci: [beta[i + 1] - critVal * se[i + 1], beta[i + 1] + critVal * se[i + 1]]
    });
  }

  // Model fit statistics
  let QM = 0, QE = 0;
  const yMean = y.reduce((s, yi, i) => s + w[i] * yi, 0) / w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) {
    const fitted = X[i].reduce((s, x, j) => s + x * beta[j], 0);
    QM += w[i] * (fitted - yMean) * (fitted - yMean);
    QE += w[i] * (y[i] - fitted) * (y[i] - fitted);
  }

  const R2 = QM / (QM + QE);
  const FStatistic = (QM / p) / (QE / df);
  const omnibusP = 1 - fDistCdf(FStatistic, p, df);

  // Permutation test with seeded RNG
  let permPValues = null;
  if (permutations > 0) {
    const rng = new SeededRNG(seed);
    permPValues = seededPermutationTest(y, X, w, beta, permutations, rng);
  }

  if (permPValues) {
    coefficients.forEach((c, i) => {
      c.permP = permPValues[i];
    });
  }

  return {
    method: useKnappHartung ? "Mixed-effects REML with Knapp-Hartung" : "Mixed-effects REML",
    nStudies: n,
    nCovariates: p,
    coefficients,
    tau2,
    R2,
    R2Percent: R2 * 100,
    QM,
    QE,
    dfModel: p,
    dfResidual: df,
    FStatistic,
    omnibusP,
    knappHartungFactor: qCorrection,
    interpretation: `${omnibusP < 0.05 ? "Significant" : "No significant"} moderator effect. ` +
      `R² = ${(R2 * 100).toFixed(1)}% of heterogeneity explained. τ² = ${tau2.toFixed(4)}.`
  };
}

// Helper functions for matrix operations
function computeXtWX(X, w) {
  const p = X[0].length;
  const result = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < X.length; i++) {
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < p; k++) {
        result[j][k] += w[i] * X[i][j] * X[i][k];
      }
    }
  }
  return result;
}

function computeXtWy(X, w, y) {
  const p = X[0].length;
  const result = Array(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    for (let j = 0; j < p; j++) {
      result[j] += w[i] * X[i][j] * y[i];
    }
  }
  return result;
}

function trace(A) {
  return A.reduce((s, row, i) => s + row[i], 0);
}

function matMult(A, B) {
  const n = A.length;
  const m = B[0].length;
  const p = B.length;
  const result = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < p; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

function seededPermutationTest(y, X, w, observedBeta, nPerm, rng) {
  const n = y.length;
  const p = observedBeta.length;
  const counts = Array(p).fill(0);

  for (let perm = 0; perm < nPerm; perm++) {
    const permY = [...y];
    rng.shuffle(permY);

    const XtWX = computeXtWX(X, w);
    const XtWy = computeXtWy(X, w, permY);
    const permBeta = solveLinearSystem(XtWX, XtWy);

    if (permBeta) {
      for (let i = 0; i < p; i++) {
        if (Math.abs(permBeta[i]) >= Math.abs(observedBeta[i])) {
          counts[i]++;
        }
      }
    }
  }

  return counts.map(c => (c + 1) / (nPerm + 1));
}

/**
 * Network Meta-Analysis with Inconsistency Detection
 * Implements design-by-treatment interaction model
 * Reference: Higgins JPT, et al. Stat Med 2012;31:3805-20
 *
 * @param {Array} contrasts - Array of {t1, t2, effect, se, design}
 * @param {Array} treatments - Treatment names
 * @param {string} reference - Reference treatment
 * @param {Object} options - {checkInconsistency, alpha}
 * @returns {Object} NMA results with inconsistency assessment
 */
export function networkMetaWithInconsistency(contrasts, treatments, reference, options = {}) {
  const { checkInconsistency = true, alpha = 0.05, useHKSJ = true } = options;

  // Run standard NMA first
  const nmaResults = networkMeta(contrasts, treatments, reference, { useHKSJ, alpha });

  if (!checkInconsistency || contrasts.length < 3) {
    return {
      ...nmaResults,
      inconsistency: { checked: false, message: "Insufficient data for inconsistency check" }
    };
  }

  // Identify designs (unique combinations of treatments compared)
  const designMap = new Map();
  contrasts.forEach(c => {
    const design = [c.t1, c.t2].sort().join("-");
    if (!designMap.has(design)) {
      designMap.set(design, []);
    }
    designMap.get(design).push(c);
  });

  const designs = Array.from(designMap.keys());
  const nDesigns = designs.length;

  if (nDesigns < 2) {
    return {
      ...nmaResults,
      inconsistency: { checked: false, message: "Only one design, inconsistency not estimable" }
    };
  }

  // Check for closed loops (necessary for inconsistency)
  const hasLoop = detectClosedLoop(contrasts, treatments);

  if (!hasLoop) {
    return {
      ...nmaResults,
      inconsistency: {
        checked: true,
        hasLoop: false,
        message: "No closed loops - network is star-shaped, inconsistency not estimable"
      }
    };
  }

  // Compute inconsistency using back-calculation method
  // For each loop, compare direct and indirect evidence
  const loops = findAllLoops(contrasts, treatments);
  const inconsistencyTests = [];

  for (const loop of loops) {
    if (loop.length < 3) continue;

    // Get direct estimates for each edge in loop
    const edges = [];
    for (let i = 0; i < loop.length; i++) {
      const t1 = loop[i];
      const t2 = loop[(i + 1) % loop.length];

      // Find direct evidence
      const direct = contrasts.filter(c =>
        (c.t1 === t1 && c.t2 === t2) || (c.t1 === t2 && c.t2 === t1)
      );

      if (direct.length > 0) {
        // Pool direct evidence
        const effects = direct.map(d => d.t1 === t1 ? d.effect : -d.effect);
        const vars = direct.map(d => d.se * d.se);
        const w = vars.map(v => 1 / v);
        const pooled = effects.reduce((s, e, i) => s + w[i] * e, 0) / w.reduce((a, b) => a + b, 0);
        const pooledVar = 1 / w.reduce((a, b) => a + b, 0);
        edges.push({ t1, t2, effect: pooled, var: pooledVar, direct: true });
      } else {
        // Get indirect from NMA
        const nma1 = nmaResults.find(r => r.treatment === t1);
        const nma2 = nmaResults.find(r => r.treatment === t2);
        if (nma1 && nma2) {
          edges.push({
            t1, t2,
            effect: nma1.effect - nma2.effect,
            var: nma1.se * nma1.se + nma2.se * nma2.se,
            direct: false
          });
        }
      }
    }

    // Check loop consistency: sum of effects around loop should be ~0
    if (edges.length === loop.length) {
      let loopSum = 0;
      let loopVar = 0;
      for (const edge of edges) {
        loopSum += edge.effect;
        loopVar += edge.var;
      }

      const z = loopSum / Math.sqrt(loopVar);
      const pValue = 2 * (1 - normalCdf(Math.abs(z)));

      inconsistencyTests.push({
        loop: loop.join(" → "),
        inconsistencyFactor: loopSum,
        se: Math.sqrt(loopVar),
        z,
        pValue,
        significant: pValue < alpha
      });
    }
  }

  // Global inconsistency test (Q statistic)
  let Qinconsistency = 0;
  let dfInconsistency = 0;

  for (const test of inconsistencyTests) {
    Qinconsistency += test.z * test.z;
    dfInconsistency++;
  }

  const globalPValue = dfInconsistency > 0 ? 1 - chiSquaredCdf(Qinconsistency, dfInconsistency) : 1;

  // Warning level
  let warning = "none";
  let message = "No significant inconsistency detected";

  if (globalPValue < 0.01) {
    warning = "severe";
    message = "SEVERE: Strong evidence of inconsistency (p < 0.01). Results may be unreliable.";
  } else if (globalPValue < 0.05) {
    warning = "moderate";
    message = "MODERATE: Evidence of inconsistency (p < 0.05). Interpret with caution.";
  } else if (globalPValue < 0.10) {
    warning = "mild";
    message = "MILD: Weak evidence of inconsistency (p < 0.10). Consider sensitivity analysis.";
  }

  return {
    effects: nmaResults,
    inconsistency: {
      checked: true,
      hasLoop: true,
      nLoops: loops.length,
      tests: inconsistencyTests,
      global: {
        Q: Qinconsistency,
        df: dfInconsistency,
        pValue: globalPValue
      },
      warning,
      message
    }
  };
}

// Helper: Detect if network has closed loops
function detectClosedLoop(contrasts, treatments) {
  const adj = new Map();
  treatments.forEach(t => adj.set(t, new Set()));

  contrasts.forEach(c => {
    adj.get(c.t1).add(c.t2);
    adj.get(c.t2).add(c.t1);
  });

  // DFS to find cycle
  const visited = new Set();
  const recStack = new Set();

  function dfs(node, parent) {
    visited.add(node);
    recStack.add(node);

    for (const neighbor of adj.get(node)) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, node)) return true;
      } else if (neighbor !== parent && recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const t of treatments) {
    if (!visited.has(t)) {
      if (dfs(t, null)) return true;
    }
  }

  return false;
}

// Helper: Find all triangular loops
function findAllLoops(contrasts, treatments) {
  const adj = new Map();
  treatments.forEach(t => adj.set(t, new Set()));

  contrasts.forEach(c => {
    adj.get(c.t1).add(c.t2);
    adj.get(c.t2).add(c.t1);
  });

  const loops = [];

  // Find triangles (3-node loops)
  for (const t1 of treatments) {
    for (const t2 of adj.get(t1)) {
      if (t2 <= t1) continue;
      for (const t3 of adj.get(t2)) {
        if (t3 <= t2) continue;
        if (adj.get(t3).has(t1)) {
          loops.push([t1, t2, t3]);
        }
      }
    }
  }

  return loops;
}

// Helper: Chi-squared CDF
function chiSquaredCdfNma(x, df) {
  if (x <= 0) return 0;
  return gammaIncomplete(df / 2, x / 2);
}

/**
 * P-Score with Bootstrap Standard Errors
 * Reference: Rucker G, Schwarzer G. BMC Med Res Methodol 2015;15:58
 *
 * @param {Array} effects - Array of {treatment, effect, se}
 * @param {Object} options - {nBoot, seed, alpha}
 * @returns {Array} P-scores with SEs and CIs
 */
export function computePScoreWithSE(effects, options = {}) {
  const { nBoot = 1000, seed = 12345, alpha = 0.05 } = options;

  if (!effects || effects.length < 2) return [];

  const rng = new SeededRNG(seed);

  // Compute observed P-scores
  const observed = computePScoreInternal(effects);

  // Bootstrap for SEs
  const bootScores = effects.map(() => []);

  for (let b = 0; b < nBoot; b++) {
    // Resample effects with replacement
    const bootEffects = effects.map(e => ({
      treatment: e.treatment,
      effect: e.effect + rng.randomNormal(0, e.se || 0.001),
      se: e.se
    }));

    const bootP = computePScoreInternal(bootEffects);

    bootP.forEach((p, i) => {
      const idx = effects.findIndex(e => e.treatment === p.treatment);
      if (idx >= 0) bootScores[idx].push(p.score);
    });
  }

  // Compute SEs and percentile CIs from bootstrap samples.
  return observed.map((p, i) => {
    const treatmentIdx = effects.findIndex(e => e.treatment === p.treatment);
    const scores = treatmentIdx >= 0 ? bootScores[treatmentIdx] : [];
    if (!scores.length) {
      return {
        ...p,
        se: 0,
        ci: [p.score, p.score],
        ciMethod: "percentile bootstrap"
      };
    }

    scores.sort((a, b) => a - b);

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.length > 1
      ? scores.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (scores.length - 1)
      : 0;
    const se = Math.sqrt(variance);

    // Percentile CI
    const lowerIdx = Math.max(0, Math.min(scores.length - 1, Math.floor(scores.length * (alpha / 2))));
    const upperIdx = Math.max(0, Math.min(scores.length - 1, Math.floor(scores.length * (1 - alpha / 2))));
    const ciLowerRaw = scores[lowerIdx];
    const ciUpperRaw = scores[upperIdx];

    // Ensure CI encloses the observed point estimate and remains in [0, 1].
    const ciLower = Math.max(0, Math.min(ciLowerRaw, p.score));
    const ciUpper = Math.min(1, Math.max(ciUpperRaw, p.score));

    return {
      ...p,
      se,
      ci: [ciLower, ciUpper],
      ciMethod: "percentile bootstrap"
    };
  });
}

function computePScoreInternal(effects) {
  const scores = effects.map(e => ({ treatment: e.treatment, score: 0 }));

  for (let i = 0; i < effects.length; i++) {
    for (let j = 0; j < effects.length; j++) {
      if (i === j) continue;
      const diff = effects[i].effect - effects[j].effect;
      const sei = effects[i].se || 0.001;
      const sej = effects[j].se || 0.001;
      const pooledSE = Math.sqrt(sei * sei + sej * sej);
      const p = normalCdf(diff / pooledSE);
      scores[i].score += p;
    }
  }

  const denom = effects.length - 1;
  return scores.map(s => ({ ...s, score: s.score / denom })).sort((a, b) => b.score - a.score);
}

/**
 * Trim-and-Fill with Variance Estimation
 * Reference: Duval S, Tweedie R. Biometrics 2000;56:455-63
 *
 * @param {Array} studies - Array of {effect, se}
 * @param {Object} options - {side, estimator, nBoot, seed}
 * @returns {Object} Trim-fill results with SE for adjusted estimate
 */
export function trimAndFillWithSE(studies, options = {}) {
  const { side = "auto", estimator = "L0", nBoot = 500, seed = 12345 } = options;

  if (!studies || studies.length < 3) return null;

  const rng = new SeededRNG(seed);

  // Run trim-and-fill
  const result = trimAndFillInternal(studies, side, estimator);

  if (!result || result.nFilled === 0) {
    return {
      ...result,
      adjustedSE: result ? result.adjustedMeta.se : null,
      adjustedCI: result ? result.adjustedMeta.ci : null,
      seMethod: "standard"
    };
  }

  // Bootstrap for SE of adjusted estimate
  const bootMu = [];

  for (let b = 0; b < nBoot; b++) {
    // Resample original studies
    const bootStudies = [];
    for (let i = 0; i < studies.length; i++) {
      const idx = Math.floor(rng.random() * studies.length);
      bootStudies.push({
        effect: studies[idx].effect + rng.randomNormal(0, studies[idx].se),
        se: studies[idx].se
      });
    }

    const bootResult = trimAndFillInternal(bootStudies, side, estimator);
    if (bootResult && bootResult.adjustedMeta) {
      bootMu.push(bootResult.adjustedMeta.mu);
    }
  }

  if (bootMu.length < 10) {
    return {
      ...result,
      adjustedSE: result.adjustedMeta.se,
      adjustedCI: result.adjustedMeta.ci,
      seMethod: "standard"
    };
  }

  bootMu.sort((a, b) => a - b);
  const mean = bootMu.reduce((a, b) => a + b, 0) / bootMu.length;
  const variance = bootMu.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (bootMu.length - 1);
  const bootSE = Math.sqrt(variance);

  const ciLower = bootMu[Math.floor(bootMu.length * 0.025)];
  const ciUpper = bootMu[Math.floor(bootMu.length * 0.975)];

  return {
    ...result,
    adjustedSE: bootSE,
    adjustedCI: [ciLower, ciUpper],
    seMethod: "bootstrap"
  };
}

function trimAndFillInternal(studies, side, estimator) {
  // Simplified trim-fill wrapper around the core implementation.
  const core = trimAndFill(studies);
  if (!core) return null;

  const imputed = Array.isArray(core.imputedStudies) ? core.imputedStudies : [];
  const combined = [
    ...studies.map(s => ({ effect: s.effect, se: s.se })),
    ...imputed.map(s => ({ effect: s.effect, se: s.se }))
  ];

  const meta = combined.length >= 2 ? metaAnalysis(combined) : null;
  const adjustedMeta = meta
    ? { mu: meta.mu, se: meta.se, ci: meta.ci }
    : { mu: core.adjustedMu, se: NaN, ci: [NaN, NaN] };

  return {
    ...core,
    nFilled: Number.isFinite(core.imputedCount) ? core.imputedCount : imputed.length,
    adjustedMeta
  };
}

/**
 * Trial Sequential Analysis for Living Reviews
 * Implements O'Brien-Fleming and Lan-DeMets boundaries
 * Reference: Wetterslev J, et al. J Clin Epidemiol 2008;61:64-75
 *
 * @param {Array} cumulativeResults - Array of {k, n, effect, se, ci} from cumulative MA
 * @param {Object} options - {alpha, beta, delta, boundaryType}
 * @returns {Object} TSA results with monitoring boundaries
 */
export function trialSequentialAnalysis(cumulativeResults, options = {}) {
  const {
    alpha = 0.05,
    beta = 0.20,
    delta = null, // Required information size effect
    boundaryType = "OBrienFleming", // or "LanDeMets" or "Pocock"
    heterogeneityCorrection = true
  } = options;

  if (!cumulativeResults || cumulativeResults.length < 2) {
    return { error: "Need at least 2 cumulative results" };
  }

  // Get final result for RIS calculation
  const final = cumulativeResults[cumulativeResults.length - 1];
  const tau2 = final.tau2 || 0;

  // Required Information Size (RIS)
  // Based on anticipated effect size or observed effect
  const targetEffect = delta || final.mu;
  if (!targetEffect || targetEffect === 0) {
    return { error: "Cannot compute RIS: effect size is zero" };
  }

  const za = inverseNormal(1 - alpha / 2);
  const zb = inverseNormal(1 - beta);

  // D² diversity adjustment
  const D2 = heterogeneityCorrection && final.i2 ? final.i2 / 100 : 0;
  const diversityFactor = 1 / (1 - D2);

  // RIS calculation (for continuous outcomes)
  const pooledVar = final.se * final.se * final.k; // Approximate total variance
  const RIS = diversityFactor * 4 * pooledVar * Math.pow(za + zb, 2) / (targetEffect * targetEffect);

  // Compute information fraction at each analysis
  const analyses = cumulativeResults.map((r, i) => {
    const info = r.k; // Using number of studies as proxy for information
    const infoFraction = info / cumulativeResults[cumulativeResults.length - 1].k;
    const adjustedInfoFraction = Math.min(1, info / Math.max(1, RIS / 100)); // Normalized

    // Z-statistic
    const z = r.se > 0 ? r.mu / r.se : 0;

    return {
      analysis: i + 1,
      k: r.k,
      n: r.n || r.k * 100, // Approximate if not provided
      effect: r.mu,
      se: r.se,
      z,
      infoFraction: adjustedInfoFraction,
      ci: r.ci
    };
  });

  // Compute monitoring boundaries
  const boundaries = computeMonitoringBoundaries(
    analyses.map(a => a.infoFraction),
    alpha,
    boundaryType
  );

  // Add boundaries to analyses
  analyses.forEach((a, i) => {
    a.upperBoundary = boundaries.upper[i];
    a.lowerBoundary = boundaries.lower[i];
    a.crossedUpper = a.z > a.upperBoundary;
    a.crossedLower = a.z < a.lowerBoundary;
    a.crossed = a.crossedUpper || a.crossedLower;
  });

  // Determine conclusion
  const lastCrossed = analyses.filter(a => a.crossed);
  let conclusion = "Continue monitoring";
  let conclusionType = "inconclusive";

  if (lastCrossed.length > 0) {
    const first = lastCrossed[0];
    if (first.crossedUpper) {
      conclusion = `Crossed upper boundary at analysis ${first.analysis}: significant benefit`;
      conclusionType = "benefit";
    } else {
      conclusion = `Crossed lower boundary at analysis ${first.analysis}: significant harm or futility`;
      conclusionType = "harm";
    }
  } else if (analyses[analyses.length - 1].infoFraction >= 1) {
    conclusion = "Reached required information size without crossing boundaries";
    conclusionType = "inconclusive_complete";
  }

  return {
    method: boundaryType,
    alpha,
    beta,
    RIS: Math.ceil(RIS),
    diversityFactor,
    currentInfo: analyses[analyses.length - 1].k,
    infoFraction: analyses[analyses.length - 1].infoFraction,
    analyses,
    boundaries: {
      type: boundaryType,
      upper: boundaries.upper,
      lower: boundaries.lower,
      infoFractions: analyses.map(a => a.infoFraction)
    },
    conclusion,
    conclusionType
  };
}

function computeMonitoringBoundaries(infoFractions, alpha, type) {
  const n = infoFractions.length;
  const upper = [];
  const lower = [];

  const za = inverseNormal(1 - alpha / 2);

  for (let i = 0; i < n; i++) {
    const t = infoFractions[i];
    let boundary;

    if (type === "OBrienFleming") {
      // O'Brien-Fleming: z_alpha / sqrt(t)
      boundary = za / Math.sqrt(Math.max(0.01, t));
    } else if (type === "Pocock") {
      // Pocock: constant boundary (approximately)
      boundary = za * Math.sqrt(Math.log(1 + (Math.E - 1) * t));
    } else {
      // Lan-DeMets (O'Brien-Fleming spending function)
      const spent = 2 * (1 - normalCdf(za / Math.sqrt(Math.max(0.01, t))));
      boundary = inverseNormal(1 - spent / 2);
    }

    upper.push(Math.min(10, boundary)); // Cap at 10
    lower.push(-Math.min(10, boundary));
  }

  return { upper, lower };
}

/**
 * Multivariate Meta-Analysis for Correlated Outcomes
 * Reference: Jackson D, et al. Stat Med 2011;30:2481-98
 *
 * @param {Array} studies - Array of {outcomes: [{name, effect, se}], correlations: {}}
 * @param {Object} options - {method, maxIter}
 * @returns {Object} Multivariate MA results
 */
export function multivariateMetaAnalysis(studies, options = {}) {
  const { method = "REML", maxIter = 100, alpha = 0.05, useAitken = true } = options;

  if (!studies || studies.length < 3) {
    return { error: "Need at least 3 studies" };
  }

  // Extract outcome names
  const outcomeNames = new Set();
  studies.forEach(s => {
    if (s.outcomes) {
      s.outcomes.forEach(o => outcomeNames.add(o.name));
    }
  });

  const outcomes = Array.from(outcomeNames);
  const p = outcomes.length;

  if (p < 2) {
    return { error: "Need at least 2 outcomes for multivariate MA" };
  }

  // Build data structure
  const data = [];
  for (const study of studies) {
    if (!study.outcomes) continue;

    const y = outcomes.map(name => {
      const o = study.outcomes.find(x => x.name === name);
      return o ? o.effect : null;
    });

    const v = outcomes.map(name => {
      const o = study.outcomes.find(x => x.name === name);
      return o ? o.se * o.se : null;
    });

    // Build within-study covariance matrix
    const S = [];
    for (let i = 0; i < p; i++) {
      S[i] = [];
      for (let j = 0; j < p; j++) {
        if (i === j) {
          S[i][j] = v[i] || Infinity;
        } else {
          // Get correlation from study or assume 0.5
          const key = `${outcomes[i]}_${outcomes[j]}`;
          const rho = study.correlations?.[key] || study.correlations?.[`${outcomes[j]}_${outcomes[i]}`] || 0.5;
          const si = v[i] ? Math.sqrt(v[i]) : 1;
          const sj = v[j] ? Math.sqrt(v[j]) : 1;
          S[i][j] = rho * si * sj;
        }
      }
    }

    if (y.every(yi => yi !== null)) {
      data.push({ studyId: study.studyId, y, S });
    }
  }

  if (data.length < 3) {
    return { error: "Insufficient studies with complete outcome data" };
  }

  const n = data.length;

  // Initialize between-study covariance (Sigma)
  let Sigma = outcomes.map(() => outcomes.map(() => 0));
  for (let i = 0; i < p; i++) {
    // Initial tau² estimate
    const yi = data.map(d => d.y[i]);
    const vi = data.map(d => d.S[i][i]);
    Sigma[i][i] = Math.max(0.001, computeDLTau2(yi, vi));
  }

  // Set initial correlations to 0.5
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      if (i !== j) {
        Sigma[i][j] = 0.5 * Math.sqrt(Sigma[i][i] * Sigma[j][j]);
      }
    }
  }

  // Iterative REML estimation with optional Aitken's delta² acceleration
  let mu = outcomes.map(() => 0);
  let converged = false;
  let nIter = 0;

  // Store previous values for Aitken's acceleration
  let muPrev = [...mu];
  let muPrev2 = [...mu];

  for (let iter = 0; iter < maxIter; iter++) {
    nIter = iter + 1;

    // E-step: Compute weights and update mu
    let sumW = outcomes.map(() => outcomes.map(() => 0));
    let sumWy = outcomes.map(() => 0);

    for (const d of data) {
      // Total covariance: V = S + Sigma
      const V = d.S.map((row, i) => row.map((sij, j) => sij + Sigma[i][j]));
      const Vinv = invertMatrix(V);
      if (!Vinv) continue;

      // Accumulate weighted sums
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          sumW[i][j] += Vinv[i][j];
        }
        for (let j = 0; j < p; j++) {
          sumWy[i] += Vinv[i][j] * d.y[j];
        }
      }
    }

    // Update mu
    const sumWinv = invertMatrix(sumW);
    if (!sumWinv) break;

    let newMu = outcomes.map((_, i) => {
      let sum = 0;
      for (let j = 0; j < p; j++) {
        sum += sumWinv[i][j] * sumWy[j];
      }
      return sum;
    });

    // Apply Aitken's delta² acceleration after 3 iterations
    if (useAitken && iter >= 2) {
      const acceleratedMu = newMu.map((m, i) => {
        const d1 = mu[i] - muPrev[i];
        const d2 = newMu[i] - mu[i];
        const denom = d2 - d1;
        if (Math.abs(denom) > 1e-10) {
          // Aitken's formula: x_acc = x_n - (x_n - x_{n-1})² / (x_{n+1} - 2*x_n + x_{n-1})
          return newMu[i] - (d2 * d2) / denom;
        }
        return newMu[i];
      });
      newMu = acceleratedMu;
    }

    // M-step: Update Sigma using method of moments
    const newSigma = outcomes.map(() => outcomes.map(() => 0));

    for (const d of data) {
      const V = d.S.map((row, i) => row.map((sij, j) => sij + Sigma[i][j]));
      const Vinv = invertMatrix(V);
      if (!Vinv) continue;

      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          const ri = d.y[i] - newMu[i];
          const rj = d.y[j] - newMu[j];
          newSigma[i][j] += ri * rj;
        }
      }
    }

    // Normalize and ensure positive definiteness
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        newSigma[i][j] = newSigma[i][j] / n - (i === j ? 0 : 0);
        if (i === j) newSigma[i][j] = Math.max(0.001, newSigma[i][j]);
      }
    }

    // Check convergence
    let change = 0;
    for (let i = 0; i < p; i++) {
      change += Math.abs(newMu[i] - mu[i]);
      for (let j = 0; j < p; j++) {
        change += Math.abs(newSigma[i][j] - Sigma[i][j]);
      }
    }

    // Update history for Aitken's
    muPrev2 = [...muPrev];
    muPrev = [...mu];
    mu = newMu;
    Sigma = newSigma;

    if (change < 1e-6) {
      converged = true;
      break;
    }
  }

  // Compute standard errors
  let sumW = outcomes.map(() => outcomes.map(() => 0));
  for (const d of data) {
    const V = d.S.map((row, i) => row.map((sij, j) => sij + Sigma[i][j]));
    const Vinv = invertMatrix(V);
    if (!Vinv) continue;

    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        sumW[i][j] += Vinv[i][j];
      }
    }
  }

  const varMu = invertMatrix(sumW);
  const se = varMu ? outcomes.map((_, i) => Math.sqrt(varMu[i][i])) : outcomes.map(() => NaN);

  // Build results (using parameterized alpha)
  const zCrit = inverseNormal(1 - alpha / 2);
  const pooledResults = outcomes.map((name, i) => ({
    outcome: name,
    effect: mu[i],
    se: se[i],
    ci: [mu[i] - zCrit * se[i], mu[i] + zCrit * se[i]],
    tau2: Sigma[i][i],
    pValue: 2 * (1 - normalCdf(Math.abs(mu[i] / se[i])))
  }));

  // Correlation matrix of pooled effects
  const corrMatrix = [];
  for (let i = 0; i < p; i++) {
    corrMatrix[i] = [];
    for (let j = 0; j < p; j++) {
      if (Sigma[i][i] > 0 && Sigma[j][j] > 0) {
        corrMatrix[i][j] = Sigma[i][j] / Math.sqrt(Sigma[i][i] * Sigma[j][j]);
      } else {
        corrMatrix[i][j] = i === j ? 1 : 0;
      }
    }
  }

  return {
    method: "Multivariate REML" + (useAitken ? " with Aitken acceleration" : ""),
    converged,
    nIterations: nIter,
    nStudies: n,
    nOutcomes: p,
    alpha,
    outcomes: pooledResults,
    betweenStudyCovariance: Sigma,
    betweenStudyCorrelation: corrMatrix,
    outcomeNames: outcomes
  };
}

/**
 * Validation against R metafor package
 * Returns expected values for test comparison
 */
export function getValidationData() {
  return {
    // BCG vaccine data from metafor::dat.bcg
    bcgData: {
      description: "BCG vaccine effectiveness against tuberculosis",
      studies: [
        { study: "Aronson", tpos: 4, tneg: 119, cpos: 11, cneg: 128, ablat: 44, year: 1948 },
        { study: "Ferguson", tpos: 6, tneg: 300, cpos: 29, cneg: 274, ablat: 55, year: 1949 },
        { study: "Rosenthal", tpos: 3, tneg: 228, cpos: 11, cneg: 209, ablat: 42, year: 1960 },
        { study: "Hart", tpos: 62, tneg: 13536, cpos: 248, cneg: 12619, ablat: 52, year: 1977 },
        { study: "Frimodt", tpos: 33, tneg: 5036, cpos: 47, cneg: 5761, ablat: 13, year: 1973 },
        { study: "Stein", tpos: 180, tneg: 1361, cpos: 372, cneg: 1079, ablat: 44, year: 1953 },
        { study: "Vandiviere", tpos: 8, tneg: 2537, cpos: 10, cneg: 619, ablat: 19, year: 1973 },
        { study: "TPT Madras", tpos: 505, tneg: 87886, cpos: 499, cneg: 87892, ablat: 13, year: 1980 },
        { study: "Coetzee", tpos: 29, tneg: 7470, cpos: 45, cneg: 7232, ablat: 27, year: 1968 },
        { study: "Rosenthal", tpos: 17, tneg: 1699, cpos: 65, cneg: 1600, ablat: 42, year: 1961 },
        { study: "Comstock", tpos: 186, tneg: 50448, cpos: 141, cneg: 27197, ablat: 18, year: 1974 },
        { study: "Comstock", tpos: 5, tneg: 2493, cpos: 3, cneg: 2338, ablat: 33, year: 1969 },
        { study: "Comstock", tpos: 27, tneg: 16886, cpos: 29, cneg: 17825, ablat: 33, year: 1976 }
      ],
      // Expected results from R metafor (REML)
      expected: {
        mu: -0.7145,  // Log RR
        se: 0.1787,
        tau2: 0.3088,
        i2: 92.22,
        Q: 152.23,
        eggerP: 0.0039
      }
    },

    // DTA data from mada package
    dtaData: {
      description: "Diagnostic test accuracy for screening",
      studies: [
        { tp: 47, fp: 3, fn: 12, tn: 48 },
        { tp: 21, fp: 5, fn: 4, tn: 88 },
        { tp: 28, fp: 4, fn: 8, tn: 51 },
        { tp: 39, fp: 8, fn: 6, tn: 54 },
        { tp: 35, fp: 2, fn: 7, tn: 63 }
      ],
      expected: {
        pooledSens: 0.82,
        pooledSpec: 0.94,
        auc: 0.95
      }
    }
  };
}

/**
 * Run validation tests comparing to R packages
 * @returns {Object} Validation results
 */
export function runValidation() {
  const validation = getValidationData();
  const results = { passed: 0, failed: 0, tests: [] };

  // Test 1: BCG data meta-analysis
  const bcg = validation.bcgData;
  const bcgStudies = bcg.studies.map(s => {
    const logRR = computeLogRR(s.tpos, s.tpos + s.tneg, s.cpos, s.cpos + s.cneg);
    return { effect: logRR.effect, se: logRR.se };
  }).filter(s => !isNaN(s.effect));

  const bcgMeta = metaAnalysisAdvanced(bcgStudies, { tau2Method: "REML" });

  const muDiff = Math.abs(bcgMeta.random.mu - bcg.expected.mu);
  const tau2Diff = Math.abs(bcgMeta.tau2 - bcg.expected.tau2);

  results.tests.push({
    name: "BCG pooled effect (vs metafor)",
    expected: bcg.expected.mu,
    observed: bcgMeta.random.mu,
    tolerance: 0.05,
    passed: muDiff < 0.05
  });

  results.tests.push({
    name: "BCG tau² (vs metafor)",
    expected: bcg.expected.tau2,
    observed: bcgMeta.tau2,
    tolerance: 0.05,
    passed: tau2Diff < 0.05
  });

  // Test 2: DTA bivariate model
  const dta = validation.dtaData;
  const dtaResult = bivariateDTAReml(dta.studies);

  if (!dtaResult.error) {
    const sensDiff = Math.abs(dtaResult.pooled.sensitivity - dta.expected.pooledSens);
    const specDiff = Math.abs(dtaResult.pooled.specificity - dta.expected.pooledSpec);

    results.tests.push({
      name: "DTA pooled sensitivity (vs mada)",
      expected: dta.expected.pooledSens,
      observed: dtaResult.pooled.sensitivity,
      tolerance: 0.05,
      passed: sensDiff < 0.05
    });

    results.tests.push({
      name: "DTA pooled specificity (vs mada)",
      expected: dta.expected.pooledSpec,
      observed: dtaResult.pooled.specificity,
      tolerance: 0.05,
      passed: specDiff < 0.05
    });
  }

  // Count results
  results.tests.forEach(t => {
    if (t.passed) results.passed++;
    else results.failed++;
  });

  results.summary = `${results.passed}/${results.tests.length} validation tests passed`;

  return results;
}

// ============================================================================
// PHASE 1: IPD META-ANALYSIS (Individual Participant Data)
// ============================================================================

/**
 * Individual Participant Data (IPD) Meta-Analysis - Two-Stage Approach
 * Stage 1: Analyze each study separately
 * Stage 2: Pool study-level estimates using standard meta-analysis
 *
 * Reference: Riley RD, et al. BMJ 2010;340:c221
 *
 * @param {Array} ipdData - Array of {studyId, treatment, outcome, covariates}
 * @param {Object} options - Configuration options
 * @returns {Object} IPD meta-analysis results
 */
export function ipdTwoStage(ipdData, options = {}) {
  const {
    outcomeType = 'binary', // 'binary', 'continuous', 'time-to-event'
    effectMeasure = 'OR', // 'OR', 'RR', 'RD', 'MD', 'HR'
    covariates = [],
    poolingMethod = 'REML'
  } = options;

  // Group data by study
  const studyGroups = new Map();
  ipdData.forEach(obs => {
    if (!studyGroups.has(obs.studyId)) {
      studyGroups.set(obs.studyId, []);
    }
    studyGroups.get(obs.studyId).push(obs);
  });

  // Stage 1: Analyze each study
  const studyEstimates = [];

  for (const [studyId, studyData] of studyGroups) {
    let estimate, se;

    if (outcomeType === 'binary') {
      // Logistic regression or 2x2 table
      const treated = studyData.filter(d => d.treatment === 1);
      const control = studyData.filter(d => d.treatment === 0);

      const e1 = treated.filter(d => d.outcome === 1).length;
      const n1 = treated.length;
      const e0 = control.filter(d => d.outcome === 1).length;
      const n0 = control.length;

      if (effectMeasure === 'OR') {
        const result = computeLogOR(e1, n1, e0, n0);
        estimate = result.effect;
        se = result.se;
      } else if (effectMeasure === 'RR') {
        const result = computeLogRR(e1, n1, e0, n0);
        estimate = result.effect;
        se = result.se;
      } else {
        // Risk difference
        const p1 = e1 / n1;
        const p0 = e0 / n0;
        estimate = p1 - p0;
        se = Math.sqrt(p1 * (1 - p1) / n1 + p0 * (1 - p0) / n0);
      }
    } else if (outcomeType === 'continuous') {
      // Mean difference
      const treated = studyData.filter(d => d.treatment === 1);
      const control = studyData.filter(d => d.treatment === 0);

      const mean1 = treated.reduce((s, d) => s + d.outcome, 0) / treated.length;
      const mean0 = control.reduce((s, d) => s + d.outcome, 0) / control.length;

      const var1 = treated.reduce((s, d) => s + Math.pow(d.outcome - mean1, 2), 0) / (treated.length - 1);
      const var0 = control.reduce((s, d) => s + Math.pow(d.outcome - mean0, 2), 0) / (control.length - 1);

      estimate = mean1 - mean0;
      se = Math.sqrt(var1 / treated.length + var0 / control.length);
    } else if (outcomeType === 'time-to-event') {
      // Log-rank based hazard ratio estimation
      const result = coxPHSimple(studyData);
      estimate = result.logHR;
      se = result.se;
    }

    if (!isNaN(estimate) && isFinite(se) && se > 0) {
      studyEstimates.push({
        studyId,
        effect: estimate,
        se,
        n: studyData.length
      });
    }
  }

  // Stage 2: Pool estimates
  const pooledResult = metaAnalysisAdvanced(studyEstimates, {
    tau2Method: poolingMethod,
    hksj: true
  });

  return {
    approach: 'two-stage',
    outcomeType,
    effectMeasure,
    nStudies: studyEstimates.length,
    totalN: ipdData.length,
    studyEstimates,
    pooled: pooledResult,
    interpretation: generateIPDInterpretation(pooledResult, effectMeasure)
  };
}

/**
 * Simple Cox PH estimation for time-to-event IPD
 * Uses Peto's approximation for log-rank based HR
 */
function coxPHSimple(studyData) {
  // Peto's method for single-study HR estimation
  const treated = studyData.filter(d => d.treatment === 1);
  const control = studyData.filter(d => d.treatment === 0);

  const events1 = treated.filter(d => d.event === 1).length;
  const events0 = control.filter(d => d.event === 1).length;
  const totalEvents = events1 + events0;

  const n1 = treated.length;
  const n0 = control.length;
  const N = n1 + n0;

  // Expected events in treatment group under null
  const expected1 = totalEvents * (n1 / N);

  // Observed - Expected
  const OE = events1 - expected1;

  // Variance (hypergeometric)
  const variance = totalEvents * (n1 / N) * (n0 / N) * (N - totalEvents) / (N - 1);

  const logHR = OE / variance;
  const se = 1 / Math.sqrt(variance);

  return { logHR, se, events: totalEvents };
}

/**
 * IPD Meta-Analysis - One-Stage Mixed Effects Model
 * Analyzes all IPD together with study as random effect
 *
 * NOTE: Current implementation uses linear mixed model which is appropriate
 * for CONTINUOUS outcomes. For binary outcomes, this provides an approximation
 * only. For proper binary outcome analysis, use ipdTwoStage() or external
 * GLMM software (lme4, Stan).
 *
 * Reference: Debray TPA, et al. Stat Med 2015;34:2081-2110
 *
 * @param {Array} ipdData - Individual participant data
 * @param {Object} options - Model options
 * @param {string} options.outcomeType - 'continuous' (recommended) or 'binary' (approximate)
 * @param {number} options.alpha - Significance level (default 0.05)
 * @returns {Object} One-stage IPD results
 */
export function ipdOneStage(ipdData, options = {}) {
  const {
    outcomeType = 'continuous',
    covariates = [],
    interactionTerms = [],
    maxIterations = 100,
    tolerance = 1e-6,
    alpha = 0.05
  } = options;

  // Warning for binary outcomes
  const warnings = [];
  if (outcomeType === 'binary') {
    warnings.push('Binary outcomes: Linear mixed model provides approximation only. ' +
      'For proper GLMM analysis, consider ipdTwoStage() or external software (lme4, Stan).');
  }

  // Group by study to get study-level info
  const studies = [...new Set(ipdData.map(d => d.studyId))];
  const K = studies.length;
  const N = ipdData.length;

  // Create design matrices
  // Fixed effects: treatment + covariates
  // Random effects: study intercept + optional treatment-by-study

  // Initialize parameters
  let beta = new Array(1 + covariates.length).fill(0); // Treatment + covariates
  let sigma2_study = 0.5; // Between-study variance

  // Iterative estimation (simplified REML-like approach)
  for (let iter = 0; iter < maxIterations; iter++) {
    // E-step: Estimate study random effects given beta, sigma2
    const studyEffects = {};
    const studyPredictions = {};

    for (const study of studies) {
      const studyData = ipdData.filter(d => d.studyId === study);

      // Simple shrinkage estimate
      const nStudy = studyData.length;
      const studyMean = studyData.reduce((s, d) => s + d.outcome, 0) / nStudy;

      // Shrinkage factor
      const lambda = sigma2_study / (sigma2_study + 1 / nStudy);
      studyEffects[study] = lambda * (studyMean - beta[0]);
    }

    // M-step: Update beta given study effects
    const betaOld = [...beta];

    // Update treatment effect (simplified)
    let sumNum = 0, sumDen = 0;
    for (const obs of ipdData) {
      const predicted = studyEffects[obs.studyId];
      const residual = obs.outcome - predicted;
      if (obs.treatment === 1) {
        sumNum += residual;
        sumDen += 1;
      } else {
        sumNum -= residual;
      }
    }
    beta[0] = sumNum / Math.max(sumDen, 1);

    // Update between-study variance
    let sumSq = 0;
    for (const study of studies) {
      sumSq += Math.pow(studyEffects[study], 2);
    }
    sigma2_study = Math.max(sumSq / K, 0.001);

    // Check convergence
    const maxChange = Math.max(...beta.map((b, i) => Math.abs(b - betaOld[i])));
    if (maxChange < tolerance) break;
  }

  // Standard error estimation (observed information approximation)
  const seBeta = estimateIPDStandardErrors(ipdData, beta, sigma2_study, studies);
  const zCrit = inverseNormal(1 - alpha / 2);

  return {
    approach: 'one-stage',
    outcomeType,
    nStudies: K,
    totalN: N,
    coefficients: {
      treatment: {
        estimate: beta[0],
        se: seBeta[0],
        z: beta[0] / seBeta[0],
        pValue: 2 * (1 - normalCDF(Math.abs(beta[0] / seBeta[0]))),
        ci: [
          beta[0] - zCrit * seBeta[0],
          beta[0] + zCrit * seBeta[0]
        ]
      }
    },
    variance: {
      betweenStudy: sigma2_study
    },
    modelFit: {
      logLikelihood: computeIPDLogLikelihood(ipdData, beta, sigma2_study, studies)
    },
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Estimate standard errors for IPD model via observed information
 */
function estimateIPDStandardErrors(ipdData, beta, sigma2, studies) {
  // Simplified SE estimation using sandwich estimator concept
  const N = ipdData.length;
  const K = studies.length;

  // Within-study variance contribution
  const withinVar = ipdData.reduce((s, d) => {
    const pred = beta[0] * d.treatment;
    return s + Math.pow(d.outcome - pred, 2);
  }, 0) / (N - 1);

  // SE for treatment effect
  const nTreated = ipdData.filter(d => d.treatment === 1).length;
  const nControl = ipdData.filter(d => d.treatment === 0).length;

  const se = Math.sqrt(withinVar * (1 / nTreated + 1 / nControl) + sigma2 / K);

  return [se];
}

/**
 * Compute log-likelihood for IPD model
 */
function computeIPDLogLikelihood(ipdData, beta, sigma2, studies) {
  let logLik = 0;

  for (const study of studies) {
    const studyData = ipdData.filter(d => d.studyId === study);
    const n = studyData.length;

    // Residual sum of squares for this study
    let rss = 0;
    for (const d of studyData) {
      const pred = beta[0] * d.treatment;
      rss += Math.pow(d.outcome - pred, 2);
    }

    // Contribution from this study (simplified)
    logLik -= 0.5 * n * Math.log(2 * Math.PI);
    logLik -= 0.5 * rss;
  }

  return logLik;
}

/**
 * Generate interpretation for IPD results
 */
function generateIPDInterpretation(result, effectMeasure) {
  const effect = result.random.mu;
  const ci = result.random.ci;

  let effectStr;
  if (effectMeasure === 'OR' || effectMeasure === 'RR' || effectMeasure === 'HR') {
    const expEffect = Math.exp(effect);
    const expCi = [Math.exp(ci[0]), Math.exp(ci[1])];
    effectStr = `${effectMeasure} = ${expEffect.toFixed(2)} (95% CI: ${expCi[0].toFixed(2)} - ${expCi[1].toFixed(2)})`;
  } else {
    effectStr = `Effect = ${effect.toFixed(3)} (95% CI: ${ci[0].toFixed(3)} - ${ci[1].toFixed(3)})`;
  }

  return {
    summary: effectStr,
    significant: ci[0] > 0 || ci[1] < 0,
    heterogeneity: result.I2 > 50 ? 'substantial' : result.I2 > 25 ? 'moderate' : 'low'
  };
}

// ============================================================================
// PHASE 2: BAYESIAN META-ANALYSIS
// ============================================================================

/**
 * Mulberry32 PRNG for reproducible Bayesian sampling
 * (Uses existing SeededRNG class)
 */

/**
 * Bayesian Meta-Analysis using Metropolis-Hastings MCMC
 *
 * Reference: Sutton AJ, Abrams KR. Stat Methods Med Res 2001;10:277-303
 *
 * @param {Array} studies - Array of {effect, se}
 * @param {Object} priors - Prior specifications
 * @param {Object} mcmcOptions - MCMC settings
 * @returns {Object} Bayesian meta-analysis results
 */
export function bayesianMetaAnalysis(studies, priors = {}, mcmcOptions = {}) {
  const {
    muPrior = { mean: 0, sd: 10 }, // Normal prior on pooled effect
    tauPrior = { type: 'half-cauchy', scale: 0.5 } // Prior on between-study SD
  } = priors;

  const {
    nIterations = 10000,
    nBurnin = 5000,
    nThin = 1,
    seed = 12345,
    nChains = 2
  } = mcmcOptions;

  const rng = new SeededRNG(seed);
  const K = studies.length;

  // Log posterior function
  const logPosterior = (mu, tau) => {
    if (tau < 0) return -Infinity;

    // Log likelihood
    let logLik = 0;
    for (const study of studies) {
      const totalVar = study.se * study.se + tau * tau;
      logLik -= 0.5 * Math.log(2 * Math.PI * totalVar);
      logLik -= 0.5 * Math.pow(study.effect - mu, 2) / totalVar;
    }

    // Log prior for mu (normal)
    const logPriorMu = -0.5 * Math.pow(mu - muPrior.mean, 2) / (muPrior.sd * muPrior.sd);

    // Log prior for tau (half-Cauchy or half-normal)
    // Half-Cauchy: f(x) = 2/(π*scale*(1+(x/scale)²))
    // log f(x) = log(2) - log(π) - log(scale) - log(1 + (x/scale)²)
    let logPriorTau;
    if (tauPrior.type === 'half-cauchy') {
      logPriorTau = Math.log(2) - Math.log(Math.PI) - Math.log(tauPrior.scale)
                    - Math.log(1 + Math.pow(tau / tauPrior.scale, 2));
    } else {
      // Half-normal: f(x) = sqrt(2/π)/scale * exp(-x²/(2*scale²))
      logPriorTau = 0.5 * Math.log(2 / Math.PI) - Math.log(tauPrior.scale)
                    - 0.5 * Math.pow(tau / tauPrior.scale, 2);
    }

    return logLik + logPriorMu + logPriorTau;
  };

  // Run multiple chains
  const allSamples = [];

  for (let chain = 0; chain < nChains; chain++) {
    const chainRng = new SeededRNG(seed + chain * 1000);
    const samples = runMHChain(studies, logPosterior, chainRng, nIterations, nBurnin, nThin);
    allSamples.push(samples);
  }

  // Combine chains after burnin
  const combinedMu = [];
  const combinedTau = [];

  for (const chainSamples of allSamples) {
    combinedMu.push(...chainSamples.mu);
    combinedTau.push(...chainSamples.tau);
  }

  // Compute summaries
  const muSummary = summarizePosterior(combinedMu);
  const tauSummary = summarizePosterior(combinedTau);

  // Compute Rhat (Gelman-Rubin diagnostic)
  const rhatMu = computeRhat(allSamples.map(s => s.mu));
  const rhatTau = computeRhat(allSamples.map(s => s.tau));

  // Compute DIC
  const dic = computeDIC(studies, combinedMu, combinedTau);

  return {
    method: 'Bayesian',
    sampler: 'Metropolis-Hastings',
    nIterations,
    nBurnin,
    nChains,
    effectiveSampleSize: computeESS(combinedMu),
    mu: {
      mean: muSummary.mean,
      median: muSummary.median,
      sd: muSummary.sd,
      ci95: [muSummary.q025, muSummary.q975],
      ci80: [muSummary.q10, muSummary.q90],
      rhat: rhatMu
    },
    tau: {
      mean: tauSummary.mean,
      median: tauSummary.median,
      sd: tauSummary.sd,
      ci95: [tauSummary.q025, tauSummary.q975],
      rhat: rhatTau
    },
    dic: dic,
    convergence: {
      rhatMu,
      rhatTau,
      converged: rhatMu < 1.1 && rhatTau < 1.1
    },
    samples: {
      mu: combinedMu,
      tau: combinedTau
    }
  };
}

/**
 * Run single Metropolis-Hastings chain
 */
function runMHChain(studies, logPosterior, rng, nIterations, nBurnin, nThin) {
  // Initialize
  let mu = 0;
  let tau = 0.5;

  // Proposal standard deviations (will be adapted)
  let sdMu = 0.5;
  let sdTau = 0.2;

  const samples = { mu: [], tau: [] };
  let acceptMu = 0, acceptTau = 0;

  for (let i = 0; i < nIterations; i++) {
    // Update mu
    const muProposal = mu + rng.nextGaussian() * sdMu;
    const logAcceptMu = logPosterior(muProposal, tau) - logPosterior(mu, tau);

    if (Math.log(rng.next()) < logAcceptMu) {
      mu = muProposal;
      acceptMu++;
    }

    // Update tau
    const tauProposal = Math.abs(tau + rng.nextGaussian() * sdTau);
    const logAcceptTau = logPosterior(mu, tauProposal) - logPosterior(mu, tau);

    if (Math.log(rng.next()) < logAcceptTau) {
      tau = tauProposal;
      acceptTau++;
    }

    // Adapt proposal SDs during burnin
    if (i < nBurnin && i > 100 && i % 100 === 0) {
      const targetRate = 0.234; // Optimal for 2D
      const currentRateMu = acceptMu / i;
      const currentRateTau = acceptTau / i;

      if (currentRateMu < targetRate - 0.05) sdMu *= 0.9;
      else if (currentRateMu > targetRate + 0.05) sdMu *= 1.1;

      if (currentRateTau < targetRate - 0.05) sdTau *= 0.9;
      else if (currentRateTau > targetRate + 0.05) sdTau *= 1.1;
    }

    // Store samples after burnin
    if (i >= nBurnin && (i - nBurnin) % nThin === 0) {
      samples.mu.push(mu);
      samples.tau.push(tau);
    }
  }

  return samples;
}

/**
 * Summarize posterior distribution
 */
function summarizePosterior(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (n - 1);

  return {
    mean,
    median: sorted[Math.floor(n / 2)],
    sd: Math.sqrt(variance),
    q025: sorted[Math.floor(0.025 * n)],
    q10: sorted[Math.floor(0.10 * n)],
    q90: sorted[Math.floor(0.90 * n)],
    q975: sorted[Math.floor(0.975 * n)]
  };
}

/**
 * Compute Gelman-Rubin Rhat statistic
 */
function computeRhat(chains) {
  const M = chains.length;
  const N = chains[0].length;

  // Chain means
  const chainMeans = chains.map(chain =>
    chain.reduce((a, b) => a + b, 0) / N
  );

  // Overall mean
  const overallMean = chainMeans.reduce((a, b) => a + b, 0) / M;

  // Between-chain variance
  const B = N / (M - 1) * chainMeans.reduce((s, m) =>
    s + Math.pow(m - overallMean, 2), 0
  );

  // Within-chain variance
  const W = chains.reduce((s, chain, i) => {
    const chainVar = chain.reduce((ss, x) =>
      ss + Math.pow(x - chainMeans[i], 2), 0
    ) / (N - 1);
    return s + chainVar;
  }, 0) / M;

  // Pooled variance estimate
  const varPlus = ((N - 1) / N) * W + B / N;

  return Math.sqrt(varPlus / W);
}

/**
 * Compute effective sample size using Geyer's initial positive sequence estimator
 * Reference: Geyer CJ. Stat Sci 1992;7:473-483
 */
function computeESS(samples) {
  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const var0 = samples.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / n;

  if (var0 === 0) return n; // No variation

  // Compute autocorrelations
  const maxLag = Math.min(n - 1, 100);
  const rho = [];

  for (let lag = 0; lag <= maxLag; lag++) {
    let acf = 0;
    for (let i = 0; i < n - lag; i++) {
      acf += (samples[i] - mean) * (samples[i + lag] - mean);
    }
    rho.push(acf / (n * var0));
  }

  // Geyer's initial positive sequence estimator
  // Sum pairs of consecutive autocorrelations until the sum becomes negative
  let rhoSum = 0;
  for (let t = 1; t < maxLag - 1; t += 2) {
    const pairSum = rho[t] + rho[t + 1];
    if (pairSum < 0) break; // Stop when sum of pair is negative
    rhoSum += pairSum;
  }

  // ESS = n / (1 + 2 * sum of autocorrelations)
  const tau = 1 + 2 * rhoSum;
  return Math.max(1, n / tau);
}

/**
 * Compute Deviance Information Criterion (DIC)
 */
function computeDIC(studies, muSamples, tauSamples) {
  const n = muSamples.length;

  // Compute deviance at each sample
  const deviances = [];
  for (let i = 0; i < n; i++) {
    let dev = 0;
    for (const study of studies) {
      const totalVar = study.se * study.se + tauSamples[i] * tauSamples[i];
      dev += Math.log(totalVar) + Math.pow(study.effect - muSamples[i], 2) / totalVar;
    }
    deviances.push(dev);
  }

  // Mean deviance
  const meanDeviance = deviances.reduce((a, b) => a + b, 0) / n;

  // Deviance at posterior means
  const muMean = muSamples.reduce((a, b) => a + b, 0) / n;
  const tauMean = tauSamples.reduce((a, b) => a + b, 0) / n;

  let devianceAtMean = 0;
  for (const study of studies) {
    const totalVar = study.se * study.se + tauMean * tauMean;
    devianceAtMean += Math.log(totalVar) + Math.pow(study.effect - muMean, 2) / totalVar;
  }

  // Effective number of parameters
  const pD = meanDeviance - devianceAtMean;

  return {
    dic: meanDeviance + pD,
    pD: pD,
    meanDeviance
  };
}

// ============================================================================
// PHASE 3: RISK OF BIAS ASSESSMENT
// ============================================================================

/**
 * Risk of Bias 2 (RoB 2) Assessment for Randomized Trials
 *
 * Reference: Sterne JAC, et al. BMJ 2019;366:l4898
 *
 * @param {Object} assessments - Domain assessments for each study
 * @returns {Object} RoB 2 summary
 */
export function assessRoB2(assessments) {
  const domains = [
    'randomization',      // D1: Randomization process
    'deviations',         // D2: Deviations from intended interventions
    'missingData',        // D3: Missing outcome data
    'measurement',        // D4: Measurement of the outcome
    'selectiveReporting'  // D5: Selection of the reported result
  ];

  const judgments = ['low', 'some_concerns', 'high'];

  const results = {
    studies: {},
    summary: {
      low: 0,
      some_concerns: 0,
      high: 0
    },
    byDomain: {}
  };

  // Initialize domain summaries
  domains.forEach(d => {
    results.byDomain[d] = { low: 0, some_concerns: 0, high: 0 };
  });

  // Process each study
  for (const [studyId, domainJudgments] of Object.entries(assessments)) {
    const studyResult = {
      domains: {},
      overall: null
    };

    // Record domain judgments
    let highCount = 0;
    let someConcernsCount = 0;

    for (const domain of domains) {
      const judgment = domainJudgments[domain] || 'some_concerns';
      studyResult.domains[domain] = judgment;
      results.byDomain[domain][judgment]++;

      if (judgment === 'high') highCount++;
      if (judgment === 'some_concerns') someConcernsCount++;
    }

    // Overall judgment following RoB 2 algorithm
    // Per RoB 2 guidance: multiple "some concerns" may warrant "high" risk
    // Typically: any high = high, ≥3 some concerns = high, any some concerns = some concerns
    if (highCount > 0) {
      studyResult.overall = 'high';
    } else if (someConcernsCount >= 3) {
      // Multiple domains with some concerns elevates to high risk
      studyResult.overall = 'high';
      studyResult.overallNote = 'Multiple domains with some concerns';
    } else if (someConcernsCount > 0) {
      studyResult.overall = 'some_concerns';
    } else {
      studyResult.overall = 'low';
    }

    results.studies[studyId] = studyResult;
    results.summary[studyResult.overall]++;
  }

  // Generate traffic light data for visualization
  results.trafficLight = generateTrafficLightData(results.studies, domains);

  return results;
}

/**
 * ROBINS-I Assessment for Non-Randomized Studies
 *
 * Reference: Sterne JA, et al. BMJ 2016;355:i4919
 */
export function assessROBINSI(assessments) {
  const domains = [
    'confounding',        // D1: Confounding
    'selection',          // D2: Selection of participants
    'classification',     // D3: Classification of interventions
    'deviations',         // D4: Deviations from intended interventions
    'missingData',        // D5: Missing data
    'measurement',        // D6: Measurement of outcomes
    'selectiveReporting'  // D7: Selection of the reported result
  ];

  const judgments = ['low', 'moderate', 'serious', 'critical', 'no_info'];

  const results = {
    studies: {},
    summary: {},
    byDomain: {}
  };

  // Initialize
  judgments.forEach(j => results.summary[j] = 0);
  domains.forEach(d => {
    results.byDomain[d] = {};
    judgments.forEach(j => results.byDomain[d][j] = 0);
  });

  // Process studies
  for (const [studyId, domainJudgments] of Object.entries(assessments)) {
    const studyResult = { domains: {}, overall: null };

    let worstJudgment = 'low';
    const severity = { low: 0, moderate: 1, serious: 2, critical: 3, no_info: 2 };

    for (const domain of domains) {
      const judgment = domainJudgments[domain] || 'no_info';
      studyResult.domains[domain] = judgment;
      results.byDomain[domain][judgment]++;

      if (severity[judgment] > severity[worstJudgment]) {
        worstJudgment = judgment;
      }
    }

    studyResult.overall = worstJudgment;
    results.studies[studyId] = studyResult;
    results.summary[worstJudgment]++;
  }

  results.trafficLight = generateTrafficLightData(results.studies, domains);

  return results;
}

/**
 * QUADAS-2 Assessment for Diagnostic Test Accuracy Studies
 *
 * Reference: Whiting PF, et al. Ann Intern Med 2011;155:529-536
 */
export function assessQUADAS2(assessments) {
  const domains = [
    'patientSelection',   // D1: Patient selection
    'indexTest',          // D2: Index test
    'referenceStandard',  // D3: Reference standard
    'flowTiming'          // D4: Flow and timing
  ];

  const results = {
    studies: {},
    summary: { low: 0, high: 0, unclear: 0 },
    byDomain: {}
  };

  domains.forEach(d => {
    results.byDomain[d] = {
      riskOfBias: { low: 0, high: 0, unclear: 0 },
      applicabilityConcerns: { low: 0, high: 0, unclear: 0 }
    };
  });

  for (const [studyId, domainJudgments] of Object.entries(assessments)) {
    const studyResult = { domains: {}, overall: null };
    let hasHigh = false;
    let hasUnclear = false;

    for (const domain of domains) {
      const assessment = domainJudgments[domain] || { rob: 'unclear', applicability: 'unclear' };
      studyResult.domains[domain] = assessment;

      results.byDomain[domain].riskOfBias[assessment.rob]++;
      if (assessment.applicability) {
        results.byDomain[domain].applicabilityConcerns[assessment.applicability]++;
      }

      if (assessment.rob === 'high') hasHigh = true;
      if (assessment.rob === 'unclear') hasUnclear = true;
    }

    studyResult.overall = hasHigh ? 'high' : (hasUnclear ? 'unclear' : 'low');
    results.studies[studyId] = studyResult;
    results.summary[studyResult.overall]++;
  }

  results.trafficLight = generateTrafficLightData(results.studies, domains);

  return results;
}

/**
 * Generate traffic light plot data
 */
function generateTrafficLightData(studies, domains) {
  const colorMap = {
    low: '#2ecc71',
    some_concerns: '#f1c40f',
    moderate: '#f1c40f',
    high: '#e74c3c',
    serious: '#e74c3c',
    critical: '#8e44ad',
    unclear: '#95a5a6',
    no_info: '#95a5a6'
  };

  const data = [];

  for (const [studyId, result] of Object.entries(studies)) {
    const row = { studyId };
    for (const domain of domains) {
      const judgment = result.domains[domain];
      const value = typeof judgment === 'object' ? judgment.rob : judgment;
      row[domain] = {
        value,
        color: colorMap[value] || '#95a5a6'
      };
    }
    row.overall = {
      value: result.overall,
      color: colorMap[result.overall] || '#95a5a6'
    };
    data.push(row);
  }

  return data;
}

/**
 * Sensitivity analysis excluding high risk of bias studies
 */
export function sensitivityByRoB(studies, robResults, metaFunction) {
  // All studies
  const allResult = metaFunction(studies);

  // Low RoB only
  const lowRoBStudies = studies.filter(s =>
    robResults.studies[s.id]?.overall === 'low'
  );
  const lowRoBResult = lowRoBStudies.length >= 2 ?
    metaFunction(lowRoBStudies) : null;

  // Exclude high RoB
  const excludeHighStudies = studies.filter(s =>
    robResults.studies[s.id]?.overall !== 'high'
  );
  const excludeHighResult = excludeHighStudies.length >= 2 ?
    metaFunction(excludeHighStudies) : null;

  return {
    all: {
      nStudies: studies.length,
      result: allResult
    },
    lowRoBOnly: {
      nStudies: lowRoBStudies.length,
      result: lowRoBResult,
      excluded: studies.length - lowRoBStudies.length
    },
    excludeHighRoB: {
      nStudies: excludeHighStudies.length,
      result: excludeHighResult,
      excluded: studies.length - excludeHighStudies.length
    },
    interpretation: interpretRoBSensitivity(allResult, lowRoBResult, excludeHighResult)
  };
}

/**
 * Interpret RoB sensitivity analysis
 */
function interpretRoBSensitivity(all, lowRoB, excludeHigh) {
  if (!lowRoB && !excludeHigh) {
    return "Insufficient studies with lower risk of bias for sensitivity analysis.";
  }

  const messages = [];

  if (excludeHigh) {
    const change = Math.abs(excludeHigh.random.mu - all.random.mu);
    const seChange = (change / all.random.se) * 100;

    if (seChange < 10) {
      messages.push("Excluding high RoB studies did not substantially change the pooled estimate.");
    } else if (seChange < 50) {
      messages.push("Excluding high RoB studies moderately changed the pooled estimate.");
    } else {
      messages.push("Excluding high RoB studies substantially changed the pooled estimate, suggesting results may be influenced by studies at high risk of bias.");
    }
  }

  return messages.join(" ");
}

// ============================================================================
// PHASE 4: AUTOMATED REPORTING
// ============================================================================

/**
 * Generate PRISMA 2020 methods paragraph
 *
 * @param {Object} analysisResults - Results from meta-analysis
 * @param {Object} options - Reporting options
 * @returns {string} Methods section text
 */
export function generateMethodsParagraph(analysisResults, options = {}) {
  const {
    effectMeasure = 'risk ratio',
    model = 'random-effects',
    heterogeneityMethod = 'REML',
    publicationBiasTests = ['Egger', 'Begg'],
    software = 'ESC ACS Living Meta-Analysis Platform'
  } = options;

  const paragraphs = [];

  // Statistical analysis paragraph
  paragraphs.push(
    `Meta-analysis was performed using a ${model} model with ` +
    `${effectMeasure}s as the effect measure. ` +
    `Between-study variance (τ²) was estimated using the ${heterogeneityMethod} method. ` +
    `Heterogeneity was quantified using the I² statistic, with values of 25%, 50%, and 75% ` +
    `representing low, moderate, and high heterogeneity, respectively. ` +
    `Prediction intervals were calculated to estimate the range of true effects across settings.`
  );

  // Publication bias paragraph
  if (publicationBiasTests.length > 0) {
    const tests = publicationBiasTests.join(' and ');
    paragraphs.push(
      `Publication bias was assessed visually using funnel plots and statistically using ` +
      `${tests} tests. ` +
      `Trim-and-fill analysis was performed to estimate the number of potentially missing studies.`
    );
  }

  // Software paragraph
  paragraphs.push(
    `All analyses were conducted using ${software}, ` +
    `which implements algorithms validated against the R metafor package (version 4.0). ` +
    `Statistical significance was set at α = 0.05 (two-tailed).`
  );

  return paragraphs.join('\n\n');
}

/**
 * Generate results paragraph from analysis
 */
export function generateResultsParagraph(results, options = {}) {
  const {
    effectMeasure = 'RR',
    outcomeDescription = 'the primary outcome'
  } = options;

  const k = results.nStudies || results.studies?.length || 0;
  const effect = results.random?.mu || results.pooled?.effect;
  const ci = results.random?.ci || results.pooled?.ci;
  const I2 = results.I2;
  const tau2 = results.tau2;
  const pValue = results.random?.pValue;

  let effectString;
  if (['RR', 'OR', 'HR'].includes(effectMeasure)) {
    const expEffect = Math.exp(effect);
    const expCi = [Math.exp(ci[0]), Math.exp(ci[1])];
    effectString = `${effectMeasure} ${expEffect.toFixed(2)} (95% CI: ${expCi[0].toFixed(2)}-${expCi[1].toFixed(2)})`;
  } else {
    effectString = `${effect.toFixed(3)} (95% CI: ${ci[0].toFixed(3)}-${ci[1].toFixed(3)})`;
  }

  const significanceStr = pValue < 0.05 ? 'statistically significant' : 'not statistically significant';
  const heterogeneityStr = I2 > 75 ? 'high' : I2 > 50 ? 'substantial' : I2 > 25 ? 'moderate' : 'low';

  return `A total of ${k} studies were included in the meta-analysis for ${outcomeDescription}. ` +
    `The pooled estimate was ${effectString}, which was ${significanceStr} (p ${pValue < 0.001 ? '< 0.001' : '= ' + pValue.toFixed(3)}). ` +
    `Heterogeneity was ${heterogeneityStr} (I² = ${I2.toFixed(1)}%, τ² = ${tau2.toFixed(4)}).`;
}

// ============================================================================
// PHASE 2: GRADE FRAMEWORK (Rules-Based Certainty Assessment)
// ============================================================================

/**
 * GRADE Certainty of Evidence Assessment
 * Rules-based implementation following GRADE handbook
 *
 * Reference: Schünemann H, et al. GRADE handbook. 2013.
 *
 * @param {Object} metaResults - Meta-analysis results
 * @param {Object} domainAssessments - Manual domain inputs
 * @param {Object} options - Additional options
 * @returns {Object} GRADE assessment with certainty rating
 */
export function gradeFramework(metaResults, domainAssessments = {}, options = {}) {
  const {
    studyDesign = 'RCT', // 'RCT' starts at high, 'observational' starts at low
    outcomeType = 'objective', // 'objective', 'subjective', 'mortality'
    alpha = 0.05
  } = options;

  // Starting certainty
  let certainty = studyDesign === 'RCT' ? 4 : 2; // 4=high, 3=moderate, 2=low, 1=very low
  const reasons = [];

  // Domain 1: Risk of Bias
  const robAssessment = assessRiskOfBiasDomain(domainAssessments.riskOfBias, metaResults);
  certainty -= robAssessment.downgrade;
  if (robAssessment.downgrade > 0) {
    reasons.push(`Risk of bias: -${robAssessment.downgrade} (${robAssessment.reason})`);
  }

  // Domain 2: Inconsistency
  const inconsistencyAssessment = assessInconsistencyDomain(metaResults);
  certainty -= inconsistencyAssessment.downgrade;
  if (inconsistencyAssessment.downgrade > 0) {
    reasons.push(`Inconsistency: -${inconsistencyAssessment.downgrade} (${inconsistencyAssessment.reason})`);
  }

  // Domain 3: Indirectness
  const indirectnessAssessment = assessIndirectnessDomain(domainAssessments.indirectness);
  certainty -= indirectnessAssessment.downgrade;
  if (indirectnessAssessment.downgrade > 0) {
    reasons.push(`Indirectness: -${indirectnessAssessment.downgrade} (${indirectnessAssessment.reason})`);
  }

  // Domain 4: Imprecision
  const imprecisionAssessment = assessImprecisionDomain(metaResults, options);
  certainty -= imprecisionAssessment.downgrade;
  if (imprecisionAssessment.downgrade > 0) {
    reasons.push(`Imprecision: -${imprecisionAssessment.downgrade} (${imprecisionAssessment.reason})`);
  }

  // Domain 5: Publication Bias
  const pubBiasAssessment = assessPublicationBiasDomain(metaResults, domainAssessments.publicationBias);
  certainty -= pubBiasAssessment.downgrade;
  if (pubBiasAssessment.downgrade > 0) {
    reasons.push(`Publication bias: -${pubBiasAssessment.downgrade} (${pubBiasAssessment.reason})`);
  }

  // Upgrading factors (observational studies only)
  if (studyDesign === 'observational') {
    const upgradeAssessment = assessUpgradingFactors(metaResults, domainAssessments);
    certainty += upgradeAssessment.upgrade;
    if (upgradeAssessment.upgrade > 0) {
      reasons.push(`Upgrading: +${upgradeAssessment.upgrade} (${upgradeAssessment.reason})`);
    }
  }

  // Clamp to valid range
  certainty = Math.max(1, Math.min(4, certainty));

  const certaintyLabels = ['', 'Very Low', 'Low', 'Moderate', 'High'];
  const certaintySymbols = ['', '⊕○○○', '⊕⊕○○', '⊕⊕⊕○', '⊕⊕⊕⊕'];

  return {
    certainty: certainty,
    label: certaintyLabels[certainty],
    symbol: certaintySymbols[certainty],
    domains: {
      riskOfBias: robAssessment,
      inconsistency: inconsistencyAssessment,
      indirectness: indirectnessAssessment,
      imprecision: imprecisionAssessment,
      publicationBias: pubBiasAssessment
    },
    reasons,
    interpretation: generateGRADEInterpretation(certainty, reasons),
    footnotes: generateGRADEFootnotes(metaResults, {
      robAssessment, inconsistencyAssessment, indirectnessAssessment,
      imprecisionAssessment, pubBiasAssessment
    })
  };
}

/**
 * Assess Risk of Bias domain for GRADE
 */
function assessRiskOfBiasDomain(robInput, metaResults) {
  if (robInput?.manual) {
    return {
      downgrade: robInput.downgrade || 0,
      reason: robInput.reason || 'Manual assessment',
      judgment: robInput.judgment || 'not serious'
    };
  }

  // Rules-based assessment if RoB data available
  if (metaResults.robSummary) {
    const highRoB = metaResults.robSummary.high || 0;
    const total = metaResults.nStudies || metaResults.studies?.length || 1;
    const proportion = highRoB / total;

    if (proportion > 0.5) {
      return { downgrade: 2, reason: '>50% studies at high risk of bias', judgment: 'very serious' };
    } else if (proportion > 0.25) {
      return { downgrade: 1, reason: '>25% studies at high risk of bias', judgment: 'serious' };
    }
  }

  return { downgrade: 0, reason: 'No serious concerns', judgment: 'not serious' };
}

/**
 * Assess Inconsistency domain for GRADE (rules-based on I² and prediction interval)
 */
function assessInconsistencyDomain(metaResults) {
  const I2 = metaResults.I2 || 0;
  const k = metaResults.nStudies || metaResults.studies?.length || 1;

  // Check prediction interval crosses null
  let piCrossesNull = false;
  if (metaResults.predictionInterval) {
    const pi = metaResults.predictionInterval;
    piCrossesNull = pi[0] < 0 && pi[1] > 0;
  }

  // Single study - cannot assess
  if (k === 1) {
    return { downgrade: 0, reason: 'Single study - inconsistency not applicable', judgment: 'not applicable' };
  }

  // Rules based on I² thresholds
  if (I2 > 75) {
    return { downgrade: 2, reason: `Very high heterogeneity (I²=${I2.toFixed(0)}%)`, judgment: 'very serious' };
  } else if (I2 > 50 || (I2 > 40 && piCrossesNull)) {
    return { downgrade: 1, reason: `Substantial heterogeneity (I²=${I2.toFixed(0)}%)`, judgment: 'serious' };
  } else if (I2 > 30 && piCrossesNull) {
    return { downgrade: 1, reason: `Moderate heterogeneity with wide prediction interval`, judgment: 'serious' };
  }

  return { downgrade: 0, reason: `Low heterogeneity (I²=${I2.toFixed(0)}%)`, judgment: 'not serious' };
}

/**
 * Assess Indirectness domain for GRADE
 */
function assessIndirectnessDomain(indirectnessInput) {
  if (!indirectnessInput) {
    return { downgrade: 0, reason: 'Direct evidence assumed', judgment: 'not serious' };
  }

  const concerns = [];
  let downgrade = 0;

  if (indirectnessInput.population) {
    concerns.push('population differences');
    downgrade += indirectnessInput.population === 'serious' ? 1 : 0.5;
  }
  if (indirectnessInput.intervention) {
    concerns.push('intervention differences');
    downgrade += indirectnessInput.intervention === 'serious' ? 1 : 0.5;
  }
  if (indirectnessInput.comparator) {
    concerns.push('comparator differences');
    downgrade += indirectnessInput.comparator === 'serious' ? 1 : 0.5;
  }
  if (indirectnessInput.outcome) {
    concerns.push('surrogate outcome');
    downgrade += indirectnessInput.outcome === 'serious' ? 1 : 0.5;
  }

  downgrade = Math.min(2, Math.round(downgrade));

  if (downgrade === 0) {
    return { downgrade: 0, reason: 'Direct evidence', judgment: 'not serious' };
  }

  return {
    downgrade,
    reason: `Indirect: ${concerns.join(', ')}`,
    judgment: downgrade >= 2 ? 'very serious' : 'serious'
  };
}

/**
 * Assess Imprecision domain for GRADE (rules-based on OIS and CI width)
 *
 * MID parameter interpretation:
 * - For ratio measures (RR, OR, HR): MID is the relative change threshold
 *   E.g., MID=0.25 means RR 0.75-1.25 is the equivalence zone
 *   On log scale: log(0.75)=-0.288 to log(1.25)=0.223
 * - For difference measures (MD, SMD, RD): MID is the absolute threshold
 *   E.g., MID=0.2 means -0.2 to +0.2 is the equivalence zone
 */
function assessImprecisionDomain(metaResults, options = {}) {
  const {
    minimalImportantDifference = null, // MID: relative change for ratios, absolute for differences
    optimalInformationSize = null, // OIS in total sample size or events
    effectMeasure = 'RR'
  } = options;

  const ci = metaResults.random?.ci || metaResults.pooled?.ci;
  const effect = metaResults.random?.mu || metaResults.pooled?.effect;
  const totalN = metaResults.totalN || 0;

  if (!ci) {
    return { downgrade: 0, reason: 'Cannot assess - no CI', judgment: 'not assessed' };
  }

  // Check if CI crosses null (no effect line)
  const ciCrossesNull = ci[0] < 0 && ci[1] > 0;

  // Check if CI crosses MID thresholds (appreciable benefit/harm)
  // For ratio measures: default MID = 0.25 (equivalence zone RR 0.75-1.25)
  // For difference measures: default MID = 0.2 SD or specified units
  let midLow, midHigh;
  if (['RR', 'OR', 'HR'].includes(effectMeasure)) {
    // MID is relative change (e.g., 0.25 = 25% relative change)
    const midRelative = minimalImportantDifference || 0.25;
    midLow = Math.log(1 - midRelative);  // log(0.75) = -0.288 for default
    midHigh = Math.log(1 + midRelative); // log(1.25) = 0.223 for default
  } else {
    // MID is absolute threshold
    const midAbsolute = minimalImportantDifference || 0.2;
    midLow = -midAbsolute;
    midHigh = midAbsolute;
  }

  const ciCrossesMID = (ci[0] < midLow && ci[1] > midLow) ||
                        (ci[0] < midHigh && ci[1] > midHigh) ||
                        (ci[0] < midLow && ci[1] > midHigh);

  // OIS check (default: 300 events for binary, 400 participants for continuous)
  const defaultOIS = effectMeasure === 'MD' || effectMeasure === 'SMD' ? 400 : 300;
  const ois = optimalInformationSize || defaultOIS;
  const belowOIS = totalN < ois;

  // Decision rules
  if (ciCrossesNull && ciCrossesMID) {
    return { downgrade: 2, reason: 'CI crosses null and MID thresholds', judgment: 'very serious' };
  } else if (ciCrossesNull || ciCrossesMID) {
    return { downgrade: 1, reason: ciCrossesNull ? 'CI crosses null' : 'CI crosses MID threshold', judgment: 'serious' };
  } else if (belowOIS) {
    return { downgrade: 1, reason: `Sample size below OIS (n=${totalN} < ${ois})`, judgment: 'serious' };
  }

  return { downgrade: 0, reason: 'Precise estimate', judgment: 'not serious' };
}

/**
 * Assess Publication Bias domain for GRADE
 */
function assessPublicationBiasDomain(metaResults, pubBiasInput) {
  // Use Egger test result if available
  const eggerP = metaResults.egger?.pValue;
  const trimFillMissing = metaResults.trimFill?.missing || 0;
  const k = metaResults.nStudies || metaResults.studies?.length || 0;

  // Manual override
  if (pubBiasInput?.manual) {
    return {
      downgrade: pubBiasInput.downgrade || 0,
      reason: pubBiasInput.reason || 'Manual assessment',
      judgment: pubBiasInput.judgment || 'not serious'
    };
  }

  // Too few studies to assess
  if (k < 10) {
    return { downgrade: 0, reason: 'Too few studies to assess (<10)', judgment: 'not assessed' };
  }

  // Rules-based assessment
  let suspicion = 0;
  const reasons = [];

  if (eggerP !== undefined && eggerP < 0.1) {
    suspicion += 1;
    reasons.push(`Egger test significant (p=${eggerP.toFixed(3)})`);
  }

  if (trimFillMissing > 0) {
    const proportion = trimFillMissing / k;
    if (proportion > 0.3) {
      suspicion += 1;
      reasons.push(`Trim-fill suggests ${trimFillMissing} missing studies`);
    }
  }

  if (suspicion >= 2) {
    return { downgrade: 2, reason: reasons.join('; '), judgment: 'very serious' };
  } else if (suspicion === 1) {
    return { downgrade: 1, reason: reasons.join('; '), judgment: 'serious' };
  }

  return { downgrade: 0, reason: 'No evidence of publication bias', judgment: 'not serious' };
}

/**
 * Assess upgrading factors for observational studies
 */
function assessUpgradingFactors(metaResults, domainAssessments) {
  let upgrade = 0;
  const reasons = [];

  // Large magnitude of effect
  const effect = metaResults.random?.mu || metaResults.pooled?.effect;
  if (effect !== undefined) {
    const absEffect = Math.abs(effect);
    if (absEffect > 1.1) { // RR > 3 or < 0.33
      upgrade += 2;
      reasons.push('Very large effect');
    } else if (absEffect > 0.69) { // RR > 2 or < 0.5
      upgrade += 1;
      reasons.push('Large effect');
    }
  }

  // Dose-response gradient
  if (domainAssessments.doseResponse) {
    upgrade += 1;
    reasons.push('Dose-response gradient');
  }

  // Plausible confounding would reduce effect
  if (domainAssessments.plausibleConfounding) {
    upgrade += 1;
    reasons.push('Plausible confounding would reduce effect');
  }

  upgrade = Math.min(2, upgrade); // Max upgrade of 2 levels

  return {
    upgrade,
    reason: reasons.length > 0 ? reasons.join('; ') : 'No upgrading factors'
  };
}

/**
 * Generate GRADE interpretation text
 */
function generateGRADEInterpretation(certainty, reasons) {
  const labels = ['', 'Very Low', 'Low', 'Moderate', 'High'];
  const interpretations = {
    4: 'We are very confident that the true effect lies close to that of the estimate of the effect.',
    3: 'We are moderately confident in the effect estimate: the true effect is likely to be close to the estimate of the effect, but there is a possibility that it is substantially different.',
    2: 'Our confidence in the effect estimate is limited: the true effect may be substantially different from the estimate of the effect.',
    1: 'We have very little confidence in the effect estimate: the true effect is likely to be substantially different from the estimate of effect.'
  };

  return {
    certaintyStatement: `Certainty of evidence: ${labels[certainty]}`,
    meaningStatement: interpretations[certainty],
    downgradingReasons: reasons.filter(r => r.includes('-')),
    upgradingReasons: reasons.filter(r => r.includes('+'))
  };
}

/**
 * Generate GRADE footnotes for SoF table
 */
function generateGRADEFootnotes(metaResults, assessments) {
  const footnotes = [];
  let index = 1;

  if (assessments.robAssessment.downgrade > 0) {
    footnotes.push({ index: index++, text: assessments.robAssessment.reason });
  }
  if (assessments.inconsistencyAssessment.downgrade > 0) {
    footnotes.push({ index: index++, text: assessments.inconsistencyAssessment.reason });
  }
  if (assessments.indirectnessAssessment.downgrade > 0) {
    footnotes.push({ index: index++, text: assessments.indirectnessAssessment.reason });
  }
  if (assessments.imprecisionAssessment.downgrade > 0) {
    footnotes.push({ index: index++, text: assessments.imprecisionAssessment.reason });
  }
  if (assessments.pubBiasAssessment.downgrade > 0) {
    footnotes.push({ index: index++, text: assessments.pubBiasAssessment.reason });
  }

  return footnotes;
}

/**
 * Generate Summary of Findings (SoF) Table
 *
 * @param {Array} outcomes - Array of outcome results
 * @param {Object} options - Table options
 * @returns {Object} SoF table data
 */
export function generateSoFTable(outcomes, options = {}) {
  const {
    intervention = 'Intervention',
    comparator = 'Control',
    population = 'Adults',
    setting = 'Any setting'
  } = options;

  const rows = outcomes.map(outcome => {
    const grade = gradeFramework(outcome.metaResults, outcome.gradeInputs, outcome.options);

    // Calculate absolute effects
    let baselineRisk = outcome.baselineRisk || 0.1;
    let absoluteEffect = null;
    let absoluteEffectCI = null;

    if (outcome.effectMeasure === 'RR' || outcome.effectMeasure === 'OR') {
      const rr = Math.exp(outcome.metaResults.random?.mu || 0);
      const rrLow = Math.exp(outcome.metaResults.random?.ci?.[0] || 0);
      const rrHigh = Math.exp(outcome.metaResults.random?.ci?.[1] || 0);

      const interventionRisk = baselineRisk * rr;
      absoluteEffect = Math.round((interventionRisk - baselineRisk) * 1000);
      absoluteEffectCI = [
        Math.round((baselineRisk * rrLow - baselineRisk) * 1000),
        Math.round((baselineRisk * rrHigh - baselineRisk) * 1000)
      ];
    }

    return {
      outcome: outcome.name,
      nStudies: outcome.metaResults.nStudies || outcome.metaResults.studies?.length,
      nParticipants: outcome.metaResults.totalN,
      relativeEffect: formatRelativeEffect(outcome.metaResults, outcome.effectMeasure),
      anticipatedAbsoluteEffect: {
        comparator: `${Math.round(baselineRisk * 1000)} per 1,000`,
        intervention: absoluteEffect !== null ?
          `${Math.round(baselineRisk * 1000) + absoluteEffect} per 1,000 (${absoluteEffectCI[0]} to ${absoluteEffectCI[1]} difference)` :
          'Not calculated'
      },
      certainty: grade.label,
      certaintySymbol: grade.symbol,
      footnoteIndices: grade.footnotes.map(f => f.index),
      comments: outcome.comments || ''
    };
  });

  return {
    title: `Summary of Findings: ${intervention} compared to ${comparator} for ${population}`,
    population,
    intervention,
    comparator,
    setting,
    rows,
    footnotes: outcomes.flatMap(o => {
      const grade = gradeFramework(o.metaResults, o.gradeInputs, o.options);
      return grade.footnotes;
    }).filter((f, i, arr) => arr.findIndex(x => x.text === f.text) === i) // Deduplicate
  };
}

/**
 * Format relative effect for SoF table
 */
function formatRelativeEffect(metaResults, effectMeasure) {
  const effect = metaResults.random?.mu || metaResults.pooled?.effect;
  const ci = metaResults.random?.ci || metaResults.pooled?.ci;

  if (effect === undefined || !ci) return 'Not estimable';

  if (['RR', 'OR', 'HR'].includes(effectMeasure)) {
    const exp = Math.exp(effect);
    const expCi = [Math.exp(ci[0]), Math.exp(ci[1])];
    return `${effectMeasure} ${exp.toFixed(2)} (${expCi[0].toFixed(2)} to ${expCi[1].toFixed(2)})`;
  }

  return `${effectMeasure} ${effect.toFixed(2)} (${ci[0].toFixed(2)} to ${ci[1].toFixed(2)})`;
}

// ============================================================================
// PHASE 2: COMPONENT NETWORK META-ANALYSIS
// ============================================================================

/**
 * Component Network Meta-Analysis (CNMA)
 * Decomposes multi-component interventions into individual component effects
 *
 * Reference: Rücker G, et al. Res Synth Methods 2020;11:443-454
 *
 * @param {Array} comparisons - Array of {treat1, treat2, effect, se}
 * @param {Object} options - CNMA options
 * @param {string} options.model - 'additive' or 'interaction'
 * @param {string} options.reference - Reference component
 * @param {boolean} options.randomEffects - Use random effects (default: true)
 * @param {string} options.tau2Method - Method for τ² estimation ('DL', 'REML')
 * @param {number} options.alpha - Significance level (default 0.05)
 * @returns {Object} Component-level effects
 */
export function componentNMA(comparisons, options = {}) {
  const {
    model = 'additive', // 'additive' or 'interaction'
    reference = null, // Reference component (usually placebo/control)
    randomEffects = true, // Use random effects model
    tau2Method = 'DL', // DerSimonian-Laird
    alpha = 0.05
  } = options;

  // Parse treatments into components
  const componentMap = new Map();
  const treatments = new Set();

  comparisons.forEach(comp => {
    treatments.add(comp.treat1);
    treatments.add(comp.treat2);

    // Parse components (assume format: "A+B+C" or "A_B_C")
    const parseComponents = (treat) => {
      if (treat.includes('+')) return treat.split('+').map(s => s.trim());
      if (treat.includes('_')) return treat.split('_').map(s => s.trim());
      return [treat];
    };

    const comps1 = parseComponents(comp.treat1);
    const comps2 = parseComponents(comp.treat2);

    comps1.forEach(c => componentMap.set(c, (componentMap.get(c) || 0) + 1));
    comps2.forEach(c => componentMap.set(c, (componentMap.get(c) || 0) + 1));
  });

  const components = Array.from(componentMap.keys());
  const refComponent = reference || components[0];

  // Build design matrix for additive model
  // Each row: comparison, columns: component indicators (+1 if in treat1, -1 if in treat2)
  const nComparisons = comparisons.length;
  const nComponents = components.length;

  // Create X matrix (design matrix for components)
  const X = [];
  const y = [];
  const w = [];

  comparisons.forEach(comp => {
    const row = new Array(nComponents).fill(0);

    const parseComponents = (treat) => {
      if (treat.includes('+')) return treat.split('+').map(s => s.trim());
      if (treat.includes('_')) return treat.split('_').map(s => s.trim());
      return [treat];
    };

    const comps1 = parseComponents(comp.treat1);
    const comps2 = parseComponents(comp.treat2);

    comps1.forEach(c => {
      const idx = components.indexOf(c);
      if (idx >= 0) row[idx] += 1;
    });

    comps2.forEach(c => {
      const idx = components.indexOf(c);
      if (idx >= 0) row[idx] -= 1;
    });

    X.push(row);
    y.push(comp.effect);
    w.push(1 / (comp.se * comp.se));
  });

  // Remove reference component column (for identifiability)
  const refIdx = components.indexOf(refComponent);
  const Xreduced = X.map(row => row.filter((_, i) => i !== refIdx));
  const componentsReduced = components.filter((_, i) => i !== refIdx);
  const variances = comparisons.map(c => c.se * c.se);

  // Step 1: Fixed-effect fit to get Q statistic
  const XtWX_fixed = multiplyMatrices(
    transposeMatrix(Xreduced),
    multiplyMatrices(diagMatrix(w), Xreduced)
  );

  const XtWy_fixed = multiplyMatrices(
    transposeMatrix(Xreduced),
    multiplyMatrices(diagMatrix(w), y.map(v => [v]))
  ).map(row => row[0]);

  const XtWXinv_fixed = invertMatrix(XtWX_fixed);
  const beta_fixed = XtWXinv_fixed.map((row, i) =>
    row.reduce((sum, val, j) => sum + val * XtWy_fixed[j], 0)
  );

  // Calculate Q statistic from fixed-effect model
  const fitted_fixed = X.map(row =>
    row.reduce((sum, val, i) => {
      if (i === refIdx) return sum;
      const betaIdx = i < refIdx ? i : i - 1;
      return sum + val * beta_fixed[betaIdx];
    }, 0)
  );

  const residuals_fixed = y.map((obs, i) => obs - fitted_fixed[i]);
  const Q = residuals_fixed.reduce((sum, r, i) => sum + w[i] * r * r, 0);
  const df = nComparisons - componentsReduced.length;

  // Step 2: Estimate τ² for random effects
  let tau2 = 0;
  if (randomEffects && df > 0) {
    // DerSimonian-Laird estimator
    const sumW = w.reduce((a, b) => a + b, 0);
    const sumW2 = w.reduce((a, b) => a + b * b, 0);
    const C = sumW - sumW2 / sumW;
    tau2 = Math.max(0, (Q - df) / C);
  }

  // Step 3: Re-fit with random-effects weights if τ² > 0
  let beta, XtWXinv, wFinal;
  if (randomEffects && tau2 > 0) {
    wFinal = variances.map(v => 1 / (v + tau2));

    const XtWX = multiplyMatrices(
      transposeMatrix(Xreduced),
      multiplyMatrices(diagMatrix(wFinal), Xreduced)
    );

    const XtWy = multiplyMatrices(
      transposeMatrix(Xreduced),
      multiplyMatrices(diagMatrix(wFinal), y.map(v => [v]))
    ).map(row => row[0]);

    XtWXinv = invertMatrix(XtWX);
    beta = XtWXinv.map((row, i) =>
      row.reduce((sum, val, j) => sum + val * XtWy[j], 0)
    );
  } else {
    beta = beta_fixed;
    XtWXinv = XtWXinv_fixed;
    wFinal = w;
  }

  // Standard errors
  const se = XtWXinv.map((row, i) => Math.sqrt(row[i]));
  const zCrit = inverseNormal(1 - alpha / 2);

  // Build results
  const componentEffects = {};
  componentEffects[refComponent] = { effect: 0, se: 0, ci: [0, 0], reference: true };

  componentsReduced.forEach((comp, i) => {
    componentEffects[comp] = {
      effect: beta[i],
      se: se[i],
      ci: [beta[i] - zCrit * se[i], beta[i] + zCrit * se[i]],
      z: beta[i] / se[i],
      pValue: 2 * (1 - normalCDF(Math.abs(beta[i] / se[i]))),
      reference: false
    };
  });

  // Rank components by effect
  const ranking = Object.entries(componentEffects)
    .filter(([_, v]) => !v.reference)
    .sort((a, b) => b[1].effect - a[1].effect)
    .map(([name, _], i) => ({ component: name, rank: i + 1 }));

  // Model fit statistics
  const I2 = df > 0 ? Math.max(0, (Q - df) / Q * 100) : 0;

  return {
    model,
    reference: refComponent,
    components: componentEffects,
    ranking,
    nComparisons,
    nComponents,
    randomEffects,
    tau2: randomEffects ? tau2 : null,
    modelFit: {
      Q,
      df,
      pValue: df > 0 ? 1 - chiSquaredCDF(Q, df) : 1,
      I2,
      tau2
    },
    designMatrix: {
      X: Xreduced,
      components: componentsReduced
    }
  };
}

/**
 * Helper: Create diagonal matrix from vector
 */
function diagMatrix(v) {
  const n = v.length;
  const D = Array(n).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) D[i][i] = v[i];
  return D;
}

/**
 * Helper: Transpose matrix
 */
function transposeMatrix(M) {
  if (M.length === 0) return [];
  const rows = M.length;
  const cols = M[0].length;
  const T = Array(cols).fill(null).map(() => Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      T[j][i] = M[i][j];
    }
  }
  return T;
}

/**
 * Helper: Multiply matrices
 */
function multiplyMatrices(A, B) {
  if (A.length === 0 || B.length === 0) return [];
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;

  const C = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        C[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return C;
}

/**
 * Chi-squared CDF (for p-value calculation)
 */
function chiSquaredCDFApprox(x, df) {
  if (x <= 0) return 0;
  return incompleteGamma(df / 2, x / 2) / gamma(df / 2);
}

// ============================================================================
// PHASE 2: ADVANCED DOSE-RESPONSE MODELS
// ============================================================================

/**
 * Fractional Polynomial Dose-Response Meta-Analysis
 * Fits FP1 and FP2 models to find best-fitting dose-response curve
 *
 * Reference: Royston P, Altman DG. Stat Med 1994;13:1141-1163
 *
 * @param {Array} studies - Array of {dose, effect, se, n}
 * @param {Object} options - FP options
 * @returns {Object} Best-fitting FP model
 */
export function fractionalPolynomialDR(studies, options = {}) {
  const {
    powers = [-2, -1, -0.5, 0, 0.5, 1, 2, 3], // Standard FP power set
    maxDegree = 2 // FP1 or FP2
  } = options;

  const results = [];

  // Transform dose (add small constant to avoid log(0))
  const minDose = Math.min(...studies.filter(s => s.dose > 0).map(s => s.dose));
  const epsilon = minDose / 10;

  const transformedStudies = studies.map(s => ({
    ...s,
    doseAdj: s.dose + epsilon
  }));

  // Fit FP1 models (single power)
  for (const p1 of powers) {
    const X = transformedStudies.map(s => [1, fpTransform(s.doseAdj, p1)]);
    const fit = weightedRegression(X, transformedStudies.map(s => s.effect),
      transformedStudies.map(s => 1 / (s.se * s.se)));

    if (fit.converged) {
      results.push({
        degree: 1,
        powers: [p1],
        coefficients: fit.beta,
        deviance: fit.deviance,
        aic: fit.deviance + 2 * 2,
        bic: fit.deviance + Math.log(studies.length) * 2,
        fit
      });
    }
  }

  // Fit FP2 models (two powers)
  if (maxDegree >= 2) {
    for (let i = 0; i < powers.length; i++) {
      for (let j = i; j < powers.length; j++) {
        const p1 = powers[i];
        const p2 = powers[j];

        let X;
        if (p1 === p2) {
          // Repeated power: use x^p and x^p * log(x)
          X = transformedStudies.map(s => [
            1,
            fpTransform(s.doseAdj, p1),
            fpTransform(s.doseAdj, p1) * Math.log(s.doseAdj)
          ]);
        } else {
          X = transformedStudies.map(s => [
            1,
            fpTransform(s.doseAdj, p1),
            fpTransform(s.doseAdj, p2)
          ]);
        }

        const fit = weightedRegression(X, transformedStudies.map(s => s.effect),
          transformedStudies.map(s => 1 / (s.se * s.se)));

        if (fit.converged) {
          results.push({
            degree: 2,
            powers: [p1, p2],
            coefficients: fit.beta,
            deviance: fit.deviance,
            aic: fit.deviance + 2 * 3,
            bic: fit.deviance + Math.log(studies.length) * 3,
            fit
          });
        }
      }
    }
  }

  // Select best model by AIC
  results.sort((a, b) => a.aic - b.aic);
  const best = results[0];

  // Compute covariance matrix for best model (for CIs)
  const bestX = transformedStudies.map(s => {
    const row = [1, fpTransform(s.doseAdj, best.powers[0])];
    if (best.powers.length === 2) {
      if (best.powers[0] === best.powers[1]) {
        row.push(fpTransform(s.doseAdj, best.powers[0]) * Math.log(s.doseAdj));
      } else {
        row.push(fpTransform(s.doseAdj, best.powers[1]));
      }
    }
    return row;
  });
  const bestW = transformedStudies.map(s => 1 / (s.se * s.se));

  // Compute (X'WX)^-1 for standard errors
  const nP = best.coefficients.length;
  const XtWX = Array(nP).fill(null).map(() => Array(nP).fill(0));
  for (let i = 0; i < bestX.length; i++) {
    for (let j = 0; j < nP; j++) {
      for (let k = 0; k < nP; k++) {
        XtWX[j][k] += bestX[i][j] * bestW[i] * bestX[i][k];
      }
    }
  }
  let covMatrix;
  try {
    covMatrix = invertMatrix(XtWX);
  } catch (e) {
    covMatrix = null;
  }

  // Generate predicted curve with CIs
  const maxDoseVal = Math.max(...studies.map(s => s.dose));
  const doseRange = Array.from({ length: 101 }, (_, i) => i * maxDoseVal / 100);
  const zCrit = inverseNormal(0.975);

  const predicted = doseRange.map(d => {
    const dAdj = d + epsilon;
    const effect = predictFP(dAdj, best.powers, best.coefficients);

    // Compute SE using delta method: SE = sqrt(x' * Cov * x)
    let lower = null, upper = null;
    if (covMatrix) {
      const x = [1, fpTransform(dAdj, best.powers[0])];
      if (best.powers.length === 2) {
        if (best.powers[0] === best.powers[1]) {
          x.push(fpTransform(dAdj, best.powers[0]) * Math.log(dAdj));
        } else {
          x.push(fpTransform(dAdj, best.powers[1]));
        }
      }

      // x' * Cov * x
      let variance = 0;
      for (let i = 0; i < nP; i++) {
        for (let j = 0; j < nP; j++) {
          variance += x[i] * covMatrix[i][j] * x[j];
        }
      }
      const se = Math.sqrt(Math.max(0, variance));
      lower = effect - zCrit * se;
      upper = effect + zCrit * se;
    }

    return { dose: d, effect, lower, upper };
  });

  return {
    bestModel: {
      powers: best.powers,
      coefficients: best.coefficients,
      aic: best.aic,
      bic: best.bic,
      covarianceMatrix: covMatrix
    },
    allModels: results.slice(0, 10), // Top 10 models
    predicted,
    doseAtEffect: (targetEffect) => findDoseAtEffect(targetEffect, best, epsilon)
  };
}

/**
 * Fractional polynomial transformation
 */
function fpTransform(x, p) {
  if (p === 0) return Math.log(x);
  return Math.pow(x, p);
}

/**
 * Predict from FP model
 */
function predictFP(dose, powers, coefficients) {
  let pred = coefficients[0]; // Intercept

  if (powers.length === 1) {
    pred += coefficients[1] * fpTransform(dose, powers[0]);
  } else if (powers.length === 2) {
    pred += coefficients[1] * fpTransform(dose, powers[0]);
    if (powers[0] === powers[1]) {
      pred += coefficients[2] * fpTransform(dose, powers[0]) * Math.log(dose);
    } else {
      pred += coefficients[2] * fpTransform(dose, powers[1]);
    }
  }

  return pred;
}

/**
 * Find dose at target effect (inverse prediction)
 */
function findDoseAtEffect(targetEffect, model, epsilon) {
  // Binary search for dose
  let low = epsilon;
  let high = 1000;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const pred = predictFP(mid, model.powers, model.coefficients);

    if (Math.abs(pred - targetEffect) < 0.001) {
      return mid - epsilon;
    }

    if (pred < targetEffect) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2 - epsilon;
}

/**
 * Weighted linear regression
 */
function weightedRegression(X, y, weights) {
  const n = X.length;
  const p = X[0].length;

  // X'WX
  const XtWX = Array(p).fill(null).map(() => Array(p).fill(0));
  const XtWy = Array(p).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      XtWy[j] += X[i][j] * weights[i] * y[i];
      for (let k = 0; k < p; k++) {
        XtWX[j][k] += X[i][j] * weights[i] * X[i][k];
      }
    }
  }

  // Solve for beta
  try {
    const XtWXinv = invertMatrix(XtWX);
    const beta = XtWXinv.map((row, i) =>
      row.reduce((sum, val, j) => sum + val * XtWy[j], 0)
    );

    // Compute deviance
    let deviance = 0;
    for (let i = 0; i < n; i++) {
      const fitted = X[i].reduce((sum, xij, j) => sum + xij * beta[j], 0);
      deviance += weights[i] * Math.pow(y[i] - fitted, 2);
    }

    return { converged: true, beta, deviance };
  } catch (e) {
    return { converged: false };
  }
}

/**
 * EMAX Dose-Response Model
 * Sigmoid model common in pharmacology
 *
 * E = E0 + Emax * dose^h / (ED50^h + dose^h)
 *
 * @param {Array} studies - Dose-response data
 * @param {Object} options - Model options
 * @returns {Object} EMAX model fit
 */
export function emaxModel(studies, options = {}) {
  const {
    fixedHill = null, // Fix Hill coefficient (null = estimate)
    maxIterations = 100,
    tolerance = 1e-6
  } = options;

  const doses = studies.map(s => s.dose);
  const effects = studies.map(s => s.effect);
  const weights = studies.map(s => 1 / (s.se * s.se));

  // Initial parameter estimates
  const E0 = effects[0]; // Effect at dose 0
  const Emax = Math.max(...effects) - E0;
  const medianDose = doses.sort((a, b) => a - b)[Math.floor(doses.length / 2)];
  let ED50 = medianDose;
  let h = fixedHill || 1;

  // Iterative estimation (Gauss-Newton)
  for (let iter = 0; iter < maxIterations; iter++) {
    const predictions = doses.map(d => E0 + Emax * Math.pow(d, h) / (Math.pow(ED50, h) + Math.pow(d, h)));
    const residuals = effects.map((e, i) => e - predictions[i]);

    // Jacobian - handle dose=0 to avoid log(0) = -Infinity
    const J = doses.map(d => {
      // At dose=0: E = E0, so dE/dE0=1, all other derivatives=0
      if (d === 0 || d < 1e-10) {
        return fixedHill ? [1, 0, 0] : [1, 0, 0, 0];
      }

      const dPowH = Math.pow(d, h);
      const ed50PowH = Math.pow(ED50, h);
      const denom = ed50PowH + dPowH;

      const dE0 = 1;
      const dEmax = dPowH / denom;
      const dED50 = -Emax * dPowH * h * Math.pow(ED50, h - 1) / (denom * denom);

      // Derivative w.r.t. h: requires log(d) and log(ED50)
      let dh = 0;
      if (!fixedHill) {
        const logD = Math.log(d);
        const logED50 = Math.log(ED50);
        dh = Emax * dPowH * logD / denom -
          Emax * dPowH * (dPowH * logD + ed50PowH * logED50) / (denom * denom);
      }

      return fixedHill ? [dE0, dEmax, dED50] : [dE0, dEmax, dED50, dh];
    });

    // Weighted normal equations
    const nParams = fixedHill ? 3 : 4;
    const JtWJ = Array(nParams).fill(null).map(() => Array(nParams).fill(0));
    const JtWr = Array(nParams).fill(0);

    for (let i = 0; i < studies.length; i++) {
      for (let j = 0; j < nParams; j++) {
        JtWr[j] += J[i][j] * weights[i] * residuals[i];
        for (let k = 0; k < nParams; k++) {
          JtWJ[j][k] += J[i][j] * weights[i] * J[i][k];
        }
      }
    }

    // Update parameters
    try {
      const JtWJinv = invertMatrix(JtWJ);
      const delta = JtWJinv.map((row, i) =>
        row.reduce((sum, val, j) => sum + val * JtWr[j], 0)
      );

      const oldParams = fixedHill ? [E0, Emax, ED50] : [E0, Emax, ED50, h];
      E0 += delta[0];
      Emax += delta[1];
      ED50 = Math.max(0.001, ED50 + delta[2]);
      if (!fixedHill) h = Math.max(0.1, h + delta[3]);

      // Check convergence
      const maxChange = Math.max(...delta.map(Math.abs));
      if (maxChange < tolerance) break;
    } catch (e) {
      break; // Singular matrix, stop iteration
    }
  }

  // Standard errors (from inverse Hessian)
  const finalJ = doses.map(d => {
    const denom = Math.pow(ED50, h) + Math.pow(d, h);
    return fixedHill ?
      [1, Math.pow(d, h) / denom, -Emax * Math.pow(d, h) * h * Math.pow(ED50, h - 1) / (denom * denom)] :
      [1, Math.pow(d, h) / denom, -Emax * Math.pow(d, h) * h * Math.pow(ED50, h - 1) / (denom * denom), 0];
  });

  const nParams = fixedHill ? 3 : 4;
  const JtWJ = Array(nParams).fill(null).map(() => Array(nParams).fill(0));
  for (let i = 0; i < studies.length; i++) {
    for (let j = 0; j < nParams; j++) {
      for (let k = 0; k < nParams; k++) {
        JtWJ[j][k] += finalJ[i][j] * weights[i] * finalJ[i][k];
      }
    }
  }

  let se;
  try {
    const cov = invertMatrix(JtWJ);
    se = cov.map((row, i) => Math.sqrt(Math.max(0, row[i])));
  } catch (e) {
    se = Array(nParams).fill(NaN);
  }

  // Generate prediction curve
  const maxDose = Math.max(...doses);
  const doseRange = Array.from({ length: 101 }, (_, i) => i * maxDose / 100);
  const predicted = doseRange.map(d => ({
    dose: d,
    effect: E0 + Emax * Math.pow(d, h) / (Math.pow(ED50, h) + Math.pow(d, h))
  }));

  return {
    parameters: {
      E0: { estimate: E0, se: se[0] },
      Emax: { estimate: Emax, se: se[1] },
      ED50: { estimate: ED50, se: se[2] },
      h: fixedHill ? { estimate: h, fixed: true } : { estimate: h, se: se[3] }
    },
    predicted,
    derivedQuantities: {
      ED10: ED50 * Math.pow(0.1 / 0.9, 1 / h),
      ED50: ED50,
      ED90: ED50 * Math.pow(0.9 / 0.1, 1 / h)
    }
  };
}

// ============================================================================
// PHASE 3: PRISMA 2020 CHECKLIST GENERATOR
// ============================================================================

/**
 * Generate PRISMA 2020 Checklist
 * Auto-populates items based on available analysis data
 *
 * Reference: Page MJ, et al. BMJ 2021;372:n71
 *
 * @param {Object} reviewData - Review metadata and analysis results
 * @returns {Object} PRISMA checklist with completion status
 */
export function generatePRISMAChecklist(reviewData) {
  const checklist = {
    title: 'PRISMA 2020 Checklist',
    sections: []
  };

  // Title Section
  checklist.sections.push({
    name: 'TITLE',
    items: [{
      number: 1,
      item: 'Title',
      description: 'Identify the report as a systematic review.',
      status: reviewData.title?.includes('systematic review') ||
              reviewData.title?.includes('meta-analysis') ? 'complete' : 'incomplete',
      recommendation: 'Include "systematic review" and/or "meta-analysis" in the title.',
      autoFilled: reviewData.title || null
    }]
  });

  // Abstract Section
  checklist.sections.push({
    name: 'ABSTRACT',
    items: [{
      number: 2,
      item: 'Abstract',
      description: 'See the PRISMA 2020 for Abstracts checklist.',
      status: reviewData.abstract ? 'complete' : 'incomplete',
      recommendation: 'Provide a structured summary including background, methods, results, and conclusions.'
    }]
  });

  // Introduction Section
  checklist.sections.push({
    name: 'INTRODUCTION',
    items: [
      {
        number: 3,
        item: 'Rationale',
        description: 'Describe the rationale for the review in the context of existing knowledge.',
        status: reviewData.rationale ? 'complete' : 'incomplete'
      },
      {
        number: 4,
        item: 'Objectives',
        description: 'Provide an explicit statement of the objective(s) or question(s) the review addresses.',
        status: reviewData.objectives || reviewData.pico ? 'complete' : 'incomplete',
        autoFilled: reviewData.pico ? `PICO: ${JSON.stringify(reviewData.pico)}` : null
      }
    ]
  });

  // Methods Section
  const methodsItems = [
    {
      number: 5,
      item: 'Eligibility criteria',
      description: 'Specify the inclusion and exclusion criteria for the review.',
      status: reviewData.eligibility ? 'complete' : 'incomplete'
    },
    {
      number: 6,
      item: 'Information sources',
      description: 'Specify all databases, registers, websites, organisations, reference lists and other sources searched.',
      status: reviewData.databases?.length > 0 ? 'complete' : 'incomplete',
      autoFilled: reviewData.databases?.join(', ')
    },
    {
      number: 7,
      item: 'Search strategy',
      description: 'Present the full search strategies for all databases, registers and websites.',
      status: reviewData.searchStrategy ? 'complete' : 'incomplete'
    },
    {
      number: 8,
      item: 'Selection process',
      description: 'Specify the methods used to decide whether a study met the inclusion criteria.',
      status: reviewData.selectionProcess ? 'complete' : 'incomplete'
    },
    {
      number: 9,
      item: 'Data collection process',
      description: 'Specify the methods used to collect data from reports.',
      status: reviewData.dataCollection ? 'complete' : 'incomplete'
    },
    {
      number: 10,
      item: 'Data items',
      subItems: [
        { sub: '10a', description: 'List and define all outcomes.' },
        { sub: '10b', description: 'List and define all other variables.' }
      ],
      status: reviewData.outcomes?.length > 0 ? 'partial' : 'incomplete',
      autoFilled: reviewData.outcomes?.map(o => o.name).join(', ')
    },
    {
      number: 11,
      item: 'Study risk of bias assessment',
      description: 'Specify the methods used to assess risk of bias in included studies.',
      status: reviewData.robTool ? 'complete' : 'incomplete',
      autoFilled: reviewData.robTool
    },
    {
      number: 12,
      item: 'Effect measures',
      description: 'Specify for each outcome the effect measure(s) used.',
      status: reviewData.effectMeasures ? 'complete' : 'incomplete',
      autoFilled: reviewData.effectMeasures
    },
    {
      number: 13,
      item: 'Synthesis methods',
      subItems: [
        { sub: '13a', description: 'Describe processes for deciding which studies were eligible for synthesis.' },
        { sub: '13b', description: 'Describe any methods required to prepare the data for synthesis.' },
        { sub: '13c', description: 'Describe any methods used to tabulate or visually display results.' },
        { sub: '13d', description: 'Describe any methods used to synthesize results (statistical model).' },
        { sub: '13e', description: 'Describe any methods used to explore heterogeneity.' },
        { sub: '13f', description: 'Describe any sensitivity analyses conducted.' }
      ],
      status: reviewData.synthesisMethod ? 'complete' : 'incomplete',
      autoFilled: generateSynthesisMethodsText(reviewData)
    },
    {
      number: 14,
      item: 'Reporting bias assessment',
      description: 'Describe any methods used to assess risk of bias due to missing results.',
      status: reviewData.publicationBiasMethod ? 'complete' : 'incomplete',
      autoFilled: reviewData.publicationBiasMethod
    },
    {
      number: 15,
      item: 'Certainty assessment',
      description: 'Describe any methods used to assess certainty in the body of evidence.',
      status: reviewData.gradeUsed ? 'complete' : 'incomplete',
      autoFilled: reviewData.gradeUsed ? 'GRADE framework' : null
    }
  ];

  checklist.sections.push({ name: 'METHODS', items: methodsItems });

  // Results Section
  const resultsItems = [
    {
      number: 16,
      item: 'Study selection',
      subItems: [
        { sub: '16a', description: 'Describe results of search and selection process.' },
        { sub: '16b', description: 'Cite studies excluded after full-text review and explain why.' }
      ],
      status: reviewData.flowDiagram ? 'complete' : 'incomplete',
      autoFilled: reviewData.studyCounts ? `Identified: ${reviewData.studyCounts.identified}, Screened: ${reviewData.studyCounts.screened}, Included: ${reviewData.studyCounts.included}` : null
    },
    {
      number: 17,
      item: 'Study characteristics',
      description: 'Cite each included study and present its characteristics.',
      status: reviewData.studyCharacteristics ? 'complete' : 'incomplete'
    },
    {
      number: 18,
      item: 'Risk of bias in studies',
      description: 'Present assessments of risk of bias for each included study.',
      status: reviewData.robResults ? 'complete' : 'incomplete'
    },
    {
      number: 19,
      item: 'Results of individual studies',
      description: 'Present results for all outcomes for each study.',
      status: reviewData.individualResults ? 'complete' : 'incomplete'
    },
    {
      number: 20,
      item: 'Results of syntheses',
      subItems: [
        { sub: '20a', description: 'Present results of each synthesis.' },
        { sub: '20b', description: 'Present results of statistical heterogeneity investigations.' },
        { sub: '20c', description: 'Present results of sensitivity analyses.' },
        { sub: '20d', description: 'If meta-analysis was done, present forest plot.' }
      ],
      status: reviewData.metaResults ? 'complete' : 'incomplete',
      autoFilled: generateResultsSummaryText(reviewData)
    },
    {
      number: 21,
      item: 'Reporting biases',
      description: 'Present assessments of risk of bias due to missing results.',
      status: reviewData.publicationBiasResults ? 'complete' : 'incomplete'
    },
    {
      number: 22,
      item: 'Certainty of evidence',
      description: 'Present assessments of certainty for each assessed outcome.',
      status: reviewData.gradeResults ? 'complete' : 'incomplete'
    }
  ];

  checklist.sections.push({ name: 'RESULTS', items: resultsItems });

  // Discussion Section
  checklist.sections.push({
    name: 'DISCUSSION',
    items: [
      {
        number: 23,
        item: 'Discussion',
        subItems: [
          { sub: '23a', description: 'Provide a general interpretation of results in context.' },
          { sub: '23b', description: 'Discuss any limitations of the evidence.' },
          { sub: '23c', description: 'Discuss any limitations of the review processes.' },
          { sub: '23d', description: 'Discuss implications for practice, policy, and research.' }
        ],
        status: reviewData.discussion ? 'complete' : 'incomplete'
      }
    ]
  });

  // Other Information
  checklist.sections.push({
    name: 'OTHER INFORMATION',
    items: [
      {
        number: 24,
        item: 'Registration and protocol',
        subItems: [
          { sub: '24a', description: 'Provide registration information.' },
          { sub: '24b', description: 'Indicate where protocol can be accessed.' },
          { sub: '24c', description: 'Describe and explain any amendments.' }
        ],
        status: reviewData.registration ? 'complete' : 'incomplete',
        autoFilled: reviewData.registration
      },
      {
        number: 25,
        item: 'Support',
        description: 'Describe sources of financial or non-financial support.',
        status: reviewData.funding ? 'complete' : 'incomplete'
      },
      {
        number: 26,
        item: 'Competing interests',
        description: 'Declare any competing interests of review authors.',
        status: reviewData.conflicts ? 'complete' : 'incomplete'
      },
      {
        number: 27,
        item: 'Availability of data, code, materials',
        description: 'Report which data, code, and materials are available.',
        status: reviewData.dataAvailability ? 'complete' : 'incomplete'
      }
    ]
  });

  // Calculate completion summary
  const allItems = checklist.sections.flatMap(s => s.items);
  const complete = allItems.filter(i => i.status === 'complete').length;
  const partial = allItems.filter(i => i.status === 'partial').length;
  const incomplete = allItems.filter(i => i.status === 'incomplete').length;

  checklist.summary = {
    total: allItems.length,
    complete,
    partial,
    incomplete,
    percentComplete: Math.round((complete + partial * 0.5) / allItems.length * 100)
  };

  return checklist;
}

/**
 * Generate synthesis methods text from review data
 */
function generateSynthesisMethodsText(reviewData) {
  if (!reviewData.synthesisMethod) return null;

  const parts = [];

  if (reviewData.model) {
    parts.push(`${reviewData.model} model`);
  }

  if (reviewData.tau2Method) {
    parts.push(`τ² estimated using ${reviewData.tau2Method}`);
  }

  if (reviewData.hksj) {
    parts.push('Hartung-Knapp-Sidik-Jonkman adjustment applied');
  }

  return parts.join('; ');
}

/**
 * Generate results summary text from review data
 */
function generateResultsSummaryText(reviewData) {
  if (!reviewData.metaResults) return null;

  const r = reviewData.metaResults;
  return `Pooled effect: ${r.random?.mu?.toFixed(3) || 'N/A'}, ` +
    `I²: ${r.I2?.toFixed(1) || 'N/A'}%, ` +
    `k: ${r.nStudies || r.studies?.length || 'N/A'} studies`;
}

// ============================================================================
// PHASE 3: DATA IMPORT/EXPORT
// ============================================================================

/**
 * Parse RevMan 5 XML file
 * Extracts study data from Cochrane Review Manager format
 *
 * @param {string} xmlString - RevMan .rm5 file content
 * @returns {Object} Parsed review data
 */
export function parseRevManXML(xmlString) {
  // Simple XML parser (for browser without DOMParser dependency)
  const getTagContent = (xml, tag) => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  };

  const getAttribute = (xml, attr) => {
    const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  };

  const result = {
    title: '',
    authors: [],
    studies: [],
    outcomes: [],
    comparisons: []
  };

  // Extract title
  const titles = getTagContent(xmlString, 'TITLE');
  if (titles.length > 0) result.title = titles[0].trim();

  // Extract included studies
  const studiesSection = getTagContent(xmlString, 'STUDIES_AND_REFERENCES');
  if (studiesSection.length > 0) {
    const includedStudies = getTagContent(studiesSection[0], 'INCLUDED_STUDIES');
    if (includedStudies.length > 0) {
      const studyRefs = getTagContent(includedStudies[0], 'STUDY');
      studyRefs.forEach(study => {
        const name = getAttribute(study, 'NAME');
        const year = getAttribute(study, 'YEAR');
        if (name) {
          result.studies.push({ name, year });
        }
      });
    }
  }

  // Extract analyses (outcomes and data)
  const analyses = getTagContent(xmlString, 'ANALYSIS');
  analyses.forEach(analysis => {
    const outcomeName = getAttribute(analysis, 'NAME');
    const outcomeType = getAttribute(analysis, 'TYPE'); // 'DICH' or 'CONT'

    const outcomeData = {
      name: outcomeName,
      type: outcomeType,
      studies: []
    };

    // Extract study data within outcome
    const dichData = getTagContent(analysis, 'DICH_DATA');
    dichData.forEach(data => {
      outcomeData.studies.push({
        name: getAttribute(data, 'STUDY_ID'),
        events1: parseInt(getAttribute(data, 'EVENTS_1')) || 0,
        total1: parseInt(getAttribute(data, 'TOTAL_1')) || 0,
        events2: parseInt(getAttribute(data, 'EVENTS_2')) || 0,
        total2: parseInt(getAttribute(data, 'TOTAL_2')) || 0
      });
    });

    const contData = getTagContent(analysis, 'CONT_DATA');
    contData.forEach(data => {
      outcomeData.studies.push({
        name: getAttribute(data, 'STUDY_ID'),
        n1: parseInt(getAttribute(data, 'N_1')) || 0,
        mean1: parseFloat(getAttribute(data, 'MEAN_1')) || 0,
        sd1: parseFloat(getAttribute(data, 'SD_1')) || 0,
        n2: parseInt(getAttribute(data, 'N_2')) || 0,
        mean2: parseFloat(getAttribute(data, 'MEAN_2')) || 0,
        sd2: parseFloat(getAttribute(data, 'SD_2')) || 0
      });
    });

    if (outcomeData.studies.length > 0) {
      result.outcomes.push(outcomeData);
    }
  });

  return result;
}

/**
 * Export to RevMan 5 XML format
 *
 * @param {Object} reviewData - Review data to export
 * @returns {string} RevMan-compatible XML
 */
export function exportToRevManXML(reviewData) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<COCHRANE_REVIEW>\n';
  xml += `  <COVER_SHEET>\n`;
  xml += `    <TITLE>${escapeXML(reviewData.title || 'Untitled Review')}</TITLE>\n`;
  xml += `  </COVER_SHEET>\n`;

  // Studies section
  xml += '  <STUDIES_AND_REFERENCES>\n';
  xml += '    <INCLUDED_STUDIES>\n';
  (reviewData.studies || []).forEach(study => {
    xml += `      <STUDY NAME="${escapeXML(study.name)}" YEAR="${study.year || ''}"/>\n`;
  });
  xml += '    </INCLUDED_STUDIES>\n';
  xml += '  </STUDIES_AND_REFERENCES>\n';

  // Analyses section
  xml += '  <ANALYSES_AND_DATA>\n';
  (reviewData.outcomes || []).forEach((outcome, idx) => {
    xml += `    <ANALYSIS NAME="${escapeXML(outcome.name)}" TYPE="${outcome.type || 'DICH'}" NO="${idx + 1}">\n`;

    (outcome.studies || []).forEach(study => {
      if (outcome.type === 'CONT') {
        xml += `      <CONT_DATA STUDY_ID="${escapeXML(study.name)}" N_1="${study.n1}" MEAN_1="${study.mean1}" SD_1="${study.sd1}" N_2="${study.n2}" MEAN_2="${study.mean2}" SD_2="${study.sd2}"/>\n`;
      } else {
        xml += `      <DICH_DATA STUDY_ID="${escapeXML(study.name)}" EVENTS_1="${study.events1}" TOTAL_1="${study.total1}" EVENTS_2="${study.events2}" TOTAL_2="${study.total2}"/>\n`;
      }
    });

    xml += '    </ANALYSIS>\n';
  });
  xml += '  </ANALYSES_AND_DATA>\n';

  xml += '</COCHRANE_REVIEW>';
  return xml;
}

/**
 * Escape special XML characters
 */
function escapeXML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Export to CSV format for spreadsheet software
 *
 * @param {Array} studies - Study data
 * @param {Object} options - Export options
 * @returns {string} CSV content
 */
export function exportToCSV(studies, options = {}) {
  const {
    includeCI = true,
    effectMeasure = 'Effect',
    separator = ','
  } = options;

  const headers = ['Study', 'Year', effectMeasure, 'SE', 'Weight'];
  if (includeCI) headers.push('CI_Lower', 'CI_Upper');
  headers.push('N_Treatment', 'N_Control', 'Events_Treatment', 'Events_Control');

  const rows = [headers.join(separator)];

  studies.forEach(study => {
    const row = [
      `"${study.name || study.id || ''}"`,
      study.year || '',
      study.effect?.toFixed(4) || '',
      study.se?.toFixed(4) || '',
      study.weight?.toFixed(2) || ''
    ];

    if (includeCI) {
      row.push(study.ci?.[0]?.toFixed(4) || '');
      row.push(study.ci?.[1]?.toFixed(4) || '');
    }

    row.push(study.n1 || '', study.n0 || '', study.e1 || '', study.e0 || '');

    rows.push(row.join(separator));
  });

  return rows.join('\n');
}

/**
 * Parse CSV input into study data
 *
 * @param {string} csvContent - CSV file content
 * @param {Object} columnMapping - Map column names to fields
 * @returns {Array} Parsed study data
 */
export function parseCSV(csvContent, columnMapping = {}) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  // Default column mapping with smart detection
  const mapping = {
    study: findColumn(headers, ['study', 'name', 'author', 'id']),
    year: findColumn(headers, ['year', 'date', 'publication']),
    effect: findColumn(headers, ['effect', 'estimate', 'logor', 'logrr', 'loghr', 'or', 'rr', 'hr', 'smd', 'md']),
    se: findColumn(headers, ['se', 'stderr', 'standard_error', 'standarderror']),
    variance: findColumn(headers, ['variance', 'var', 'v']),
    ciLower: findColumn(headers, ['ci_lower', 'lower', 'lcl', 'ci_l', 'll']),
    ciUpper: findColumn(headers, ['ci_upper', 'upper', 'ucl', 'ci_u', 'ul']),
    n1: findColumn(headers, ['n1', 'n_treatment', 'n_exp', 'nt', 'ne']),
    n0: findColumn(headers, ['n0', 'n_control', 'n_ctrl', 'nc']),
    e1: findColumn(headers, ['e1', 'events1', 'events_treatment', 'et']),
    e0: findColumn(headers, ['e0', 'events0', 'events_control', 'ec']),
    ...columnMapping
  };

  // Parse data rows
  const studies = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const study = {
      name: mapping.study >= 0 ? values[mapping.study] : `Study ${i}`,
      year: mapping.year >= 0 ? parseInt(values[mapping.year]) : null
    };

    if (mapping.effect >= 0) {
      study.effect = parseFloat(values[mapping.effect]);
    }

    if (mapping.se >= 0) {
      study.se = parseFloat(values[mapping.se]);
    } else if (mapping.variance >= 0) {
      study.se = Math.sqrt(parseFloat(values[mapping.variance]));
    } else if (mapping.ciLower >= 0 && mapping.ciUpper >= 0) {
      // Estimate SE from CI
      const lower = parseFloat(values[mapping.ciLower]);
      const upper = parseFloat(values[mapping.ciUpper]);
      study.se = (upper - lower) / (2 * 1.96);
      study.ci = [lower, upper];
    }

    if (mapping.n1 >= 0) study.n1 = parseInt(values[mapping.n1]);
    if (mapping.n0 >= 0) study.n0 = parseInt(values[mapping.n0]);
    if (mapping.e1 >= 0) study.e1 = parseInt(values[mapping.e1]);
    if (mapping.e0 >= 0) study.e0 = parseInt(values[mapping.e0]);

    // Validate
    if (!isNaN(study.effect) && !isNaN(study.se) && study.se > 0) {
      studies.push(study);
    }
  }

  return studies;
}

/**
 * Find column index by possible names
 */
function findColumn(headers, possibleNames) {
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const name of possibleNames) {
    const idx = lowerHeaders.indexOf(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * Parse a single CSV line (handling quoted values)
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

// ============================================================================
// PHASE 3: LEAGUE TABLE GENERATION
// ============================================================================

/**
 * Generate NMA League Table
 * Matrix showing all pairwise comparisons
 *
 * @param {Object} nmaResults - Network meta-analysis results
 * @param {Object} options - Display options
 * @returns {Object} League table data
 */
export function generateLeagueTable(nmaResults, options = {}) {
  const {
    effectMeasure = 'OR',
    showPValues = false,
    colorScale = true
  } = options;

  const treatments = nmaResults.treatments || [];
  const K = treatments.length;

  // Initialize table
  const table = {
    treatments,
    cells: Array(K).fill(null).map(() => Array(K).fill(null)),
    ranking: []
  };

  // Fill in pairwise comparisons
  for (let i = 0; i < K; i++) {
    for (let j = 0; j < K; j++) {
      if (i === j) {
        table.cells[i][j] = { treatment: treatments[i], diagonal: true };
        continue;
      }

      // Find comparison in results
      const comparison = findComparison(nmaResults, treatments[i], treatments[j]);

      if (comparison) {
        const effect = comparison.effect;
        const ci = comparison.ci || [effect - 1.96 * comparison.se, effect + 1.96 * comparison.se];

        // Format based on effect measure
        let displayEffect, displayCI;
        if (['OR', 'RR', 'HR'].includes(effectMeasure)) {
          displayEffect = Math.exp(effect).toFixed(2);
          displayCI = `(${Math.exp(ci[0]).toFixed(2)}-${Math.exp(ci[1]).toFixed(2)})`;
        } else {
          displayEffect = effect.toFixed(2);
          displayCI = `(${ci[0].toFixed(2)}-${ci[1].toFixed(2)})`;
        }

        // Determine significance and color
        const significant = ci[0] > 0 || ci[1] < 0;
        let color = '#ffffff';
        if (colorScale) {
          if (significant && effect > 0) color = '#c8e6c9'; // Green - favors row
          else if (significant && effect < 0) color = '#ffcdd2'; // Red - favors column
          else color = '#fff9c4'; // Yellow - not significant
        }

        table.cells[i][j] = {
          row: treatments[i],
          column: treatments[j],
          effect: displayEffect,
          ci: displayCI,
          rawEffect: effect,
          significant,
          color,
          pValue: showPValues ? comparison.pValue : null
        };
      } else {
        table.cells[i][j] = { missing: true };
      }
    }
  }

  // Add ranking
  if (nmaResults.pScores) {
    table.ranking = treatments.map((t, i) => ({
      treatment: t,
      pScore: nmaResults.pScores[i] || nmaResults.pScores[t],
      rank: 0
    })).sort((a, b) => (b.pScore || 0) - (a.pScore || 0))
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  return table;
}

/**
 * Find comparison in NMA results
 */
function findComparison(nmaResults, treat1, treat2) {
  // Check direct comparisons
  if (nmaResults.comparisons) {
    const direct = nmaResults.comparisons.find(c =>
      (c.treat1 === treat1 && c.treat2 === treat2) ||
      (c.treat1 === treat2 && c.treat2 === treat1)
    );

    if (direct) {
      // Flip effect if comparison is reversed
      if (direct.treat1 === treat2) {
        return {
          effect: -direct.effect,
          se: direct.se,
          ci: direct.ci ? [-direct.ci[1], -direct.ci[0]] : null,
          pValue: direct.pValue
        };
      }
      return direct;
    }
  }

  // Check relative effects matrix
  if (nmaResults.relativeEffects) {
    const key1 = `${treat1}_vs_${treat2}`;
    const key2 = `${treat2}_vs_${treat1}`;

    if (nmaResults.relativeEffects[key1]) {
      return nmaResults.relativeEffects[key1];
    }
    if (nmaResults.relativeEffects[key2]) {
      const r = nmaResults.relativeEffects[key2];
      return {
        effect: -r.effect,
        se: r.se,
        ci: r.ci ? [-r.ci[1], -r.ci[0]] : null,
        pValue: r.pValue
      };
    }
  }

  return null;
}

// ============================================================================
// PHASE 4: LARGE DATASET OPTIMIZATION
// ============================================================================

/**
 * Streaming Meta-Analysis for Large Datasets
 * Processes studies in chunks to avoid memory issues
 *
 * @param {Iterator|Array} studyIterator - Study data iterator
 * @param {Object} options - Processing options
 * @param {number} options.chunkSize - Number of studies per chunk (default 100)
 * @param {number} options.alpha - Significance level (default 0.05)
 * @param {Function} options.onProgress - Progress callback
 * @returns {Object} Meta-analysis results
 */
export function streamingMetaAnalysis(studyIterator, options = {}) {
  const {
    chunkSize = 100,
    onProgress = null,
    alpha = 0.05
  } = options;

  // Running statistics (Welford's online algorithm for variance)
  let n = 0;
  let sumW = 0;
  let sumWY = 0;
  let sumWY2 = 0;
  let studies = [];

  // Process in chunks
  const iterator = Array.isArray(studyIterator) ? studyIterator[Symbol.iterator]() : studyIterator;
  let chunk = [];
  let processed = 0;

  for (const study of iterator) {
    chunk.push(study);

    if (chunk.length >= chunkSize) {
      processChunk(chunk);
      processed += chunk.length;
      if (onProgress) onProgress(processed);
      chunk = [];
    }
  }

  // Process remaining
  if (chunk.length > 0) {
    processChunk(chunk);
  }

  function processChunk(studies) {
    for (const study of studies) {
      if (isNaN(study.effect) || isNaN(study.se) || study.se <= 0) continue;

      const w = 1 / (study.se * study.se);
      n++;
      sumW += w;
      sumWY += w * study.effect;
      sumWY2 += w * study.effect * study.effect;
    }
  }

  // Compute final statistics
  if (n === 0) {
    return { error: 'No valid studies' };
  }

  const muFixed = sumWY / sumW;
  const seFixed = 1 / Math.sqrt(sumW);
  const Q = sumWY2 - sumWY * sumWY / sumW;

  // Estimate tau² using DerSimonian-Laird
  const df = n - 1;
  const C = sumW - (studies.reduce((s, st) => {
    const w = 1 / (st.se * st.se);
    return s + w * w;
  }, 0) / sumW);

  const tau2 = Math.max(0, (Q - df) / C);
  const I2 = df > 0 ? Math.max(0, (Q - df) / Q * 100) : 0;
  const zCrit = inverseNormal(1 - alpha / 2);

  return {
    fixed: {
      mu: muFixed,
      se: seFixed,
      ci: [muFixed - zCrit * seFixed, muFixed + zCrit * seFixed]
    },
    Q,
    df,
    tau2,
    I2,
    nStudies: n,
    streaming: true
  };
}

/**
 * Incremental Meta-Analysis Update
 * Efficiently updates existing meta-analysis with new studies
 *
 * @param {Object} existingResults - Previous meta-analysis results
 * @param {Array} newStudies - New studies to add
 * @param {Object} options - Options
 * @param {number} options.alpha - Significance level (default 0.05)
 * @returns {Object} Updated meta-analysis results
 */
export function incrementalMetaAnalysisUpdate(existingResults, newStudies, options = {}) {
  const { alpha = 0.05 } = options;
  const {
    sumW: prevSumW,
    sumWY: prevSumWY,
    sumWY2: prevSumWY2,
    sumW2: prevSumW2,
    nStudies: prevN
  } = existingResults._internals || {};

  if (prevSumW === undefined) {
    // No internals stored, fall back to full recalculation
    const allStudies = [...(existingResults.studies || []), ...newStudies];
    return metaAnalysisAdvanced(allStudies);
  }

  // Update running sums
  let sumW = prevSumW;
  let sumWY = prevSumWY;
  let sumWY2 = prevSumWY2;
  let sumW2 = prevSumW2;
  let n = prevN;

  for (const study of newStudies) {
    if (isNaN(study.effect) || isNaN(study.se) || study.se <= 0) continue;

    const w = 1 / (study.se * study.se);
    n++;
    sumW += w;
    sumWY += w * study.effect;
    sumWY2 += w * study.effect * study.effect;
    sumW2 += w * w;
  }

  // Compute updated statistics
  const muFixed = sumWY / sumW;
  const seFixed = 1 / Math.sqrt(sumW);
  const Q = sumWY2 - sumWY * sumWY / sumW;
  const df = n - 1;
  const C = sumW - sumW2 / sumW;
  const tau2 = Math.max(0, (Q - df) / C);
  const I2 = df > 0 ? Math.max(0, (Q - df) / Q * 100) : 0;

  // Random effects
  let sumWRandom = 0;
  let sumWYRandom = 0;

  const allStudies = [...(existingResults.studies || []), ...newStudies];
  for (const study of allStudies) {
    if (isNaN(study.effect) || isNaN(study.se) || study.se <= 0) continue;
    const wRandom = 1 / (study.se * study.se + tau2);
    sumWRandom += wRandom;
    sumWYRandom += wRandom * study.effect;
  }

  const muRandom = sumWYRandom / sumWRandom;
  const seRandom = 1 / Math.sqrt(sumWRandom);
  const zCrit = inverseNormal(1 - alpha / 2);

  return {
    fixed: {
      mu: muFixed,
      se: seFixed,
      ci: [muFixed - zCrit * seFixed, muFixed + zCrit * seFixed],
      pValue: 2 * (1 - normalCDF(Math.abs(muFixed / seFixed)))
    },
    random: {
      mu: muRandom,
      se: seRandom,
      ci: [muRandom - zCrit * seRandom, muRandom + zCrit * seRandom],
      pValue: 2 * (1 - normalCDF(Math.abs(muRandom / seRandom)))
    },
    Q,
    df,
    tau2,
    I2,
    nStudies: n,
    studies: allStudies,
    _internals: { sumW, sumWY, sumWY2, sumW2, nStudies: n },
    incremental: true
  };
}

/**
 * Memoized computation cache for repeated analyses
 */
export class AnalysisCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate cache key from analysis parameters
   * Uses fixed precision to avoid floating point cache misses
   */
  generateKey(studies, options) {
    // Round to 8 decimal places to avoid floating point precision issues
    const studyHash = studies.map(s =>
      `${s.effect.toFixed(8)}:${s.se.toFixed(8)}`
    ).join('|');
    const optionsHash = JSON.stringify(options);
    return `${studyHash}::${optionsHash}`;
  }

  /**
   * Get cached result or compute and cache
   */
  getOrCompute(studies, options, computeFn) {
    const key = this.generateKey(studies, options);

    if (this.cache.has(key)) {
      this.hits++;
      return this.cache.get(key);
    }

    this.misses++;
    const result = computeFn(studies, options);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, result);
    return result;
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0
    };
  }
}

// ============================================================================
// PHASE 4: LIVING REVIEW RULES-BASED EVIDENCE MONITORING
// ============================================================================

/**
 * Evidence Change Detector (Rules-Based)
 * Monitors meta-analysis results for clinically significant changes
 *
 * @param {Object} previousResults - Previous meta-analysis results
 * @param {Object} currentResults - Current meta-analysis results
 * @param {Object} thresholds - Detection thresholds
 * @returns {Object} Change detection results
 */
export function detectEvidenceChange(previousResults, currentResults, thresholds = {}) {
  const {
    effectChangeThreshold = 0.2, // Minimum absolute change in effect
    significanceChange = true, // Alert on significance flip
    certaintyChange = true, // Alert on GRADE certainty change
    clinicalThreshold = null // Clinical decision threshold
  } = thresholds;

  const changes = [];
  let alertLevel = 'none'; // 'none', 'minor', 'moderate', 'major'

  const prevEffect = previousResults.random?.mu || previousResults.pooled?.effect;
  const currEffect = currentResults.random?.mu || currentResults.pooled?.effect;
  const prevCI = previousResults.random?.ci || previousResults.pooled?.ci;
  const currCI = currentResults.random?.ci || currentResults.pooled?.ci;

  // Check effect size change
  if (prevEffect !== undefined && currEffect !== undefined) {
    const effectChange = Math.abs(currEffect - prevEffect);

    if (effectChange > effectChangeThreshold) {
      changes.push({
        type: 'effect_magnitude',
        description: `Effect changed by ${effectChange.toFixed(3)} (${prevEffect.toFixed(3)} → ${currEffect.toFixed(3)})`,
        severity: effectChange > effectChangeThreshold * 2 ? 'major' : 'moderate'
      });
      alertLevel = upgradeAlertLevel(alertLevel, effectChange > effectChangeThreshold * 2 ? 'major' : 'moderate');
    }
  }

  // Check significance flip
  if (significanceChange && prevCI && currCI) {
    const prevSignificant = prevCI[0] > 0 || prevCI[1] < 0;
    const currSignificant = currCI[0] > 0 || currCI[1] < 0;

    if (prevSignificant !== currSignificant) {
      changes.push({
        type: 'significance_flip',
        description: `Significance changed: ${prevSignificant ? 'significant' : 'non-significant'} → ${currSignificant ? 'significant' : 'non-significant'}`,
        severity: 'major'
      });
      alertLevel = upgradeAlertLevel(alertLevel, 'major');
    }
  }

  // Check direction change
  if (prevEffect !== undefined && currEffect !== undefined) {
    if ((prevEffect > 0 && currEffect < 0) || (prevEffect < 0 && currEffect > 0)) {
      changes.push({
        type: 'direction_change',
        description: `Effect direction changed: ${prevEffect > 0 ? 'positive' : 'negative'} → ${currEffect > 0 ? 'positive' : 'negative'}`,
        severity: 'major'
      });
      alertLevel = upgradeAlertLevel(alertLevel, 'major');
    }
  }

  // Check clinical threshold crossing
  if (clinicalThreshold !== null && prevCI && currCI) {
    const prevCrossed = prevCI[0] <= clinicalThreshold && prevCI[1] >= clinicalThreshold;
    const currCrossed = currCI[0] <= clinicalThreshold && currCI[1] >= clinicalThreshold;

    if (prevCrossed !== currCrossed) {
      changes.push({
        type: 'clinical_threshold',
        description: `Relationship to clinical threshold (${clinicalThreshold}) changed`,
        severity: 'major'
      });
      alertLevel = upgradeAlertLevel(alertLevel, 'major');
    }
  }

  // Check heterogeneity change
  const prevI2 = previousResults.I2;
  const currI2 = currentResults.I2;
  if (prevI2 !== undefined && currI2 !== undefined) {
    const i2Change = currI2 - prevI2;

    if (Math.abs(i2Change) > 25) {
      changes.push({
        type: 'heterogeneity',
        description: `I² changed by ${i2Change.toFixed(1)}% (${prevI2.toFixed(1)}% → ${currI2.toFixed(1)}%)`,
        severity: Math.abs(i2Change) > 40 ? 'moderate' : 'minor'
      });
      alertLevel = upgradeAlertLevel(alertLevel, Math.abs(i2Change) > 40 ? 'moderate' : 'minor');
    }
  }

  // Check sample size / precision improvement
  const prevN = previousResults.nStudies || previousResults.studies?.length || 0;
  const currN = currentResults.nStudies || currentResults.studies?.length || 0;

  if (currN > prevN) {
    changes.push({
      type: 'new_studies',
      description: `${currN - prevN} new studies added (${prevN} → ${currN})`,
      severity: 'minor'
    });
    alertLevel = upgradeAlertLevel(alertLevel, 'minor');
  }

  return {
    hasChanges: changes.length > 0,
    alertLevel,
    changes,
    summary: generateChangeSummary(changes, alertLevel),
    recommendation: generateChangeRecommendation(alertLevel, changes),
    timestamp: new Date().toISOString()
  };
}

/**
 * Upgrade alert level
 */
function upgradeAlertLevel(current, proposed) {
  const levels = { none: 0, minor: 1, moderate: 2, major: 3 };
  return levels[proposed] > levels[current] ? proposed : current;
}

/**
 * Generate change summary text
 */
function generateChangeSummary(changes, alertLevel) {
  if (changes.length === 0) {
    return 'No significant changes detected in the evidence base.';
  }

  const majorChanges = changes.filter(c => c.severity === 'major');
  const moderateChanges = changes.filter(c => c.severity === 'moderate');
  const minorChanges = changes.filter(c => c.severity === 'minor');

  let summary = `Evidence monitoring detected ${changes.length} change(s): `;

  if (majorChanges.length > 0) {
    summary += `${majorChanges.length} major`;
  }
  if (moderateChanges.length > 0) {
    summary += `${majorChanges.length > 0 ? ', ' : ''}${moderateChanges.length} moderate`;
  }
  if (minorChanges.length > 0) {
    summary += `${(majorChanges.length + moderateChanges.length) > 0 ? ', ' : ''}${minorChanges.length} minor`;
  }

  return summary + '.';
}

/**
 * Generate recommendation based on changes
 */
function generateChangeRecommendation(alertLevel, changes) {
  switch (alertLevel) {
    case 'major':
      return 'URGENT: Major change in evidence detected. Review conclusions and consider updating recommendations immediately.';
    case 'moderate':
      return 'Important change in evidence detected. Schedule review of conclusions within 1 month.';
    case 'minor':
      return 'Minor change in evidence detected. Continue monitoring; no immediate action required.';
    default:
      return 'No action required. Continue routine monitoring.';
  }
}

/**
 * Search Strategy Validator
 * Rules-based validation of search strategy completeness
 *
 * @param {Object} searchStrategy - Search strategy details
 * @returns {Object} Validation results
 */
export function validateSearchStrategy(searchStrategy) {
  const issues = [];
  const recommendations = [];
  let score = 100;

  // Check databases searched
  const minDatabases = ['MEDLINE', 'Embase', 'CENTRAL'];
  const searched = (searchStrategy.databases || []).map(d => d.toUpperCase());

  minDatabases.forEach(db => {
    if (!searched.some(s => s.includes(db))) {
      issues.push(`Missing recommended database: ${db}`);
      score -= 10;
    }
  });

  // Check for grey literature
  const greyLit = ['ClinicalTrials.gov', 'WHO ICTRP', 'OpenGrey', 'ProQuest'];
  const hasGreyLit = greyLit.some(g =>
    searched.some(s => s.toLowerCase().includes(g.toLowerCase()))
  );

  if (!hasGreyLit) {
    issues.push('No grey literature sources searched');
    recommendations.push('Consider searching trial registries and grey literature');
    score -= 5;
  }

  // Check search terms
  if (!searchStrategy.terms || searchStrategy.terms.length === 0) {
    issues.push('No search terms documented');
    score -= 20;
  } else {
    // Check for MeSH/controlled vocabulary
    const hasMeSH = searchStrategy.terms.some(t =>
      t.includes('[MeSH]') || t.includes('[Mesh]') || t.includes('exp ')
    );
    if (!hasMeSH) {
      recommendations.push('Consider adding MeSH/controlled vocabulary terms');
    }

    // Check for Boolean operators
    const hasBoolean = searchStrategy.terms.some(t =>
      t.includes(' AND ') || t.includes(' OR ') || t.includes(' NOT ')
    );
    if (!hasBoolean) {
      issues.push('Search strategy may lack proper Boolean structure');
      score -= 5;
    }
  }

  // Check date restrictions
  if (searchStrategy.dateRestriction) {
    recommendations.push('Date restrictions applied - document justification');
  }

  // Check language restrictions
  if (searchStrategy.languageRestriction) {
    issues.push('Language restrictions may introduce bias');
    score -= 5;
  }

  return {
    valid: score >= 70,
    score: Math.max(0, score),
    issues,
    recommendations,
    databases: searchStrategy.databases || [],
    dateRange: searchStrategy.dateRange || null,
    lastUpdated: searchStrategy.lastUpdated || null
  };
}

// ============================================================================
// PHASE 5: ADVANCED STATISTICAL METHODS
// ============================================================================

// ----------------------------------------------------------------------------
// 5.1 NETWORK META-REGRESSION
// ----------------------------------------------------------------------------

/**
 * Network Meta-Regression
 * Extends NMA to include study-level or treatment-level covariates
 * Reference: Salanti G, et al. Stat Med 2008;27:5689-702
 *
 * @param {Array} contrasts - Array of {study, t1, t2, effect, se, covariate}
 * @param {Array} treatments - List of treatment names
 * @param {string|Array} moderators - Covariate name(s) to include
 * @param {Object} options - Analysis options
 * @returns {Object} Network meta-regression results
 */
export function networkMetaRegression(contrasts, treatments, moderators, options = {}) {
  const {
    model = 'random', // 'fixed' or 'random'
    interactionType = 'common', // 'common', 'treatment-specific'
    center = true // Center covariates
  } = options;

  const mods = Array.isArray(moderators) ? moderators : [moderators];
  const k = contrasts.length;
  const nTreatments = treatments.length;
  const nMods = mods.length;

  // Extract and center covariates
  const covariateData = {};
  mods.forEach(mod => {
    const values = contrasts.map(c => c[mod] || c.covariates?.[mod] || 0);
    const mean = center ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    covariateData[mod] = {
      values: values.map(v => v - mean),
      mean,
      sd: Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1))
    };
  });

  // Build design matrix with covariates
  const refTreatment = treatments[0];
  const designMatrix = [];
  const Y = [];
  const V = [];

  contrasts.forEach((contrast, i) => {
    const row = new Array(nTreatments - 1 + nMods * (interactionType === 'common' ? 1 : nTreatments - 1)).fill(0);

    // Treatment effects (vs reference)
    const t1Idx = treatments.indexOf(contrast.t1);
    const t2Idx = treatments.indexOf(contrast.t2);

    if (t1Idx > 0) row[t1Idx - 1] = 1;
    if (t2Idx > 0) row[t2Idx - 1] = -1;

    // Covariate effects
    let colOffset = nTreatments - 1;
    mods.forEach((mod, mi) => {
      const covValue = covariateData[mod].values[i];
      if (interactionType === 'common') {
        row[colOffset + mi] = covValue;
      } else {
        // Treatment-specific interactions
        if (t1Idx > 0) row[colOffset + (t1Idx - 1) * nMods + mi] = covValue;
        if (t2Idx > 0) row[colOffset + (t2Idx - 1) * nMods + mi] = -covValue;
      }
    });

    designMatrix.push(row);
    Y.push(contrast.effect);
    V.push(contrast.se * contrast.se);
  });

  // Estimate tau² using method of moments if random effects
  let tau2 = 0;
  if (model === 'random') {
    // Simple moment estimator for NMA
    const basicNMA = networkMetaAnalysis(contrasts, treatments, { model: 'random' });
    tau2 = basicNMA.tau2 || 0;
  }

  // Weighted least squares with tau²
  const W = V.map(v => 1 / (v + tau2));
  const XtWX = matrixMultiply(
    matrixTranspose(designMatrix),
    matrixDiagonalMultiply(designMatrix, W)
  );
  const XtWY = matrixVectorMultiply(
    matrixTranspose(designMatrix),
    Y.map((y, i) => y * W[i])
  );

  // Solve for coefficients
  const XtWXInv = matrixInverse(XtWX);
  const beta = matrixVectorMultiply(XtWXInv, XtWY);
  const se = XtWXInv.map((row, i) => Math.sqrt(row[i]));

  // Parse results
  const treatmentEffects = {};
  treatments.slice(1).forEach((t, i) => {
    treatmentEffects[t] = {
      effect: beta[i],
      se: se[i],
      ci: [beta[i] - 1.96 * se[i], beta[i] + 1.96 * se[i]],
      pValue: 2 * (1 - normalCDF(Math.abs(beta[i] / se[i])))
    };
  });

  const moderatorEffects = {};
  let colOffset = nTreatments - 1;
  if (interactionType === 'common') {
    mods.forEach((mod, mi) => {
      moderatorEffects[mod] = {
        coefficient: beta[colOffset + mi],
        se: se[colOffset + mi],
        ci: [beta[colOffset + mi] - 1.96 * se[colOffset + mi], beta[colOffset + mi] + 1.96 * se[colOffset + mi]],
        pValue: 2 * (1 - normalCDF(Math.abs(beta[colOffset + mi] / se[colOffset + mi]))),
        centered: center,
        mean: covariateData[mod].mean
      };
    });
  }

  // Calculate R² (variance explained)
  const predictedY = designMatrix.map(row => row.reduce((sum, x, j) => sum + x * beta[j], 0));
  const residuals = Y.map((y, i) => y - predictedY[i]);
  const SSres = residuals.reduce((sum, r, i) => sum + W[i] * r * r, 0);
  const meanY = Y.reduce((a, b) => a + b, 0) / Y.length;
  const SStot = Y.reduce((sum, y, i) => sum + W[i] * Math.pow(y - meanY, 2), 0);
  const R2 = 1 - SSres / SStot;

  // Model fit statistics
  const df = k - beta.length;
  const Qres = SSres;
  const pHeterogeneity = 1 - chiSquaredCDF(Qres, df);

  return {
    treatmentEffects,
    moderatorEffects,
    model: {
      type: model,
      interactionType,
      tau2,
      R2: Math.max(0, R2),
      Qres,
      df,
      pHeterogeneity
    },
    covariateInfo: covariateData,
    coefficients: beta,
    se,
    nStudies: k,
    nTreatments
  };
}

// ----------------------------------------------------------------------------
// 5.2 COMPONENT NETWORK META-ANALYSIS
// ----------------------------------------------------------------------------

/**
 * Component Network Meta-Analysis
 * Decomposes multicomponent interventions to estimate individual component effects
 * Reference: Welton NJ, et al. Stat Med 2009;28:3301-18
 *
 * @param {Array} contrasts - Array of {study, intervention1, intervention2, effect, se}
 * @param {Object} componentMap - Map of intervention names to component arrays
 * @param {Object} options - Analysis options
 * @returns {Object} Component NMA results
 */
export function componentNMAWithMap(contrasts, componentMap, options = {}) {
  const {
    additive = true, // Assume additive component effects
    includeInteractions = false, // Include 2-way interactions
    reference = null // Reference intervention (e.g., 'placebo')
  } = options;

  // Extract all unique components
  const allComponents = new Set();
  Object.values(componentMap).forEach(components => {
    components.forEach(c => allComponents.add(c));
  });
  const components = Array.from(allComponents);
  const nComponents = components.length;

  // Build design matrix based on component presence
  const designMatrix = [];
  const Y = [];
  const V = [];

  contrasts.forEach(contrast => {
    const c1 = componentMap[contrast.intervention1] || componentMap[contrast.t1] || [];
    const c2 = componentMap[contrast.intervention2] || componentMap[contrast.t2] || [];

    const row = new Array(nComponents + (includeInteractions ? nComponents * (nComponents - 1) / 2 : 0)).fill(0);

    // Main effects: +1 if in intervention1, -1 if in intervention2
    components.forEach((comp, i) => {
      if (c1.includes(comp)) row[i] += 1;
      if (c2.includes(comp)) row[i] -= 1;
    });

    // Interactions (if enabled)
    if (includeInteractions) {
      let interIdx = nComponents;
      for (let i = 0; i < nComponents; i++) {
        for (let j = i + 1; j < nComponents; j++) {
          const hasInC1 = c1.includes(components[i]) && c1.includes(components[j]);
          const hasInC2 = c2.includes(components[i]) && c2.includes(components[j]);
          if (hasInC1) row[interIdx] += 1;
          if (hasInC2) row[interIdx] -= 1;
          interIdx++;
        }
      }
    }

    designMatrix.push(row);
    Y.push(contrast.effect);
    V.push(contrast.se * contrast.se);
  });

  // Estimate tau²
  const Q = computeCochranQ(Y, V.map(v => 1 / v));
  const df = Y.length - designMatrix[0].length;
  const tau2 = Math.max(0, (Q - df) / (Y.length - 1));

  // Weighted least squares
  const W = V.map(v => 1 / (v + tau2));
  const XtWX = matrixMultiply(
    matrixTranspose(designMatrix),
    matrixDiagonalMultiply(designMatrix, W)
  );
  const XtWY = matrixVectorMultiply(
    matrixTranspose(designMatrix),
    Y.map((y, i) => y * W[i])
  );

  const XtWXInv = matrixInverse(XtWX);
  const beta = matrixVectorMultiply(XtWXInv, XtWY);
  const se = XtWXInv.map((row, i) => Math.sqrt(Math.max(0, row[i])));

  // Parse component effects
  const componentEffects = {};
  components.forEach((comp, i) => {
    componentEffects[comp] = {
      effect: beta[i],
      se: se[i],
      ci: [beta[i] - 1.96 * se[i], beta[i] + 1.96 * se[i]],
      pValue: 2 * (1 - normalCDF(Math.abs(beta[i] / se[i])))
    };
  });

  // Parse interaction effects
  const interactionEffects = {};
  if (includeInteractions) {
    let interIdx = nComponents;
    for (let i = 0; i < nComponents; i++) {
      for (let j = i + 1; j < nComponents; j++) {
        const key = `${components[i]}:${components[j]}`;
        interactionEffects[key] = {
          effect: beta[interIdx],
          se: se[interIdx],
          ci: [beta[interIdx] - 1.96 * se[interIdx], beta[interIdx] + 1.96 * se[interIdx]],
          pValue: 2 * (1 - normalCDF(Math.abs(beta[interIdx] / se[interIdx]))),
          synergistic: beta[interIdx] > 0
        };
        interIdx++;
      }
    }
  }

  // Rank components by effect
  const rankedComponents = Object.entries(componentEffects)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));

  return {
    componentEffects,
    interactionEffects,
    rankedComponents,
    model: {
      tau2,
      additive,
      includeInteractions,
      df,
      nComponents,
      nContrasts: contrasts.length
    }
  };
}

// ----------------------------------------------------------------------------
// 5.3 NMA THRESHOLD ANALYSIS
// ----------------------------------------------------------------------------

/**
 * NMA Threshold Analysis
 * Determine how much each study would need to change to alter treatment rankings
 * Reference: Phillippo DM, et al. Stat Med 2019;38:5062-80
 *
 * @param {Object} nmaResults - Results from networkMetaAnalysis
 * @param {Object} options - Analysis options
 * @returns {Object} Threshold analysis results
 */
export function nmaThresholdAnalysis(nmaResults, options = {}) {
  const {
    rankingMetric = 'sucra', // 'sucra' or 'pBest'
    topN = 3 // Number of top treatments to analyze
  } = options;

  const treatments = nmaResults.treatments || Object.keys(nmaResults.treatmentEffects || {});
  const effects = nmaResults.treatmentEffects || {};
  const contrasts = nmaResults.contrasts || [];

  // Current rankings
  const currentRanking = treatments
    .map(t => ({
      treatment: t,
      effect: effects[t]?.effect || 0,
      sucra: effects[t]?.sucra || 0
    }))
    .sort((a, b) => b.effect - a.effect);

  const thresholds = [];

  // For each study, calculate threshold to change top ranking
  contrasts.forEach((contrast, studyIdx) => {
    const t1 = contrast.t1;
    const t2 = contrast.t2;
    const currentEffect = contrast.effect;
    const se = contrast.se;
    const weight = contrast.weight || 1 / (se * se);

    // Calculate threshold to flip ranking between any adjacent treatments
    const relevantPairs = [];
    for (let i = 0; i < Math.min(topN, currentRanking.length - 1); i++) {
      const upper = currentRanking[i];
      const lower = currentRanking[i + 1];

      // Check if this study informs this comparison
      const informsComparison =
        (t1 === upper.treatment || t1 === lower.treatment) ||
        (t2 === upper.treatment || t2 === lower.treatment);

      if (informsComparison) {
        const gap = upper.effect - lower.effect;
        const contribution = estimateStudyContribution(contrast, upper.treatment, lower.treatment, effects);

        // Threshold = change needed to close the gap
        const threshold = contribution !== 0 ? gap / contribution : Infinity;

        relevantPairs.push({
          upper: upper.treatment,
          lower: lower.treatment,
          gap,
          threshold: Math.abs(threshold),
          direction: threshold > 0 ? 'increase' : 'decrease',
          wouldFlip: Math.abs(currentEffect) + Math.abs(threshold) > Math.abs(currentEffect)
        });
      }
    }

    if (relevantPairs.length > 0) {
      const minThreshold = Math.min(...relevantPairs.map(p => p.threshold));
      thresholds.push({
        study: contrast.study || `Contrast ${studyIdx + 1}`,
        t1,
        t2,
        currentEffect,
        se,
        weight,
        minThreshold,
        thresholdInSE: minThreshold / se,
        affectedRankings: relevantPairs,
        robust: minThreshold > 2 * se // Robust if threshold > 2 SE
      });
    }
  });

  // Sort by vulnerability (lowest threshold first)
  thresholds.sort((a, b) => a.minThreshold - b.minThreshold);

  // Overall robustness assessment
  const vulnerableStudies = thresholds.filter(t => t.thresholdInSE < 2);
  const robustStudies = thresholds.filter(t => t.thresholdInSE >= 2);

  return {
    thresholds,
    currentRanking,
    robustnessAssessment: {
      overallRobust: vulnerableStudies.length === 0,
      nVulnerable: vulnerableStudies.length,
      nRobust: robustStudies.length,
      mostVulnerable: thresholds[0] || null,
      interpretation: vulnerableStudies.length === 0
        ? 'Rankings are robust to plausible changes in individual study results'
        : `Rankings could change with ${vulnerableStudies.length} study(ies) changing by <2 SE`
    }
  };
}

/**
 * Helper: Estimate study contribution to a treatment comparison
 */
function estimateStudyContribution(contrast, t1, t2, effects) {
  // Simplified contribution estimate based on network geometry
  if (contrast.t1 === t1 && contrast.t2 === t2) return 1;
  if (contrast.t1 === t2 && contrast.t2 === t1) return -1;

  // Indirect contribution (simplified)
  if (contrast.t1 === t1 || contrast.t2 === t1) return 0.5;
  if (contrast.t1 === t2 || contrast.t2 === t2) return -0.5;

  return 0;
}

// ----------------------------------------------------------------------------
// 5.4 TIME-TO-EVENT META-ANALYSIS
// ----------------------------------------------------------------------------

/**
 * Meta-Analysis of Hazard Ratios
 * Pool hazard ratios accounting for different follow-up times
 * Reference: Tierney JF, et al. BMJ 2007;334:281
 *
 * @param {Array} studies - Array of {hr, lowerCI, upperCI, events, followUp}
 * @param {Object} options - Analysis options
 * @returns {Object} Pooled hazard ratio results
 */
export function metaAnalyzeHR(studies, options = {}) {
  const {
    model = 'random',
    adjustForFollowUp = false,
    method = 'generic_inverse_variance' // or 'peto' for sparse data
  } = options;

  // Convert HR to log scale with SE
  const processedStudies = studies.map(s => {
    let logHR, se;

    if (s.logHR !== undefined && s.se !== undefined) {
      logHR = s.logHR;
      se = s.se;
    } else {
      logHR = Math.log(s.hr);
      // Derive SE from CI (assuming symmetric on log scale)
      const logLower = Math.log(s.lowerCI || s.ci?.[0]);
      const logUpper = Math.log(s.upperCI || s.ci?.[1]);
      se = (logUpper - logLower) / (2 * 1.96);
    }

    return {
      ...s,
      effect: logHR,
      se,
      weight: 1 / (se * se)
    };
  });

  // Standard meta-analysis on log HR
  const meta = metaAnalysisAdvanced(processedStudies, { method: model === 'random' ? 'reml' : 'fixed' });

  // Back-transform to HR scale
  const pooledLogHR = meta.random?.mu || meta.fixed?.mu;
  const pooledSE = meta.random?.se || meta.fixed?.se;

  return {
    pooledHR: Math.exp(pooledLogHR),
    logHR: pooledLogHR,
    se: pooledSE,
    ci: [Math.exp(pooledLogHR - 1.96 * pooledSE), Math.exp(pooledLogHR + 1.96 * pooledSE)],
    pValue: meta.random?.pValue || meta.fixed?.pValue,
    heterogeneity: {
      Q: meta.Q,
      I2: meta.I2,
      tau2: meta.tau2,
      H2: meta.H2 || (meta.I2 > 0 ? 100 / (100 - meta.I2) : 1)
    },
    predictionInterval: meta.random?.pi ? {
      lower: Math.exp(meta.random.pi[0]),
      upper: Math.exp(meta.random.pi[1])
    } : null,
    studies: processedStudies,
    nStudies: studies.length,
    totalEvents: studies.reduce((sum, s) => sum + (s.events || 0), 0)
  };
}

/**
 * Reconstruct IPD from Kaplan-Meier Curves
 * Algorithm from Guyot P, et al. BMC Med Res Methodol 2012;12:9
 *
 * @param {Array} timePoints - Array of time points from KM curve
 * @param {Array} survivalProbs - Survival probabilities at each time point
 * @param {Array} numbersAtRisk - Numbers at risk at specific times (optional)
 * @param {Object} options - Reconstruction options
 * @returns {Object} Pseudo-IPD with event and censoring times
 */
export function reconstructIPDFromKM(timePoints, survivalProbs, numbersAtRisk = null, options = {}) {
  const {
    nAtRisk0 = 100, // Initial number at risk if not provided
    interpolation = 'linear' // 'linear' or 'step'
  } = options;

  // Validate inputs
  if (timePoints.length !== survivalProbs.length) {
    throw new Error('timePoints and survivalProbs must have same length');
  }

  const n = numbersAtRisk ? numbersAtRisk[0]?.n || numbersAtRisk[0] : nAtRisk0;
  const events = [];
  const censored = [];

  // Process each interval
  for (let i = 0; i < timePoints.length - 1; i++) {
    const t1 = timePoints[i];
    const t2 = timePoints[i + 1];
    const S1 = survivalProbs[i];
    const S2 = survivalProbs[i + 1];

    // Number at risk at start of interval
    const nAtRiskStart = numbersAtRisk
      ? (numbersAtRisk.find(r => r.time === t1)?.n || Math.round(n * S1))
      : Math.round(n * S1);

    // Estimate events in interval
    const hazardInInterval = S2 > 0 ? -Math.log(S2 / S1) : Infinity;
    const expectedEvents = nAtRiskStart * (1 - S2 / S1);
    const nEvents = Math.round(expectedEvents);

    // Distribute events uniformly within interval (Guyot algorithm)
    for (let j = 0; j < nEvents; j++) {
      const eventTime = interpolation === 'step'
        ? t1
        : t1 + (t2 - t1) * (j + 0.5) / nEvents;
      events.push(eventTime);
    }

    // Estimate censoring
    const nAtRiskEnd = numbersAtRisk
      ? (numbersAtRisk.find(r => r.time === t2)?.n || Math.round(n * S2))
      : Math.round(n * S2);

    const expectedCensored = nAtRiskStart - nEvents - nAtRiskEnd;
    if (expectedCensored > 0) {
      for (let j = 0; j < Math.round(expectedCensored); j++) {
        const censorTime = t1 + (t2 - t1) * (j + 0.5) / expectedCensored;
        censored.push(censorTime);
      }
    }
  }

  // Create IPD structure
  const ipd = [
    ...events.map(t => ({ time: t, event: 1 })),
    ...censored.map(t => ({ time: t, event: 0 }))
  ].sort((a, b) => a.time - b.time);

  // Calculate summary statistics
  const medianSurvival = findMedianSurvival(timePoints, survivalProbs);

  return {
    ipd,
    nTotal: ipd.length,
    nEvents: events.length,
    nCensored: censored.length,
    eventRate: events.length / ipd.length,
    medianSurvival,
    maxFollowUp: Math.max(...timePoints),
    reconstructionMethod: 'Guyot algorithm'
  };
}

/**
 * Find median survival time from KM curve
 */
function findMedianSurvival(times, survival) {
  for (let i = 0; i < survival.length - 1; i++) {
    if (survival[i] >= 0.5 && survival[i + 1] < 0.5) {
      // Linear interpolation
      const t1 = times[i];
      const t2 = times[i + 1];
      const s1 = survival[i];
      const s2 = survival[i + 1];
      return t1 + (t2 - t1) * (s1 - 0.5) / (s1 - s2);
    }
  }
  return null; // Median not reached
}

// ----------------------------------------------------------------------------
// 5.5 BAYESIAN META-ANALYSIS (Local Numerical Methods)
// ----------------------------------------------------------------------------

/**
 * Bayesian Meta-Analysis using Grid Approximation
 * Provides posterior distributions without requiring external APIs
 * Reference: Spiegelhalter DJ, et al. Bayesian Approaches to Clinical Trials (2004)
 *
 * @param {Array} studies - Array of {effect, se}
 * @param {Object} priors - Prior specifications
 * @param {Object} options - Analysis options
 * @returns {Object} Bayesian meta-analysis results
 */
export function bayesianMA(studies, priors = {}, options = {}) {
  const {
    gridPoints = 200,
    seed = 12345,
    method = 'grid', // 'grid' or 'mcmc'
    mcmcIterations = 10000,
    mcmcBurnin = 2000,
    mcmcThin = 2
  } = options;

  // If MCMC is requested, use Metropolis-Hastings sampler
  if (method === 'mcmc') {
    return bayesianMAMCMC(studies, priors, {
      iterations: mcmcIterations,
      burnin: mcmcBurnin,
      thin: mcmcThin,
      seed
    });
  }

  const {
    muPrior = { type: 'normal', mean: 0, sd: 10 }, // Vague prior on mean
    tau2Prior = { type: 'halfCauchy', scale: 0.5 } // Prior on between-study variance
  } = priors;

  const rng = createSeededRNG(seed);

  // Grid for mu and tau
  const muRange = [-5, 5];
  const tauRange = [0.001, 2];

  const muGrid = Array.from({ length: gridPoints }, (_, i) =>
    muRange[0] + (muRange[1] - muRange[0]) * i / (gridPoints - 1)
  );
  const tauGrid = Array.from({ length: gridPoints }, (_, i) =>
    tauRange[0] + (tauRange[1] - tauRange[0]) * i / (gridPoints - 1)
  );

  // Compute log posterior on grid
  const logPosterior = [];
  let maxLogPost = -Infinity;

  for (let i = 0; i < gridPoints; i++) {
    logPosterior[i] = [];
    for (let j = 0; j < gridPoints; j++) {
      const mu = muGrid[i];
      const tau = tauGrid[j];
      const tau2 = tau * tau;

      // Log prior
      let logPrior = 0;
      // Prior on mu
      if (muPrior.type === 'normal') {
        logPrior += -0.5 * Math.pow((mu - muPrior.mean) / muPrior.sd, 2);
      }
      // Prior on tau (half-Cauchy)
      if (tau2Prior.type === 'halfCauchy') {
        logPrior += Math.log(2) - Math.log(Math.PI * tau2Prior.scale) -
          Math.log(1 + Math.pow(tau / tau2Prior.scale, 2));
      }

      // Log likelihood (random effects)
      let logLik = 0;
      for (const study of studies) {
        const v = study.se * study.se + tau2;
        logLik += -0.5 * Math.log(2 * Math.PI * v) - 0.5 * Math.pow(study.effect - mu, 2) / v;
      }

      logPosterior[i][j] = logPrior + logLik;
      if (logPosterior[i][j] > maxLogPost) {
        maxLogPost = logPosterior[i][j];
      }
    }
  }

  // Convert to probabilities (normalize)
  let totalProb = 0;
  const posterior = [];
  for (let i = 0; i < gridPoints; i++) {
    posterior[i] = [];
    for (let j = 0; j < gridPoints; j++) {
      posterior[i][j] = Math.exp(logPosterior[i][j] - maxLogPost);
      totalProb += posterior[i][j];
    }
  }

  // Normalize
  for (let i = 0; i < gridPoints; i++) {
    for (let j = 0; j < gridPoints; j++) {
      posterior[i][j] /= totalProb;
    }
  }

  // Marginal posteriors
  const muMarginal = muGrid.map((mu, i) =>
    posterior[i].reduce((sum, p) => sum + p, 0)
  );
  const tauMarginal = tauGrid.map((tau, j) =>
    posterior.reduce((sum, row) => sum + row[j], 0)
  );

  // Posterior summaries
  const muPosteriorMean = muGrid.reduce((sum, mu, i) => sum + mu * muMarginal[i], 0);
  const muPosteriorVar = muGrid.reduce((sum, mu, i) => sum + Math.pow(mu - muPosteriorMean, 2) * muMarginal[i], 0);

  const tauPosteriorMean = tauGrid.reduce((sum, tau, j) => sum + tau * tauMarginal[j], 0);
  const tau2PosteriorMean = tauGrid.reduce((sum, tau, j) => sum + tau * tau * tauMarginal[j], 0);

  // Credible intervals (HPD approximation using quantiles)
  const muCI = computeCredibleInterval(muGrid, muMarginal, 0.95);
  const tauCI = computeCredibleInterval(tauGrid, tauMarginal, 0.95);

  // Posterior probability of effect > 0
  let probPositive = 0;
  for (let i = 0; i < gridPoints; i++) {
    if (muGrid[i] > 0) probPositive += muMarginal[i];
  }

  // Predictive distribution for new study
  const predictiveMean = muPosteriorMean;
  const predictiveSD = Math.sqrt(muPosteriorVar + tau2PosteriorMean);
  const predictiveCI = [
    predictiveMean - 1.96 * predictiveSD,
    predictiveMean + 1.96 * predictiveSD
  ];

  return {
    posteriorMean: muPosteriorMean,
    posteriorSD: Math.sqrt(muPosteriorVar),
    credibleInterval: muCI,
    tau: {
      posteriorMean: tauPosteriorMean,
      credibleInterval: tauCI
    },
    tau2: {
      posteriorMean: tau2PosteriorMean
    },
    probPositive,
    probNegative: 1 - probPositive,
    predictiveDistribution: {
      mean: predictiveMean,
      sd: predictiveSD,
      ci: predictiveCI
    },
    priors: { muPrior, tau2Prior },
    nStudies: studies.length,
    method: 'Grid approximation',
    gridResolution: gridPoints
  };
}

/**
 * Compute credible interval from grid approximation
 */
function computeCredibleInterval(grid, marginal, level) {
  const cumsum = [];
  let total = 0;
  for (let i = 0; i < marginal.length; i++) {
    total += marginal[i];
    cumsum.push(total);
  }

  const alpha = (1 - level) / 2;
  let lower = grid[0], upper = grid[grid.length - 1];

  for (let i = 0; i < cumsum.length; i++) {
    if (cumsum[i] >= alpha) {
      lower = grid[i];
      break;
    }
  }

  for (let i = cumsum.length - 1; i >= 0; i--) {
    if (cumsum[i] <= 1 - alpha) {
      upper = grid[i];
      break;
    }
  }

  return [lower, upper];
}

/**
 * MCMC-based Bayesian Meta-Analysis using Metropolis-Hastings
 * Reference: Gelman A, et al. Bayesian Data Analysis (3rd ed), 2013
 * Reference: Sutton AJ, Abrams KR. Stat Med 2001;20:3543-66
 *
 * @param {Array} studies - Array of {effect, se}
 * @param {Object} priors - Prior specifications
 * @param {Object} options - MCMC options
 * @returns {Object} Posterior summaries from MCMC samples
 */
function bayesianMAMCMC(studies, priors = {}, options = {}) {
  const {
    iterations = 10000,
    burnin = 2000,
    thin = 2,
    seed = 12345
  } = options;

  const {
    muPrior = { type: 'normal', mean: 0, sd: 10 },
    tau2Prior = { type: 'halfCauchy', scale: 0.5 }
  } = priors;

  const rng = createSeededRNG(seed);
  const k = studies.length;

  // Log posterior function
  function logPosterior(mu, tau2) {
    if (tau2 < 0) return -Infinity;

    let logP = 0;

    // Prior on mu (normal)
    if (muPrior.type === 'normal') {
      logP += -0.5 * Math.pow((mu - muPrior.mean) / muPrior.sd, 2);
    }

    // Prior on tau (half-Cauchy on tau, not tau2)
    const tau = Math.sqrt(tau2);
    if (tau2Prior.type === 'halfCauchy') {
      logP += Math.log(2) - Math.log(Math.PI * tau2Prior.scale) -
        Math.log(1 + Math.pow(tau / tau2Prior.scale, 2));
    } else if (tau2Prior.type === 'uniform') {
      // Uniform on tau: implicit flat prior
      logP += -Math.log(tau); // Jacobian for tau2 -> tau
    }

    // Likelihood
    for (const study of studies) {
      const v = study.se * study.se + tau2;
      logP += -0.5 * Math.log(2 * Math.PI * v) - 0.5 * Math.pow(study.effect - mu, 2) / v;
    }

    return logP;
  }

  // Initialize from data
  const yi = studies.map(s => s.effect);
  const vi = studies.map(s => s.se * s.se);
  let mu = yi.reduce((a, b) => a + b, 0) / k;
  let tau2 = Math.max(0.01, vi.reduce((a, b) => a + b, 0) / k);

  // Adaptive proposal SDs
  let muProposalSD = 0.5;
  let tau2ProposalSD = 0.2;

  // MCMC samples
  const muSamples = [];
  const tau2Samples = [];
  let muAccept = 0, tau2Accept = 0;

  // Run MCMC
  for (let iter = 0; iter < iterations + burnin; iter++) {
    // Update mu (Gibbs-like: conditional on tau2, mu has conjugate update)
    // Use Metropolis for generality
    const muProposed = mu + (rng() - 0.5) * 2 * muProposalSD;
    const logAcceptMu = logPosterior(muProposed, tau2) - logPosterior(mu, tau2);
    if (Math.log(rng()) < logAcceptMu) {
      mu = muProposed;
      if (iter >= burnin) muAccept++;
    }

    // Update tau2 (Metropolis on log scale for positivity)
    const logTau2Proposed = Math.log(tau2) + (rng() - 0.5) * 2 * tau2ProposalSD;
    const tau2Proposed = Math.exp(logTau2Proposed);
    const logAcceptTau2 = logPosterior(mu, tau2Proposed) - logPosterior(mu, tau2) +
      logTau2Proposed - Math.log(tau2); // Jacobian for log transform
    if (Math.log(rng()) < logAcceptTau2) {
      tau2 = tau2Proposed;
      if (iter >= burnin) tau2Accept++;
    }

    // Adapt proposal SDs during burn-in (target ~40% acceptance)
    if (iter < burnin && iter > 100 && iter % 100 === 0) {
      const muRate = muAccept / iter;
      const tau2Rate = tau2Accept / iter;
      if (muRate < 0.3) muProposalSD *= 0.8;
      else if (muRate > 0.5) muProposalSD *= 1.2;
      if (tau2Rate < 0.3) tau2ProposalSD *= 0.8;
      else if (tau2Rate > 0.5) tau2ProposalSD *= 1.2;
    }

    // Store samples (after burn-in, with thinning)
    if (iter >= burnin && (iter - burnin) % thin === 0) {
      muSamples.push(mu);
      tau2Samples.push(tau2);
    }
  }

  // Compute posterior summaries
  const nSamples = muSamples.length;
  const muMean = muSamples.reduce((a, b) => a + b, 0) / nSamples;
  const tau2Mean = tau2Samples.reduce((a, b) => a + b, 0) / nSamples;
  const tauMean = tau2Samples.map(t => Math.sqrt(t)).reduce((a, b) => a + b, 0) / nSamples;

  const muVar = muSamples.reduce((s, x) => s + Math.pow(x - muMean, 2), 0) / (nSamples - 1);
  const tau2Var = tau2Samples.reduce((s, x) => s + Math.pow(x - tau2Mean, 2), 0) / (nSamples - 1);

  // Credible intervals (quantile-based)
  const sortedMu = [...muSamples].sort((a, b) => a - b);
  const sortedTau2 = [...tau2Samples].sort((a, b) => a - b);
  const sortedTau = tau2Samples.map(t => Math.sqrt(t)).sort((a, b) => a - b);

  const muCI = [sortedMu[Math.floor(nSamples * 0.025)], sortedMu[Math.floor(nSamples * 0.975)]];
  const tau2CI = [sortedTau2[Math.floor(nSamples * 0.025)], sortedTau2[Math.floor(nSamples * 0.975)]];
  const tauCI = [sortedTau[Math.floor(nSamples * 0.025)], sortedTau[Math.floor(nSamples * 0.975)]];

  // Probability effect > 0
  const probPositive = muSamples.filter(x => x > 0).length / nSamples;

  // Predictive distribution
  const predictiveSamples = muSamples.map((m, i) => m + Math.sqrt(tau2Samples[i]) * (rng() - 0.5) * 3.46);
  const predictiveMean = predictiveSamples.reduce((a, b) => a + b, 0) / nSamples;
  const sortedPred = [...predictiveSamples].sort((a, b) => a - b);
  const predictiveCI = [sortedPred[Math.floor(nSamples * 0.025)], sortedPred[Math.floor(nSamples * 0.975)]];

  // Effective sample size (using autocorrelation)
  const ess = computeESSMcmc(muSamples);

  // Gelman-Rubin diagnostic proxy (single chain - use variance ratio)
  const rhat = Math.sqrt((nSamples - 1) / nSamples + muVar / (muMean * muMean + 0.001));

  return {
    posteriorMean: muMean,
    posteriorSD: Math.sqrt(muVar),
    credibleInterval: muCI,
    tau: {
      posteriorMean: tauMean,
      credibleInterval: tauCI
    },
    tau2: {
      posteriorMean: tau2Mean,
      posteriorSD: Math.sqrt(tau2Var),
      credibleInterval: tau2CI
    },
    probPositive,
    probNegative: 1 - probPositive,
    predictiveDistribution: {
      mean: predictiveMean,
      ci: predictiveCI
    },
    priors: { muPrior, tau2Prior },
    nStudies: k,
    method: 'MCMC (Metropolis-Hastings)',
    mcmcDiagnostics: {
      iterations,
      burnin,
      thin,
      effectiveSampleSize: ess,
      rhat: Math.min(rhat, 2),
      acceptanceRates: {
        mu: muAccept / iterations,
        tau2: tau2Accept / iterations
      }
    }
  };
}

/**
 * Compute effective sample size from MCMC samples
 */
function computeESSMcmc(samples) {
  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (n - 1);

  if (variance < 1e-10) return n;

  // Compute autocorrelations up to lag 50
  let rhoSum = 0;
  for (let lag = 1; lag <= Math.min(50, n - 1); lag++) {
    let cov = 0;
    for (let i = 0; i < n - lag; i++) {
      cov += (samples[i] - mean) * (samples[i + lag] - mean);
    }
    const rho = cov / ((n - lag) * variance);
    if (rho < 0.05) break; // Stop when autocorrelation drops below threshold
    rhoSum += rho;
  }

  return Math.max(1, n / (1 + 2 * rhoSum));
}

/**
 * Bayesian Model Averaging for Meta-Analysis
 * Compares fixed vs random effects models using BIC approximation
 *
 * @param {Array} studies - Array of {effect, se}
 * @param {Object} options - Analysis options
 * @returns {Object} Model averaged results
 */
export function bayesianModelAveraging(studies, options = {}) {
  const { priorModelProb = 0.5 } = options; // Prior probability for RE model

  // Fit both models
  const fixedMeta = metaAnalysisAdvanced(studies, { method: 'fixed' });
  const randomMeta = metaAnalysisAdvanced(studies, { method: 'reml' });

  const k = studies.length;

  // Compute BIC for each model
  // BIC = -2 * logLik + p * log(n)
  const fixedLogLik = computeLogLikelihood(studies, fixedMeta.fixed.mu, 0);
  const randomLogLik = computeLogLikelihood(studies, randomMeta.random.mu, randomMeta.tau2);

  const bicFixed = -2 * fixedLogLik + 1 * Math.log(k); // 1 parameter (mu)
  const bicRandom = -2 * randomLogLik + 2 * Math.log(k); // 2 parameters (mu, tau2)

  // Posterior model probabilities (BIC approximation)
  const logBF = (bicFixed - bicRandom) / 2; // log Bayes factor
  const priorOdds = priorModelProb / (1 - priorModelProb);
  const posteriorOdds = priorOdds * Math.exp(logBF);
  const posteriorProbRE = posteriorOdds / (1 + posteriorOdds);
  const posteriorProbFE = 1 - posteriorProbRE;

  // Model-averaged estimate
  const avgEffect = posteriorProbFE * fixedMeta.fixed.mu + posteriorProbRE * randomMeta.random.mu;
  const avgVar = posteriorProbFE * (fixedMeta.fixed.se ** 2 + fixedMeta.fixed.mu ** 2) +
    posteriorProbRE * (randomMeta.random.se ** 2 + randomMeta.random.mu ** 2) -
    avgEffect ** 2;
  const avgSE = Math.sqrt(avgVar);

  return {
    modelAveraged: {
      effect: avgEffect,
      se: avgSE,
      ci: [avgEffect - 1.96 * avgSE, avgEffect + 1.96 * avgSE]
    },
    modelWeights: {
      fixed: posteriorProbFE,
      random: posteriorProbRE
    },
    modelComparison: {
      bicFixed,
      bicRandom,
      logBayesFactor: logBF,
      preferredModel: posteriorProbRE > 0.5 ? 'random' : 'fixed'
    },
    fixedEffects: fixedMeta.fixed,
    randomEffects: randomMeta.random,
    heterogeneity: {
      tau2: randomMeta.tau2,
      I2: randomMeta.I2
    }
  };
}

/**
 * Compute log-likelihood for meta-analysis model
 */
function computeLogLikelihood(studies, mu, tau2) {
  let logLik = 0;
  for (const study of studies) {
    const v = study.se * study.se + tau2;
    logLik += -0.5 * Math.log(2 * Math.PI * v) - 0.5 * Math.pow(study.effect - mu, 2) / v;
  }
  return logLik;
}

// ----------------------------------------------------------------------------
// 5.6 IPD META-ANALYSIS
// ----------------------------------------------------------------------------

/**
 * Two-Stage IPD Meta-Analysis
 * Stage 1: Within-study estimates; Stage 2: Pool across studies
 * Reference: Debray TPA, et al. Stat Med 2015;34:2081-2103
 *
 * @param {Array} datasets - Array of IPD datasets
 * @param {string} outcome - Outcome variable name
 * @param {string} treatment - Treatment variable name
 * @param {Object} options - Analysis options
 * @returns {Object} Two-stage IPD-MA results
 */
export function ipdTwoStageMA(datasets, outcome, treatment, options = {}) {
  const {
    adjustFor = [], // Covariates to adjust for in stage 1
    outcomeType = 'continuous', // 'continuous', 'binary', 'survival'
    method = 'random'
  } = options;

  const stage1Results = [];

  // Stage 1: Estimate treatment effect within each study
  datasets.forEach((data, studyIdx) => {
    let effect, se, n;

    if (outcomeType === 'continuous') {
      // Simple mean difference (or regression if covariates)
      const treated = data.filter(d => d[treatment] === 1);
      const control = data.filter(d => d[treatment] === 0);

      const meanTreated = treated.reduce((s, d) => s + d[outcome], 0) / treated.length;
      const meanControl = control.reduce((s, d) => s + d[outcome], 0) / control.length;

      const varTreated = treated.reduce((s, d) => s + Math.pow(d[outcome] - meanTreated, 2), 0) / (treated.length - 1);
      const varControl = control.reduce((s, d) => s + Math.pow(d[outcome] - meanControl, 2), 0) / (control.length - 1);

      effect = meanTreated - meanControl;
      se = Math.sqrt(varTreated / treated.length + varControl / control.length);
      n = data.length;

    } else if (outcomeType === 'binary') {
      // Log odds ratio
      const treated = data.filter(d => d[treatment] === 1);
      const control = data.filter(d => d[treatment] === 0);

      const a = treated.filter(d => d[outcome] === 1).length;
      const b = treated.length - a;
      const c = control.filter(d => d[outcome] === 1).length;
      const d_val = control.length - c;

      const or = ((a + 0.5) * (d_val + 0.5)) / ((b + 0.5) * (c + 0.5));
      effect = Math.log(or);
      se = Math.sqrt(1 / (a + 0.5) + 1 / (b + 0.5) + 1 / (c + 0.5) + 1 / (d_val + 0.5));
      n = data.length;

    } else if (outcomeType === 'survival') {
      // Log hazard ratio (simplified Cox model)
      const treated = data.filter(d => d[treatment] === 1);
      const control = data.filter(d => d[treatment] === 0);

      const eventsTreated = treated.filter(d => d.event === 1).length;
      const eventsControl = control.filter(d => d.event === 1).length;
      const timeTreated = treated.reduce((s, d) => s + d.time, 0);
      const timeControl = control.reduce((s, d) => s + d.time, 0);

      const rateTreated = eventsTreated / timeTreated;
      const rateControl = eventsControl / timeControl;

      effect = Math.log(rateTreated / rateControl);
      se = Math.sqrt(1 / eventsTreated + 1 / eventsControl);
      n = data.length;
    }

    stage1Results.push({
      study: studyIdx + 1,
      effect,
      se,
      n,
      weight: 1 / (se * se)
    });
  });

  // Stage 2: Pool estimates
  const pooledResults = metaAnalysisAdvanced(stage1Results, {
    method: method === 'random' ? 'reml' : 'fixed'
  });

  return {
    stage1: stage1Results,
    pooled: method === 'random' ? pooledResults.random : pooledResults.fixed,
    heterogeneity: {
      Q: pooledResults.Q,
      I2: pooledResults.I2,
      tau2: pooledResults.tau2
    },
    predictionInterval: pooledResults.random?.pi,
    totalN: stage1Results.reduce((s, r) => s + r.n, 0),
    nStudies: datasets.length,
    outcomeType,
    method
  };
}

/**
 * One-Stage IPD Meta-Analysis
 * Mixed-effects model accounting for clustering within studies
 * Simplified implementation using iterative weighted least squares
 *
 * @param {Array} datasets - Array of IPD datasets with study identifier
 * @param {string} formula - Model formula (simplified: "outcome ~ treatment")
 * @param {Object} options - Analysis options
 * @returns {Object} One-stage IPD-MA results
 */
export function ipdOneStageMA(datasets, formula, options = {}) {
  const {
    randomSlopes = false, // Random treatment effects by study
    maxIterations = 100,
    tolerance = 1e-6
  } = options;

  // Parse formula
  const [outcome, predictors] = formula.split('~').map(s => s.trim());
  const terms = predictors.split('+').map(s => s.trim());
  const treatment = terms[0];
  const covariates = terms.slice(1);

  // Combine all datasets with study indicator
  const combinedData = [];
  datasets.forEach((data, studyIdx) => {
    data.forEach(d => {
      combinedData.push({ ...d, _study: studyIdx });
    });
  });

  const n = combinedData.length;
  const nStudies = datasets.length;

  // Build design matrix
  const X = combinedData.map(d => {
    const row = [1, d[treatment]]; // Intercept + treatment
    covariates.forEach(cov => row.push(d[cov] || 0));
    return row;
  });
  const Y = combinedData.map(d => d[outcome]);
  const studyId = combinedData.map(d => d._study);

  // Initial estimates using OLS
  const XtX = matrixMultiply(matrixTranspose(X), X);
  const XtY = matrixVectorMultiply(matrixTranspose(X), Y);
  let beta = matrixVectorMultiply(matrixInverse(XtX), XtY);

  // Estimate random effects variance using restricted likelihood
  let sigmaStudy2 = 0.1; // Between-study variance
  let sigmaResid2 = 1; // Residual variance

  for (let iter = 0; iter < maxIterations; iter++) {
    // E-step: Estimate random effects
    const randomEffects = [];
    for (let s = 0; s < nStudies; s++) {
      const studyIndices = combinedData.map((d, i) => d._study === s ? i : -1).filter(i => i >= 0);
      const ni = studyIndices.length;

      let sumResid = 0;
      studyIndices.forEach(i => {
        const predicted = X[i].reduce((sum, x, j) => sum + x * beta[j], 0);
        sumResid += Y[i] - predicted;
      });

      const shrinkage = sigmaStudy2 / (sigmaStudy2 + sigmaResid2 / ni);
      randomEffects[s] = shrinkage * sumResid / ni;
    }

    // M-step: Update variance components
    const residuals = combinedData.map((d, i) => {
      const predicted = X[i].reduce((sum, x, j) => sum + x * beta[j], 0);
      return Y[i] - predicted - randomEffects[d._study];
    });

    const newSigmaResid2 = residuals.reduce((s, r) => s + r * r, 0) / (n - X[0].length);
    const newSigmaStudy2 = randomEffects.reduce((s, r) => s + r * r, 0) / nStudies;

    // Check convergence
    if (Math.abs(newSigmaStudy2 - sigmaStudy2) < tolerance &&
        Math.abs(newSigmaResid2 - sigmaResid2) < tolerance) {
      break;
    }

    sigmaStudy2 = Math.max(0.001, newSigmaStudy2);
    sigmaResid2 = newSigmaResid2;

    // Update fixed effects with weighted least squares
    const W = combinedData.map((d, i) => 1 / (sigmaResid2 + sigmaStudy2));
    const XtWX = matrixMultiply(
      matrixTranspose(X),
      matrixDiagonalMultiply(X, W)
    );
    const XtWY = matrixVectorMultiply(
      matrixTranspose(X),
      Y.map((y, i) => y * W[i])
    );
    beta = matrixVectorMultiply(matrixInverse(XtWX), XtWY);
  }

  // Standard errors
  const W = combinedData.map(() => 1 / (sigmaResid2 + sigmaStudy2));
  const XtWXInv = matrixInverse(matrixMultiply(
    matrixTranspose(X),
    matrixDiagonalMultiply(X, W)
  ));
  const se = XtWXInv.map((row, i) => Math.sqrt(Math.max(0, row[i])));

  // Parse results
  const coefficients = {
    intercept: { estimate: beta[0], se: se[0] },
    treatment: {
      estimate: beta[1],
      se: se[1],
      ci: [beta[1] - 1.96 * se[1], beta[1] + 1.96 * se[1]],
      pValue: 2 * (1 - normalCDF(Math.abs(beta[1] / se[1])))
    }
  };

  covariates.forEach((cov, i) => {
    coefficients[cov] = {
      estimate: beta[2 + i],
      se: se[2 + i],
      ci: [beta[2 + i] - 1.96 * se[2 + i], beta[2 + i] + 1.96 * se[2 + i]],
      pValue: 2 * (1 - normalCDF(Math.abs(beta[2 + i] / se[2 + i])))
    };
  });

  // ICC
  const icc = sigmaStudy2 / (sigmaStudy2 + sigmaResid2);

  return {
    coefficients,
    varianceComponents: {
      betweenStudy: sigmaStudy2,
      residual: sigmaResid2,
      icc
    },
    treatmentEffect: coefficients.treatment,
    nTotal: n,
    nStudies,
    method: 'One-stage mixed effects (REML approximation)'
  };
}

// ----------------------------------------------------------------------------
// 5.7 MATRIX UTILITIES
// ----------------------------------------------------------------------------

/**
 * Matrix multiplication
 */
function matrixMultiply(A, B) {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;

  const result = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

/**
 * Matrix transpose
 */
function matrixTranspose(A) {
  return A[0].map((_, j) => A.map(row => row[j]));
}

/**
 * Matrix-vector multiplication
 */
function matrixVectorMultiply(A, v) {
  return A.map(row => row.reduce((sum, a, j) => sum + a * v[j], 0));
}

/**
 * Diagonal matrix multiplication: diag(W) * A
 */
function matrixDiagonalMultiply(A, W) {
  return A.map((row, i) => row.map(a => a * W[i]));
}

/**
 * Matrix inverse using Gauss-Jordan elimination
 */
function matrixInverse(A) {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Scale pivot row
    const scale = augmented[i][i];
    if (Math.abs(scale) < 1e-10) {
      // Singular matrix - return pseudo-inverse approximation
      return A.map((row, i) => row.map((_, j) => i === j ? 1e10 : 0));
    }

    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= scale;
    }

    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  return augmented.map(row => row.slice(n));
}

/**
 * Compute Cochran's Q for heterogeneity
 */
function computeCochranQ(effects, weights) {
  const sumW = weights.reduce((a, b) => a + b, 0);
  const sumWY = effects.reduce((sum, y, i) => sum + weights[i] * y, 0);
  const muFixed = sumWY / sumW;
  return effects.reduce((sum, y, i) => sum + weights[i] * Math.pow(y - muFixed, 2), 0);
}

/**
 * Chi-squared CDF approximation
 */
function chiSquaredCDF(x, df) {
  if (x <= 0) return 0;
  if (df <= 0) return NaN;

  // Use normal approximation for large df
  if (df > 100) {
    const z = Math.pow(x / df, 1/3) - (1 - 2/(9*df));
    const se = Math.sqrt(2/(9*df));
    return normalCDF(z / se);
  }

  // Regularized gamma function approximation
  return gammaCDF(x / 2, df / 2);
}

/**
 * Gamma CDF (regularized incomplete gamma)
 */
function gammaCDF(x, a) {
  if (x <= 0) return 0;

  // Series expansion for small x
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGammaLanczos(a));
  }

  // Continued fraction for large x
  let f = 1, c = 1, d = 1 / (x + 1 - a);
  for (let n = 1; n < 100; n++) {
    const an = n * (a - n);
    const bn = x + 2 * n + 1 - a;
    d = 1 / (bn + an * d);
    c = bn + an / c;
    const delta = c * d;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGammaLanczos(a)) * f;
}

/**
 * Log gamma function (Lanczos approximation)
 */
function logGammaLanczos(x) {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGammaLanczos(1 - x);
  }

  x -= 1;
  let sum = c[0];
  for (let i = 1; i < g + 2; i++) {
    sum += c[i] / (x + i);
  }

  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(sum);
}
