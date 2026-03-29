/**
 * ESC ACS Living Meta-Analysis - Living Review Automation Module
 *
 * Automates evidence surveillance and living systematic review updates:
 * - PubMed/ClinicalTrials.gov monitoring
 * - New study detection
 * - Automatic relevance classification
 * - Evidence change detection
 * - Update scheduling
 *
 * No external AI APIs - uses rule-based classification and statistical methods.
 *
 * @module living-review
 * @version 1.4.0
 * @date 2026-02-24
 */

import { classifyRelevance, extractPICO, detectDuplicates } from './ml-local.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const LIVING_REVIEW_CONFIG = {
  version: "1.4.0",
  checkIntervals: {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000
  },
  maxResultsPerQuery: 100,
  pubmedBaseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/',
  ctgovBaseUrl: 'https://clinicaltrials.gov/api/v2/',
  // Embase/Scopus API (requires institutional API key)
  embaseBaseUrl: 'https://api.elsevier.com/content/search/scopus',
  // Cochrane Central Register of Controlled Trials
  cochraneBaseUrl: 'https://www.cochranelibrary.com/api/v1/',
  // WHO ICTRP
  ictrpBaseUrl: 'https://trialsearch.who.int/api/'
};

// CT.gov strategy presets derived from the validated backup workflow
// in `ctgov-search-strategies_backup_20260114-110157`.
export const CTGOV_STRATEGY_PRESETS = {
  S1: {
    id: 'S1',
    name: 'Condition Only (Maximum Recall)',
    description: 'Broadest condition query; highest sensitivity, lowest precision.',
    expectedRecallPct: 100
  },
  S2: {
    id: 'S2',
    name: 'Interventional Studies',
    description: 'Condition constrained to interventional studies.',
    expectedRecallPct: 100
  },
  S3: {
    id: 'S3',
    name: 'Randomized Allocation Only',
    description: 'Core RCT filter using DesignAllocation randomized.',
    expectedRecallPct: 100
  },
  S4: {
    id: 'S4',
    name: 'Phase 3/4 Studies',
    description: 'Late-phase focus with lower sensitivity.',
    expectedRecallPct: 30
  },
  S5: {
    id: 'S5',
    name: 'Has Posted Results',
    description: 'Trials with posted results; useful for fast extraction.',
    expectedRecallPct: 80
  },
  S6: {
    id: 'S6',
    name: 'Completed Status',
    description: 'Completed studies regardless of allocation.',
    expectedRecallPct: 85
  },
  S7: {
    id: 'S7',
    name: 'Interventional + Completed',
    description: 'Completed interventional studies.',
    expectedRecallPct: 85
  },
  S8: {
    id: 'S8',
    name: 'RCT + Phase 3/4 + Completed',
    description: 'Narrowest high-specificity profile.',
    expectedRecallPct: 30
  },
  S9: {
    id: 'S9',
    name: 'Full-Text RCT Keywords',
    description: 'Free-text randomization and control terms.',
    expectedRecallPct: 70
  },
  S10: {
    id: 'S10',
    name: 'Treatment RCTs Only',
    description: 'Randomized treatment-purpose studies.',
    expectedRecallPct: 90
  }
};

export const ESC_CARDIOLOGY_QUERY_PACK = {
  heart_failure: [
    'heart failure',
    'cardiac failure',
    'left ventricular dysfunction',
    'congestive heart failure',
    'hfref',
    'hfpef',
    'cardiomyopathy'
  ],
  atrial_fibrillation: [
    'atrial fibrillation',
    'atrial flutter',
    'paroxysmal af',
    'persistent af',
    'afib'
  ],
  acute_coronary_syndromes: [
    'acute coronary syndrome',
    'myocardial infarction',
    'stemi',
    'nstemi',
    'unstable angina',
    'heart attack'
  ],
  chronic_coronary_syndromes: [
    'chronic coronary',
    'stable angina',
    'coronary artery disease',
    'ischemic heart disease'
  ],
  valvular_heart_disease: [
    'aortic stenosis',
    'aortic regurgitation',
    'mitral regurgitation',
    'mitral stenosis',
    'tricuspid regurgitation',
    'valvular heart disease'
  ],
  ventricular_arrhythmias: [
    'ventricular tachycardia',
    'ventricular fibrillation',
    'sudden cardiac death',
    'arrhythmia'
  ],
  pulmonary_hypertension: [
    'pulmonary hypertension',
    'pulmonary arterial hypertension',
    'right ventricular failure'
  ],
  peripheral_arterial_disease: [
    'peripheral arterial disease',
    'peripheral artery disease',
    'claudication',
    'critical limb ischemia'
  ],
  cardiovascular_prevention: [
    'primary prevention',
    'secondary prevention',
    'cardiovascular prevention',
    'lipid lowering',
    'blood pressure control',
    'preventive cardiology'
  ],
  cardiomyopathies: [
    'cardiomyopathy',
    'hypertrophic cardiomyopathy',
    'dilated cardiomyopathy',
    'restrictive cardiomyopathy',
    'arrhythmogenic cardiomyopathy'
  ],
  hypertension: [
    'hypertension',
    'high blood pressure',
    'resistant hypertension',
    'hypertensive heart disease'
  ],
  dyslipidaemias: [
    'dyslipidemia',
    'dyslipidaemia',
    'hypercholesterolemia',
    'hyperlipidemia',
    'lipoprotein(a)',
    'apob'
  ],
  diabetes_cardiovascular_disease: [
    'type 2 diabetes',
    'cardiovascular outcomes',
    'diabetic cardiovascular disease',
    'cardiometabolic',
    'glp-1',
    'sglt2'
  ],
  cardio_oncology: [
    'cardio-oncology',
    'cancer therapy related cardiac dysfunction',
    'anthracycline cardiotoxicity',
    'immune checkpoint myocarditis',
    'oncology cardiology'
  ],
  aortic_diseases: [
    'aortic stenosis',
    'aortic aneurysm',
    'aortic dissection',
    'thoracic aorta',
    'aortic disease'
  ],
  pericardial_diseases: [
    'pericarditis',
    'pericardial effusion',
    'constrictive pericarditis',
    'pericardial disease'
  ],
  infective_endocarditis: [
    'infective endocarditis',
    'valve infection',
    'prosthetic valve endocarditis',
    'endocarditis'
  ],
  pulmonary_embolism: [
    'pulmonary embolism',
    'venous thromboembolism',
    'acute pulmonary embolism',
    'intermediate-risk pulmonary embolism'
  ],
  congenital_heart_disease: [
    'congenital heart disease',
    'adult congenital heart disease',
    'tetralogy of fallot',
    'fontan',
    'single ventricle'
  ],
  pregnancy_heart_disease: [
    'pregnancy and heart disease',
    'pregnancy cardiology',
    'peripartum cardiomyopathy',
    'maternal cardiovascular'
  ],
  sports_cardiology: [
    'sports cardiology',
    'athlete heart',
    'exercise cardiology',
    'sudden cardiac death athlete'
  ],
  cardiovascular_intensive_care: [
    'cardiogenic shock',
    'cardiac intensive care',
    'acute heart failure critical care',
    'mechanical circulatory support'
  ]
};

// Empirical strategy performance from:
// - output/recall_summary.csv
// - output/COMPREHENSIVE_REPORT.md
// from ctgov-search-strategies_backup_20260114-110157.
export const CTGOV_STRATEGY_EVIDENCE = {
  S1: { meanRecallPct: 99.0, minRecallPct: 85.7, retentionPct: 100 },
  S2: { meanRecallPct: 99.0, minRecallPct: 85.7, retentionPct: 77 },
  S3: { meanRecallPct: 99.0, minRecallPct: 85.7, retentionPct: 54 },
  S4: { meanRecallPct: 40.3, minRecallPct: 0.0, retentionPct: 16 },
  S5: { meanRecallPct: 61.5, minRecallPct: 0.0, retentionPct: 14 },
  S6: { meanRecallPct: 85.4, minRecallPct: 50.0, retentionPct: 55 },
  S7: { meanRecallPct: 85.4, minRecallPct: 50.0, retentionPct: 43 },
  S8: { meanRecallPct: 37.6, minRecallPct: 0.0, retentionPct: 8 },
  S9: { meanRecallPct: 78.4, minRecallPct: 60.0, retentionPct: 72 },
  S10: { meanRecallPct: 84.8, minRecallPct: 0.0, retentionPct: 36 }
};

export const CTGOV_CONDITION_CHALLENGE_HINTS = {
  // Empirically lower CT.gov API recall in validation backup.
  postoperative_pain: ['S1', 'S3', 'S9', 'S10'],
  stroke: ['S1', 'S3', 'S9', 'S10'],
  covid_19: ['S1', 'S3', 'S9', 'S10'],
  obesity: ['S1', 'S3', 'S5', 'S9', 'S10'],
  cancer: ['S1', 'S2', 'S3', 'S9', 'S10']
};

export const AACT_VALIDATION_REFERENCE = {
  directLookupRecallPct: 100.0,
  // Trials found in AACT but known to be difficult via CT.gov API-only strategy paths.
  knownApiGapNctIds: [
    'NCT01958736',
    'NCT02717715',
    'NCT02735148',
    'NCT04499677',
    'NCT04818320',
    'NCT02067728',
    'NCT03415646',
    'NCT03420703',
    'NCT03756987'
  ]
};

// Landmark NCT IDs from esc_cardiology_search.py in the validated backup.
export const ESC_GUIDELINE_LANDMARK_TRIALS = {
  heart_failure: [
    'NCT03036124', 'NCT03057977', 'NCT03619213', 'NCT03521934', 'NCT03057951',
    'NCT01035255', 'NCT02924727', 'NCT00000560', 'NCT00000516', 'NCT00407446',
    'NCT02861534', 'NCT00000609', 'NCT00232180', 'NCT00000607', 'NCT00271154',
    'NCT03037931', 'NCT03036462'
  ],
  atrial_fibrillation: [
    'NCT00004488', 'NCT00106912', 'NCT01288352', 'NCT00262600', 'NCT00403767',
    'NCT00412984', 'NCT01150474', 'NCT00911508', 'NCT00794053', 'NCT01420393',
    'NCT02039622', 'NCT00129545', 'NCT01182441'
  ],
  acute_coronary_syndromes: [
    'NCT00391872', 'NCT00528411', 'NCT01187134', 'NCT02548650', 'NCT03234114',
    'NCT01305993', 'NCT02079636', 'NCT01764633', 'NCT01663402', 'NCT00469729',
    'NCT00127517', 'NCT00428961', 'NCT00610532'
  ],
  chronic_coronary_syndromes: [
    'NCT00086450', 'NCT01471522', 'NCT01205776', 'NCT00327795',
    'NCT01281774', 'NCT00064207', 'NCT00318890', 'NCT00126360'
  ],
  cardiovascular_prevention: [
    'NCT00000479', 'NCT00000500', 'NCT00000506', 'NCT01764633', 'NCT01663402',
    'NCT00501059', 'NCT02110537', 'NCT00501098', 'NCT00000542', 'NCT00206882', 'NCT00968708'
  ],
  valvular_heart_disease: [
    'NCT00530894', 'NCT00688207', 'NCT01314313', 'NCT02675114',
    'NCT01057173', 'NCT01240902', 'NCT01626079', 'NCT02371512'
  ],
  ventricular_arrhythmias: [
    'NCT00000558', 'NCT00000609', 'NCT00004488', 'NCT00271154', 'NCT01045070', 'NCT02130765'
  ],
  pulmonary_hypertension: [
    'NCT00149487', 'NCT01106014', 'NCT01106742', 'NCT02631980', 'NCT00367770', 'NCT00070590'
  ],
  cardiomyopathies: [
    'NCT04349072', 'NCT03470545', 'NCT01927757', 'NCT03759379'
  ],
  peripheral_arterial_disease: [
    'NCT02504216', 'NCT01145079', 'NCT02312102'
  ],
  hypertension: [
    'NCT00000542', 'NCT00206882', 'NCT00968708'
  ],
  dyslipidaemias: [
    'NCT00000479', 'NCT00000500', 'NCT00000506', 'NCT01764633', 'NCT01663402'
  ],
  diabetes_cardiovascular_disease: [
    'NCT01243424', 'NCT01032629', 'NCT01720446', 'NCT01730534', 'NCT01131676'
  ]
};

