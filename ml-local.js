/**
 * ESC ACS Living Meta-Analysis - Local ML & Rule-Based Module
 *
 * Provides intelligent features WITHOUT external AI APIs:
 * - Rule-based PICO extraction
 * - Statistical anomaly detection
 * - Fuzzy duplicate detection
 * - Quality prediction from reporting patterns
 * - Smart interpretation templates
 * - Study classification
 *
 * All processing runs locally in the browser - no API calls.
 *
 * @module ml-local
 * @version 1.0.0
 * @date 2026-01-26
 */

// ============================================================================
// RULE-BASED PICO EXTRACTION
// ============================================================================

/**
 * Extract PICO elements using sophisticated rule-based NLP
 *
 * @param {string} text - Abstract or full text
 * @returns {Object} Extracted PICO with confidence scores
 */
export function extractPICO(text) {
  if (!text || typeof text !== 'string') {
    return { error: 'Invalid input text' };
  }

  const normalizedText = text.toLowerCase();
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s);

  return {
    population: extractPopulation(text, normalizedText, sentences),
    intervention: extractIntervention(text, normalizedText, sentences),
    comparator: extractComparator(text, normalizedText, sentences),
    outcomes: extractOutcomes(text, normalizedText, sentences),
    studyDesign: classifyStudyDesign(text, normalizedText),
    sampleSize: extractSampleSize(text),
    followUp: extractFollowUp(text),
    setting: extractSetting(text, normalizedText)
  };
}

function extractPopulation(text, normalizedText, sentences) {
  const results = [];

  // Pattern 1: "X patients with Y"
  const patientPatterns = [
    /(\d+)\s*(?:patients?|participants?|subjects?|individuals?|people|adults?|children)\s+(?:with|who had|diagnosed with|suffering from)\s+([^.;,]+)/gi,
    /(?:enrolled|included|recruited|randomized)\s+(\d+)\s*(?:patients?|participants?|subjects?)\s+(?:with|who had)?\s*([^.;,]+)?/gi,
    /(?:patients?|participants?)\s+(?:were\s+)?(?:aged?|between)\s+(\d+)[-–](\d+)\s*(?:years?)?/gi
  ];

  for (const pattern of patientPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      results.push({
        text: match[0].trim(),
        type: 'patient_description',
        confidence: 0.8
      });
    }
  }

  // Pattern 2: Condition/disease mentions
  const conditions = [
    'acute coronary syndrome', 'acs', 'stemi', 'nstemi', 'unstable angina',
    'myocardial infarction', 'heart attack', 'coronary artery disease', 'cad',
    'heart failure', 'atrial fibrillation', 'hypertension', 'diabetes',
    'stroke', 'cancer', 'copd', 'asthma', 'depression', 'anxiety'
  ];

  for (const condition of conditions) {
    if (normalizedText.includes(condition)) {
      results.push({
        text: condition.toUpperCase(),
        type: 'condition',
        confidence: 0.9
      });
    }
  }

  // Pattern 3: Age and sex
  const ageMatch = normalizedText.match(/(?:mean|median|average)\s+age\s+(?:was\s+)?(\d+(?:\.\d+)?)/);
  if (ageMatch) {
    results.push({
      text: `Mean age: ${ageMatch[1]} years`,
      type: 'demographics',
      confidence: 0.85
    });
  }

  const maleMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:were\s+)?(?:male|men)/);
  if (maleMatch) {
    results.push({
      text: `${maleMatch[1]}% male`,
      type: 'demographics',
      confidence: 0.85
    });
  }

  return consolidateResults(results, 'population');
}

function extractIntervention(text, normalizedText, sentences) {
  const results = [];

  // Pattern 1: Drug names with doses
  const drugPatterns = [
    /(\w+(?:mab|nib|vir|stat|pril|sartan|olol|dipine|azole|mycin|cillin)?)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)/gi,
    /(?:treated with|received|administered|given)\s+([^,.]+?)(?:\s+(?:versus|vs\.?|or|compared))/gi,
    /(?:intervention|treatment|experimental)\s+(?:group|arm)?\s*[:=]?\s*([^,.;]+)/gi
  ];

  for (const pattern of drugPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      results.push({
        text: match[0].trim(),
        type: 'drug_with_dose',
        confidence: 0.85
      });
    }
  }

  // Pattern 2: Common cardiovascular drugs
  const cvDrugs = [
    'aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel', 'ticlopidine',
    'heparin', 'enoxaparin', 'fondaparinux', 'bivalirudin', 'rivaroxaban',
    'apixaban', 'dabigatran', 'edoxaban', 'warfarin',
    'atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin',
    'metoprolol', 'bisoprolol', 'carvedilol', 'atenolol',
    'ramipril', 'lisinopril', 'enalapril', 'perindopril',
    'losartan', 'valsartan', 'candesartan', 'irbesartan',
    'amlodipine', 'nifedipine', 'diltiazem', 'verapamil',
    'pci', 'cabg', 'angioplasty', 'stent', 'thrombolysis'
  ];

  for (const drug of cvDrugs) {
    const regex = new RegExp(`\\b${drug}\\b`, 'gi');
    if (regex.test(text)) {
      // Find context around the drug
      const contextMatch = text.match(new RegExp(`[^.]*\\b${drug}\\b[^.]*`, 'gi'));
      if (contextMatch) {
        results.push({
          text: drug.charAt(0).toUpperCase() + drug.slice(1),
          context: contextMatch[0].trim(),
          type: 'known_drug',
          confidence: 0.9
        });
      }
    }
  }

  return consolidateResults(results, 'intervention');
}

