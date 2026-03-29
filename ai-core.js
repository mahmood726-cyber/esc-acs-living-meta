/**
 * ESC ACS Living Meta-Analysis - Interpretation Core Module
 *
 * PURE TEMPLATE-BASED INTERPRETATION - NO EXTERNAL API CALLS
 *
 * Provides automated interpretation features using rule-based templates:
 * - Template-based interpretation of results
 * - Rule-based quality assessment
 * - Structured recommendations
 * - Multi-audience summaries
 *
 * @module ai-core
 * @version 2.0.0
 * @date 2026-01-26
 * @note This module uses NO external AI APIs (OpenAI, Anthropic, etc.)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export const INTERPRETATION_CONFIG = {
  version: "2.0.0",
  method: "template-based",
  apiRequired: false,
  supportedAudiences: ['clinical', 'patient', 'researcher', 'policy'],
  supportedLanguages: ['en']
};

// ============================================================================
// TEMPLATE-BASED INTERPRETATION
// ============================================================================

/**
 * Generate interpretation of meta-analysis results
 * Uses structured templates - NO external API calls
 *
 * @param {Object} metaResults - Results from metaAnalysisAdvanced()
 * @param {Object} options - Configuration options
 * @returns {Object} Generated interpretations
 */
export function generateInterpretation(metaResults, options = {}) {
  const {
    audience = 'clinical', // 'clinical', 'patient', 'researcher', 'policy'
    includeRecommendations = true,
    includeLimitations = true,
    outcomeLabel = 'the outcome',
    treatmentLabel = 'treatment',
    comparatorLabel = 'control'
  } = options;

  // Extract key statistics
  const effect = metaResults.random?.mu ?? metaResults.pooled?.effect ?? 0;
  const se = metaResults.random?.se ?? metaResults.pooled?.se ?? 0;
  const ci = metaResults.random?.ci ?? metaResults.pooled?.ci ?? [effect - 1.96 * se, effect + 1.96 * se];
  const pValue = metaResults.random?.pValue ?? metaResults.pooled?.pValue ?? 0;
  const I2 = metaResults.I2 ?? 0;
  const tau2 = metaResults.tau2 ?? 0;
  const k = metaResults.nStudies ?? metaResults.studies?.length ?? 0;
  const N = metaResults.totalN ?? metaResults.studies?.reduce((s, st) => s + (st.n || 0), 0) ?? 0;

  // Determine effect interpretation
  const effectDirection = effect > 0 ? 'increased' : effect < 0 ? 'decreased' : 'unchanged';
  const effectMagnitude = classifyEffectMagnitude(Math.abs(effect));
  const isSignificant = pValue < 0.05;
  const heterogeneityLevel = classifyHeterogeneity(I2);

  // Generate audience-specific interpretation
  let interpretation;
  switch (audience) {
    case 'patient':
      interpretation = generatePatientSummary(effect, ci, isSignificant, k, N, effectDirection, effectMagnitude, outcomeLabel, treatmentLabel, comparatorLabel);
      break;
    case 'researcher':
      interpretation = generateResearcherSummary(effect, se, ci, pValue, I2, tau2, k, effectDirection, effectMagnitude);
      break;
    case 'policy':
      interpretation = generatePolicySummary(effect, ci, isSignificant, k, N, I2, effectDirection, effectMagnitude, outcomeLabel, treatmentLabel);
      break;
    case 'clinical':
    default:
      interpretation = generateClinicalSummary(effect, ci, pValue, I2, k, N, effectDirection, effectMagnitude, outcomeLabel, treatmentLabel, comparatorLabel);
  }

  // Generate limitations
  const limitations = includeLimitations ? generateLimitations(metaResults, k, I2) : [];

  // Generate recommendations
  const recommendations = includeRecommendations ? generateRecommendations(metaResults, isSignificant, heterogeneityLevel) : [];

  // Generate GRADE-style certainty assessment
  const certainty = assessCertainty(metaResults, k, I2);

  return {
    summary: interpretation,
    effectSummary: {
      direction: effectDirection,
      magnitude: effectMagnitude,
      significant: isSignificant,
      effect,
      ci,
      pValue
    },
    heterogeneitySummary: {
      level: heterogeneityLevel,
      I2,
      tau2,
      interpretation: interpretHeterogeneity(I2)
    },
    certainty,
    limitations,
    recommendations,
    metadata: {
      audience,
      generatedAt: new Date().toISOString(),
      method: 'template-based',
      nStudies: k,
      totalN: N
    }
  };
}