export const ESC_GUIDELINE_PROFILES = {
  cardiology: {
    id: 'cardiology',
    label: 'ESC Cardiology',
    description: 'Comprehensive ESC cardiology guideline surveillance profile.',
    defaultSearchTerms: ['cardiovascular', 'cardiac'],
    areaQueryPack: ESC_CARDIOLOGY_QUERY_PACK,
    landmarkTrials: ESC_GUIDELINE_LANDMARK_TRIALS,
    aliases: ['esc', 'esc_cardiology', 'cardio', 'cardiology', 'cardiovascular']
  }
};

// ============================================================================
// SEARCH STRATEGY MANAGEMENT
// ============================================================================

/**
 * Create and store a search strategy for monitoring
 *
 * @param {Object} strategy - Search strategy configuration
 * @returns {Object} Strategy with ID and metadata
 */
export function createSearchStrategy(strategy) {
  const id = `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const searchObjective = strategy.searchObjective || 'balanced'; // 'max_recall' | 'balanced' | 'high_precision'
  const guidelineProfile = normalizeGuidelineProfileKey(
    strategy.guidelineProfile ||
    strategy.aactQuery?.guidelineProfile ||
    strategy.ctgovQuery?.guidelineProfile ||
    'cardiology'
  );
  const ctgovSeed = strategy.ctgovQuery || {};
  const recommendedCtgov = recommendCTGovStrategyBundle({
    condition: ctgovSeed.condition || strategy.condition || strategy.name,
    topic: ctgovSeed.topic || null,
    searchObjective,
    strategyIds: strategy.ctgovStrategyIds,
    primaryStrategyId: strategy.ctgovPrimaryStrategyId
  });
  const ctgovMode = strategy.ctgovMode || 'single';
  const primaryCtgovStrategyId = strategy.ctgovPrimaryStrategyId || recommendedCtgov.primaryStrategyId;
  const ctgovStrategyIds = dedupeStrings(
    strategy.ctgovStrategyIds || recommendedCtgov.strategyIds || [primaryCtgovStrategyId]
  );
  const finalCtgovStrategyIds = ctgovMode === 'multi'
    ? ctgovStrategyIds
    : [primaryCtgovStrategyId];
  const normalizedLandmarkAreas = dedupeStrings(strategy.landmarkGuidelineAreas || [])
    .map(area => normalizeGuidelineAreaKey(area, guidelineProfile))
    .filter(Boolean);
  const inclusionCriteria = sanitizeInclusionCriteria(strategy.inclusionCriteria || strategy);

  const ctgovQuery = strategy.ctgovQuery
    ? { ...strategy.ctgovQuery, guidelineProfile }
    : null;
  const aactQuery = strategy.aactQuery
    ? { ...strategy.aactQuery, guidelineProfile }
    : null;

  return {
    id,
    name: strategy.name || 'Unnamed Strategy',
    created: new Date().toISOString(),
    lastRun: null,
    guidelineProfile,
    sources: strategy.sources || ['pubmed', 'ctgov'],
    searchObjective,
    queries: {
      pubmed: strategy.pubmedQuery || null,
      ctgov: ctgovQuery,
      embase: strategy.embaseQuery || null,
      cochrane: strategy.cochraneQuery || null,
      aact: aactQuery
    },
    ctgovStrategy: {
      mode: ctgovMode, // 'single' | 'multi'
      primaryStrategyId: primaryCtgovStrategyId,
      strategyIds: finalCtgovStrategyIds,
      strategyEvidence: recommendedCtgov.evidence,
      strategyRationale: recommendedCtgov.rationale,
      includeStatusFilter: strategy.ctgovIncludeStatusFilter !== false
    },
    infrastructure: {
      aactGatewayUrl: strategy.aactGatewayUrl || strategy.infrastructure?.aactGatewayUrl || null,
      embaseApiKey: strategy.embaseApiKey || strategy.infrastructure?.embaseApiKey || null
    },
    filters: {
      dateRange: strategy.dateRange || { from: null, to: null },
      studyTypes: strategy.studyTypes || ['RCT'],
      languages: strategy.languages || ['en'],
      humans: strategy.humans !== false,
      ctgovStatuses: strategy.ctgovStatuses || ['COMPLETED', 'ACTIVE_NOT_RECRUITING', 'RECRUITING']
    },
    inclusionCriteria,
    qualityTargets: {
      minCtgovRecallPct: strategy.minCtgovRecallPct || 90,
      requireAACTForFinalReview: strategy.requireAACTForFinalReview ?? false,
      requireAACTIncrementalCapture: strategy.requireAACTIncrementalCapture ?? false,
      minAACTIncrementalNcts: strategy.minAACTIncrementalNcts ?? 1,
      enforceLandmarkCoverage: strategy.enforceLandmarkCoverage ?? false,
      minLandmarkCoveragePct: strategy.minLandmarkCoveragePct ?? 70,
      landmarkGuidelineAreas: normalizedLandmarkAreas,
      minSourcesForHighConfidence: strategy.minSourcesForHighConfidence || 2
    },
    schedule: {
      enabled: strategy.scheduleEnabled || false,
      interval: strategy.interval || 'weekly',
      lastCheck: null,
      nextCheck: null
    },
    stats: {
      totalRuns: 0,
      totalFound: 0,
      totalIncluded: 0,
      totalExcluded: 0
    }
  };
}

/**
 * Build PubMed query from structured criteria
 *
 * @param {Object} criteria - Search criteria
 * @returns {string} PubMed query string
 */
export function buildPubMedQuery(criteria) {
  const parts = [];

  // Main topic terms
  if (criteria.topic) {
    parts.push(`(${criteria.topic}[Title/Abstract])`);
  }

  // Population terms
  if (criteria.population && criteria.population.length > 0) {
    const popTerms = criteria.population.map(p => `${p}[MeSH Terms] OR ${p}[Title/Abstract]`);
    parts.push(`(${popTerms.join(' OR ')})`);
  }

  // Intervention terms
  if (criteria.interventions && criteria.interventions.length > 0) {
    const intTerms = criteria.interventions.map(i => `${i}[MeSH Terms] OR ${i}[Title/Abstract]`);
    parts.push(`(${intTerms.join(' OR ')})`);
  }

  // Comparator terms
  if (criteria.comparators && criteria.comparators.length > 0) {
    const compTerms = criteria.comparators.map(c => `${c}[Title/Abstract]`);
    parts.push(`(${compTerms.join(' OR ')})`);
  }

  // Outcome terms
  if (criteria.outcomes && criteria.outcomes.length > 0) {
    const outTerms = criteria.outcomes.map(o => `${o}[Title/Abstract]`);
    parts.push(`(${outTerms.join(' OR ')})`);
  }

  // Study type filter
  if (criteria.studyTypes && criteria.studyTypes.includes('RCT')) {
    parts.push('(randomized controlled trial[pt] OR randomized[tiab] OR randomised[tiab])');
  }

  // Humans filter
  if (criteria.humans !== false) {
    parts.push('humans[MeSH Terms]');
  }

  // Date filter
  if (criteria.dateFrom) {
    const dateStr = criteria.dateFrom.replace(/-/g, '/');
    parts.push(`"${dateStr}"[Date - Publication] : "3000"[Date - Publication]`);
  }

  return parts.join(' AND ');
}

function normalizeStatusFilter(status) {
  if (!status) return [];
  if (Array.isArray(status)) return status.filter(Boolean);
  if (typeof status === 'string') {
    return status.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function dedupeStrings(values = []) {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))];
}

function toSafeLikeTerm(term) {
  return String(term || '').trim().toLowerCase().replace(/[%_]/g, '');
}

function normalizeConditionKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function normalizeGuidelineProfileKey(value) {
  if (!value) return 'cardiology';
  const key = normalizeConditionKey(value);
  const aliases = {
    esc: 'cardiology',
    esc_cardiology: 'cardiology',
    cardio: 'cardiology',
    cardiology: 'cardiology',
    cardiovascular: 'cardiology'
  };
  return aliases[key] || key;
}

function getGuidelineProfile(profileKey = 'cardiology') {
  const key = normalizeGuidelineProfileKey(profileKey);
  return ESC_GUIDELINE_PROFILES[key] || ESC_GUIDELINE_PROFILES.cardiology;
}

function normalizeGuidelineAreaKey(value, profileKey = 'cardiology') {
  const key = normalizeConditionKey(value);
  const profile = getGuidelineProfile(profileKey);
  const profileAreas = profile?.areaQueryPack || {};
  const aliases = {
    cv_prevention: 'cardiovascular_prevention',
    cardiovascular_prevention: 'cardiovascular_prevention',
    prevention: 'cardiovascular_prevention',
    acute_coronary_syndrome: 'acute_coronary_syndromes',
    acute_coronary_syndromes: 'acute_coronary_syndromes',
    acs: 'acute_coronary_syndromes',
    chronic_coronary_syndrome: 'chronic_coronary_syndromes',
    chronic_coronary_syndromes: 'chronic_coronary_syndromes',
    ccs: 'chronic_coronary_syndromes',
    peripheral_arterial_disease: 'peripheral_arterial_disease',
    peripheral_artery_disease: 'peripheral_arterial_disease',
    pad: 'peripheral_arterial_disease',
    valvular_heart_disease: 'valvular_heart_disease',
    ventricular_arrhythmia: 'ventricular_arrhythmias',
    ventricular_arrhythmias: 'ventricular_arrhythmias',
    pulmonary_hypertension: 'pulmonary_hypertension',
    cardiomyopathy: 'cardiomyopathies',
    cardiomyopathies: 'cardiomyopathies',
    dyslipidemia: 'dyslipidaemias',
    dyslipidemias: 'dyslipidaemias',
    dyslipidaemia: 'dyslipidaemias',
    dyslipidaemias: 'dyslipidaemias',
    pe: 'pulmonary_embolism',
    pulmonary_thromboembolism: 'pulmonary_embolism',
    achd: 'congenital_heart_disease',
    adult_congenital_heart_disease: 'congenital_heart_disease'
  };

  const normalized = aliases[key] || key;
  if (profileAreas[normalized]) return normalized;
  return normalized;
}

function normalizeNctId(value) {
  const v = String(value || '').trim().toUpperCase();
  return /^NCT\d{8}$/.test(v) ? v : null;
}

function collectNctIds(studies = []) {
  const ids = [];
  for (const study of studies) {
    const rawId = study?.nctId || study?.nct_id || study?.id || study?.NCT_ID || '';
    const normalized = normalizeNctId(rawId);
    if (normalized) ids.push(normalized);
  }
  return dedupeStrings(ids);
}

function resolveGuidelineAreaKeys(input, profileKey = 'cardiology') {
  const values = Array.isArray(input) ? input : [input];
  return dedupeStrings(values.map(v => normalizeGuidelineAreaKey(v, profileKey))).filter(Boolean);
}

function getGuidelineAreaTerms(areaKey, profileKey = 'cardiology') {
  const profile = getGuidelineProfile(profileKey);
  const normalizedArea = normalizeGuidelineAreaKey(areaKey, profile.id);
  const profileTerms = profile.areaQueryPack?.[normalizedArea] || [];
  // Keep legacy cardiology pack in the merge for strict backward compatibility.
  const legacyTerms = ESC_CARDIOLOGY_QUERY_PACK[normalizedArea] || [];
  return dedupeStrings([...profileTerms, ...legacyTerms]);
}

function getGuidelineLandmarkTrials(areaKey, profileKey = 'cardiology') {
  const profile = getGuidelineProfile(profileKey);
  const normalizedArea = normalizeGuidelineAreaKey(areaKey, profile.id);
  const profileTrials = profile.landmarkTrials?.[normalizedArea] || [];
  const legacyTrials = ESC_GUIDELINE_LANDMARK_TRIALS[normalizedArea] || [];
  return dedupeStrings([...profileTrials, ...legacyTrials]);
}

function getDefaultLandmarkAreaKeys(profileKey = 'cardiology') {
  const profile = getGuidelineProfile(profileKey);
  const profileAreas = Object.keys(profile.landmarkTrials || {});
  const legacyAreas = Object.keys(ESC_GUIDELINE_LANDMARK_TRIALS);
  return dedupeStrings([...profileAreas, ...legacyAreas]).filter(area =>
    getGuidelineLandmarkTrials(area, profile.id).length > 0
  );
}

function sanitizeInclusionCriteria(criteria = {}) {
  return {
    requiredKeywords: Array.isArray(criteria.requiredKeywords) ? criteria.requiredKeywords : [],
    preferredKeywords: Array.isArray(criteria.preferredKeywords) ? criteria.preferredKeywords : [],
    exclusionKeywords: Array.isArray(criteria.exclusionKeywords) ? criteria.exclusionKeywords : [],
    acceptedDesigns: Array.isArray(criteria.acceptedDesigns) && criteria.acceptedDesigns.length > 0
      ? criteria.acceptedDesigns
      : ['RCT', 'Observational']
  };
}

function normalizeStudyUniverseId(study = {}, fallbackIndex = 0) {
  const nctId = normalizeNctId(study.nctId || study.nct_id || study.id || study.NCT_ID || '');
  if (nctId) return nctId;

  const title = String(study.title || study.briefTitle || '').trim().toLowerCase();
  const year = String(study.year || study.startDate || study.start_date || '').slice(0, 4);
  if (title) return `TITLE:${title}|${year || 'na'}`;
  return `STUDY:${fallbackIndex + 1}`;
}

/**
 * Recommend CT.gov strategy bundle from objective + challenge hints.
 *
 * @param {Object} criteria - { condition, topic, searchObjective, strategyIds }
 * @param {Object} options - { strategyIds, primaryStrategyId, searchObjective }
 * @returns {Object} Recommended strategy bundle + evidence summary
 */
export function recommendCTGovStrategyBundle(criteria = {}, options = {}) {
  const objective = options.searchObjective || criteria.searchObjective || 'balanced';
  const explicitStrategyIds = dedupeStrings(options.strategyIds || criteria.strategyIds || []);
  const conditionKey = normalizeConditionKey(criteria.condition || criteria.topic || '');
  const challengeBundle = CTGOV_CONDITION_CHALLENGE_HINTS[conditionKey] || null;

  const objectiveDefaults = {
    max_recall: ['S1', 'S2', 'S3', 'S9', 'S10'],
    balanced: ['S3', 'S6', 'S10'],
    high_precision: ['S3', 'S8', 'S10']
  };

  let strategyIds = explicitStrategyIds;
  if (strategyIds.length === 0) {
    strategyIds = challengeBundle || objectiveDefaults[objective] || objectiveDefaults.balanced;
  }
  if (challengeBundle && objective !== 'high_precision') {
    strategyIds = dedupeStrings([...strategyIds, ...challengeBundle]);
  }
  strategyIds = dedupeStrings(strategyIds).filter(id => !!CTGOV_STRATEGY_PRESETS[id]);

  if (strategyIds.length === 0) {
    strategyIds = ['S3', 'S10'];
  }

  const primaryStrategyId = options.primaryStrategyId ||
    criteria.primaryStrategyId ||
    strategyIds[0];

  const evidence = strategyIds.map(id => ({
    strategyId: id,
    preset: CTGOV_STRATEGY_PRESETS[id]?.name || id,
    meanRecallPct: CTGOV_STRATEGY_EVIDENCE[id]?.meanRecallPct ?? null,
    minRecallPct: CTGOV_STRATEGY_EVIDENCE[id]?.minRecallPct ?? null,
    retentionPct: CTGOV_STRATEGY_EVIDENCE[id]?.retentionPct ?? null
  }));

  const recallValues = evidence.map(e => e.meanRecallPct).filter(v => typeof v === 'number');
  const floorValues = evidence.map(e => e.minRecallPct).filter(v => typeof v === 'number');
  const estimatedMeanRecallPct = recallValues.length > 0
    ? Number((recallValues.reduce((sum, v) => sum + v, 0) / recallValues.length).toFixed(1))
    : null;
  const conservativeRecallFloorPct = floorValues.length > 0
    ? Number(Math.max(...floorValues).toFixed(1))
    : null;

  const rationale = [];
  if (explicitStrategyIds.length > 0) {
    rationale.push('User-specified CT.gov strategy IDs were preserved.');
  } else {
    rationale.push(`Objective "${objective}" selected default strategy bundle.`);
  }
  if (challengeBundle) {
    rationale.push(`Condition "${conditionKey}" matched challenge hints from validation backup.`);
  }

  return {
    objective,
    primaryStrategyId,
    strategyIds,
    conditionKey: conditionKey || null,
    estimatedMeanRecallPct,
    conservativeRecallFloorPct,
    rationale,
    evidence
  };
}

/**
 * Assess landmark-trial coverage for selected ESC guideline areas.
 *
 * @param {Array<Object>} studies - Trial records (must include NCT IDs)
 * @param {Object} options - { guidelineAreas, guidelineProfile, minCoveragePct }
 * @returns {Object} Landmark coverage report
 */
export function assessESCLandmarkCoverage(studies = [], options = {}) {
  const guidelineProfile = normalizeGuidelineProfileKey(options.guidelineProfile || 'cardiology');
  const nctSet = new Set(collectNctIds(studies));
  const requestedAreas = resolveGuidelineAreaKeys(options.guidelineAreas, guidelineProfile);
  const areaKeys = requestedAreas.length > 0
    ? requestedAreas
    : getDefaultLandmarkAreaKeys(guidelineProfile);
  const minCoveragePct = Number(options.minCoveragePct ?? 0);

  const perArea = {};
  let totalExpected = 0;
  let totalFound = 0;

  for (const area of areaKeys) {
    const expected = getGuidelineLandmarkTrials(area, guidelineProfile);
    const found = expected.filter(id => nctSet.has(id));
    const missing = expected.filter(id => !nctSet.has(id));
    const coveragePct = expected.length > 0 ? (found.length / expected.length) * 100 : 100;

    totalExpected += expected.length;
    totalFound += found.length;

    perArea[area] = {
      expected: expected.length,
      found: found.length,
      missing: missing.length,
      coveragePct: Number(coveragePct.toFixed(1)),
      foundNctIds: found,
      missingNctIds: missing
    };
  }

  const overallCoveragePct = totalExpected > 0 ? (totalFound / totalExpected) * 100 : 100;

  return {
    decision: overallCoveragePct >= minCoveragePct ? 'PASS' : 'FLAG',
    guidelineProfile,
    overallCoveragePct: Number(overallCoveragePct.toFixed(1)),
    totalExpected,
    totalFound,
    minCoveragePct,
    areas: perArea
  };
}

/**
 * Build CT.gov query parameters using validated strategy presets (S1-S10).
 *
 * @param {Object} criteria - Search criteria ({ condition, intervention, status })
 * @param {string} presetId - Strategy ID (S1-S10)
 * @param {Object} options - { pageSize, pageToken }
 * @returns {Object} { presetId, preset, params, queryString }
 */
export function buildCTGovQueryFromPreset(criteria = {}, presetId = 'S3', options = {}) {
  const preset = CTGOV_STRATEGY_PRESETS[presetId] || CTGOV_STRATEGY_PRESETS.S3;
  const condition = String(criteria.condition || criteria.topic || '').trim();
  const intervention = String(criteria.intervention || '').trim();
  const statusFilter = normalizeStatusFilter(criteria.status);
  const pageSize = Math.max(1, Math.min(Number(options.pageSize || criteria.pageSize || 100), 1000));

  const params = new URLSearchParams();
  params.append('format', 'json');
  params.append('pageSize', String(pageSize));
  if (options.pageToken || criteria.pageToken) {
    params.append('pageToken', options.pageToken || criteria.pageToken);
  }

  switch (preset.id) {
    case 'S1':
      if (condition) params.append('query.cond', condition);
      break;
    case 'S2':
      if (condition) params.append('query.cond', condition);
      params.append('query.term', 'AREA[StudyType]INTERVENTIONAL');
      break;
    case 'S3':
      if (condition) params.append('query.cond', condition);
      params.append('query.term', 'AREA[DesignAllocation]RANDOMIZED');
      break;
    case 'S4':
      if (condition) params.append('query.cond', condition);
      params.append('query.term', 'AREA[Phase](PHASE3 OR PHASE4)');
      break;
    case 'S5':
      if (condition) params.append('query.cond', condition);
      params.append('query.term', 'AREA[ResultsFirstPostDate]RANGE[MIN,MAX]');
      break;
    case 'S6':
      if (condition) params.append('query.cond', condition);
      params.append('filter.overallStatus', 'COMPLETED');
      break;
    case 'S7':
      if (condition) params.append('query.cond', condition);
      params.append('query.term', 'AREA[StudyType]INTERVENTIONAL');
      params.append('filter.overallStatus', 'COMPLETED');
      break;
    case 'S8':
      if (condition) params.append('query.cond', condition);
      params.append('query.term', 'AREA[DesignAllocation]RANDOMIZED AND AREA[Phase](PHASE3 OR PHASE4)');
      params.append('filter.overallStatus', 'COMPLETED');
      break;
    case 'S9':
      if (condition) {
        params.append('query.term', `${condition} AND randomized AND controlled`);
      }
      break;
    case 'S10':
      if (condition) params.append('query.cond', condition);
      params.append('query.term', 'AREA[DesignAllocation]RANDOMIZED AND AREA[DesignPrimaryPurpose]TREATMENT');
      break;
    default:
      if (condition) params.append('query.cond', condition);
      params.append('query.term', 'AREA[DesignAllocation]RANDOMIZED');
      break;
  }

  if (intervention && !params.has('query.intr')) {
    params.append('query.intr', intervention);
  }

  if (statusFilter.length > 0 && !params.has('filter.overallStatus')) {
    params.append('filter.overallStatus', statusFilter.join(','));
  }

  return {
    presetId: preset.id,
    preset,
    params,
    queryString: params.toString()
  };
}

/**
 * Build AACT SQL query payload for ESC-guideline-aligned retrieval.
 *
 * @param {Object} criteria - { guidelineProfile, guidelineArea, condition, synonyms, statuses }
 * @param {Object} options - { maxResults, completedOnly, includeResultsOnly }
 * @returns {Object} SQL payload with parameterized placeholders
 */
export function buildAACTSQLQuery(criteria = {}, options = {}) {
  const maxResults = Math.max(1, Number(options.maxResults || criteria.maxResults || 1000));
  const completedOnly = options.completedOnly ?? criteria.completedOnly ?? false;
  const includeResultsOnly = options.includeResultsOnly ?? criteria.includeResultsOnly ?? false;
  const useAreaTerms = options.useAreaTerms ?? criteria.useAreaTerms ?? true;
  const enforceInterventional = options.enforceInterventional ?? criteria.enforceInterventional ?? true;
  const enforceRandomized = options.enforceRandomized ?? criteria.enforceRandomized ?? true;
  const guidelineProfile = normalizeGuidelineProfileKey(
    criteria.guidelineProfile ||
    options.guidelineProfile ||
    'cardiology'
  );
  const profile = getGuidelineProfile(guidelineProfile);
  const statusList = normalizeStatusFilter(criteria.status || options.status);
  const explicitNctIds = dedupeStrings([
    ...(Array.isArray(criteria.nctIds) ? criteria.nctIds : []),
    ...(Array.isArray(options.nctIds) ? options.nctIds : [])
  ]).map(normalizeNctId).filter(Boolean);

  const areaKey = normalizeGuidelineAreaKey(criteria.guidelineArea || '', guidelineProfile);
  const areaTerms = useAreaTerms ? getGuidelineAreaTerms(areaKey, guidelineProfile) : [];
  const conditionTerms = dedupeStrings([
    criteria.condition,
    ...(criteria.synonyms || []),
    ...(Array.isArray(criteria.terms) ? criteria.terms : []),
    ...(Array.isArray(criteria.additionalTerms) ? criteria.additionalTerms : []),
    ...(Array.isArray(options.additionalTerms) ? options.additionalTerms : [])
  ]);
  const terms = dedupeStrings([...areaTerms, ...conditionTerms]);

  const activeTerms = explicitNctIds.length > 0
    ? []
    : (terms.length > 0 ? terms : (profile.defaultSearchTerms || ['cardiovascular']));
  const whereClauses = [];
  const params = [];
  let paramIndex = 1;

  if (explicitNctIds.length > 0) {
    const placeholders = explicitNctIds.map(id => {
      params.push(id);
      return `$${paramIndex++}`;
    });
    whereClauses.push(`s.nct_id IN (${placeholders.join(', ')})`);
  } else {
    const conditionClauses = activeTerms.map(term => {
      params.push(`%${toSafeLikeTerm(term)}%`);
      return `LOWER(c.name) LIKE $${paramIndex++}`;
    });
    whereClauses.push(`(${conditionClauses.join(' OR ')})`);
  }

  if (enforceInterventional) {
    whereClauses.push(`UPPER(s.study_type) = 'INTERVENTIONAL'`);
  }
  if (enforceRandomized) {
    whereClauses.push(`LOWER(d.allocation) = 'randomized'`);
  }

  if (completedOnly) {
    whereClauses.push(`UPPER(s.overall_status) = 'COMPLETED'`);
  } else if (statusList.length > 0) {
    const statusPlaceholders = statusList.map(status => {
      params.push(String(status).toUpperCase());
      return `$${paramIndex++}`;
    });
    whereClauses.push(`UPPER(s.overall_status) IN (${statusPlaceholders.join(', ')})`);
  }

  if (includeResultsOnly) {
    whereClauses.push(`EXISTS (SELECT 1 FROM ctgov.reported_events re WHERE re.nct_id = s.nct_id)`);
  }

  params.push(maxResults);
  const sql = `
SELECT DISTINCT
  s.nct_id,
  s.brief_title,
  s.official_title,
  s.overall_status,
  s.phase,
  s.study_type,
  s.enrollment,
  s.start_date,
  s.completion_date,
  d.allocation,
  d.primary_purpose
FROM ctgov.studies s
LEFT JOIN ctgov.conditions c ON s.nct_id = c.nct_id
LEFT JOIN ctgov.designs d ON s.nct_id = d.nct_id
WHERE ${whereClauses.join('\n  AND ')}
ORDER BY s.nct_id
LIMIT $${paramIndex};
  `.trim();

  return {
    sql,
    parameters: params,
    termsUsed: activeTerms,
    nctIds: explicitNctIds,
    useAreaTerms,
    enforceInterventional,
    enforceRandomized,
    guidelineProfile,
    guidelineArea: areaKey || null
  };
}

// ============================================================================
// PUBMED SEARCH
// ============================================================================

/**
 * Search PubMed for new studies
 *
 * @param {string} query - PubMed query string
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchPubMed(query, options = {}) {
  const {
    maxResults = 100,
    dateFrom = null,
    dateTo = null,
    sortBy = 'date' // 'date' or 'relevance'
  } = options;

  // Build ESearch URL
  const esearchParams = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: maxResults,
    sort: sortBy === 'date' ? 'pub+date' : 'relevance',
    retmode: 'json',
    usehistory: 'y'
  });

  if (dateFrom) {
    esearchParams.append('mindate', dateFrom.replace(/-/g, '/'));
  }
  if (dateTo) {
    esearchParams.append('maxdate', dateTo.replace(/-/g, '/'));
  }

  try {
    // Step 1: Search to get PMIDs
    const searchResponse = await fetch(
      `${LIVING_REVIEW_CONFIG.pubmedBaseUrl}esearch.fcgi?${esearchParams}`
    );

    if (!searchResponse.ok) {
      throw new Error(`PubMed search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const pmids = searchData.esearchresult?.idlist || [];

    if (pmids.length === 0) {
      return { count: 0, studies: [], query };
    }

    // Step 2: Fetch details for PMIDs
    const efetchParams = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'xml',
      rettype: 'abstract'
    });

    const fetchResponse = await fetch(
      `${LIVING_REVIEW_CONFIG.pubmedBaseUrl}efetch.fcgi?${efetchParams}`
    );

    if (!fetchResponse.ok) {
      throw new Error(`PubMed fetch failed: ${fetchResponse.status}`);
    }

    const xmlText = await fetchResponse.text();
    const studies = parsePubMedXML(xmlText);

    return {
      count: parseInt(searchData.esearchresult?.count || 0),
      retrieved: studies.length,
      studies,
      query,
      webEnv: searchData.esearchresult?.webenv,
      queryKey: searchData.esearchresult?.querykey
    };
  } catch (error) {
    console.error('PubMed search error:', error);
    return { error: error.message, query, count: 0, studies: [] };
  }
}