function extractComparator(text, normalizedText, sentences) {
  const results = [];

  // Pattern 1: "versus", "vs", "compared to/with"
  const comparatorPatterns = [
    /(?:versus|vs\.?|compared\s+(?:to|with)|or)\s+([^,.;]+?)(?:[,.]|\s+(?:in|for|with|among))/gi,
    /(?:control|placebo|standard\s+(?:care|treatment|therapy|of\s+care)|usual\s+care|sham)/gi,
    /(?:comparator|comparison)\s+(?:group|arm)?\s*[:=]?\s*([^,.;]+)/gi
  ];

  for (const pattern of comparatorPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const extracted = match[1] || match[0];
      results.push({
        text: extracted.trim(),
        type: 'comparator',
        confidence: 0.8
      });
    }
  }

  // Check for placebo-controlled
  if (normalizedText.includes('placebo-controlled') || normalizedText.includes('placebo controlled')) {
    results.push({
      text: 'Placebo',
      type: 'placebo',
      confidence: 0.95
    });
  }

  return consolidateResults(results, 'comparator');
}

function extractOutcomes(text, normalizedText, sentences) {
  const results = [];

  // Pattern 1: Explicit outcome mentions
  const outcomePatterns = [
    /(?:primary\s+(?:outcome|endpoint|end-?point))\s*(?:was|were|:)?\s*([^.;]+)/gi,
    /(?:secondary\s+(?:outcome|endpoint|end-?point)s?)\s*(?:included?|were|:)?\s*([^.;]+)/gi,
    /(?:main\s+outcome|principal\s+endpoint)\s*(?:was|:)?\s*([^.;]+)/gi
  ];

  for (const pattern of outcomePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      results.push({
        text: match[1].trim(),
        type: match[0].toLowerCase().includes('primary') ? 'primary' : 'secondary',
        confidence: 0.9
      });
    }
  }

  // Pattern 2: Common cardiovascular outcomes
  const cvOutcomes = [
    { term: 'mace', full: 'Major Adverse Cardiovascular Events (MACE)' },
    { term: 'all-cause mortality', full: 'All-cause mortality' },
    { term: 'cardiovascular mortality', full: 'Cardiovascular mortality' },
    { term: 'cardiovascular death', full: 'Cardiovascular death' },
    { term: 'myocardial infarction', full: 'Myocardial infarction' },
    { term: 'stroke', full: 'Stroke' },
    { term: 'stent thrombosis', full: 'Stent thrombosis' },
    { term: 'major bleeding', full: 'Major bleeding' },
    { term: 'target vessel revascularization', full: 'Target vessel revascularization' },
    { term: 'heart failure hospitalization', full: 'Heart failure hospitalization' },
    { term: 'rehospitalization', full: 'Rehospitalization' }
  ];

  for (const outcome of cvOutcomes) {
    if (normalizedText.includes(outcome.term)) {
      results.push({
        text: outcome.full,
        type: 'clinical_outcome',
        confidence: 0.85
      });
    }
  }

  return results;
}

function classifyStudyDesign(text, normalizedText) {
  const designs = {
    rct: {
      patterns: ['randomized', 'randomised', 'rct', 'random allocation', 'randomly assigned'],
      score: 0
    },
    observational: {
      patterns: ['observational', 'cohort', 'case-control', 'cross-sectional', 'registry'],
      score: 0
    },
    systematic_review: {
      patterns: ['systematic review', 'meta-analysis', 'pooled analysis'],
      score: 0
    },
    case_report: {
      patterns: ['case report', 'case series'],
      score: 0
    }
  };

  for (const [design, info] of Object.entries(designs)) {
    for (const pattern of info.patterns) {
      if (normalizedText.includes(pattern)) {
        designs[design].score += 1;
      }
    }
  }

  // Find best match
  let bestDesign = 'unknown';
  let bestScore = 0;
  for (const [design, info] of Object.entries(designs)) {
    if (info.score > bestScore) {
      bestScore = info.score;
      bestDesign = design;
    }
  }

  // Additional checks
  if (normalizedText.includes('double-blind') || normalizedText.includes('double blind')) {
    if (bestDesign === 'rct') {
      return { type: 'RCT (double-blind)', confidence: 0.95 };
    }
  }

  if (normalizedText.includes('open-label') || normalizedText.includes('open label')) {
    if (bestDesign === 'rct') {
      return { type: 'RCT (open-label)', confidence: 0.9 };
    }
  }

  return {
    type: bestDesign === 'rct' ? 'RCT' :
          bestDesign === 'observational' ? 'Observational' :
          bestDesign === 'systematic_review' ? 'Systematic Review' :
          bestDesign === 'case_report' ? 'Case Report' : 'Unknown',
    confidence: bestScore > 0 ? Math.min(0.95, 0.6 + bestScore * 0.15) : 0.3
  };
}