/**
 * Generate clinical summary
 */
function generateClinicalSummary(effect, ci, pValue, I2, k, N, direction, magnitude, outcome, treatment, comparator) {
  const expEffect = Math.exp(effect);
  const expCI = [Math.exp(ci[0]), Math.exp(ci[1])];

  let summary = `This meta-analysis of ${k} studies (N=${N.toLocaleString()}) `;

  if (pValue < 0.05) {
    summary += `demonstrates a statistically significant ${magnitude} ${direction === 'decreased' ? 'reduction' : 'increase'} in ${outcome} with ${treatment} compared to ${comparator}. `;

    if (effect < 0) {
      // Risk reduction
      const rr = expEffect;
      const rrr = ((1 - rr) * 100).toFixed(1);
      summary += `The pooled risk ratio was ${rr.toFixed(2)} (95% CI: ${expCI[0].toFixed(2)}-${expCI[1].toFixed(2)}), representing a ${rrr}% relative risk reduction. `;
    } else {
      // Risk increase
      const rr = expEffect;
      const rri = ((rr - 1) * 100).toFixed(1);
      summary += `The pooled risk ratio was ${rr.toFixed(2)} (95% CI: ${expCI[0].toFixed(2)}-${expCI[1].toFixed(2)}), representing a ${rri}% relative risk increase. `;
    }
  } else {
    summary += `found no statistically significant difference in ${outcome} between ${treatment} and ${comparator}. `;
    summary += `The pooled effect was ${effect.toFixed(2)} (95% CI: ${ci[0].toFixed(2)} to ${ci[1].toFixed(2)}, p=${pValue.toFixed(3)}). `;
  }

  // Heterogeneity statement
  if (I2 > 75) {
    summary += `Substantial heterogeneity was observed (I²=${I2.toFixed(1)}%), suggesting caution in interpreting these pooled results.`;
  } else if (I2 > 50) {
    summary += `Moderate heterogeneity was present (I²=${I2.toFixed(1)}%), which may reflect clinical diversity among studies.`;
  } else if (I2 > 25) {
    summary += `Low to moderate heterogeneity was observed (I²=${I2.toFixed(1)}%).`;
  } else {
    summary += `Heterogeneity was low (I²=${I2.toFixed(1)}%), suggesting consistent effects across studies.`;
  }

  return summary;
}

/**
 * Generate patient-friendly summary
 */
function generatePatientSummary(effect, ci, isSignificant, k, N, direction, magnitude, outcome, treatment, comparator) {
  let summary = `We looked at ${k} research studies involving ${N.toLocaleString()} people to understand how ${treatment} compares to ${comparator}. `;

  if (isSignificant) {
    const changePercent = Math.abs((1 - Math.exp(effect)) * 100).toFixed(0);

    if (effect < 0) {
      summary += `The studies suggest that ${treatment} may ${magnitude === 'large' ? 'substantially' : ''} lower the chance of ${outcome} by about ${changePercent}% compared to ${comparator}. `;
      summary += `This means that out of 100 people, roughly ${Math.round(changePercent / 10)} fewer might experience ${outcome} when using ${treatment}.`;
    } else {
      summary += `The studies suggest that ${treatment} may ${magnitude === 'large' ? 'substantially' : ''} increase the chance of ${outcome} by about ${changePercent}% compared to ${comparator}.`;
    }
  } else {
    summary += `Based on the current evidence, we cannot say for certain whether ${treatment} is better or worse than ${comparator} for ${outcome}. `;
    summary += `More research may be needed to find out if there is a meaningful difference.`;
  }

  return summary;
}

/**
 * Generate researcher summary
 */