/**
 * Parse PubMed XML response to structured data
 */
function parsePubMedXML(xml) {
  const studies = [];

  // Simple XML parsing (browser-compatible)
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const articles = doc.querySelectorAll('PubmedArticle');

  articles.forEach(article => {
    try {
      const medlineCitation = article.querySelector('MedlineCitation');
      const articleData = medlineCitation?.querySelector('Article');

      // Extract basic info
      const pmid = medlineCitation?.querySelector('PMID')?.textContent;
      const title = articleData?.querySelector('ArticleTitle')?.textContent;

      // Extract abstract
      const abstractTexts = articleData?.querySelectorAll('AbstractText');
      let abstract = '';
      abstractTexts?.forEach(at => {
        const label = at.getAttribute('Label');
        const text = at.textContent;
        if (label) {
          abstract += `${label}: ${text} `;
        } else {
          abstract += text + ' ';
        }
      });

      // Extract authors
      const authorList = articleData?.querySelectorAll('Author');
      const authors = [];
      authorList?.forEach(author => {
        const lastName = author.querySelector('LastName')?.textContent;
        const initials = author.querySelector('Initials')?.textContent;
        if (lastName) {
          authors.push(`${lastName} ${initials || ''}`);
        }
      });

      // Extract publication date
      const pubDate = articleData?.querySelector('Journal ArticleDate') ||
                      articleData?.querySelector('Journal JournalIssue PubDate');
      const year = pubDate?.querySelector('Year')?.textContent;
      const month = pubDate?.querySelector('Month')?.textContent;

      // Extract journal
      const journal = articleData?.querySelector('Journal Title')?.textContent;

      // Extract DOI
      const articleIds = article.querySelectorAll('ArticleId');
      let doi = null;
      articleIds.forEach(id => {
        if (id.getAttribute('IdType') === 'doi') {
          doi = id.textContent;
        }
      });

      // Extract publication types
      const pubTypes = [];
      articleData?.querySelectorAll('PublicationType')?.forEach(pt => {
        pubTypes.push(pt.textContent);
      });

      // Extract MeSH terms
      const meshTerms = [];
      medlineCitation?.querySelectorAll('MeshHeading DescriptorName')?.forEach(mesh => {
        meshTerms.push(mesh.textContent);
      });

      studies.push({
        pmid,
        title: title?.trim(),
        abstract: abstract?.trim(),
        authors: authors.join(', '),
        authorList: authors,
        year: year ? parseInt(year) : null,
        month,
        journal,
        doi,
        publicationTypes: pubTypes,
        meshTerms,
        source: 'pubmed',
        retrievedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Error parsing article:', e);
    }
  });

  return studies;
}

// ============================================================================
// CLINICALTRIALS.GOV SEARCH
// ============================================================================

/**
 * Search ClinicalTrials.gov for studies
 *
 * @param {Object} criteria - Search criteria
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchClinicalTrials(criteria, options = {}) {
  const {
    maxResults = 100,
    status = ['COMPLETED', 'ACTIVE_NOT_RECRUITING', 'RECRUITING'],
    strategyId = criteria.strategyId || null,
    maxPages = 20
  } = options;

  try {
    const targetResults = Math.max(1, Number(maxResults || 100));
    const maxPageCount = Math.max(1, Number(maxPages || 20));
    const allStudies = [];
    let totalCount = 0;
    let nextPageToken = criteria.pageToken || null;
    let firstQueryUrl = null;
    let lastQueryUrl = null;
    let pagesFetched = 0;
    let strategyMeta = null;

    while (allStudies.length < targetResults && pagesFetched < maxPageCount) {
      const pageSize = Math.min(targetResults - allStudies.length, 1000);
      let params = null;

      if (strategyId) {
        const built = buildCTGovQueryFromPreset(
          { ...criteria, status, pageToken: nextPageToken },
          strategyId,
          { pageSize, pageToken: nextPageToken }
        );
        params = built.params;
        if (!strategyMeta) {
          strategyMeta = {
            id: built.presetId,
            name: built.preset.name,
            expectedRecallPct: built.preset.expectedRecallPct
          };
        }
      } else {
        // Legacy/default CT.gov query mode
        params = new URLSearchParams({
          format: 'json',
          pageSize: Math.min(pageSize, 1000)
        });

        if (nextPageToken) {
          params.append('pageToken', nextPageToken);
        }

        // Condition/disease
        if (criteria.condition) {
          params.append('query.cond', criteria.condition);
        }

        // Intervention
        if (criteria.intervention) {
          params.append('query.intr', criteria.intervention);
        }

        // Study type
        if (criteria.studyType) {
          params.append('filter.studyType', criteria.studyType);
        }

        // Status filter
        const statuses = normalizeStatusFilter(status);
        if (statuses.length > 0) {
          params.append('filter.overallStatus', statuses.join(','));
        }

        // Results posted filter
        if (criteria.hasResults) {
          params.append('filter.resultsFirstSubmitDate', 'MIN,MAX');
        }
      }

      const requestUrl = `${LIVING_REVIEW_CONFIG.ctgovBaseUrl}studies?${params}`;
      if (!firstQueryUrl) firstQueryUrl = requestUrl;
      lastQueryUrl = requestUrl;

      const response = await fetch(requestUrl);
      if (!response.ok) {
        throw new Error(`ClinicalTrials.gov search failed: ${response.status}`);
      }

      const data = await response.json();
      if (!totalCount) {
        totalCount = Number(data.totalCount || 0);
      }

      const pageStudies = (data.studies || []).map(parseCTGovStudy);
      allStudies.push(...pageStudies);
      nextPageToken = data.nextPageToken || null;
      pagesFetched += 1;

      if (!nextPageToken || pageStudies.length === 0) {
        break;
      }
    }

    return {
      count: totalCount || allStudies.length,
      studies: allStudies.slice(0, targetResults),
      nextPageToken,
      pagesFetched,
      strategy: strategyMeta,
      queryUrl: firstQueryUrl,
      lastQueryUrl
    };
  } catch (error) {
    console.error('ClinicalTrials.gov search error:', error);
    return { error: error.message, count: 0, studies: [] };
  }
}

/**
 * Parse ClinicalTrials.gov study to structured format
 */
function parseCTGovStudy(study) {
  const protocol = study.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const description = protocol.descriptionModule || {};
  const status = protocol.statusModule || {};
  const design = protocol.designModule || {};
  const arms = protocol.armsInterventionsModule || {};
  const outcomes = protocol.outcomesModule || {};
  const eligibility = protocol.eligibilityModule || {};
  const contacts = protocol.contactsLocationsModule || {};

  return {
    nctId: identification.nctId,
    title: identification.officialTitle || identification.briefTitle,
    briefSummary: description.briefSummary,
    detailedDescription: description.detailedDescription,
    status: status.overallStatus,
    startDate: status.startDateStruct?.date,
    completionDate: status.completionDateStruct?.date,
    studyType: design.studyType,
    phases: design.phases || [],
    enrollment: design.enrollmentInfo?.count,
    interventions: (arms.interventions || []).map(i => ({
      type: i.type,
      name: i.name,
      description: i.description
    })),
    primaryOutcomes: (outcomes.primaryOutcomes || []).map(o => ({
      measure: o.measure,
      timeFrame: o.timeFrame
    })),
    eligibilityCriteria: eligibility.eligibilityCriteria,
    locations: (contacts.locations || []).map(l => ({
      facility: l.facility,
      city: l.city,
      country: l.country
    })),
    source: 'clinicaltrials.gov',
    retrievedAt: new Date().toISOString()
  };
}

/**
 * Execute multiple validated CT.gov strategy profiles and deduplicate by NCT ID.
 *
 * @param {Object} criteria - CT.gov criteria ({ condition, intervention, status })
 * @param {Object} options - { strategyIds, maxResultsPerStrategy }
 * @returns {Promise<Object>} Combined multi-strategy result
 */
export async function searchClinicalTrialsMultiStrategy(criteria, options = {}) {
  const explicitIds = Array.isArray(options.strategyIds) && options.strategyIds.length > 0
    ? options.strategyIds
    : (Array.isArray(criteria.strategyIds) && criteria.strategyIds.length > 0
      ? criteria.strategyIds
      : []);
  const recommended = recommendCTGovStrategyBundle(criteria, {
    strategyIds: explicitIds.length > 0 ? explicitIds : undefined,
    searchObjective: options.searchObjective || criteria.searchObjective
  });
  let strategyIds = dedupeStrings(
    explicitIds.length > 0 ? explicitIds : recommended.strategyIds
  ).filter(id => !!CTGOV_STRATEGY_PRESETS[id]);
  if (strategyIds.length === 0) {
    strategyIds = ['S1', 'S3', 'S10'];
  }

  const perStrategy = {};
  const byNct = new Map();
  let totalRetrieved = 0;

  const results = await Promise.all(strategyIds.map(async strategyId => {
    const result = await searchClinicalTrials(
      { ...criteria, strategyId },
      {
        ...options,
        strategyId,
        maxResults: Math.max(1, Number(options.maxResultsPerStrategy || options.maxResults || 100)),
        status: options.status || criteria.status
      }
    );
    return { strategyId, result };
  }));

  for (const { strategyId, result } of results) {
    const preset = CTGOV_STRATEGY_PRESETS[strategyId] || null;
    perStrategy[strategyId] = {
      strategyId,
      strategyName: preset?.name || strategyId,
      expectedRecallPct: preset?.expectedRecallPct ?? null,
      observedMeanRecallPct: CTGOV_STRATEGY_EVIDENCE[strategyId]?.meanRecallPct ?? null,
      count: result.count || 0,
      retrieved: result.studies?.length || 0,
      pagesFetched: result.pagesFetched || 0,
      error: result.error || null,
      queryUrl: result.queryUrl || null
    };

    totalRetrieved += result.studies?.length || 0;

    for (const [index, study] of (result.studies || []).entries()) {
      const normalizedNct = normalizeNctId(study.nctId || study.nct_id || study.id);
      const normalizedTitle = String(study.title || '').trim().toLowerCase();
      const key = normalizedNct || (normalizedTitle ? `title:${normalizedTitle}` : `strategy:${strategyId}:${index}`);
      if (!byNct.has(key)) {
        byNct.set(key, {
          ...study,
          nctId: normalizedNct || study.nctId || study.nct_id || null,
          strategyHits: [strategyId]
        });
      } else {
        const existing = byNct.get(key);
        if (!existing.strategyHits.includes(strategyId)) {
          existing.strategyHits.push(strategyId);
        }
      }
    }
  }

  const studies = Array.from(byNct.values());
  const averageHitDepth = studies.length > 0
    ? studies.reduce((sum, s) => sum + (s.strategyHits?.length || 0), 0) / studies.length
    : 0;

  return {
    count: studies.length,
    studies,
    strategyIds,
    recommendation: {
      objective: recommended.objective,
      rationale: recommended.rationale,
      estimatedMeanRecallPct: recommended.estimatedMeanRecallPct,
      conservativeRecallFloorPct: recommended.conservativeRecallFloorPct
    },
    perStrategy,
    summary: {
      totalRetrieved,
      uniqueStudies: studies.length,
      averageHitDepth,
      overlapRate: totalRetrieved > 0 ? 1 - (studies.length / totalRetrieved) : 0
    }
  };
}

function parseAACTStudyRow(row) {
  const nctId = row.nct_id || row.nctId || row.NCT_ID;
  return {
    nctId,
    title: row.brief_title || row.briefTitle || row.official_title || row.officialTitle || '',
    briefSummary: row.brief_summary || row.briefSummary || null,
    status: row.overall_status || row.overallStatus || null,
    startDate: row.start_date || row.startDate || null,
    completionDate: row.completion_date || row.completionDate || null,
    studyType: row.study_type || row.studyType || null,
    phases: row.phase ? [row.phase] : (Array.isArray(row.phases) ? row.phases : []),
    enrollment: row.enrollment || null,
    allocation: row.allocation || null,
    primaryPurpose: row.primary_purpose || row.primaryPurpose || null,
    source: 'aact',
    retrievedAt: new Date().toISOString()
  };
}

/**
 * Query AACT through a secure gateway and return standardized study records.
 *
 * Browser clients should never connect directly to PostgreSQL.
 * Provide an HTTP gateway that executes parameterized SQL server-side.
 *
 * @param {Object} criteria - AACT criteria
 * @param {Object} options - { gatewayUrl, maxResults, status, completedOnly, includeResultsOnly }
 * @returns {Promise<Object>} AACT search result
 */
export async function searchAACT(criteria = {}, options = {}) {
  const gatewayUrl = options.gatewayUrl ||
    criteria.gatewayUrl ||
    (options.useLocalGateway ? 'http://127.0.0.1:8787/aact/query' : null);
  const payload = buildAACTSQLQuery(criteria, options);

  if (!gatewayUrl) {
    return {
      count: 0,
      studies: [],
      requiresGateway: true,
      source: 'aact',
      sql: payload.sql,
      parameters: payload.parameters,
      termsUsed: payload.termsUsed,
      useAreaTerms: payload.useAreaTerms,
      enforceInterventional: payload.enforceInterventional,
      enforceRandomized: payload.enforceRandomized,
      guidelineProfile: payload.guidelineProfile,
      nctIds: payload.nctIds,
      note: 'AACT requires a secure server-side SQL gateway. Configure strategy.infrastructure.aactGatewayUrl.'
    };
  }

  try {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryId: 'esc_aact_rct_search',
        sql: payload.sql,
        parameters: payload.parameters,
        meta: {
          guidelineProfile: payload.guidelineProfile,
          guidelineArea: payload.guidelineArea,
          termsUsed: payload.termsUsed,
          useAreaTerms: payload.useAreaTerms,
          enforceInterventional: payload.enforceInterventional,
          enforceRandomized: payload.enforceRandomized,
          nctIds: payload.nctIds
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AACT gateway request failed: ${response.status}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data?.studies)
      ? data.studies
      : (Array.isArray(data?.rows) ? data.rows : []);
    const studies = rows.map(parseAACTStudyRow).filter(s => s.nctId);

    return {
      count: studies.length,
      studies,
      source: 'aact',
      gatewayUrl,
      sql: payload.sql,
      parameters: payload.parameters,
      termsUsed: payload.termsUsed,
      useAreaTerms: payload.useAreaTerms,
      enforceInterventional: payload.enforceInterventional,
      enforceRandomized: payload.enforceRandomized,
      guidelineProfile: payload.guidelineProfile,
      nctIds: payload.nctIds
    };
  } catch (error) {
    console.error('AACT search error:', error);
    return {
      count: 0,
      studies: [],
      source: 'aact',
      error: error.message,
      gatewayUrl,
      sql: payload.sql,
      parameters: payload.parameters,
      termsUsed: payload.termsUsed,
      useAreaTerms: payload.useAreaTerms,
      enforceInterventional: payload.enforceInterventional,
      enforceRandomized: payload.enforceRandomized,
      guidelineProfile: payload.guidelineProfile,
      nctIds: payload.nctIds
    };
  }
}

// ============================================================================
// EMBASE/SCOPUS SEARCH
// ============================================================================

/**
 * Search Embase via Scopus API for comprehensive literature coverage
 * Reference: Elsevier Scopus Search API documentation
 * Note: Requires institutional API key from Elsevier Developer Portal
 *
 * @param {string} query - Embase query string
 * @param {Object} options - Search options including apiKey
 * @returns {Promise<Object>} Search results
 */
export async function searchEmbase(query, options = {}) {
  const {
    maxResults = 100,
    dateFrom = null,
    dateTo = null,
    apiKey = null,
    institutionToken = null
  } = options;

  if (!apiKey) {
    return {
      error: 'Embase API key required. Register at https://dev.elsevier.com/',
      query,
      count: 0,
      studies: [],
      requiresAuth: true
    };
  }

  // Build Scopus query with Embase content
  let scopusQuery = query;

  // Add date filter
  if (dateFrom) {
    const year = dateFrom.substring(0, 4);
    scopusQuery += ` AND PUBYEAR > ${parseInt(year) - 1}`;
  }

  // Add Embase-specific filter (MEDLINE exclusion to avoid PubMed overlap)
  scopusQuery += ' AND SRCTYPE(j) AND NOT PMID(*)';

  const headers = {
    'X-ELS-APIKey': apiKey,
    'Accept': 'application/json'
  };

  if (institutionToken) {
    headers['X-ELS-Insttoken'] = institutionToken;
  }

  try {
    const params = new URLSearchParams({
      query: scopusQuery,
      count: maxResults,
      start: 0,
      sort: '-coverDate',
      field: 'dc:identifier,dc:title,dc:description,prism:coverDate,prism:publicationName,dc:creator,authkeywords'
    });

    const response = await fetch(
      `${LIVING_REVIEW_CONFIG.embaseBaseUrl}?${params}`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return {
          error: 'Invalid or expired Embase API key',
          query,
          count: 0,
          studies: [],
          authError: true
        };
      }
      throw new Error(`Embase search failed: ${response.status}`);
    }

    const data = await response.json();
    const entries = data['search-results']?.entry || [];
    const totalResults = parseInt(data['search-results']?.['opensearch:totalResults'] || 0);

    const studies = entries.map(entry => parseEmbaseEntry(entry));

    return {
      count: totalResults,
      retrieved: studies.length,
      studies,
      query: scopusQuery,
      source: 'embase'
    };
  } catch (error) {
    console.error('Embase search error:', error);
    return { error: error.message, query, count: 0, studies: [] };
  }
}

/**
 * Parse Embase/Scopus entry to standardized format
 */
function parseEmbaseEntry(entry) {
  const scopusId = entry['dc:identifier']?.replace('SCOPUS_ID:', '');
  const eid = entry.eid;

  return {
    id: scopusId || eid,
    source: 'embase',
    title: entry['dc:title'] || '',
    abstract: entry['dc:description'] || '',
    publicationDate: entry['prism:coverDate'],
    journal: entry['prism:publicationName'],
    authors: parseEmbaseAuthors(entry['dc:creator']),
    keywords: parseEmbaseKeywords(entry.authkeywords),
    doi: entry['prism:doi'],
    scopusId,
    eid,
    retrievedAt: new Date().toISOString()
  };
}

/**
 * Parse Embase author field
 */
function parseEmbaseAuthors(creatorField) {
  if (!creatorField) return [];
  if (typeof creatorField === 'string') return [creatorField];
  if (Array.isArray(creatorField)) return creatorField;
  return [];
}

/**
 * Parse Embase keywords
 */
function parseEmbaseKeywords(keywordsField) {
  if (!keywordsField) return [];
  if (typeof keywordsField === 'string') {
    return keywordsField.split('|').map(k => k.trim());
  }
  return [];
}

/**
 * Build Embase query from structured PICO criteria
 *
 * @param {Object} criteria - PICO criteria
 * @returns {string} Embase/Scopus query string
 */
export function buildEmbaseQuery(criteria) {
  const parts = [];

  // Topic/title terms
  if (criteria.topic) {
    parts.push(`TITLE-ABS-KEY(${criteria.topic})`);
  }

  // Population (Emtree terms preferred)
  if (criteria.population && criteria.population.length > 0) {
    const popTerms = criteria.population.map(p => `"${p}"`).join(' OR ');
    parts.push(`TITLE-ABS-KEY(${popTerms})`);
  }

  // Interventions
  if (criteria.interventions && criteria.interventions.length > 0) {
    const intTerms = criteria.interventions.map(i => `"${i}"`).join(' OR ');
    parts.push(`TITLE-ABS-KEY(${intTerms})`);
  }

  // Outcomes
  if (criteria.outcomes && criteria.outcomes.length > 0) {
    const outTerms = criteria.outcomes.map(o => `"${o}"`).join(' OR ');
    parts.push(`TITLE-ABS-KEY(${outTerms})`);
  }

  // RCT filter (Embase-specific)
  if (criteria.studyTypes && criteria.studyTypes.includes('RCT')) {
    parts.push('(TITLE-ABS-KEY("randomized controlled trial") OR TITLE-ABS-KEY("randomised controlled trial") OR TITLE-ABS-KEY(rct))');
  }

  // Human studies
  if (criteria.humans !== false) {
    parts.push('TITLE-ABS-KEY(human*)');
  }

  return parts.join(' AND ');
}

// ============================================================================
// COCHRANE CENTRAL SEARCH
// ============================================================================

/**
 * Search Cochrane Central Register of Controlled Trials
 * Note: Requires Cochrane Library subscription for full access
 *
 * @param {Object} criteria - Search criteria
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchCochraneCentral(criteria, options = {}) {
  const {
    maxResults = 100,
    apiKey = null
  } = options;

  // Cochrane doesn't have a public API, so we provide a structure for
  // institutional implementations or manual import
  return {
    count: 0,
    studies: [],
    query: buildCochraneQuery(criteria),
    source: 'cochrane-central',
    note: 'Cochrane Central requires institutional access. Export results manually from cochranelibrary.com or use Ovid/EBSCOhost interface.',
    manualSearchUrl: `https://www.cochranelibrary.com/central/search?searchBy=6&searchText=${encodeURIComponent(criteria.topic || '')}&isWordVariations=&resultPerPage=${maxResults}`
  };
}

/**
 * Build Cochrane search query
 */
function buildCochraneQuery(criteria) {
  const parts = [];

  if (criteria.topic) {
    parts.push(`"${criteria.topic}":ti,ab,kw`);
  }

  if (criteria.interventions) {
    parts.push(criteria.interventions.map(i => `"${i}":ti,ab,kw`).join(' OR '));
  }

  return parts.join(' AND ');
}

/**
 * Summarize trial universe before and after PICO/relevance filtering.
 *
 * @param {Array<Object>} studies - Retrieved studies from all sources
 * @param {Object} options - { inclusionCriteria, dedupe, includeMaybe }
 * @returns {Object} Trial-universe report with and without PICO filtering
 */
export function summarizeTrialUniverse(studies = [], options = {}) {
  const inclusionCriteria = sanitizeInclusionCriteria(options.inclusionCriteria || {});
  const dedupe = options.dedupe !== false;
  const includeMaybe = options.includeMaybe !== false;

  const uniqueStudies = [];
  const duplicateStudyIds = [];
  const seenIds = new Set();

  for (let i = 0; i < studies.length; i++) {
    const study = studies[i] || {};
    const studyId = normalizeStudyUniverseId(study, i);
    if (dedupe && seenIds.has(studyId)) {
      duplicateStudyIds.push(studyId);
      continue;
    }
    seenIds.add(studyId);
    uniqueStudies.push({ study, studyId });
  }

  const includeStudyIds = [];
  const maybeStudyIds = [];
  const excludeStudyIds = [];

  const classified = uniqueStudies.map(({ study, studyId }) => {
    const relevance = classifyRelevance(study, inclusionCriteria);
    if (relevance.classification === 'include') includeStudyIds.push(studyId);
    if (relevance.classification === 'maybe') maybeStudyIds.push(studyId);
    if (relevance.classification === 'exclude') excludeStudyIds.push(studyId);
    return { study, studyId, relevance };
  });

  const withPICOStudies = classified.filter(item =>
    item.relevance.classification === 'include' ||
    (includeMaybe && item.relevance.classification === 'maybe')
  );
  const withPICOStudyIds = withPICOStudies.map(item => item.studyId);
  const withoutPICOStudyIds = uniqueStudies.map(item => item.studyId);
  const withoutPICOCount = withoutPICOStudyIds.length;
  const withPICOCount = withPICOStudyIds.length;
  const retainedPct = withoutPICOCount > 0 ? (withPICOCount / withoutPICOCount) * 100 : 0;

  return {
    decision: withoutPICOCount > 0 ? 'PASS' : 'FLAG',
    withoutPICO: {
      totalStudies: withoutPICOCount,
      uniqueNctCount: collectNctIds(uniqueStudies.map(item => item.study)).length,
      studyIds: withoutPICOStudyIds,
      duplicateCount: duplicateStudyIds.length,
      duplicateStudyIds
    },
    withPICO: {
      totalStudies: withPICOCount,
      includeCount: includeStudyIds.length,
      maybeCount: maybeStudyIds.length,
      excludeCount: excludeStudyIds.length,
      studyIds: withPICOStudyIds,
      includeStudyIds,
      maybeStudyIds,
      excludeStudyIds
    },
    comparison: {
      removedByPICO: withoutPICOCount - withPICOCount,
      retainedPct: Number(retainedPct.toFixed(1)),
      excludedPct: Number((100 - retainedPct).toFixed(1))
    }
  };
}

// ============================================================================
// EVIDENCE SURVEILLANCE
// ============================================================================

/**
 * Run evidence surveillance check
 * Now includes Embase and Cochrane Central for comprehensive coverage
 *
 * @param {Object} strategy - Search strategy
 * @param {Object} existingStudies - Already included studies
 * @returns {Promise<Object>} Surveillance results
 */
export async function runSurveillance(strategy, existingStudies = []) {
  const guidelineProfile = normalizeGuidelineProfileKey(strategy.guidelineProfile || 'cardiology');
  const results = {
    timestamp: new Date().toISOString(),
    strategyId: strategy.id,
    guidelineProfile,
    sources: {},
    newStudies: [],
    duplicates: [],
    excluded: [],
    summary: {}
  };
  const allRetrievedStudies = [];
  const dedupePool = [...existingStudies];

  const processBatch = (studies = []) => {
    for (const study of studies) {
      const processed = processNewStudy(study, strategy, dedupePool);
      dedupePool.push(study);
      allRetrievedStudies.push(study);

      if (processed.isDuplicate) {
        results.duplicates.push(processed);
      } else if (processed.classification === 'exclude') {
        results.excluded.push(processed);
      } else {
        results.newStudies.push(processed);
      }
    }
  };

  // Run PubMed search
  if (strategy.sources.includes('pubmed') && strategy.queries.pubmed) {
    const dateFrom = strategy.schedule.lastCheck ?
      new Date(strategy.schedule.lastCheck).toISOString().split('T')[0] : null;

    const pubmedResults = await searchPubMed(strategy.queries.pubmed, {
      maxResults: LIVING_REVIEW_CONFIG.maxResultsPerQuery,
      dateFrom
    });

    results.sources.pubmed = {
      count: pubmedResults.count,
      retrieved: pubmedResults.studies?.length || 0,
      nctIds: collectNctIds(pubmedResults.studies || [])
    };
    processBatch(pubmedResults.studies || []);
  }

  // Run ClinicalTrials.gov search (single or multi-strategy)
  if (strategy.sources.includes('ctgov') && strategy.queries.ctgov) {
    const ctgovRecommendation = recommendCTGovStrategyBundle(
      {
        ...strategy.queries.ctgov,
        searchObjective: strategy.searchObjective
      },
      {
        strategyIds: strategy.ctgovStrategy?.strategyIds,
        primaryStrategyId: strategy.ctgovStrategy?.primaryStrategyId
      }
    );

    const useMultiStrategy =
      strategy.ctgovStrategy?.mode === 'multi' ||
      (Array.isArray(strategy.ctgovStrategy?.strategyIds) && strategy.ctgovStrategy.strategyIds.length > 1) ||
      Array.isArray(strategy.queries.ctgov.strategyIds);

    const ctgovStatus = strategy.ctgovStrategy?.includeStatusFilter === false
      ? []
      : (strategy.filters?.ctgovStatuses || ['COMPLETED', 'ACTIVE_NOT_RECRUITING', 'RECRUITING']);

    let ctgovResults = null;
    if (useMultiStrategy) {
      const strategyIds = strategy.ctgovStrategy?.strategyIds ||
        strategy.queries.ctgov.strategyIds ||
        ctgovRecommendation.strategyIds;

      ctgovResults = await searchClinicalTrialsMultiStrategy(
        {
          ...strategy.queries.ctgov,
          searchObjective: strategy.searchObjective
        },
        {
          strategyIds,
          maxResultsPerStrategy: LIVING_REVIEW_CONFIG.maxResultsPerQuery,
          status: ctgovStatus
        }
      );
    } else {
      const strategyId =
        strategy.ctgovStrategy?.primaryStrategyId ||
        strategy.queries.ctgov.strategyId ||
        ctgovRecommendation.primaryStrategyId;

      ctgovResults = await searchClinicalTrials(
        strategy.queries.ctgov,
        {
          maxResults: LIVING_REVIEW_CONFIG.maxResultsPerQuery,
          status: ctgovStatus,
          strategyId
        }
      );
    }

    results.sources.ctgov = {
      count: ctgovResults.count,
      retrieved: ctgovResults.studies?.length || 0,
      strategyMode: useMultiStrategy ? 'multi' : 'single',
      strategyRecommendation: ctgovRecommendation,
      perStrategy: ctgovResults.perStrategy || null,
      strategySummary: ctgovResults.summary || null,
      nctIds: collectNctIds(ctgovResults.studies || []),
      error: ctgovResults.error
    };
    processBatch(ctgovResults.studies || []);
  }

  // Run AACT search through configured gateway
  if (strategy.sources.includes('aact')) {
    const aactCriteria = {
      ...(strategy.queries.aact || strategy.queries.ctgov || { condition: strategy.name }),
      guidelineProfile
    };
    const landmarkAreaKeys = resolveGuidelineAreaKeys([
      ...(Array.isArray(strategy.qualityTargets?.landmarkGuidelineAreas)
        ? strategy.qualityTargets.landmarkGuidelineAreas
        : []),
      aactCriteria.guidelineArea,
      strategy.queries?.ctgov?.guidelineArea,
      strategy.guidelineArea
    ], guidelineProfile);
    const landmarkNctIds = dedupeStrings(
      landmarkAreaKeys.flatMap(area => getGuidelineLandmarkTrials(area, guidelineProfile))
    );

    const aactResults = await searchAACT(aactCriteria, {
      gatewayUrl: strategy.infrastructure?.aactGatewayUrl,
      maxResults: Number(aactCriteria.maxResults || strategy.maxAACTResults || (LIVING_REVIEW_CONFIG.maxResultsPerQuery * 10)),
      status: aactCriteria.status || strategy.filters?.ctgovStatuses,
      completedOnly: aactCriteria.completedOnly,
      includeResultsOnly: aactCriteria.includeResultsOnly,
      useAreaTerms: aactCriteria.useAreaTerms,
      enforceInterventional: aactCriteria.enforceInterventional,
      enforceRandomized: aactCriteria.enforceRandomized
    });
    let mergedAACTStudies = [...(aactResults.studies || [])];
    let aactLandmarkVerification = null;

    if (landmarkNctIds.length > 0) {
      const landmarkCheck = await searchAACT(
        {
          nctIds: landmarkNctIds,
          guidelineProfile,
          guidelineArea: landmarkAreaKeys[0] || aactCriteria.guidelineArea || null,
          useAreaTerms: false,
          enforceInterventional: false,
          enforceRandomized: false
        },
        {
          gatewayUrl: strategy.infrastructure?.aactGatewayUrl,
          maxResults: landmarkNctIds.length,
          useAreaTerms: false,
          enforceInterventional: false,
          enforceRandomized: false
        }
      );

      const verifiedSet = new Set(collectNctIds(landmarkCheck.studies || []));
      const missingLandmarks = landmarkNctIds.filter(id => !verifiedSet.has(id));
      aactLandmarkVerification = {
        requested: landmarkNctIds.length,
        found: landmarkNctIds.length - missingLandmarks.length,
        coveragePct: landmarkNctIds.length > 0
          ? Number((((landmarkNctIds.length - missingLandmarks.length) / landmarkNctIds.length) * 100).toFixed(1))
          : 100,
        missingNctIds: missingLandmarks
      };

      const seen = new Set();
      const deduped = [];
      for (const study of [...mergedAACTStudies, ...(landmarkCheck.studies || [])]) {
        const id = normalizeNctId(study.nctId || study.nct_id || study.id) ||
          `title:${String(study.title || '').trim().toLowerCase()}`;
        if (!seen.has(id)) {
          seen.add(id);
          deduped.push(study);
        }
      }
      mergedAACTStudies = deduped;
    }

    results.sources.aact = {
      count: Math.max(aactResults.count || 0, mergedAACTStudies.length),
      retrieved: mergedAACTStudies.length,
      requiresGateway: !!aactResults.requiresGateway,
      error: aactResults.error || null,
      guidelineProfile: aactResults.guidelineProfile || guidelineProfile,
      termsUsed: aactResults.termsUsed || [],
      nctIds: collectNctIds(mergedAACTStudies),
      landmarkVerification: aactLandmarkVerification,
      gatewayUrl: aactResults.gatewayUrl || strategy.infrastructure?.aactGatewayUrl || null
    };
    processBatch(mergedAACTStudies);
  }

  // Run Embase search (requires API key)
  if (strategy.sources.includes('embase') && strategy.queries.embase) {
    const dateFrom = strategy.schedule.lastCheck ?
      new Date(strategy.schedule.lastCheck).toISOString().split('T')[0] : null;

    const embaseResults = await searchEmbase(strategy.queries.embase, {
      maxResults: LIVING_REVIEW_CONFIG.maxResultsPerQuery,
      dateFrom,
      apiKey: strategy.infrastructure?.embaseApiKey || strategy.embaseApiKey
    });

    results.sources.embase = {
      count: embaseResults.count,
      retrieved: embaseResults.studies?.length || 0,
      requiresAuth: embaseResults.requiresAuth || false,
      nctIds: collectNctIds(embaseResults.studies || []),
      error: embaseResults.error
    };

    // Process results if we got any
    if (!embaseResults.error) {
      processBatch(embaseResults.studies || []);
    }
  }

  // Run Cochrane Central search (provides manual search URL)
  if (strategy.sources.includes('cochrane')) {
    const cochraneResults = await searchCochraneCentral(strategy.queries.cochrane || {
      topic: strategy.name
    });

    results.sources.cochrane = {
      count: cochraneResults.count,
      retrieved: cochraneResults.studies?.length || 0,
      manualSearchUrl: cochraneResults.manualSearchUrl,
      note: cochraneResults.note
    };
  }

  const trialUniverse = summarizeTrialUniverse(allRetrievedStudies, {
    inclusionCriteria: strategy.inclusionCriteria,
    dedupe: true,
    includeMaybe: true
  });
  results.trialUniverse = trialUniverse;

  // Summary
  results.summary = {
    totalFound: Object.values(results.sources).reduce((sum, s) => sum + (s.count || 0), 0),
    newPotentialInclusions: results.newStudies.filter(s => s.classification === 'include').length,
    newMaybes: results.newStudies.filter(s => s.classification === 'maybe').length,
    duplicatesDetected: results.duplicates.length,
    autoExcluded: results.excluded.length,
    trialUniverseWithoutPICO: trialUniverse.withoutPICO.totalStudies,
    trialUniverseWithPICO: trialUniverse.withPICO.totalStudies,
    trialUniverseRetainedPct: trialUniverse.comparison.retainedPct
  };

  const landmarkAreasInput =
    Array.isArray(strategy.qualityTargets?.landmarkGuidelineAreas) &&
    strategy.qualityTargets.landmarkGuidelineAreas.length > 0
      ? strategy.qualityTargets.landmarkGuidelineAreas
      : (strategy.queries?.aact?.guidelineArea || null);

  const landmarkCoverage = assessESCLandmarkCoverage(
    allRetrievedStudies,
    {
      guidelineProfile,
      guidelineAreas: landmarkAreasInput,
      minCoveragePct: strategy.qualityTargets?.minLandmarkCoveragePct ?? 0
    }
  );
  results.landmarkCoverage = landmarkCoverage;

  results.robustness = assessSurveillanceRobustness(results, {
    requiredSources: strategy.sources || [],
    minCtgovStrategies: strategy.ctgovStrategy?.mode === 'multi' ? 2 : 1,
    requireAACT: strategy.qualityTargets?.requireAACTForFinalReview || false,
    requireAACTIncremental: strategy.qualityTargets?.requireAACTIncrementalCapture || false,
    minAACTIncrementalNcts: strategy.qualityTargets?.minAACTIncrementalNcts ?? 1,
    requireLandmarkCoverage: strategy.qualityTargets?.enforceLandmarkCoverage || false,
    minLandmarkCoveragePct: strategy.qualityTargets?.minLandmarkCoveragePct ?? 70
  });

  return results;
}

/**
 * Process a newly found study
 */
function processNewStudy(study, strategy, existingStudies) {
  // Check for duplicates
  const allStudies = [...existingStudies, study];
  const duplicates = detectDuplicates(allStudies, 0.85);
  const isDuplicate = duplicates.some(group =>
    group.indices.includes(allStudies.length - 1) && group.indices.some(i => i < existingStudies.length)
  );

  if (isDuplicate) {
    return {
      ...study,
      isDuplicate: true,
      duplicateOf: duplicates.find(g => g.indices.includes(allStudies.length - 1))?.studies[0]
    };
  }

  // Classify relevance
  const relevance = classifyRelevance(study, sanitizeInclusionCriteria(strategy.inclusionCriteria));

  // Extract PICO if relevant
  let pico = null;
  if (relevance.classification !== 'exclude') {
    pico = extractPICO(`${study.title || ''} ${study.abstract || ''}`);
  }

  return {
    ...study,
    isDuplicate: false,
    classification: relevance.classification,
    relevanceScore: relevance.score,
    relevanceReasons: relevance.reasons,
    pico,
    needsReview: relevance.classification === 'maybe' || relevance.confidence === 'medium',
    processedAt: new Date().toISOString()
  };
}

/**
 * Assess whether a surveillance run is robust enough for high-stakes review use.
 *
 * @param {Object} results - Surveillance results object from runSurveillance()
 * @param {Object} options - Robustness options
 * @returns {Object} Robustness assessment
 */
export function assessSurveillanceRobustness(results, options = {}) {
  const requiredSources = options.requiredSources || [];
  const minCtgovStrategies = options.minCtgovStrategies ?? 2;
  const requireAACT = options.requireAACT ?? false;
  const requireLandmarkCoverage = options.requireLandmarkCoverage ?? false;
  const requireTrialUniverse = options.requireTrialUniverse ?? false;
  const minLandmarkCoveragePct = Number(options.minLandmarkCoveragePct ?? 70);
  const minPicoRetentionPct = Number(options.minPicoRetentionPct ?? 0);
  const requireAACTIncremental = options.requireAACTIncremental ?? false;
  const minAACTIncrementalNcts = Number(options.minAACTIncrementalNcts ?? 1);

  const sources = results.sources || {};
  const sourceKeys = Object.keys(sources);
  const sourceIsOperational = source => !!source && !source.error && !source.requiresGateway;
  const availableRequiredSources = requiredSources.filter(s => sourceIsOperational(sources[s]));
  const requiredSourceCoverage = requiredSources.length > 0
    ? availableRequiredSources.length / requiredSources.length
    : (sourceKeys.length > 0 ? 1 : 0);

  const ctgovStrategiesUsed = sources.ctgov?.perStrategy
    ? Object.keys(sources.ctgov.perStrategy).length
    : (sources.ctgov ? 1 : 0);
  const ctgovHasErrors = !!sources.ctgov?.error;
  const ctgovRequired = requiredSources.includes('ctgov') || !!sources.ctgov;

  const aactConfigured = !!sources.aact;
  const aactOperational = aactConfigured &&
    !sources.aact.error &&
    !sources.aact.requiresGateway;
  const ctgovNctSet = new Set(sources.ctgov?.nctIds || []);
  const aactNctSet = new Set(sources.aact?.nctIds || []);
  const aactIncrementalNctCount = [...aactNctSet].filter(id => !ctgovNctSet.has(id)).length;
  const knownGapRecovered = AACT_VALIDATION_REFERENCE.knownApiGapNctIds
    .filter(id => aactNctSet.has(id)).length;
  const knownGapRecoveryPct = AACT_VALIDATION_REFERENCE.knownApiGapNctIds.length > 0
    ? (knownGapRecovered / AACT_VALIDATION_REFERENCE.knownApiGapNctIds.length) * 100
    : 100;
  const landmarkCoveragePct = Number(results.landmarkCoverage?.overallCoveragePct ?? 0);
  const picoRetentionPct = Number(results.trialUniverse?.comparison?.retainedPct ?? 0);
  const trialUniverseAvailable = Number(results.trialUniverse?.withoutPICO?.totalStudies ?? 0) > 0;

  const checks = [
    {
      id: 'source_coverage',
      label: 'Required source coverage',
      pass: requiredSourceCoverage >= 1,
      value: requiredSourceCoverage
    },
    {
      id: 'ctgov_strategy_depth',
      label: 'CT.gov strategy depth',
      pass: ctgovRequired ? ctgovStrategiesUsed >= minCtgovStrategies : true,
      value: ctgovStrategiesUsed
    },
    {
      id: 'ctgov_error_free',
      label: 'CT.gov execution without errors',
      pass: ctgovRequired ? !ctgovHasErrors : true,
      value: ctgovHasErrors ? 0 : 1
    },
    {
      id: 'aact_available',
      label: 'AACT availability',
      pass: requireAACT ? aactOperational : true,
      value: aactOperational ? 1 : 0
    },
    {
      id: 'aact_incremental_capture',
      label: 'AACT incremental capture over CT.gov',
      pass: requireAACTIncremental ? aactIncrementalNctCount >= minAACTIncrementalNcts : true,
      value: aactIncrementalNctCount
    },
    {
      id: 'landmark_coverage',
      label: 'ESC landmark coverage',
      pass: requireLandmarkCoverage ? landmarkCoveragePct >= minLandmarkCoveragePct : true,
      value: landmarkCoveragePct
    },
    {
      id: 'trial_universe_pico',
      label: 'Trial universe with and without PICO',
      pass: requireTrialUniverse
        ? (trialUniverseAvailable && picoRetentionPct >= minPicoRetentionPct)
        : true,
      value: picoRetentionPct
    }
  ];

  const passed = checks.filter(c => c.pass).length;
  const score = checks.length > 0 ? (passed / checks.length) * 100 : 100;
  const actionItems = [];

  if (requiredSourceCoverage < 1) {
    const missing = requiredSources.filter(s => !sourceIsOperational(sources[s]));
    actionItems.push(`Run missing required sources: ${missing.join(', ')}`);
  }
  if (ctgovRequired && ctgovStrategiesUsed < minCtgovStrategies) {
    actionItems.push(`Increase CT.gov strategy set to at least ${minCtgovStrategies} presets (recommended: S1+S3+S10).`);
  }
  if (ctgovRequired && ctgovHasErrors) {
    actionItems.push('Resolve CT.gov request errors before using this run for decision-grade review.');
  }
  if (requireAACT && !aactOperational) {
    actionItems.push('Configure a secure AACT SQL gateway and rerun surveillance.');
  }
  if (requireAACTIncremental && aactIncrementalNctCount < minAACTIncrementalNcts) {
    actionItems.push(
      `AACT returned insufficient incremental trials versus CT.gov (${aactIncrementalNctCount}/${minAACTIncrementalNcts}).`
    );
  }
  if (requireLandmarkCoverage && landmarkCoveragePct < minLandmarkCoveragePct) {
    actionItems.push(
      `Landmark trial coverage is ${landmarkCoveragePct.toFixed(1)}%, below required ${minLandmarkCoveragePct.toFixed(1)}%.`
    );
  }
  if (requireTrialUniverse && !trialUniverseAvailable) {
    actionItems.push('Generate a non-empty trial universe before final decision-grade review.');
  } else if (requireTrialUniverse && picoRetentionPct < minPicoRetentionPct) {
    actionItems.push(
      `PICO retention is ${picoRetentionPct.toFixed(1)}%, below required ${minPicoRetentionPct.toFixed(1)}%.`
    );
  }

  return {
    decision: actionItems.length === 0 ? 'PASS' : 'FLAG',
    score: Number(score.toFixed(1)),
    metrics: {
      aactIncrementalNctCount,
      knownGapRecovered,
      knownGapRecoveryPct: Number(knownGapRecoveryPct.toFixed(1)),
      landmarkCoveragePct,
      picoRetentionPct,
      trialUniverseCount: Number(results.trialUniverse?.withoutPICO?.totalStudies ?? 0)
    },
    checks,
    actionItems
  };
}

// ============================================================================
// EVIDENCE CHANGE DETECTION
// ============================================================================

/**
 * Detect if new evidence changes conclusions
 *
 * @param {Object} previousMeta - Previous meta-analysis results
 * @param {Object} currentMeta - Current meta-analysis results
 * @param {Object} thresholds - Change thresholds
 * @returns {Object} Change assessment
 */
export function detectEvidenceChange(previousMeta, currentMeta, thresholds = {}) {
  const {
    effectChangeThreshold = 0.2, // 20% relative change in effect
    significanceChange = true, // Flag if significance status changes
    certaintyChange = true, // Flag if certainty level changes
    i2ChangeThreshold = 15 // Absolute change in I²
  } = thresholds;

  const changes = {
    timestamp: new Date().toISOString(),
    hasSignificantChange: false,
    changes: [],
    recommendation: 'No update needed',
    priority: 'low'
  };

  const prevEffect = previousMeta.random?.mu || previousMeta.mu || 0;
  const currEffect = currentMeta.random?.mu || currentMeta.mu || 0;
  const prevCI = previousMeta.random?.ci || previousMeta.ci || [0, 0];
  const currCI = currentMeta.random?.ci || currentMeta.ci || [0, 0];

  // Check effect size change
  const relativeChange = prevEffect !== 0 ? Math.abs((currEffect - prevEffect) / prevEffect) : Infinity;
  if (relativeChange > effectChangeThreshold) {
    changes.changes.push({
      type: 'effect_change',
      description: `Effect changed from ${prevEffect.toFixed(3)} to ${currEffect.toFixed(3)} (${(relativeChange * 100).toFixed(1)}% change)`,
      severity: relativeChange > 0.5 ? 'high' : 'medium'
    });
    changes.hasSignificantChange = true;
  }

  // Check significance change
  const prevSignificant = (prevCI[0] > 0 && prevCI[1] > 0) || (prevCI[0] < 0 && prevCI[1] < 0);
  const currSignificant = (currCI[0] > 0 && currCI[1] > 0) || (currCI[0] < 0 && currCI[1] < 0);

  if (significanceChange && prevSignificant !== currSignificant) {
    changes.changes.push({
      type: 'significance_change',
      description: currSignificant ?
        'Effect became statistically significant' :
        'Effect is no longer statistically significant',
      severity: 'high'
    });
    changes.hasSignificantChange = true;
    changes.priority = 'high';
  }

  // Check heterogeneity change
  const prevI2 = previousMeta.i2 || 0;
  const currI2 = currentMeta.i2 || 0;
  const i2Change = Math.abs(currI2 - prevI2);

  if (i2Change > i2ChangeThreshold) {
    changes.changes.push({
      type: 'heterogeneity_change',
      description: `I² changed from ${prevI2.toFixed(1)}% to ${currI2.toFixed(1)}%`,
      severity: i2Change > 30 ? 'high' : 'medium'
    });
  }

  // Check number of studies
  const prevK = previousMeta.k || previousMeta.nStudies || 0;
  const currK = currentMeta.k || currentMeta.nStudies || 0;
  const newStudies = currK - prevK;

  if (newStudies > 0) {
    changes.changes.push({
      type: 'new_studies',
      description: `${newStudies} new ${newStudies === 1 ? 'study' : 'studies'} added`,
      severity: newStudies >= 3 ? 'medium' : 'low'
    });
  }

  // Determine recommendation
  if (changes.hasSignificantChange) {
    if (prevSignificant !== currSignificant) {
      changes.recommendation = 'URGENT: Conclusions may have changed - immediate review required';
      changes.priority = 'critical';
    } else if (relativeChange > 0.5) {
      changes.recommendation = 'Major change in effect size - review recommended';
      changes.priority = 'high';
    } else {
      changes.recommendation = 'Moderate changes detected - review at next scheduled update';
      changes.priority = 'medium';
    }
  }

  return changes;
}

// ============================================================================
// SCHEDULING
// ============================================================================

/**
 * Schedule automated surveillance checks
 *
 * @param {Object} strategy - Search strategy with schedule config
 * @param {Function} callback - Function to call with results
 * @returns {Object} Scheduler control object
 */
export function scheduleChecks(strategy, callback) {
  if (!strategy.schedule.enabled) {
    return { active: false, message: 'Scheduling not enabled' };
  }

  const intervalMs = LIVING_REVIEW_CONFIG.checkIntervals[strategy.schedule.interval] ||
                     LIVING_REVIEW_CONFIG.checkIntervals.weekly;

  const scheduler = {
    active: true,
    intervalId: null,
    strategy: strategy,
    nextRun: new Date(Date.now() + intervalMs).toISOString()
  };

  scheduler.intervalId = setInterval(async () => {
    console.log(`Running scheduled surveillance for: ${strategy.name}`);
    try {
      const results = await runSurveillance(strategy, []);
      strategy.schedule.lastCheck = new Date().toISOString();
      strategy.stats.totalRuns++;

      if (callback && typeof callback === 'function') {
        callback(results, strategy);
      }
    } catch (error) {
      console.error('Scheduled surveillance failed:', error);
    }
    scheduler.nextRun = new Date(Date.now() + intervalMs).toISOString();
  }, intervalMs);

  // Store for cleanup
  scheduler.stop = () => {
    if (scheduler.intervalId) {
      clearInterval(scheduler.intervalId);
      scheduler.active = false;
    }
  };

  return scheduler;
}

// ============================================================================
// ALERT GENERATION
// ============================================================================

/**
 * Generate alerts based on surveillance results
 *
 * @param {Object} results - Surveillance results
 * @param {Object} options - Alert configuration
 * @returns {Array} Generated alerts
 */
export function generateAlerts(results, options = {}) {
  const {
    alertOnNewInclusions = true,
    alertOnPotentialChanges = true,
    minRelevanceScore = 70
  } = options;

  const alerts = [];

  // Alert for new potential inclusions
  if (alertOnNewInclusions) {
    const highRelevance = results.newStudies.filter(s =>
      s.classification === 'include' && s.relevanceScore >= minRelevanceScore
    );

    if (highRelevance.length > 0) {
      alerts.push({
        type: 'new_studies',
        priority: highRelevance.length >= 3 ? 'high' : 'medium',
        title: `${highRelevance.length} new potentially relevant ${highRelevance.length === 1 ? 'study' : 'studies'} found`,
        description: `Automatic screening identified ${highRelevance.length} new studies that may meet inclusion criteria.`,
        studies: highRelevance.slice(0, 5), // Include top 5
        actionRequired: 'Review and confirm inclusion',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Alert for studies needing review
  const needsReview = results.newStudies.filter(s => s.needsReview);
  if (needsReview.length > 0) {
    alerts.push({
      type: 'review_needed',
      priority: 'medium',
      title: `${needsReview.length} ${needsReview.length === 1 ? 'study needs' : 'studies need'} manual review`,
      description: 'Automatic classification was uncertain for these studies.',
      count: needsReview.length,
      actionRequired: 'Manual screening required',
      timestamp: new Date().toISOString()
    });
  }

  return alerts;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  LIVING_REVIEW_CONFIG,
  CTGOV_STRATEGY_PRESETS,
  CTGOV_STRATEGY_EVIDENCE,
  CTGOV_CONDITION_CHALLENGE_HINTS,
  ESC_CARDIOLOGY_QUERY_PACK,
  ESC_GUIDELINE_PROFILES,
  ESC_GUIDELINE_LANDMARK_TRIALS,
  AACT_VALIDATION_REFERENCE,
  createSearchStrategy,
  buildPubMedQuery,
  buildCTGovQueryFromPreset,
  buildAACTSQLQuery,
  recommendCTGovStrategyBundle,
  assessESCLandmarkCoverage,
  summarizeTrialUniverse,
  searchPubMed,
  searchClinicalTrials,
  searchClinicalTrialsMultiStrategy,
  searchAACT,
  // New comprehensive database support
  searchEmbase,
  buildEmbaseQuery,
  searchCochraneCentral,
  runSurveillance,
  assessSurveillanceRobustness,
  detectEvidenceChange,
  scheduleChecks,
  generateAlerts
};