function extractSampleSize(text) {
  const patterns = [
    /(?:n\s*=\s*)(\d+(?:,\d+)?)/gi,
    /(\d+(?:,\d+)?)\s*(?:patients?|participants?|subjects?)\s+(?:were\s+)?(?:enrolled|included|randomized)/gi,
    /(?:enrolled|included|randomized)\s+(\d+(?:,\d+)?)\s*(?:patients?|participants?|subjects?)/gi,
    /(?:total|overall)\s+(?:of\s+)?(\d+(?:,\d+)?)\s*(?:patients?|participants?)/gi
  ];

  const sizes = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1].replace(/,/g, ''), 10);
      if (num > 10 && num < 10000000) { // Reasonable range
        sizes.push(num);
      }
    }
  }

  if (sizes.length === 0) return null;

  // Return the most commonly mentioned or largest reasonable value
  const mode = sizes.sort((a, b) =>
    sizes.filter(v => v === b).length - sizes.filter(v => v === a).length
  )[0];

  return {
    n: mode,
    confidence: sizes.filter(v => v === mode).length > 1 ? 0.9 : 0.7
  };
}

function extractFollowUp(text) {
  const patterns = [
    /(?:follow-?up|followed\s+(?:up\s+)?for)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?)/gi,
    /(?:median|mean|average)\s+follow-?up\s+(?:(?:time|period|duration)\s+)?(?:was\s+)?(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?)/gi,
    /(\d+)[-–](?:day|week|month|year)\s+(?:follow-?up|outcomes?)/gi
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2]?.toLowerCase() || 'months';

      return {
        value,
        unit: unit.replace(/s$/, ''), // Normalize to singular
        text: `${value} ${unit}`,
        confidence: 0.85
      };
    }
  }

  return null;
}

function extractSetting(text, normalizedText) {
  const settings = [];

  // Country detection
  const countries = [
    'united states', 'usa', 'us', 'america',
    'united kingdom', 'uk', 'england', 'britain',
    'china', 'japan', 'germany', 'france', 'italy', 'spain',
    'canada', 'australia', 'india', 'brazil', 'korea'
  ];

  for (const country of countries) {
    if (normalizedText.includes(country)) {
      settings.push({ type: 'country', value: country });
    }
  }

  // Multicenter detection
  if (normalizedText.includes('multicenter') || normalizedText.includes('multicentre') ||
      normalizedText.includes('multi-center') || normalizedText.includes('multi-centre')) {
    settings.push({ type: 'design', value: 'Multicenter' });
  }

  if (normalizedText.includes('single-center') || normalizedText.includes('single center') ||
      normalizedText.includes('single-centre') || normalizedText.includes('single centre')) {
    settings.push({ type: 'design', value: 'Single-center' });
  }

  // International
  if (normalizedText.includes('international') || normalizedText.includes('multinational')) {
    settings.push({ type: 'scope', value: 'International' });
  }

  return settings;
}