function generateResearcherSummary(effect, se, ci, pValue, I2, tau2, k, direction, magnitude) {
  let summary = `Meta-analysis of ${k} studies yielded a pooled effect estimate of ${effect.toFixed(4)} (SE: ${se.toFixed(4)}, 95% CI: ${ci[0].toFixed(4)} to ${ci[1].toFixed(4)}). `;

  summary += `Statistical significance: z = ${(effect/se).toFixed(2)}, p = ${pValue < 0.001 ? '<0.001' : pValue.toFixed(4)}. `;

  summary += `Heterogeneity assessment: Q-statistic p-value should be examined; I² = ${I2.toFixed(2)}% (${classifyHeterogeneity(I2)}), τ² = ${tau2.toFixed(4)}. `;

  if (I2 > 50) {
    summary += `Given the substantial heterogeneity, random-effects estimation is appropriate. Consider meta-regression to explore sources of heterogeneity.`;
  } else {
    summary += `Fixed and random effects models should yield similar results given low heterogeneity.`;
  }

  return summary;
}

/**
 * Generate policy summary
 */
function generatePolicySummary(effect, ci, isSignificant, k, N, I2, direction, magnitude, outcome, treatment) {
  let summary = `Evidence synthesis from ${k} studies (total sample: ${N.toLocaleString()}) `;

  if (isSignificant) {
    const rrr = Math.abs((1 - Math.exp(effect)) * 100).toFixed(1);

    if (effect < 0) {
      summary += `supports the efficacy of ${treatment} for reducing ${outcome}, with an estimated ${rrr}% relative risk reduction (95% CI: ${Math.abs((1-Math.exp(ci[1]))*100).toFixed(1)}% to ${Math.abs((1-Math.exp(ci[0]))*100).toFixed(1)}%). `;
    } else {
      summary += `indicates ${treatment} is associated with increased ${outcome}. `;
    }

    summary += `This evidence may support policy decisions regarding ${treatment} implementation`;

    if (I2 > 50) {
      summary += `, though heterogeneity across settings (I²=${I2.toFixed(0)}%) suggests context-dependent effects that should be considered.`;
    } else {
      summary += `, with consistent effects observed across diverse settings.`;
    }
  } else {
    summary += `does not provide conclusive evidence regarding the effect of ${treatment} on ${outcome}. `;
    summary += `Additional research or alternative interventions should be considered.`;
  }

  return summary;
}

/**
 * Classify effect magnitude based on Cohen's d conventions adapted for log-scale
 */
function classifyEffectMagnitude(absEffect) {
  if (absEffect >= 0.5) return 'large';
  if (absEffect >= 0.3) return 'moderate';
  if (absEffect >= 0.1) return 'small';
  return 'negligible';
}

/**
 * Classify heterogeneity based on I²
 */
function classifyHeterogeneity(I2) {
  if (I2 >= 75) return 'substantial';
  if (I2 >= 50) return 'moderate';
  if (I2 >= 25) return 'low';
  return 'negligible';
}

/**
 * Interpret heterogeneity for narrative
 */
function interpretHeterogeneity(I2) {
  if (I2 >= 75) {
    return 'Substantial heterogeneity suggests important differences between studies that should be explored through subgroup or sensitivity analyses.';
  } else if (I2 >= 50) {
    return 'Moderate heterogeneity indicates some variability in effects across studies, potentially due to clinical or methodological differences.';
  } else if (I2 >= 25) {
    return 'Low heterogeneity suggests reasonably consistent effects across studies.';
  }
  return 'Minimal heterogeneity indicates highly consistent effects across studies.';
}

/**
 * Generate limitations based on analysis results
 */
function generateLimitations(results, k, I2) {
  const limitations = [];

  // Sample size
  if (k < 5) {
    limitations.push({
      type: 'precision',
      severity: 'moderate',
      description: `Limited number of studies (k=${k}) may affect precision and the ability to detect small effects.`
    });
  }

  // Heterogeneity
  if (I2 > 50) {
    limitations.push({
      type: 'heterogeneity',
      severity: I2 > 75 ? 'serious' : 'moderate',
      description: `${I2 > 75 ? 'Substantial' : 'Moderate'} heterogeneity (I²=${I2.toFixed(1)}%) limits confidence in the pooled estimate.`
    });
  }

  // Prediction interval warning
  if (results.random?.pi && k >= 3) {
    const pi = results.random.pi;
    if ((pi[0] < 0 && pi[1] > 0) || (pi[0] > 0 && pi[1] < 0)) {
      limitations.push({
        type: 'prediction',
        severity: 'moderate',
        description: 'The prediction interval crosses the null, suggesting that future studies may show effects in either direction.'
      });
    }
  }

  // Publication bias
  if (results.publicationBias?.eggerP < 0.1) {
    limitations.push({
      type: 'publication_bias',
      severity: 'serious',
      description: 'Evidence of potential publication bias was detected, which may affect the validity of the pooled estimate.'
    });
  }

  // Small study effects
  if (k >= 10 && results.publicationBias?.beggP < 0.1) {
    limitations.push({
      type: 'small_study_effects',
      severity: 'moderate',
      description: 'Small-study effects were detected, suggesting possible publication bias or other biases in smaller studies.'
    });
  }

  // Generic limitations always applicable
  limitations.push({
    type: 'generalizability',
    severity: 'low',
    description: 'Results may not generalize to populations or settings not represented in the included studies.'
  });

  return limitations;
}