function consolidateResults(results, category) {
  if (results.length === 0) {
    return { text: null, confidence: 0, details: [] };
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  return {
    text: results[0].text,
    confidence: results[0].confidence,
    type: results[0].type,
    details: results
  };
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Detect duplicate studies using fuzzy matching
 *
 * @param {Array} studies - Array of studies with title, authors, year
 * @param {number} threshold - Similarity threshold (0-1), default 0.85
 * @returns {Array} Groups of potential duplicates
 */
export function detectDuplicates(studies, threshold = 0.85) {
  if (!studies || studies.length < 2) return [];

  const duplicateGroups = [];
  const processed = new Set();

  for (let i = 0; i < studies.length; i++) {
    if (processed.has(i)) continue;

    const group = [i];

    for (let j = i + 1; j < studies.length; j++) {
      if (processed.has(j)) continue;

      const similarity = calculateStudySimilarity(studies[i], studies[j]);

      if (similarity >= threshold) {
        group.push(j);
        processed.add(j);
      }
    }

    if (group.length > 1) {
      duplicateGroups.push({
        indices: group,
        studies: group.map(idx => ({
          index: idx,
          title: studies[idx].title,
          authors: studies[idx].authors,
          year: studies[idx].year
        })),
        confidence: 'high'
      });
      processed.add(i);
    }
  }

  return duplicateGroups;
}

/**
 * Calculate similarity between two studies
 */
function calculateStudySimilarity(study1, study2) {
  let totalScore = 0;
  let weights = 0;

  // Title similarity (highest weight)
  if (study1.title && study2.title) {
    const titleSim = jaroWinkler(
      normalizeString(study1.title),
      normalizeString(study2.title)
    );
    totalScore += titleSim * 0.5;
    weights += 0.5;
  }

  // Author similarity
  if (study1.authors && study2.authors) {
    const authors1 = extractAuthorLastNames(study1.authors);
    const authors2 = extractAuthorLastNames(study2.authors);
    const authorSim = calculateAuthorOverlap(authors1, authors2);
    totalScore += authorSim * 0.3;
    weights += 0.3;
  }

  // Year match
  if (study1.year && study2.year) {
    const yearSim = study1.year === study2.year ? 1 : Math.abs(study1.year - study2.year) <= 1 ? 0.5 : 0;
    totalScore += yearSim * 0.1;
    weights += 0.1;
  }

  // DOI/PMID exact match (definitive)
  if (study1.doi && study2.doi && study1.doi === study2.doi) {
    return 1.0;
  }
  if (study1.pmid && study2.pmid && study1.pmid === study2.pmid) {
    return 1.0;
  }

  // NCT number match
  if (study1.nct && study2.nct && study1.nct === study2.nct) {
    totalScore += 0.1;
    weights += 0.1;
  }

  return weights > 0 ? totalScore / weights : 0;
}

/**
 * Jaro-Winkler string similarity
 */
function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  const len1 = s1.length;
  const len2 = s2.length;

  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);

    for (let j = start; j < end; j++) {
      if (matches2[j] || s1[i] !== s2[j]) continue;
      matches1[i] = matches2[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAuthorLastNames(authors) {
  if (typeof authors === 'string') {
    // Parse "Smith J, Jones A, Brown B et al." format
    return authors
      .replace(/et al\.?/gi, '')
      .split(/[,;]/)
      .map(a => a.trim().split(/\s+/)[0])
      .filter(a => a && a.length > 1)
      .map(a => a.toLowerCase());
  }
  if (Array.isArray(authors)) {
    return authors.map(a => (a.lastName || a.split(/\s+/).pop() || '').toLowerCase());
  }
  return [];
}

function calculateAuthorOverlap(authors1, authors2) {
  if (!authors1.length || !authors2.length) return 0;

  let matches = 0;
  for (const a1 of authors1) {
    for (const a2 of authors2) {
      if (jaroWinkler(a1, a2) > 0.85) {
        matches++;
        break;
      }
    }
  }

  return matches / Math.max(authors1.length, authors2.length);
}

// ============================================================================
// STATISTICAL ANOMALY DETECTION
// ============================================================================

/**
 * Detect statistical anomalies and potential data problems
 *
 * @param {Array} studies - Study data
 * @returns {Object} Detected anomalies with explanations
 */
export function detectAnomalies(studies) {
  const anomalies = {
    outliers: [],
    inconsistencies: [],
    suspiciousPatterns: [],
    warnings: []
  };

  if (!studies || studies.length < 3) {
    return { ...anomalies, message: 'Need at least 3 studies for anomaly detection' };
  }

  // 1. Effect size outliers (using IQR method)
  const effects = studies.map(s => s.effect).filter(e => !isNaN(e));
  if (effects.length >= 5) {
    const sorted = [...effects].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 2.5 * iqr;
    const upperBound = q3 + 2.5 * iqr;

    studies.forEach((s, i) => {
      if (s.effect < lowerBound || s.effect > upperBound) {
        anomalies.outliers.push({
          index: i,
          study: s.studyId || s.study || `Study ${i + 1}`,
          type: 'effect_outlier',
          value: s.effect,
          bounds: [lowerBound, upperBound],
          severity: 'high',
          message: `Effect size (${s.effect.toFixed(3)}) is an extreme outlier`
        });
      }
    });
  }

  // 2. Impossibly small standard errors
  const ses = studies.map(s => s.se).filter(se => !isNaN(se) && se > 0);
  if (ses.length >= 3) {
    const medianSE = ses.sort((a, b) => a - b)[Math.floor(ses.length / 2)];

    studies.forEach((s, i) => {
      if (s.se > 0 && s.se < medianSE * 0.1) {
        anomalies.suspiciousPatterns.push({
          index: i,
          study: s.studyId || s.study || `Study ${i + 1}`,
          type: 'tiny_se',
          value: s.se,
          expected: medianSE,
          severity: 'medium',
          message: `Very small SE (${s.se.toFixed(4)}) - verify sample size and data`
        });
      }
    });
  }

  // 3. Sample size inconsistencies (for binary data)
  studies.forEach((s, i) => {
    if (s.e1 !== undefined && s.n1 !== undefined) {
      if (s.e1 > s.n1) {
        anomalies.inconsistencies.push({
          index: i,
          study: s.studyId || s.study || `Study ${i + 1}`,
          type: 'events_exceed_total',
          severity: 'critical',
          message: `Events (${s.e1}) exceed total (${s.n1}) in treatment arm`
        });
      }
    }
    if (s.e0 !== undefined && s.n0 !== undefined) {
      if (s.e0 > s.n0) {
        anomalies.inconsistencies.push({
          index: i,
          study: s.studyId || s.study || `Study ${i + 1}`,
          type: 'events_exceed_total',
          severity: 'critical',
          message: `Events (${s.e0}) exceed total (${s.n0}) in control arm`
        });
      }
    }
  });

  // 4. GRIM test for means (checking if mean is possible given N)
  studies.forEach((s, i) => {
    if (s.mean1 !== undefined && s.n1 !== undefined && s.n1 <= 100) {
      const grimResult = grimTest(s.mean1, s.n1, 2);
      if (!grimResult.possible) {
        anomalies.suspiciousPatterns.push({
          index: i,
          study: s.studyId || s.study || `Study ${i + 1}`,
          type: 'grim_failure',
          severity: 'medium',
          message: `Mean ${s.mean1} may not be possible with n=${s.n1} (GRIM test)`
        });
      }
    }
  });

  // 5. Perfect round numbers (potential fabrication indicator)
  studies.forEach((s, i) => {
    const roundCount = countRoundNumbers(s);
    if (roundCount >= 3) {
      anomalies.warnings.push({
        index: i,
        study: s.studyId || s.study || `Study ${i + 1}`,
        type: 'excessive_rounding',
        count: roundCount,
        severity: 'low',
        message: `Multiple round numbers detected - may indicate rounding or estimation`
      });
    }
  });

  // 6. Identical effect sizes
  const effectCounts = new Map();
  studies.forEach((s, i) => {
    const key = s.effect?.toFixed(4);
    if (key) {
      if (!effectCounts.has(key)) effectCounts.set(key, []);
      effectCounts.get(key).push(i);
    }
  });

  effectCounts.forEach((indices, effect) => {
    if (indices.length > 1) {
      anomalies.suspiciousPatterns.push({
        indices,
        type: 'identical_effects',
        value: parseFloat(effect),
        severity: indices.length > 2 ? 'high' : 'low',
        message: `${indices.length} studies have identical effect size (${effect})`
      });
    }
  });

  // Summary
  anomalies.summary = {
    totalAnomalies: anomalies.outliers.length + anomalies.inconsistencies.length +
                    anomalies.suspiciousPatterns.length + anomalies.warnings.length,
    critical: anomalies.inconsistencies.filter(a => a.severity === 'critical').length,
    requiresReview: anomalies.outliers.length + anomalies.inconsistencies.length
  };

  return anomalies;
}

/**
 * GRIM test - check if a mean is mathematically possible
 */
function grimTest(mean, n, decimals = 2) {
  if (n > 100) return { possible: true, note: 'N too large for GRIM' };

  const factor = Math.pow(10, decimals);
  const totalNeeded = Math.round(mean * n * factor) / factor;
  const remainder = (totalNeeded * n) % 1;

  // Check if the remainder is close to an integer
  const possible = remainder < 0.01 || remainder > 0.99;

  return { possible, mean, n, decimals };
}

function countRoundNumbers(study) {
  let count = 0;
  const values = [study.effect, study.se, study.mean1, study.mean2, study.sd1, study.sd2];

  for (const v of values) {
    if (v !== undefined && v !== null) {
      // Check if it's a round number (ends in 0 or 5)
      const str = v.toString();
      if (str.match(/\.[05]0*$/) || str.match(/^-?\d+$/)) {
        count++;
      }
    }
  }

  return count;
}

// ============================================================================
// QUALITY PREDICTION FROM REPORTING
// ============================================================================

/**
 * Predict study quality based on reporting patterns
 *
 * @param {Object} study - Study with abstract/methods
 * @returns {Object} Quality prediction with domain scores
 */
export function predictQuality(study) {
  const text = `${study.title || ''} ${study.abstract || ''} ${study.methods || ''}`.toLowerCase();

  const domains = {
    randomization: assessRandomization(text),
    allocation: assessAllocation(text),
    blinding: assessBlinding(text),
    attrition: assessAttrition(text, study),
    reporting: assessReporting(text, study)
  };

  // Calculate overall score
  const scores = Object.values(domains).map(d => d.score);
  const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Determine overall risk
  let overallRisk = 'low';
  if (overallScore < 0.4) overallRisk = 'high';
  else if (overallScore < 0.7) overallRisk = 'unclear';

  return {
    domains,
    overallScore: Math.round(overallScore * 100),
    overallRisk,
    confidence: calculateConfidence(domains),
    recommendations: generateQualityRecommendations(domains)
  };
}

function assessRandomization(text) {
  let score = 0.5; // Default unclear
  const indicators = [];

  if (text.includes('computer-generated') || text.includes('computer generated')) {
    score = 0.9;
    indicators.push('Computer-generated randomization mentioned');
  } else if (text.includes('random number') || text.includes('randomization table')) {
    score = 0.85;
    indicators.push('Random number/table mentioned');
  } else if (text.includes('randomized') || text.includes('randomised')) {
    score = 0.6;
    indicators.push('Randomization mentioned but method unclear');
  }

  if (text.includes('stratified') || text.includes('block')) {
    score = Math.min(1, score + 0.1);
    indicators.push('Stratified/block randomization');
  }

  return { score, risk: score >= 0.7 ? 'low' : score >= 0.4 ? 'unclear' : 'high', indicators };
}

function assessAllocation(text) {
  let score = 0.5;
  const indicators = [];

  if (text.includes('central') && text.includes('allocation')) {
    score = 0.95;
    indicators.push('Central allocation');
  } else if (text.includes('sealed') && text.includes('envelope')) {
    score = 0.7;
    indicators.push('Sealed envelopes (moderate concealment)');
  } else if (text.includes('allocation concealment') || text.includes('concealed allocation')) {
    score = 0.75;
    indicators.push('Allocation concealment mentioned');
  }

  if (text.includes('open') && text.includes('label')) {
    score = Math.max(0.2, score - 0.3);
    indicators.push('Open-label design');
  }

  return { score, risk: score >= 0.7 ? 'low' : score >= 0.4 ? 'unclear' : 'high', indicators };
}

function assessBlinding(text) {
  let score = 0.5;
  const indicators = [];

  if (text.includes('double-blind') || text.includes('double blind') || text.includes('doubleblind')) {
    score = 0.9;
    indicators.push('Double-blind');
  } else if (text.includes('single-blind') || text.includes('single blind')) {
    score = 0.6;
    indicators.push('Single-blind');
  } else if (text.includes('open-label') || text.includes('open label') || text.includes('unblinded')) {
    score = 0.3;
    indicators.push('Open-label/unblinded');
  }

  if (text.includes('placebo') && !text.includes('no placebo')) {
    score = Math.min(1, score + 0.1);
    indicators.push('Placebo-controlled');
  }

  if (text.includes('blinded outcome') || text.includes('blinded endpoint') ||
      text.includes('blinded adjudication')) {
    score = Math.min(1, score + 0.1);
    indicators.push('Blinded outcome assessment');
  }

  return { score, risk: score >= 0.7 ? 'low' : score >= 0.4 ? 'unclear' : 'high', indicators };
}

function assessAttrition(text, study) {
  let score = 0.5;
  const indicators = [];

  // Check for ITT analysis
  if (text.includes('intention-to-treat') || text.includes('intention to treat') || text.includes('itt')) {
    score = 0.8;
    indicators.push('ITT analysis');
  }

  // Check for dropout rates if provided
  if (study.dropoutRate !== undefined) {
    if (study.dropoutRate < 0.1) {
      score = Math.min(1, score + 0.1);
      indicators.push('Low dropout (<10%)');
    } else if (study.dropoutRate > 0.2) {
      score = Math.max(0, score - 0.2);
      indicators.push('High dropout (>20%)');
    }
  }

  // Check for CONSORT flow
  if (text.includes('consort') || text.includes('flow diagram') || text.includes('flowchart')) {
    score = Math.min(1, score + 0.1);
    indicators.push('CONSORT flow reported');
  }

  return { score, risk: score >= 0.7 ? 'low' : score >= 0.4 ? 'unclear' : 'high', indicators };
}

function assessReporting(text, study) {
  let score = 0.5;
  const indicators = [];

  // Protocol registration
  if (text.includes('clinicaltrials.gov') || text.includes('nct') ||
      text.includes('isrctn') || text.includes('registered')) {
    score += 0.15;
    indicators.push('Trial registration mentioned');
  }

  // Sample size calculation
  if (text.includes('power') || text.includes('sample size calculation') ||
      text.includes('sample size was calculated')) {
    score += 0.1;
    indicators.push('Sample size calculation reported');
  }

  // Primary outcome specified
  if (text.includes('primary outcome') || text.includes('primary endpoint') ||
      text.includes('primary end point')) {
    score += 0.1;
    indicators.push('Primary outcome specified');
  }

  // Confidence intervals reported
  if (text.includes('confidence interval') || text.includes('95% ci') || text.includes('ci ')) {
    score += 0.05;
    indicators.push('Confidence intervals reported');
  }

  score = Math.min(1, score);

  return { score, risk: score >= 0.7 ? 'low' : score >= 0.4 ? 'unclear' : 'high', indicators };
}

function calculateConfidence(domains) {
  // More indicators = more confident in assessment
  const totalIndicators = Object.values(domains)
    .reduce((sum, d) => sum + d.indicators.length, 0);

  if (totalIndicators >= 8) return 'high';
  if (totalIndicators >= 4) return 'medium';
  return 'low';
}

function generateQualityRecommendations(domains) {
  const recommendations = [];

  for (const [domain, assessment] of Object.entries(domains)) {
    if (assessment.risk === 'high') {
      recommendations.push({
        domain,
        priority: 'high',
        action: `Verify ${domain} - high risk of bias detected`
      });
    } else if (assessment.risk === 'unclear') {
      recommendations.push({
        domain,
        priority: 'medium',
        action: `Clarify ${domain} - insufficient information`
      });
    }
  }

  return recommendations;
}

// ============================================================================
// AUTO-INTERPRETATION (TEMPLATE-BASED)
// ============================================================================

/**
 * Generate interpretation of meta-analysis results
 * Uses sophisticated templates - no AI API needed
 *
 * @param {Object} results - Meta-analysis results
 * @param {Object} options - Configuration
 * @returns {Object} Structured interpretation
 */
export function generateInterpretation(results, options = {}) {
  const {
    effectMeasure = 'RR', // 'RR', 'OR', 'MD', 'HR'
    direction = 'benefit', // 'benefit' or 'harm'
    context = 'clinical'
  } = options;

  const effect = results.random?.mu || results.mu || 0;
  const ci = results.random?.ci || results.ci || [0, 0];
  const i2 = results.i2 || 0;
  const k = results.k || results.nStudies || 0;
  const significant = (ci[0] > 0 && ci[1] > 0) || (ci[0] < 0 && ci[1] < 0);

  // Calculate derived statistics
  const isRatio = ['RR', 'OR', 'HR'].includes(effectMeasure);
  const effectValue = isRatio ? Math.exp(effect) : effect;
  const ciValues = isRatio ? [Math.exp(ci[0]), Math.exp(ci[1])] : ci;

  // Relative risk reduction / increase
  let rrr = null;
  let nnt = null;
  if (isRatio && significant) {
    rrr = Math.abs(1 - effectValue) * 100;
    // NNT calculation requires baseline risk (assume 10% if not provided)
    const baselineRisk = options.baselineRisk || 0.1;
    const arr = Math.abs(baselineRisk - baselineRisk * effectValue);
    nnt = arr > 0 ? Math.round(1 / arr) : null;
  }

  // Build interpretation
  const interpretation = {
    summary: buildSummary(effectMeasure, effectValue, ciValues, significant, k),
    effectSize: {
      point: effectValue,
      ci: ciValues,
      measure: effectMeasure,
      significant
    },
    heterogeneity: interpretHeterogeneity(i2, k),
    certainty: assessCertainty(results),
    clinicalSignificance: assessClinicalImpact(effectValue, rrr, nnt, effectMeasure),
    limitations: identifyLimitations(results),
    recommendations: generateRecommendations(results, significant, context)
  };

  if (rrr !== null) {
    interpretation.derivedMetrics = {
      relativeRiskReduction: `${rrr.toFixed(1)}%`,
      nnt: nnt,
      baselineRiskAssumed: options.baselineRisk || 0.1
    };
  }

  return interpretation;
}

function buildSummary(measure, effect, ci, significant, k) {
  const direction = effect < 1 ? 'reduced' : 'increased';
  const magnitude = Math.abs(1 - effect) * 100;

  if (!significant) {
    return `Pooled analysis of ${k} studies found no statistically significant effect ` +
           `(${measure} ${effect.toFixed(2)}, 95% CI ${ci[0].toFixed(2)} to ${ci[1].toFixed(2)}).`;
  }

  return `Pooled analysis of ${k} studies found a statistically significant ${direction} risk ` +
         `(${measure} ${effect.toFixed(2)}, 95% CI ${ci[0].toFixed(2)} to ${ci[1].toFixed(2)}), ` +
         `representing a ${magnitude.toFixed(0)}% relative ${direction === 'reduced' ? 'reduction' : 'increase'}.`;
}

function interpretHeterogeneity(i2, k) {
  let level, interpretation;

  if (i2 < 25) {
    level = 'low';
    interpretation = 'Studies show consistent results';
  } else if (i2 < 50) {
    level = 'moderate';
    interpretation = 'Some variation exists between studies';
  } else if (i2 < 75) {
    level = 'substantial';
    interpretation = 'Substantial variation suggests effects may differ across settings';
  } else {
    level = 'considerable';
    interpretation = 'Considerable variation - pooled estimate may not represent all settings';
  }

  return {
    i2: i2,
    level,
    interpretation,
    recommendation: i2 > 50 ?
      'Consider exploring sources of heterogeneity through subgroup analysis' :
      'Heterogeneity is acceptable'
  };
}

function assessCertainty(results) {
  let certainty = 4; // Start at HIGH
  const reasons = [];

  // Risk of bias (if available)
  if (results.meanRoB && results.meanRoB > 0.5) {
    certainty -= 1;
    reasons.push('Risk of bias concerns');
  }

  // Inconsistency
  if ((results.i2 || 0) > 50) {
    certainty -= 1;
    reasons.push('Inconsistency (I² > 50%)');
  }

  // Imprecision
  const ci = results.random?.ci || results.ci || [0, 0];
  const ciWidth = Math.abs(ci[1] - ci[0]);
  if (ciWidth > 0.5 || (results.k || 0) < 5) {
    certainty -= 1;
    reasons.push('Imprecision');
  }

  // Publication bias
  if (results.eggerP && results.eggerP < 0.1) {
    certainty -= 1;
    reasons.push('Suspected publication bias');
  }

  const levels = ['VERY LOW', 'LOW', 'MODERATE', 'HIGH'];
  certainty = Math.max(0, Math.min(3, certainty - 1));

  return {
    level: levels[certainty],
    score: certainty + 1,
    reasons: reasons.length > 0 ? reasons : ['No serious concerns'],
    interpretation: `${levels[certainty]} certainty evidence${reasons.length > 0 ? ` - downgraded for ${reasons.join(', ')}` : ''}`
  };
}

function assessClinicalImpact(effect, rrr, nnt, measure) {
  if (['RR', 'OR', 'HR'].includes(measure)) {
    if (rrr === null) return 'Statistical significance unclear';

    if (rrr < 10) {
      return 'Small effect - clinical significance may be limited';
    } else if (rrr < 25) {
      return 'Moderate effect - likely clinically meaningful';
    } else {
      return 'Large effect - clinically significant';
    }
  }

  // For mean differences, would need MID
  return 'Compare to minimally important difference for this outcome';
}

function identifyLimitations(results) {
  const limitations = [];

  if ((results.k || results.nStudies || 0) < 5) {
    limitations.push('Small number of studies limits precision');
  }

  if ((results.i2 || 0) > 75) {
    limitations.push('Considerable heterogeneity suggests results may not apply uniformly');
  }

  if (results.eggerP && results.eggerP < 0.1) {
    limitations.push('Evidence of funnel plot asymmetry (possible publication bias)');
  }

  if (results.piWarning) {
    limitations.push(results.piWarning);
  }

  if (limitations.length === 0) {
    limitations.push('Standard limitations of meta-analysis apply');
  }

  return limitations;
}

function generateRecommendations(results, significant, context) {
  const recommendations = [];

  if (context === 'clinical') {
    if (significant) {
      recommendations.push('Consider treatment in appropriate patients');
      if ((results.i2 || 0) > 50) {
        recommendations.push('Identify patient subgroups most likely to benefit');
      }
    } else {
      recommendations.push('Current evidence does not support routine use');
      recommendations.push('Consider individual patient factors');
    }
  }

  if ((results.k || results.nStudies || 0) < 10) {
    recommendations.push('Await additional evidence before changing practice');
  }

  return recommendations;
}

// ============================================================================
// RELEVANCE CLASSIFICATION
// ============================================================================

/**
 * Classify study relevance using rule-based scoring
 *
 * @param {Object} study - Study with title and abstract
 * @param {Object} criteria - Review inclusion criteria
 * @returns {Object} Classification with score
 */
export function classifyRelevance(study, criteria) {
  const title = (study.title || '').toLowerCase();
  const abstract = (study.abstract || '').toLowerCase();
  const fullText = `${title} ${abstract}`;

  let score = 50; // Start neutral
  const reasons = [];

  // Required keywords (must have at least one)
  if (criteria.requiredKeywords && criteria.requiredKeywords.length > 0) {
    const found = criteria.requiredKeywords.filter(kw => fullText.includes(kw.toLowerCase()));
    if (found.length === 0) {
      score -= 40;
      reasons.push('Missing required keywords');
    } else {
      score += found.length * 10;
      reasons.push(`Contains ${found.length} required keywords`);
    }
  }

  // Preferred keywords
  if (criteria.preferredKeywords) {
    const found = criteria.preferredKeywords.filter(kw => fullText.includes(kw.toLowerCase()));
    score += found.length * 5;
    if (found.length > 0) {
      reasons.push(`Contains ${found.length} preferred keywords`);
    }
  }

  // Exclusion keywords
  if (criteria.exclusionKeywords) {
    const found = criteria.exclusionKeywords.filter(kw => fullText.includes(kw.toLowerCase()));
    score -= found.length * 20;
    if (found.length > 0) {
      reasons.push(`Contains exclusion terms: ${found.join(', ')}`);
    }
  }

  // Study design filter
  if (criteria.acceptedDesigns) {
    const design = classifyStudyDesign(fullText, fullText).type;
    if (criteria.acceptedDesigns.includes(design)) {
      score += 15;
      reasons.push(`Accepted study design: ${design}`);
    } else {
      score -= 20;
      reasons.push(`Study design may not meet criteria: ${design}`);
    }
  }

  // Title emphasis (keywords in title count more)
  if (criteria.requiredKeywords) {
    const titleMatches = criteria.requiredKeywords.filter(kw => title.includes(kw.toLowerCase()));
    score += titleMatches.length * 5;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Classification
  let classification;
  if (score >= 70) {
    classification = 'include';
  } else if (score >= 40) {
    classification = 'maybe';
  } else {
    classification = 'exclude';
  }

  return {
    score,
    classification,
    confidence: score >= 80 || score <= 20 ? 'high' : 'medium',
    reasons
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  extractPICO,
  detectDuplicates,
  detectAnomalies,
  predictQuality,
  generateInterpretation,
  classifyRelevance
};