/**
 * Generate recommendations based on results
 */
function generateRecommendations(results, isSignificant, heterogeneityLevel) {
  const recommendations = [];

  // Based on significance and heterogeneity
  if (isSignificant && heterogeneityLevel === 'negligible') {
    recommendations.push({
      type: 'clinical',
      priority: 'high',
      recommendation: 'The consistent evidence supports considering this treatment in appropriate clinical contexts.'
    });
  } else if (isSignificant && (heterogeneityLevel === 'substantial' || heterogeneityLevel === 'moderate')) {
    recommendations.push({
      type: 'clinical',
      priority: 'moderate',
      recommendation: 'While overall effects favor the treatment, substantial heterogeneity suggests treatment response may vary. Individual patient factors should guide decision-making.'
    });
    recommendations.push({
      type: 'research',
      priority: 'high',
      recommendation: 'Further research should explore sources of heterogeneity through subgroup analyses or individual patient data meta-analysis.'
    });
  } else if (!isSignificant) {
    recommendations.push({
      type: 'research',
      priority: 'high',
      recommendation: 'Current evidence is inconclusive. Larger, well-designed trials are needed to establish efficacy.'
    });
    recommendations.push({
      type: 'clinical',
      priority: 'low',
      recommendation: 'In the absence of clear evidence, clinical decisions should be based on individual patient circumstances and alternative treatments.'
    });
  }

  // Small number of studies
  if ((results.nStudies || results.studies?.length || 0) < 5) {
    recommendations.push({
      type: 'research',
      priority: 'high',
      recommendation: 'The evidence base is limited. Additional studies are needed to increase confidence in the findings.'
    });
  }

  // Suggest living review approach
  recommendations.push({
    type: 'methodology',
    priority: 'moderate',
    recommendation: 'Consider a living systematic review approach to incorporate new evidence as it becomes available.'
  });

  return recommendations;
}

/**
 * Assess certainty of evidence (GRADE-style)
 */
export function assessCertainty(results, k, I2) {
  let certainty = 4; // Start at HIGH
  const reasons = [];

  // Risk of bias (simplified - would need ROB data)
  if (results.robSummary?.highRisk > 0.3) {
    certainty -= 1;
    reasons.push('Risk of bias in included studies');
  }

  // Inconsistency (heterogeneity)
  if (I2 > 75) {
    certainty -= 2;
    reasons.push('Substantial inconsistency (I² > 75%)');
  } else if (I2 > 50) {
    certainty -= 1;
    reasons.push('Moderate inconsistency (I² 50-75%)');
  }

  // Indirectness (would need PICO comparison)
  // Not assessed without specific data

  // Imprecision
  const ci = results.random?.ci || results.pooled?.ci;
  if (ci) {
    const ciWidth = Math.abs(ci[1] - ci[0]);
    if (ciWidth > 1.0) {
      certainty -= 1;
      reasons.push('Wide confidence intervals');
    }
  }
  if (k < 3) {
    certainty -= 1;
    reasons.push('Very few studies');
  }

  // Publication bias
  if (results.publicationBias?.eggerP < 0.05) {
    certainty -= 1;
    reasons.push('Evidence of publication bias');
  }

  // Ensure bounds
  certainty = Math.max(1, Math.min(4, certainty));

  const levels = ['', 'VERY LOW', 'LOW', 'MODERATE', 'HIGH'];
  const descriptions = {
    1: 'The true effect is probably markedly different from the estimated effect.',
    2: 'The true effect might be markedly different from the estimated effect.',
    3: 'The true effect is probably close to the estimated effect.',
    4: 'We are very confident that the true effect is close to the estimated effect.'
  };

  return {
    level: levels[certainty],
    score: certainty,
    description: descriptions[certainty],
    downgradingReasons: reasons
  };
}

// ============================================================================
// SMART SUGGESTIONS (RULE-BASED)
// ============================================================================

/**
 * Generate smart suggestions for additional analyses
 * Uses rules based on data characteristics - NO AI/ML
 *
 * @param {Object} metaResults - Meta-analysis results
 * @param {Array} studies - Study data
 * @returns {Object} Suggested analyses
 */
export function generateSmartSuggestions(metaResults, studies = []) {
  const suggestions = [];
  const k = metaResults.nStudies || studies.length || 0;
  const I2 = metaResults.I2 || 0;

  // Heterogeneity-based suggestions
  if (I2 > 50 && k >= 5) {
    suggestions.push({
      type: 'subgroup',
      priority: 'high',
      title: 'Subgroup Analysis',
      reason: `High heterogeneity (I²=${I2.toFixed(1)}%) detected`,
      description: 'Consider subgroup analyses by study characteristics (e.g., patient population, intervention dose, study design) to explore sources of heterogeneity.'
    });

    suggestions.push({
      type: 'metaRegression',
      priority: 'moderate',
      title: 'Meta-Regression',
      reason: 'Explore continuous moderators',
      description: 'Meta-regression could help identify continuous variables (e.g., mean age, dose, follow-up duration) associated with treatment effect.'
    });
  }

  // Sample size based suggestions
  if (k >= 10) {
    suggestions.push({
      type: 'publicationBias',
      priority: 'high',
      title: 'Publication Bias Assessment',
      reason: 'Sufficient studies for bias assessment',
      description: 'With 10+ studies, funnel plot, Egger\'s test, and trim-and-fill analysis are recommended.'
    });
  }

  // Sensitivity analyses
  if (k >= 3) {
    suggestions.push({
      type: 'sensitivity',
      priority: 'moderate',
      title: 'Leave-One-Out Analysis',
      reason: 'Assess robustness of findings',
      description: 'Remove each study iteratively to assess the influence of individual studies on the pooled estimate.'
    });
  }

  // Prediction interval
  if (k >= 3 && !metaResults.random?.pi) {
    suggestions.push({
      type: 'prediction',
      priority: 'moderate',
      title: 'Prediction Interval',
      reason: 'Inform expected range for future studies',
      description: 'Calculate a prediction interval to estimate the expected range of effects in a new study.'
    });
  }

  // Network meta-analysis suggestion
  const treatments = new Set();
  studies.forEach(s => {
    if (s.treatment) treatments.add(s.treatment);
    if (s.comparator) treatments.add(s.comparator);
  });

  if (treatments.size > 2) {
    suggestions.push({
      type: 'nma',
      priority: 'high',
      title: 'Network Meta-Analysis',
      reason: `${treatments.size} treatments identified`,
      description: 'Multiple treatments detected. Network meta-analysis would allow simultaneous comparison of all treatments.'
    });
  }

  // TSA suggestion
  suggestions.push({
    type: 'tsa',
    priority: 'moderate',
    title: 'Trial Sequential Analysis',
    reason: 'Assess if evidence is conclusive',
    description: 'TSA can determine if the cumulative evidence is sufficient or if additional trials are needed.'
  });

  // GRADE assessment
  suggestions.push({
    type: 'grade',
    priority: 'high',
    title: 'GRADE Assessment',
    reason: 'Rate certainty of evidence',
    description: 'Formal GRADE assessment recommended for clinical guideline development.'
  });

  return {
    suggestions: suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, moderate: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }),
    nSuggestions: suggestions.length,
    topPriority: suggestions.filter(s => s.priority === 'high')
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate a structured report section
 * Template-based - no external API calls
 *
 * @param {Object} results - Analysis results
 * @param {string} section - Section type ('methods', 'results', 'discussion')
 * @param {Object} options - Report options
 * @returns {string} Formatted report section
 */
export function generateReportSection(results, section, options = {}) {
  const {
    format = 'text', // 'text', 'markdown', 'html'
    style = 'academic' // 'academic', 'brief', 'plain'
  } = options;

  let content = '';

  switch (section) {
    case 'methods':
      content = generateMethodsSection(results, style);
      break;
    case 'results':
      content = generateResultsSection(results, style);
      break;
    case 'discussion':
      content = generateDiscussionSection(results, style);
      break;
    default:
      content = 'Section not recognized.';
  }

  // Format output
  if (format === 'markdown') {
    return `## ${section.charAt(0).toUpperCase() + section.slice(1)}\n\n${content}`;
  } else if (format === 'html') {
    return `<h2>${section.charAt(0).toUpperCase() + section.slice(1)}</h2>\n<p>${content.replace(/\n/g, '</p>\n<p>')}</p>`;
  }

  return content;
}

function generateMethodsSection(results, style) {
  const method = results.method || 'random-effects';
  const tau2Method = results.tau2Method || 'REML';
  const k = results.nStudies || results.studies?.length || 0;

  if (style === 'brief') {
    return `Meta-analysis used a ${method} model with ${tau2Method} estimation (k=${k}).`;
  }

  return `We conducted a meta-analysis using a ${method} model. Between-study variance (τ²) was estimated using the ${tau2Method} method. Heterogeneity was assessed using the I² statistic and Cochran's Q test. A total of ${k} studies met the inclusion criteria and were included in the quantitative synthesis. Publication bias was assessed using funnel plots and Egger's regression test where applicable (≥10 studies).`;
}

function generateResultsSection(results, style) {
  const effect = results.random?.mu ?? results.pooled?.effect ?? 0;
  const ci = results.random?.ci ?? results.pooled?.ci ?? [0, 0];
  const pValue = results.random?.pValue ?? results.pooled?.pValue ?? 1;
  const I2 = results.I2 ?? 0;
  const k = results.nStudies || results.studies?.length || 0;

  const expEffect = Math.exp(effect);
  const expCI = [Math.exp(ci[0]), Math.exp(ci[1])];

  if (style === 'brief') {
    return `Pooled RR: ${expEffect.toFixed(2)} (95% CI: ${expCI[0].toFixed(2)}-${expCI[1].toFixed(2)}), p=${pValue < 0.001 ? '<0.001' : pValue.toFixed(3)}, I²=${I2.toFixed(1)}%.`;
  }

  let text = `The meta-analysis included ${k} studies. `;
  text += `The pooled risk ratio was ${expEffect.toFixed(2)} (95% CI: ${expCI[0].toFixed(2)} to ${expCI[1].toFixed(2)}`;
  text += pValue < 0.05 ? `, p=${pValue < 0.001 ? '<0.001' : pValue.toFixed(3)}). ` : `, p=${pValue.toFixed(3)}), which was not statistically significant. `;
  text += `Heterogeneity was ${classifyHeterogeneity(I2)} (I² = ${I2.toFixed(1)}%, `;
  text += `τ² = ${(results.tau2 ?? 0).toFixed(4)}).`;

  return text;
}

function generateDiscussionSection(results, style) {
  const effect = results.random?.mu ?? results.pooled?.effect ?? 0;
  const I2 = results.I2 ?? 0;
  const pValue = results.random?.pValue ?? results.pooled?.pValue ?? 1;
  const isSignificant = pValue < 0.05;

  if (style === 'brief') {
    return isSignificant
      ? 'The evidence supports a significant effect of the intervention.'
      : 'No significant effect was found.';
  }

  let text = '';

  if (isSignificant) {
    text = `This meta-analysis provides ${I2 < 50 ? 'consistent' : 'heterogeneous'} evidence ${effect < 0 ? 'supporting' : 'indicating concerns about'} the intervention. `;
  } else {
    text = 'The current evidence does not support a statistically significant effect of the intervention. ';
  }

  if (I2 > 50) {
    text += 'The substantial heterogeneity observed suggests that treatment effects may vary across different populations or settings, and further research is needed to identify effect modifiers. ';
  }

  text += 'Several limitations should be considered when interpreting these findings, including potential publication bias and the quality of included studies.';

  return text;
}

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================

export const MODULE_INFO = {
  name: 'ai-core',
  version: INTERPRETATION_CONFIG.version,
  description: 'Template-based interpretation module (NO external AI APIs)',
  exports: [
    'generateInterpretation',
    'generateSmartSuggestions',
    'generateReportSection',
    'assessCertainty'
  ],
  apiRequired: false
};
