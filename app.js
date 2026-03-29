import { TOPICS, BASE_ACS_QUERY, APP_CONFIG } from "./topics.js";
import {
  DATASETS,
  DATASET_SOURCES,
  datasetToComparisons,
  getDatasetsByRelevance,
  getDatasetsBySource,
  getDatasetsByType,
  searchDatasets,
  getDatasetSummary,
  importFromZenodo,
  importFromGitHub,
  parseCSV,
  exportToCSV
} from "./datasets.js";
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
  computeSucra,
  computePScore,
  extractDoseFromLabel,
  doseResponseFit,
  funnelPlotData,
  comparisonAdjustedFunnel,
  trimAndFill,
  nmaInconsistency,
  cumulativeMetaAnalysis,
  subgroupAnalysis,
  gradeAssessment,
  sensitivityAnalysis,
  tau2ConfidenceInterval,
  i2ConfidenceInterval
} from "./analysis.js";
import {
  initDB,
  saveCache as saveCacheIDB,
  loadCache as loadCacheIDB,
  clearCache as clearCacheIDB,
  getCacheStats,
  migrateToIndexedDB
} from "./cache.js";
import {
  renderNetworkGraph,
  renderEvidenceGapMap,
  renderAnimatedCumulative,
  renderRankogram,
  renderRankHeatmap,
  renderInteractiveForest,
  render3DFunnel,
  renderGeographicMap,
  VISUALIZATION_MODULE
} from "./visualization-advanced.js";
import {
  ScreeningQueue,
  TruthCertValidator,
  MultiFormatExporter,
  SessionManager,
  ProvenanceTracker,
  WorkflowManager,
  COLLABORATION_MODULE
} from "./collaboration.js";
import {
  generateInterpretation,
  generateSmartSuggestions,
  generateReportSection,
  assessCertainty
} from "./ai-core.js";
import {
  extractPICO,
  detectDuplicates,
  detectAnomalies,
  predictQuality,
  classifyRelevance
} from "./ml-local.js";
import {
  CTGOV_STRATEGY_PRESETS,
  CTGOV_STRATEGY_EVIDENCE,
  CTGOV_CONDITION_CHALLENGE_HINTS,
  ESC_CARDIOLOGY_QUERY_PACK,
  ESC_GUIDELINE_PROFILES,
  ESC_GUIDELINE_LANDMARK_TRIALS,
  AACT_VALIDATION_REFERENCE,
  createSearchStrategy,
  buildCTGovQueryFromPreset,
  buildAACTSQLQuery,
  recommendCTGovStrategyBundle,
  assessESCLandmarkCoverage,
  summarizeTrialUniverse,
  searchPubMed,
  searchClinicalTrials,
  searchClinicalTrialsMultiStrategy,
  searchAACT,
  runSurveillance,
  assessSurveillanceRobustness,
  detectEvidenceChange,
  generateAlerts
} from "./living-review.js";

const dom = {
  appKicker: document.getElementById("appKicker"),
  appTitle: document.getElementById("appTitle"),
  appSubtitle: document.getElementById("appSubtitle"),
  topicPanelTitle: document.getElementById("topicPanelTitle"),
  welcomeTitle: document.getElementById("welcomeTitle"),
  startDate: document.getElementById("startDate"),
  statusFilter: document.getElementById("statusFilter"),
  outcomeRule: document.getElementById("outcomeRule"),
  referenceTx: document.getElementById("referenceTx"),
  updateBtn: document.getElementById("updateBtn"),
  fixtureBtn: document.getElementById("fixtureBtn"),
  clearBtn: document.getElementById("clearBtn"),
  lastUpdate: document.getElementById("lastUpdate"),
  priorTrials: document.getElementById("priorTrials"),
  compareBtn: document.getElementById("compareBtn"),
  coverageSummary: document.getElementById("coverageSummary"),
  topicList: document.getElementById("topicList"),
  topicCount: document.getElementById("topicCount"),
  trialCount: document.getElementById("trialCount"),
  topicTitle: document.getElementById("topicTitle"),
  topicMeta: document.getElementById("topicMeta"),
  overviewSnapshot: document.getElementById("overviewSnapshot"),
  metaSummary: document.getElementById("metaSummary"),
  warningList: document.getElementById("warningList"),
  trialTable: document.getElementById("trialTable"),
  pairwiseTable: document.getElementById("pairwiseTable"),
  networkTable: document.getElementById("networkTable"),
  doseTable: document.getElementById("doseTable"),
  gradeTable: document.getElementById("gradeTable"),
  cumulativeTable: document.getElementById("cumulativeTable"),
  cumulativeChart: document.getElementById("cumulativeChart"),
  diagnosticTable: document.getElementById("diagnosticTable"),
  rawJson: document.getElementById("rawJson"),
  transparencySummary: document.getElementById("transparencySummary"),
  transparencyLedger: document.getElementById("transparencyLedger"),
  transparencyBenchmarks: document.getElementById("transparencyBenchmarks"),
  forestChart: document.getElementById("forestChart"),
  forestTooltip: document.getElementById("forestTooltip"),
  forestResetBtn: document.getElementById("forestResetBtn"),
  forestExcludedCount: document.getElementById("forestExcludedCount"),
  networkChart: document.getElementById("networkChart"),
  doseChart: document.getElementById("doseChart"),
  funnelChart: document.getElementById("funnelChart"),
  logStream: document.getElementById("logStream"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  exportRBtn: document.getElementById("exportRBtn"),
  addStudyBtn: document.getElementById("addStudyBtn"),
  // Study entry modal
  studyEntryModal: document.getElementById("studyEntryModal"),
  closeStudyEntryBtn: document.getElementById("closeStudyEntryBtn"),
  entryStudyName: document.getElementById("entryStudyName"),
  entryStudyYear: document.getElementById("entryStudyYear"),
  binaryOutcomeSection: document.getElementById("binaryOutcomeSection"),
  continuousOutcomeSection: document.getElementById("continuousOutcomeSection"),
  precomputedSection: document.getElementById("precomputedSection"),
  entryPreview: document.getElementById("entryPreview"),
  entryPreviewContent: document.getElementById("entryPreviewContent"),
  previewStudyBtn: document.getElementById("previewStudyBtn"),
  addStudyConfirmBtn: document.getElementById("addStudyConfirmBtn"),
  // Dataset import modal elements
  importDatasetBtn: document.getElementById("importDatasetBtn"),
  datasetModal: document.getElementById("datasetModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  datasetSourceFilter: document.getElementById("datasetSourceFilter"),
  datasetTypeFilter: document.getElementById("datasetTypeFilter"),
  datasetRelevanceFilter: document.getElementById("datasetRelevanceFilter"),
  datasetSearch: document.getElementById("datasetSearch"),
  datasetList: document.getElementById("datasetList"),
  datasetPreview: document.getElementById("datasetPreview"),
  previewTitle: document.getElementById("previewTitle"),
  previewDescription: document.getElementById("previewDescription"),
  previewStats: document.getElementById("previewStats"),
  previewCitation: document.getElementById("previewCitation"),
  previewTable: document.getElementById("previewTable"),
  createTopicCheck: document.getElementById("createTopicCheck"),
  customTopicName: document.getElementById("customTopicName"),
  importDatasetConfirmBtn: document.getElementById("importDatasetConfirmBtn"),
  // ROB2 modal elements
  robModal: document.getElementById("robModal"),
  closeRobModalBtn: document.getElementById("closeRobModalBtn"),
  robStudyName: document.getElementById("robStudyName"),
  robD1: document.getElementById("robD1"),
  robD2: document.getElementById("robD2"),
  robD3: document.getElementById("robD3"),
  robD4: document.getElementById("robD4"),
  robD5: document.getElementById("robD5"),
  robD1Notes: document.getElementById("robD1Notes"),
  robD2Notes: document.getElementById("robD2Notes"),
  robD3Notes: document.getElementById("robD3Notes"),
  robD4Notes: document.getElementById("robD4Notes"),
  robD5Notes: document.getElementById("robD5Notes"),
  robOverallCalc: document.getElementById("robOverallCalc"),
  saveRobBtn: document.getElementById("saveRobBtn"),
  clearRobBtn: document.getElementById("clearRobBtn")
};

const ELIGIBILITY_TRIAL_MINIMUM = Math.max(
  1,
  Number(APP_CONFIG.eligibilityTrialMinimum || 5)
);

const state = {
  topics: TOPICS.map(topic => ({ ...topic, trials: [], query: "" })),
  activeTopicId: null,
  activeTab: "overview",
  updateToken: 0,
  wasm: null,
  selectedDatasetId: null,
  importedTopics: [],
  // Table state for sorting, filtering, pagination
  tableState: {
    trials: { sortCol: null, sortDir: "asc", search: "", page: 1, pageSize: 20 },
    pairwise: { sortCol: null, sortDir: "asc", search: "", page: 1, pageSize: 20 },
    network: { sortCol: null, sortDir: "asc", search: "", page: 1, pageSize: 20 }
  },
  // ROB2 state
  robAssessments: {}, // key: topicId_trialId, value: { d1, d2, d3, d4, d5, d1Notes, ..., overall }
  activeRobTrialId: null,
  // Forest plot state
  forestPlot: {
    elements: [], // { studyId, x, y, width, height, effect, se, ci, weight }
    hoveredIndex: -1,
    excludedStudies: new Set()
  },
  // Phase 5 & 6: Advanced features state
  sessionManager: null, // Initialized in init()
  provenanceTracker: null, // Initialized in init()
  screeningQueue: null,
  truthCertValidator: null,
  workflowManager: null,
  exporter: null
};

function applyAppConfig() {
  document.title = APP_CONFIG.pageTitle || document.title;
  if (dom.appKicker && APP_CONFIG.kicker) dom.appKicker.textContent = APP_CONFIG.kicker;
  if (dom.appTitle && APP_CONFIG.title) dom.appTitle.textContent = APP_CONFIG.title;
  if (dom.appSubtitle && APP_CONFIG.subtitle) dom.appSubtitle.textContent = APP_CONFIG.subtitle;
  if (dom.topicPanelTitle && APP_CONFIG.topicPanelTitle) {
    dom.topicPanelTitle.textContent = APP_CONFIG.topicPanelTitle;
  }
  if (dom.welcomeTitle && APP_CONFIG.welcomeTitle) {
    dom.welcomeTitle.textContent = APP_CONFIG.welcomeTitle;
  }
}

function applyDefaultStatusSelection() {
  const allowed = Array.isArray(APP_CONFIG.defaultStatuses)
    ? new Set(APP_CONFIG.defaultStatuses.map(value => String(value || "").trim()).filter(Boolean))
    : null;
  if (!allowed || !dom.statusFilter) return;
  Array.from(dom.statusFilter.options).forEach(option => {
    option.selected = allowed.has(option.value);
  });
}

function applyDefaultOutcomeRule() {
  const desired = String(APP_CONFIG.defaultOutcomeRule || "primary").trim();
  if (!desired || !dom.outcomeRule) return;
  const optionExists = Array.from(dom.outcomeRule.options).some(option => option.value === desired);
  if (optionExists) {
    dom.outcomeRule.value = desired;
  }
}

if (typeof window !== "undefined") {
  window.__escAcs = window.__escAcs || {
    listNctIds() {
      const ids = new Set();
      state.topics.forEach(topic => {
        (topic.trials || []).forEach(trial => {
          if (trial.nctId) ids.add(trial.nctId);
        });
      });
      return Array.from(ids);
    },
    listTopicStats() {
      return state.topics.map(topic => ({
        id: topic.id,
        label: topic.label,
        trials: (topic.trials || []).length
      }));
    }
  };
}

const renderCache = new Map();
let worker;

function log(message) {
  const stamp = new Date().toLocaleTimeString();
  const line = document.createElement("div");
  line.textContent = `[${stamp}] ${message}`;
  dom.logStream.prepend(line);
}

function sumWithWasm(values) {
  if (state.wasm && state.wasm.add) {
    return values.reduce((acc, v) => state.wasm.add(acc | 0, v | 0), 0);
  }
  return values.reduce((acc, v) => acc + v, 0);
}

async function loadWasm() {
  try {
    const res = await fetch(new URL("./fastmath.wasm", import.meta.url));
    const bytes = await res.arrayBuffer();
    const mod = await WebAssembly.instantiate(bytes);
    state.wasm = mod.instance.exports;
    log("WASM module loaded.");
  } catch (err) {
    log("WASM module unavailable, using JS math.");
  }
}

function getSettings() {
  const statuses = Array.from(dom.statusFilter.selectedOptions).map(opt => opt.value);
  return {
    startDate: dom.startDate.value || null,
    statuses,
    outcomeRule: dom.outcomeRule.value || "primary",
    referenceTx: dom.referenceTx.value.trim() || null,
    requirePostedResults: Boolean(APP_CONFIG.requirePostedResults),
    requireNumericOutcome: Boolean(APP_CONFIG.requireNumericOutcome),
    requireComparatorArms: Boolean(APP_CONFIG.requireComparatorArms),
    enforceConditionFilter: APP_CONFIG.enforceConditionFilter !== false
  };
}

async function saveCache(payload) {
  try {
    await saveCacheIDB(payload);
    log("Cache saved.");
  } catch (err) {
    log("Cache write failed.");
  }
}

async function loadCache() {
  try {
    return await loadCacheIDB();
  } catch (err) {
    return null;
  }
}

function applyCache(cache) {
  if (!cache || !cache.topics) return;
  state.topics = TOPICS.map(topic => {
    const found = cache.topics.find(t => t.id === topic.id);
    return found ? { ...topic, ...found } : { ...topic, trials: [], query: "" };
  });
  dom.lastUpdate.textContent = cache.lastUpdate || "Unknown";
  state.updateToken += 1;
  renderTopicList();
}

function renderTopicList() {
  dom.topicList.innerHTML = "";
  const eligible = state.topics.filter(
    t => (t.trials || []).length >= ELIGIBILITY_TRIAL_MINIMUM
  );
  const trialCounts = eligible.map(t => (t.trials || []).length);
  dom.topicCount.textContent = eligible.length.toString();
  dom.trialCount.textContent = sumWithWasm(trialCounts).toString();

  state.topics.forEach(topic => {
    const item = document.createElement("div");
    const trialCount = (topic.trials || []).length;
    const isEligible = trialCount >= ELIGIBILITY_TRIAL_MINIMUM || topic._imported;
    const isImported = topic._imported;
    item.className = `topic-item${topic.id === state.activeTopicId ? " active" : ""}${!isEligible ? " disabled" : ""}${isImported ? " topic-item--imported" : ""}`;
    item.dataset.topicId = topic.id;

    const importedBadge = isImported ? `<span class="topic-badge">R Dataset</span>` : '';
    const sourceInfo = isImported && topic._dataset
      ? `Source: ${DATASET_SOURCES[topic._dataset.source]?.name || topic._dataset.source}`
      : (topic.query || "Awaiting query");

    item.innerHTML = `
      <div><strong>${topic.label}</strong>${importedBadge}</div>
      <div class="muted">${trialCount} ${isImported ? 'studies' : 'trials'}</div>
      <div class="muted">${sourceInfo}</div>
      <div class="pill ${isEligible ? "" : "pill--warn"}">${isEligible ? (isImported ? "imported" : "eligible") : `needs >=${ELIGIBILITY_TRIAL_MINIMUM} RCTs`}</div>
    `;
    item.addEventListener("click", () => {
      if (!isEligible) return;
      selectTopic(topic.id);
    });
    dom.topicList.appendChild(item);
  });
}

function selectTopic(topicId) {
  state.activeTopicId = topicId;
  // Reset table state when switching topics
  resetTableState("trials");
  resetTableState("pairwise");
  resetTableState("network");
  // Reset forest plot exclusions
  state.forestPlot.excludedStudies.clear();
  state.forestPlot.hoveredIndex = -1;
  renderTopicList();
  renderTopicDetail();
  setActiveTab("overview", true);
}

function renderTopicDetail() {
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (!topic) {
    dom.topicTitle.textContent = "Select a topic";
    dom.topicMeta.textContent = "";
    return;
  }
  dom.topicTitle.textContent = topic.label;
  const trialCount = (topic.trials || []).length;
  dom.topicMeta.innerHTML = `
    <span class="pill">${trialCount} RCTs</span>
    <span class="muted">${topic.query || "Query pending"}</span>
  `;
}

function setActiveTab(tabName, force = false) {
  state.activeTab = tabName;
  document.querySelectorAll(".tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-content").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
  renderActiveTab(force);
}

function renderActiveTab(force = false) {
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (!topic) return;
  const cacheKey = `${topic.id}:${state.updateToken}:${state.activeTab}`;
  if (!force && renderCache.has(cacheKey)) return;
  if (state.activeTab === "overview") renderOverview(topic);
  if (state.activeTab === "trials") renderTrials(topic);
  if (state.activeTab === "pairwise") renderPairwise(topic);
  if (state.activeTab === "network") renderNetwork(topic);
  if (state.activeTab === "dose") renderDose(topic);
  if (state.activeTab === "grade") renderGrade(topic);
  if (state.activeTab === "cumulative") renderCumulative(topic);
  if (state.activeTab === "diagnostics") renderDiagnostics(topic);
  if (state.activeTab === "raw") renderRaw(topic);
  if (state.activeTab === "transparency") renderTransparency(topic);
  renderCache.set(cacheKey, true);
}

function buildComparisons(topic, includeDebug = false) {
  const comparisons = [];
  const warnings = [];
  const exclusions = [];

  // Handle imported datasets with pre-computed comparisons
  if (topic._imported && topic._comparisons) {
    const dataset = topic._dataset;
    topic._comparisons.forEach(comp => {
      if (comp.type === "binary" || !comp.type) {
        if (comp.e1 != null && comp.n1 && comp.e0 != null && comp.n0) {
          const result = computeLogRR(comp.e1, comp.n1, comp.e0, comp.n0);
          const sampleSize = getComparisonSampleSize(comp);
          comparisons.push({
            studyId: comp.id,
            title: comp.study,
            t1: comp.treat1 || "Treatment",
            t2: comp.treat2 || "Control",
            dose: null,
            measure: dataset.effectMeasure || "logRR",
            effect: result.effect,
            se: result.se,
            year: comp.year,
            e1: comp.e1,
            n1: comp.n1,
            e0: comp.e0,
            n0: comp.n0,
            totalN: sampleSize,
            sampleSize
          });
        } else if (comp.hr && comp.ci_low && comp.ci_high) {
          const logHR = Math.log(comp.hr);
          const se = (Math.log(comp.ci_high) - Math.log(comp.ci_low)) / (2 * 1.96);
          const sampleSize = getComparisonSampleSize(comp);
          comparisons.push({
            studyId: comp.id,
            title: comp.study,
            t1: comp.treat1 || "Treatment",
            t2: comp.treat2 || "Control",
            dose: null,
            measure: "logHR",
            effect: logHR,
            se,
            year: comp.year,
            totalN: sampleSize,
            sampleSize
          });
        }
      } else if (comp.type === "continuous") {
        if (comp.m1 != null && comp.sd1 && comp.n1 && comp.m0 != null && comp.sd0 && comp.n0) {
          const result = computeMeanDiff(comp.m1, comp.sd1, comp.n1, comp.m0, comp.sd0, comp.n0);
          const sampleSize = getComparisonSampleSize(comp);
          comparisons.push({
            studyId: comp.id,
            title: comp.study,
            t1: comp.treat1 || "Treatment",
            t2: comp.treat2 || "Control",
            dose: null,
            measure: "MD",
            effect: result.effect,
            se: result.se,
            year: comp.year,
            n1: comp.n1,
            n0: comp.n0,
            mean1: comp.m1,
            sd1: comp.sd1,
            mean0: comp.m0,
            sd0: comp.sd0,
            totalN: sampleSize,
            sampleSize
          });
        }
      } else if (comp.type === "diagnostic") {
        const sens = comp.sensitivity;
        const spec = comp.specificity;
        const dor = (sens * spec) / ((1 - sens) * (1 - spec));
        const logDor = Math.log(dor);
        const se = Math.sqrt(1 / comp.TP + 1 / comp.FP + 1 / comp.FN + 1 / comp.TN);
        const sampleSize = [comp.TP, comp.FP, comp.FN, comp.TN]
          .map(toFiniteNumber)
          .filter(value => value != null)
          .reduce((sum, value) => sum + value, 0);
        comparisons.push({
          studyId: comp.id,
          title: comp.study,
          t1: "Test Positive",
          t2: "Reference",
          dose: null,
          measure: "logDOR",
          effect: logDor,
          se,
          sensitivity: sens,
          specificity: spec,
          totalN: sampleSize || null,
          sampleSize: sampleSize || null
        });
      } else if (comp.effect != null && comp.se != null) {
        const sampleSize = getComparisonSampleSize(comp);
        comparisons.push({
          studyId: comp.id,
          title: comp.study,
          t1: comp.treat1 || "Treatment 1",
          t2: comp.treat2 || "Treatment 2",
          dose: null,
          measure: dataset.effectMeasure || "effect",
          effect: comp.effect,
          se: comp.se,
          year: comp.year,
          totalN: sampleSize,
          sampleSize
        });
      }
    });

    return { comparisons, warnings, exclusions };
  }

  (topic.trials || []).forEach(trial => {
    if (!trial.outcome) {
      const reason = "No outcome data available";
      warnings.push(`${trial.nctId || "Trial"}: ${reason}`);
      if (includeDebug) exclusions.push({ nctId: trial.nctId, title: trial.title, reason });
      return;
    }

    if (!trial.outcome.groups || trial.outcome.groups.length < 2) {
      const reason = `Insufficient groups (${trial.outcome.groups?.length || 0} found, need >=2)`;
      warnings.push(`${trial.nctId || "Trial"}: ${reason}`);
      if (includeDebug) exclusions.push({ nctId: trial.nctId, title: trial.title, reason });
      return;
    }

    const groups = trial.outcome.groups;
    const comparatorIndex = pickComparatorIndex(groups);
    const comparator = groups[comparatorIndex];
    let hasValidComparison = false;

    groups.forEach((group, idx) => {
      if (idx === comparatorIndex) return;
      const effect = computeEffect(group, comparator);

      if (!effect) {
        let reason = "Cannot compute effect size: ";
        const hasBinaryGroup = group.events != null && group.n != null;
        const hasBinaryComparator = comparator.events != null && comparator.n != null;
        const hasContinuousGroup = group.mean != null && group.sd != null && group.n != null;
        const hasContinuousComparator = comparator.mean != null && comparator.sd != null && comparator.n != null;

        if (!hasBinaryGroup && !hasContinuousGroup) {
          reason += `Arm "${group.title || idx}" missing data (events/n or mean/sd/n)`;
        } else if (!hasBinaryComparator && !hasContinuousComparator) {
          reason += `Comparator "${comparator.title || comparatorIndex}" missing data`;
        } else if (hasBinaryGroup && !hasBinaryComparator) {
          reason += "Mixed outcome types (binary vs continuous)";
        } else if (hasContinuousGroup && !hasContinuousComparator) {
          reason += "Mixed outcome types (continuous vs binary)";
        } else {
          reason += "Unknown data issue";
        }

        if (includeDebug && !hasValidComparison) {
          exclusions.push({ nctId: trial.nctId, title: trial.title, reason, arm: group.title });
        }
        return;
      }

      hasValidComparison = true;
      const t1 = inferTreatmentLabel(group, trial, idx);
      const t2 = inferTreatmentLabel(comparator, trial, comparatorIndex);
      const sampleSize = getComparisonSampleSize({ n1: group.n, n0: comparator.n }, trial);
      comparisons.push({
        studyId: trial.nctId,
        title: trial.title,
        t1,
        t2,
        dose: extractDoseFromLabel(t1),
        measure: effect.measure,
        effect: effect.effect,
        se: effect.se,
        n1: toPositiveNumber(group.n),
        n0: toPositiveNumber(comparator.n),
        e1: toFiniteNumber(group.events),
        e0: toFiniteNumber(comparator.events),
        mean1: toFiniteNumber(group.mean),
        mean0: toFiniteNumber(comparator.mean),
        sd1: toFiniteNumber(group.sd),
        sd0: toFiniteNumber(comparator.sd),
        totalN: sampleSize,
        sampleSize
      });
    });
  });

  return { comparisons, warnings, exclusions };
}

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toPositiveNumber(value) {
  const numeric = toFiniteNumber(value);
  return numeric != null && numeric > 0 ? numeric : null;
}

function getComparisonSampleSize(comparison, trial = null) {
  const direct = [comparison?.sampleSize, comparison?.totalN, comparison?.N, comparison?.n];
  for (const value of direct) {
    const numeric = toPositiveNumber(value);
    if (numeric != null) return numeric;
  }

  const n1 = toPositiveNumber(comparison?.n1);
  const n0 = toPositiveNumber(comparison?.n0);
  if (n1 != null && n0 != null) return n1 + n0;

  return toPositiveNumber(trial?.enrollment?.count);
}

function pickComparatorIndex(groups) {
  const anchors = ["control", "placebo", "standard", "usual", "culprit-only", "conventional"];
  const idx = groups.findIndex(g =>
    anchors.some(anchor => (g.title || "").toLowerCase().includes(anchor))
  );
  return idx >= 0 ? idx : 0;
}

function inferTreatmentLabel(group, trial, idx) {
  if (group.title) return group.title;
  if (trial.arms && trial.arms[idx] && trial.arms[idx].title) return trial.arms[idx].title;
  return `Arm ${idx + 1}`;
}

function computeEffect(group, comparator) {
  if (group.events != null && group.n != null && comparator.events != null && comparator.n != null) {
    const res = computeLogRR(group.events, group.n, comparator.events, comparator.n);
    return { ...res, measure: "logRR" };
  }
  if (
    group.mean != null &&
    group.sd != null &&
    group.n != null &&
    comparator.mean != null &&
    comparator.sd != null &&
    comparator.n != null
  ) {
    const res = computeMeanDiff(group.mean, group.sd, group.n, comparator.mean, comparator.sd, comparator.n);
    return { ...res, measure: "MD" };
  }
  return null;
}

function renderOverview(topic) {
  const trials = topic.trials || [];
  const withOutcome = trials.filter(t => t.outcome && t.outcome.groups && t.outcome.groups.length >= 2);
  const { comparisons, warnings } = buildComparisons(topic);
  const meta = comparisons.length ? metaAnalysisAdvanced(comparisons) : null;
  const snapshot = `
    <div class="pill">${trials.length} trials</div>
    <div class="pill">${withOutcome.length} with numeric outcomes</div>
    <div class="pill">${comparisons.length} contrasts</div>
  `;
  dom.overviewSnapshot.innerHTML = snapshot;

  if (meta) {
    dom.metaSummary.innerHTML = `
      <div><strong>Random-effects</strong> pooled ${formatNum(meta.random.mu)} [${formatNum(meta.random.ci[0])}, ${formatNum(meta.random.ci[1])}]</div>
      <div><strong>HKSJ</strong> ${formatNum(meta.hk.ci[0])} to ${formatNum(meta.hk.ci[1])}</div>
      <div><strong>Prediction interval</strong> ${formatNum(meta.pi[0])} to ${formatNum(meta.pi[1])}</div>
      <div><strong>I²</strong> ${formatNum(meta.i2, 1)}% [${formatNum(meta.i2CI?.lower || 0, 0)}, ${formatNum(meta.i2CI?.upper || 100, 0)}] <strong>τ²</strong> ${formatNum(meta.tau2)} ${meta.tau2CI ? `[${formatNum(meta.tau2CI.lower, 3)}, ${meta.tau2CI.upper === Infinity ? '∞' : formatNum(meta.tau2CI.upper, 3)}]` : ''}</div>
    `;
  } else {
    dom.metaSummary.textContent = "Not enough numeric outcomes to compute pooled effects.";
  }

  const warningHtml = warnings.slice(0, 6).map(msg => `<div class="pill pill--warn">${msg}</div>`).join("");
  dom.warningList.innerHTML = warningHtml || "<div class=\"muted\">No critical warnings detected.</div>";
}

// ============================================================================
// TABLE UTILITIES: Sorting, Filtering, Pagination
// ============================================================================

function sortData(data, column, direction, accessor) {
  if (!column || !accessor) return data;
  const sorted = [...data].sort((a, b) => {
    const aVal = accessor(a, column);
    const bVal = accessor(b, column);
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });
  return sorted;
}

function filterData(data, searchQuery, searchFields) {
  if (!searchQuery || !searchQuery.trim()) return data;
  const query = searchQuery.toLowerCase().trim();
  return data.filter(item => {
    return searchFields.some(field => {
      const val = typeof field === "function" ? field(item) : item[field];
      return val && String(val).toLowerCase().includes(query);
    });
  });
}

function paginateData(data, page, pageSize) {
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: data.slice(start, end),
    page: safePage,
    totalPages,
    totalItems: data.length,
    start: start + 1,
    end: Math.min(end, data.length)
  };
}

function renderTableControls(tableName, totalItems, paginationInfo) {
  const ts = state.tableState[tableName];
  return `
    <div class="table-controls">
      <div class="table-search">
        <input type="text"
               placeholder="Search..."
               value="${ts.search || ""}"
               data-table="${tableName}"
               onInput="window.__escAcs.handleTableSearch(this)" />
      </div>
      <div class="table-info">
        ${paginationInfo.totalItems > 0
          ? `Showing ${paginationInfo.start}-${paginationInfo.end} of ${paginationInfo.totalItems}`
          : "No results"}
      </div>
    </div>
  `;
}

function renderTablePagination(tableName, paginationInfo) {
  if (paginationInfo.totalPages <= 1) return "";
  const { page, totalPages } = paginationInfo;
  return `
    <div class="table-pagination">
      <button ${page <= 1 ? "disabled" : ""}
              onclick="window.__escAcs.handleTablePage('${tableName}', ${page - 1})">
        &laquo; Prev
      </button>
      <span>Page ${page} of ${totalPages}</span>
      <button ${page >= totalPages ? "disabled" : ""}
              onclick="window.__escAcs.handleTablePage('${tableName}', ${page + 1})">
        Next &raquo;
      </button>
    </div>
  `;
}

function getSortableHeader(tableName, column, label) {
  const ts = state.tableState[tableName];
  const isSorted = ts.sortCol === column;
  const sortClass = isSorted ? (ts.sortDir === "asc" ? "sortable sort-asc" : "sortable sort-desc") : "sortable";
  return `<th class="${sortClass}" onclick="window.__escAcs.handleTableSort('${tableName}', '${column}')">${label}</th>`;
}

// Global handlers for table interactions
if (typeof window !== "undefined") {
  window.__escAcs = window.__escAcs || {};

  window.__escAcs.handleTableSort = function(tableName, column) {
    const ts = state.tableState[tableName];
    if (ts.sortCol === column) {
      ts.sortDir = ts.sortDir === "asc" ? "desc" : "asc";
    } else {
      ts.sortCol = column;
      ts.sortDir = "asc";
    }
    ts.page = 1; // Reset to first page on sort
    reRenderTable(tableName);
  };

  window.__escAcs.handleTableSearch = function(input) {
    const tableName = input.dataset.table;
    const ts = state.tableState[tableName];
    ts.search = input.value;
    ts.page = 1; // Reset to first page on search
    reRenderTable(tableName);
  };

  window.__escAcs.handleTablePage = function(tableName, page) {
    const ts = state.tableState[tableName];
    ts.page = page;
    reRenderTable(tableName);
  };
}

function reRenderTable(tableName) {
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (!topic) return;

  if (tableName === "trials") renderTrials(topic);
  else if (tableName === "pairwise") renderPairwise(topic);
  else if (tableName === "network") renderNetwork(topic);
}

function resetTableState(tableName) {
  state.tableState[tableName] = {
    sortCol: null,
    sortDir: "asc",
    search: "",
    page: 1,
    pageSize: 20
  };
}

// ============================================================================

function renderTrials(topic) {
  const ts = state.tableState.trials;
  let trials = topic.trials || [];

  // Accessor for sorting
  const trialAccessor = (trial, col) => {
    switch (col) {
      case "nctId": return trial.nctId || "";
      case "title": return trial.title || "";
      case "status": return trial.status || "";
      case "startDate": return trial.startDate || "";
      case "arms": return (trial.arms || []).map(a => a.title).join(", ");
      case "outcome": return trial.outcome ? trial.outcome.title || "" : "";
      default: return "";
    }
  };

  // Filter
  const searchFields = [
    trial => trial.nctId,
    trial => trial.title,
    trial => trial.status,
    trial => (trial.arms || []).map(a => a.title).join(", "),
    trial => trial.outcome?.title
  ];
  trials = filterData(trials, ts.search, searchFields);

  // Sort
  trials = sortData(trials, ts.sortCol, ts.sortDir, trialAccessor);

  // Paginate
  const pagination = paginateData(trials, ts.page, ts.pageSize);

  // Generate rows
  const topicId = state.activeTopicId;
  const rows = pagination.items
    .map(trial => {
      const arms = (trial.arms || []).map(a => a.title).join(", ");
      const outcome = trial.outcome ? `${trial.outcome.title || "Outcome"} (${trial.outcome.type || "unknown"})` : "No results";
      const manualBadge = trial._manual ? ' <span class="badge badge--manual">Manual</span>' : "";
      const rob = getRobForTrial(topicId, trial.nctId);
      const robHtml = rob
        ? `<div class="rob-clickable" onclick="window.__escAcs.openRobModal('${trial.nctId}')" title="Click to edit">${renderRobTrafficLight(rob)}</div>`
        : `<button class="rob-assess-btn" onclick="window.__escAcs.openRobModal('${trial.nctId}')">Assess</button>`;
      return `
        <tr>
          <td>${trial.nctId || "-"}${manualBadge}</td>
          <td>${trial.title || "-"}</td>
          <td>${trial.status || "-"}</td>
          <td>${trial.startDate || "-"}</td>
          <td>${arms || "-"}</td>
          <td>${outcome}</td>
          <td>${robHtml}</td>
        </tr>
      `;
    })
    .join("");

  dom.trialTable.innerHTML = `
    ${renderTableControls("trials", pagination.totalItems, pagination)}
    <table class="table">
      <thead>
        <tr>
          ${getSortableHeader("trials", "nctId", "NCT ID")}
          ${getSortableHeader("trials", "title", "Title")}
          ${getSortableHeader("trials", "status", "Status")}
          ${getSortableHeader("trials", "startDate", "Start")}
          ${getSortableHeader("trials", "arms", "Arms")}
          ${getSortableHeader("trials", "outcome", "Outcome")}
          <th>ROB2</th>
        </tr>
      </thead>
      <tbody>${rows || "<tr><td colspan=\"7\" class=\"muted\">No trials match your search.</td></tr>"}</tbody>
    </table>
    ${renderTablePagination("trials", pagination)}
  `;
}

function renderPairwise(topic) {
  const { comparisons: allComparisons } = buildComparisons(topic);
  const meta = allComparisons.length ? metaAnalysis(allComparisons) : null;
  renderForestPlot(allComparisons, meta);

  const ts = state.tableState.pairwise;
  let comparisons = [...allComparisons];

  // Accessor for sorting
  const compAccessor = (c, col) => {
    switch (col) {
      case "studyId": return c.studyId || "";
      case "comparison": return `${c.t1} vs ${c.t2}`;
      case "measure": return c.measure || "";
      case "effect": return c.effect;
      case "se": return c.se;
      default: return "";
    }
  };

  // Filter
  const searchFields = [
    c => c.studyId,
    c => `${c.t1} vs ${c.t2}`,
    c => c.measure
  ];
  comparisons = filterData(comparisons, ts.search, searchFields);

  // Sort
  comparisons = sortData(comparisons, ts.sortCol, ts.sortDir, compAccessor);

  // Paginate
  const pagination = paginateData(comparisons, ts.page, ts.pageSize);

  // Generate rows
  const rows = pagination.items
    .map(c => {
      const manualBadge = c.id && c.id.startsWith("manual_") ? ' <span class="badge badge--manual">Manual</span>' : "";
      return `
        <tr>
          <td>${c.studyId || "-"}${manualBadge}</td>
          <td>${c.t1} vs ${c.t2}</td>
          <td>${c.measure}</td>
          <td>${formatNum(c.effect)}</td>
          <td>${formatNum(c.se)}</td>
        </tr>
      `;
    })
    .join("");

  dom.pairwiseTable.innerHTML = `
    ${renderTableControls("pairwise", pagination.totalItems, pagination)}
    <table class="table">
      <thead>
        <tr>
          ${getSortableHeader("pairwise", "studyId", "Study")}
          ${getSortableHeader("pairwise", "comparison", "Comparison")}
          ${getSortableHeader("pairwise", "measure", "Measure")}
          ${getSortableHeader("pairwise", "effect", "Effect")}
          ${getSortableHeader("pairwise", "se", "SE")}
        </tr>
      </thead>
      <tbody>${rows || "<tr><td colspan=\"5\" class=\"muted\">No comparisons match your search.</td></tr>"}</tbody>
    </table>
    ${renderTablePagination("pairwise", pagination)}
  `;
}

function renderNetwork(topic) {
  const { comparisons } = buildComparisons(topic);
  if (!comparisons.length) {
    dom.networkTable.textContent = "No contrasts for network meta-analysis.";
    clearCanvas(dom.networkChart);
    return;
  }
  const treatments = Array.from(new Set(comparisons.flatMap(c => [c.t1, c.t2])));
  const requestedRef = dom.referenceTx.value.trim();
  const reference = treatments.includes(requestedRef) ? requestedRef : findReference(treatments);
  const effects = networkMeta(comparisons, treatments, reference);
  const sucra = computeSucra(effects);
  const pscore = computePScore(effects);
  const inconsistency = nmaInconsistency(comparisons, treatments, reference);

  renderNetworkPlot(effects, comparisons);

  const rows = effects
    .map(e => {
      const s = sucra.find(su => su.treatment === e.treatment);
      const p = pscore.find(ps => ps.treatment === e.treatment);
      return `
        <tr>
          <td>${e.treatment}</td>
          <td>${formatNum(e.effect)}</td>
          <td>${s ? formatNum(s.sucra, 3) : "-"}</td>
          <td>${p ? formatNum(p.score, 3) : "-"}</td>
        </tr>
      `;
    })
    .join("");

  // Build inconsistency section
  let inconsistencyHtml = "";
  if (inconsistency.testable && inconsistency.comparisons.length > 0) {
    const inconsistencyRows = inconsistency.comparisons.map(c => `
      <tr class="${c.inconsistent ? "inconsistent-row" : ""}">
        <td>${c.comparison}</td>
        <td>${formatNum(c.direct.effect)} (${formatNum(c.direct.se)})</td>
        <td>${formatNum(c.indirect.effect)} (${formatNum(c.indirect.se)})</td>
        <td>${formatNum(c.difference)}</td>
        <td>${formatNum(c.pValue, 4)}</td>
      </tr>
    `).join("");

    inconsistencyHtml = `
      <h4>Inconsistency Testing (Node-Splitting)</h4>
      <div class="pill ${inconsistency.significantCount > 0 ? "pill--warn" : ""}">${inconsistency.interpretation}</div>
      <table class="table table--small">
        <thead>
          <tr>
            <th>Comparison</th>
            <th>Direct (SE)</th>
            <th>Indirect (SE)</th>
            <th>Difference</th>
            <th>P-value</th>
          </tr>
        </thead>
        <tbody>${inconsistencyRows}</tbody>
      </table>
    `;
  } else if (!inconsistency.testable) {
    inconsistencyHtml = `<div class="muted">${inconsistency.message}</div>`;
  }

  dom.networkTable.innerHTML = `
    <h4>Network Effects</h4>
    <div class="muted">Reference: ${reference} | Treatments: ${treatments.length} | Comparisons: ${comparisons.length}</div>
    <table class="table">
      <thead>
        <tr>
          <th>Treatment</th>
          <th>Effect vs ref</th>
          <th>SUCRA</th>
          <th>P-score</th>
        </tr>
      </thead>
      <tbody>${rows || ""}</tbody>
    </table>
    ${inconsistencyHtml}
  `;
}

function renderDose(topic) {
  const { comparisons } = buildComparisons(topic);
  const points = comparisons
    .filter(c => c.dose != null && Number.isFinite(c.dose))
    .map(c => ({ dose: c.dose, effect: c.effect, se: c.se }))
    .sort((a, b) => a.dose - b.dose);
  const fit = points.length >= 3 ? doseResponseFit(points, "quadratic") : null;
  renderDosePlot(points, fit);
  const rows = points
    .map(p => `<tr><td>${formatNum(p.dose)}</td><td>${formatNum(p.effect)}</td><td>${formatNum(p.se)}</td></tr>`)
    .join("");
  dom.doseTable.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Dose</th>
          <th>Effect</th>
          <th>SE</th>
        </tr>
      </thead>
      <tbody>${rows || ""}</tbody>
    </table>
    <div class="muted">Dose-response fit: ${fit ? `${fit.model} (R2=${formatNum(fit.r2, 2)})` : "insufficient data"}</div>
  `;
}

function renderGrade(topic) {
  const { comparisons } = buildComparisons(topic);

  if (comparisons.length < 2) {
    dom.gradeTable.innerHTML = `
      <div class="pill pill--warn">GRADE assessment requires at least 2 studies.</div>
    `;
    return;
  }

  const meta = metaAnalysisAdvanced(comparisons);
  const egger = eggerTest(comparisons);
  const trialMap = new Map((topic.trials || []).map(trial => [trial.nctId, trial]));

  let pubBiasScore = 0;
  if (egger && Math.abs(egger.intercept) > 2) {
    pubBiasScore = Math.abs(egger.intercept) > 4 ? 2 : 1;
  }

  const studiesWithMeta = comparisons.map(c => {
    const rob = getRobForTrial(topic.id, c.studyId);
    const sampleSize = getComparisonSampleSize(c, trialMap.get(c.studyId));
    return {
      ...c,
      studyId: c.studyId,
      n: sampleSize,
      sampleSize,
      totalN: sampleSize,
      riskOfBias: rob?.overall || "unclear"
    };
  });

  const grade = gradeAssessment(studiesWithMeta, meta, {
    publicationBias: pubBiasScore,
    optimalInformationSize: 400
  });

  if (!grade) {
    dom.gradeTable.innerHTML = `
      <div class="pill pill--warn">Unable to compute GRADE assessment.</div>
    `;
    return;
  }

  const domainRows = Object.entries(grade.domains)
    .filter(([key]) => ["riskOfBias", "inconsistency", "indirectness", "imprecision", "publicationBias"].includes(key))
    .map(([domain, info]) => {
      const domainNames = {
        riskOfBias: "Risk of Bias (ROB2)",
        inconsistency: "Inconsistency",
        indirectness: "Indirectness",
        imprecision: "Imprecision",
        publicationBias: "Publication Bias"
      };
      const levelClass = info.downgrade >= 2 ? "pill--warn" : info.downgrade === 1 ? "pill--caution" : "";

      let extraInfo = "";
      if (domain === "riskOfBias" && info.high !== undefined) {
        extraInfo = `<br><small class="muted">${info.low || 0} low, ${info.some || 0} some, ${info.high || 0} high</small>`;
      } else if (domain === "inconsistency" && info.i2 !== undefined) {
        const i2CIStr = info.i2CI ? ` [${formatNum(info.i2CI.lower, 0)}, ${formatNum(info.i2CI.upper, 0)}]` : "";
        extraInfo = `<br><small class="muted">I² = ${formatNum(info.i2, 1)}%${i2CIStr}</small>`;
      } else if (domain === "imprecision" && info.totalN !== undefined) {
        const missingInfo = info.missingSampleSize ? `, missing n for ${info.missingSampleSize}` : "";
        extraInfo = `<br><small class="muted">N = ${info.totalN}, CI width = ${formatNum(info.ciWidth, 2)}${missingInfo}</small>`;
      }

      return `
        <tr>
          <td>${domainNames[domain] || domain}${extraInfo}</td>
          <td><span class="pill ${levelClass}">${info.level}</span></td>
          <td>${info.downgrade > 0 ? `-${info.downgrade}` : "0"}</td>
        </tr>
      `;
    })
    .join("");

  const certaintyClass = {
    High: "grade-high",
    Moderate: "grade-moderate",
    Low: "grade-low",
    "Very Low": "grade-very-low"
  }[grade.certainty] || "";

  dom.gradeTable.innerHTML = `
    <div class="grade-summary">
      <div class="grade-certainty ${certaintyClass}">
        <h4>Overall Certainty</h4>
        <div class="certainty-badge">${grade.certainty}</div>
        <div class="certainty-stars">${"⊕".repeat(grade.certaintyLevel)}${"⊖".repeat(4 - grade.certaintyLevel)}</div>
      </div>
      <div class="grade-interpretation">
        <p>${grade.interpretation}</p>
      </div>
    </div>

    <h4>GRADE Domains</h4>
    <table class="table">
      <thead>
        <tr>
          <th>Domain</th>
          <th>Level</th>
          <th>Downgrade</th>
        </tr>
      </thead>
      <tbody>${domainRows}</tbody>
    </table>

    <h4>Evidence Profile</h4>
    <div class="evidence-profile">
      <div class="pill">Studies: ${comparisons.length}</div>
      <div class="pill">Effect: ${formatNum(meta.random.mu)} [${formatNum(meta.random.ci[0])}, ${formatNum(meta.random.ci[1])}]</div>
      <div class="pill ${meta.i2 > 50 ? "pill--warn" : ""}">I²: ${formatNum(meta.i2, 1)}% [${formatNum(meta.i2CI?.lower || 0, 0)}, ${formatNum(meta.i2CI?.upper || 100, 0)}]</div>
      <div class="pill">Observed N: ${studiesWithMeta.reduce((sum, study) => sum + (study.sampleSize || 0), 0) || "NR"}</div>
      <div class="pill">Downgrades: ${grade.downgrades}</div>
      ${grade.upgrades > 0 ? `<div class="pill">Upgrades: ${grade.upgrades}</div>` : ""}
    </div>

    <div class="muted grade-note">
      Note: This automated GRADE assessment now uses observed arm denominators where available. Final judgments should still incorporate
      clinical expertise and full risk of bias assessments.
    </div>
  `;
}

function renderCumulative(topic) {
  const { comparisons } = buildComparisons(topic);

  if (comparisons.length < 2) {
    dom.cumulativeTable.innerHTML = `
      <div class="pill pill--warn">Cumulative analysis requires at least 2 studies.</div>
    `;
    clearCanvas(dom.cumulativeChart);
    return;
  }

  // Add dates from trials if available
  const trials = topic.trials || [];
  const studiesWithDates = comparisons.map(c => {
    const trial = trials.find(t => t.nctId === c.studyId);
    return {
      ...c,
      date: trial?.startDate || trial?.completionDate || null
    };
  });

  const cumulative = cumulativeMetaAnalysis(studiesWithDates);

  if (!cumulative.length) {
    dom.cumulativeTable.innerHTML = `
      <div class="pill pill--warn">Unable to compute cumulative meta-analysis.</div>
    `;
    clearCanvas(dom.cumulativeChart);
    return;
  }

  // Render cumulative forest plot
  renderCumulativePlot(cumulative);

  // Build table
  const rows = cumulative.map(c => `
    <tr>
      <td>${c.k}</td>
      <td>${c.studyId || "-"}</td>
      <td>${c.date || "-"}</td>
      <td>${formatNum(c.mu)}</td>
      <td>[${formatNum(c.ci[0])}, ${formatNum(c.ci[1])}]</td>
      <td>${formatNum(c.i2, 1)}%</td>
    </tr>
  `).join("");

  // Calculate stability metrics
  const lastThree = cumulative.slice(-3);
  const effectRange = lastThree.length > 0
    ? Math.max(...lastThree.map(c => c.mu)) - Math.min(...lastThree.map(c => c.mu))
    : 0;
  const isStable = effectRange < 0.1;

  dom.cumulativeTable.innerHTML = `
    <h4>Cumulative Evidence Accrual</h4>
    <div class="cumulative-summary">
      <div class="pill ${isStable ? "" : "pill--warn"}">
        ${isStable ? "Evidence appears stable" : "Evidence still evolving"}
      </div>
      <div class="pill">Final effect: ${formatNum(cumulative[cumulative.length - 1].mu)}</div>
      <div class="pill">Recent variation: ${formatNum(effectRange, 3)}</div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>k</th>
          <th>Study Added</th>
          <th>Date</th>
          <th>Cumulative Effect</th>
          <th>95% CI</th>
          <th>I²</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="muted">
      Cumulative meta-analysis shows how the pooled effect evolved as studies were added chronologically.
      Stable estimates suggest mature evidence; ongoing fluctuation suggests more research needed.
    </div>
  `;
}

function renderCumulativePlot(cumulative) {
  const canvas = dom.cumulativeChart;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!cumulative.length) {
    drawEmptyState(ctx, canvas, "No cumulative data.");
    return;
  }

  const padding = 60;
  const plotWidth = canvas.width - padding * 2;
  const plotHeight = canvas.height - padding * 2;

  // Compute ranges
  const effects = cumulative.map(c => c.mu);
  const cis = cumulative.flatMap(c => c.ci);
  const min = Math.min(...cis, 0);
  const max = Math.max(...cis, 0);
  const range = max - min || 1;

  const scaleX = value => padding + ((value - min) / range) * plotWidth;
  const rowHeight = Math.min(30, plotHeight / cumulative.length);

  // Draw zero line
  const zeroX = scaleX(0);
  ctx.strokeStyle = "#a0a0a0";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(zeroX, padding / 2);
  ctx.lineTo(zeroX, canvas.height - padding / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw cumulative effects
  cumulative.forEach((c, i) => {
    const y = padding + i * rowHeight + rowHeight / 2;

    // CI line
    ctx.strokeStyle = "#0f4c5c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleX(c.ci[0]), y);
    ctx.lineTo(scaleX(c.ci[1]), y);
    ctx.stroke();

    // Effect point
    ctx.fillStyle = i === cumulative.length - 1 ? "#c95c3b" : "#0b7285";
    ctx.beginPath();
    ctx.arc(scaleX(c.mu), y, i === cumulative.length - 1 ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = "#1c1c1c";
    ctx.font = "10px Sora";
    ctx.textAlign = "right";
    ctx.fillText(`k=${c.k}`, padding - 5, y + 3);
  });

  // Connect points with line
  ctx.strokeStyle = "rgba(11, 114, 133, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  cumulative.forEach((c, i) => {
    const y = padding + i * rowHeight + rowHeight / 2;
    const x = scaleX(c.mu);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = "#1c1c1c";
  ctx.font = "11px Sora";
  ctx.textAlign = "center";
  ctx.fillText("Cumulative Effect Size", canvas.width / 2, canvas.height - 10);

  // Final effect highlight
  const final = cumulative[cumulative.length - 1];
  ctx.fillStyle = "#c95c3b";
  ctx.font = "11px Sora";
  ctx.textAlign = "left";
  ctx.fillText(`Final: ${formatNum(final.mu)} [${formatNum(final.ci[0])}, ${formatNum(final.ci[1])}]`,
    padding + 5, canvas.height - padding + 20);
}

function renderDiagnostics(topic) {
  const { comparisons, exclusions } = buildComparisons(topic, true);
  const metaBasic = comparisons.length >= 2 ? metaAnalysis(comparisons) : null;

  // Render funnel plot
  renderFunnelPlot(comparisons, metaBasic);

  // Build exclusion summary
  const trials = topic.trials || [];
  const trialsWithOutcome = trials.filter(t => t.outcome && t.outcome.groups && t.outcome.groups.length >= 2);
  const exclusionHtml = exclusions.length > 0 ? `
    <details class="exclusion-details">
      <summary class="pill pill--warn">
        ${exclusions.length} trials excluded (click to see reasons)
      </summary>
      <table class="table table--small">
        <thead><tr><th>NCT ID</th><th>Reason</th></tr></thead>
        <tbody>
          ${exclusions.slice(0, 20).map(e => `<tr><td>${e.nctId || "-"}</td><td>${e.reason}</td></tr>`).join("")}
          ${exclusions.length > 20 ? `<tr><td colspan="2" class="muted">...and ${exclusions.length - 20} more</td></tr>` : ""}
        </tbody>
      </table>
    </details>
  ` : "";

  if (comparisons.length < 2) {
    dom.diagnosticTable.innerHTML = `
      <div class="pill pill--warn">Diagnostics require at least 2 contrasts (found ${comparisons.length}).</div>
      <div class="muted">Total trials: ${trials.length} | With outcome data: ${trialsWithOutcome.length}</div>
      ${exclusionHtml}
    `;
    return;
  }

  const meta = metaAnalysisAdvanced(comparisons);
  const egger = eggerTest(comparisons);
  const begg = beggTest(comparisons);
  const peters = petersTest(comparisons);
  const pet = petPeese(comparisons);
  const loo = leaveOneOut(comparisons);
  const looRows = loo
    .map(res => {
      return `<tr><td>${comparisons[res.index].studyId || "-"}</td><td>${formatNum(res.mu)}</td><td>${formatNum(res.delta)}</td><td>${formatNum(res.cook, 3)}</td></tr>`;
    })
    .join("");

  // Interpret bias tests (using p-values)
  const eggerSignificant = egger && egger.pValue !== undefined ? egger.pValue < 0.1 : Math.abs(egger?.intercept || 0) > 2;
  const beggSignificant = begg && begg.pValue !== undefined ? begg.pValue < 0.1 : Math.abs(begg?.tau || 0) > 0.3;
  const petersSignificant = peters && peters.pValue < 0.1;
  const biasWarning = (eggerSignificant || beggSignificant || petersSignificant) ?
    `<div class="pill pill--warn">Potential publication bias detected</div>` : "";

  dom.diagnosticTable.innerHTML = `
    <h4>Heterogeneity</h4>
    <div class="pill">HKSJ CI: ${formatNum(meta.hk.ci[0])} to ${formatNum(meta.hk.ci[1])}</div>
    <div class="pill">Prediction interval: ${formatNum(meta.pi[0])} to ${formatNum(meta.pi[1])}</div>
    <div class="pill ${meta.i2 > 75 ? "pill--warn" : ""}">I² ${formatNum(meta.i2, 1)}% [${formatNum(meta.i2CI?.lower || 0, 0)}, ${formatNum(meta.i2CI?.upper || 100, 0)}]${meta.i2 > 75 ? " (high)" : meta.i2 > 50 ? " (moderate)" : " (low)"}</div>
    <div class="pill">H² ${formatNum(meta.h2, 2)}</div>
    <div class="pill">τ² ${formatNum(meta.tau2)} ${meta.tau2CI ? `[${formatNum(meta.tau2CI.lower, 3)}, ${meta.tau2CI.upper === Infinity ? '∞' : formatNum(meta.tau2CI.upper, 3)}]` : ''}</div>

    <h4>Publication Bias</h4>
    ${biasWarning}
    <div class="pill ${eggerSignificant ? "pill--warn" : ""}">Egger intercept ${egger ? formatNum(egger.intercept) : "NA"}${egger?.pValue !== undefined ? ` (p=${formatNum(egger.pValue, 3)})` : ""}</div>
    <div class="pill ${beggSignificant ? "pill--warn" : ""}">Begg τ ${begg ? formatNum(begg.tau) : "NA"}${begg?.pValue !== undefined ? ` (p=${formatNum(begg.pValue, 3)})` : ""}</div>
    <div class="pill ${petersSignificant ? "pill--warn" : ""}">Peters test ${peters?.pValue !== undefined ? `p=${formatNum(peters.pValue, 3)}` : "NA (need n1/n0)"}</div>
    <div class="pill">PET slope ${pet ? formatNum(pet.pet.beta[1]) : "NA"}</div>
    <div class="pill">PEESE slope ${pet ? formatNum(pet.peese.beta[1]) : "NA"}</div>

    <h4>Sensitivity Analysis (Leave-One-Out)</h4>
    <table class="table">
      <thead>
        <tr>
          <th>Study</th>
          <th>Leave-one-out mu</th>
          <th>Delta</th>
          <th>Cook D</th>
        </tr>
      </thead>
      <tbody>${looRows || ""}</tbody>
    </table>

    <h4>Data Quality</h4>
    <div class="muted">Total trials: ${trials.length} | With outcome data: ${trialsWithOutcome.length} | Contrasts: ${comparisons.length}</div>
    ${exclusionHtml}

    <h4>Risk of Bias (ROB2)</h4>
    ${renderRobSummaryTable(topic)}
    ${renderRobSensitivity(topic, comparisons)}
  `;
}

function renderRobSensitivity(topic, comparisons) {
  const robCounts = countRobByLevel(topic);
  const totalAssessed = robCounts.low + robCounts.some + robCounts.high;

  if (totalAssessed < 2) {
    return `<div class="muted">Not enough ROB assessments for sensitivity analysis (need at least 2).</div>`;
  }

  // Filter comparisons to exclude high-risk studies
  const highRiskTrialIds = new Set();
  (topic.trials || []).forEach(trial => {
    const rob = getRobForTrial(topic.id, trial.nctId);
    if (rob?.overall === "high") {
      highRiskTrialIds.add(trial.nctId);
    }
  });

  const lowRiskComparisons = comparisons.filter(c => !highRiskTrialIds.has(c.studyId));

  if (lowRiskComparisons.length < 2) {
    return `
      <div class="muted">
        ROB Summary: ${robCounts.low} low, ${robCounts.some} some concerns, ${robCounts.high} high risk, ${robCounts.notAssessed} not assessed
      </div>
      <div class="pill pill--warn">Not enough low/some-concerns studies for sensitivity analysis after excluding ${highRiskTrialIds.size} high-risk studies.</div>
    `;
  }

  const originalMeta = comparisons.length >= 2 ? metaAnalysis(comparisons) : null;
  const sensitivityMeta = metaAnalysis(lowRiskComparisons);

  const changeMagnitude = originalMeta
    ? Math.abs(sensitivityMeta.random.mu - originalMeta.random.mu)
    : 0;
  const changePercent = originalMeta && originalMeta.random.mu !== 0
    ? ((changeMagnitude / Math.abs(originalMeta.random.mu)) * 100).toFixed(1)
    : "N/A";

  return `
    <div class="muted" style="margin-bottom: 8px;">
      ROB Summary: ${robCounts.low} low, ${robCounts.some} some concerns, ${robCounts.high} high risk, ${robCounts.notAssessed} not assessed
    </div>
    <div class="sensitivity-comparison">
      <table class="table table--small">
        <thead>
          <tr>
            <th>Analysis</th>
            <th>Studies</th>
            <th>Effect</th>
            <th>95% CI</th>
            <th>I2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>All studies</td>
            <td>${comparisons.length}</td>
            <td>${originalMeta ? formatNum(originalMeta.random.mu) : "-"}</td>
            <td>${originalMeta ? `[${formatNum(originalMeta.random.ci[0])}, ${formatNum(originalMeta.random.ci[1])}]` : "-"}</td>
            <td>${originalMeta ? formatNum(originalMeta.i2, 1) + "%" : "-"}</td>
          </tr>
          <tr>
            <td>Excluding high-risk (${highRiskTrialIds.size})</td>
            <td>${lowRiskComparisons.length}</td>
            <td>${formatNum(sensitivityMeta.random.mu)}</td>
            <td>[${formatNum(sensitivityMeta.random.ci[0])}, ${formatNum(sensitivityMeta.random.ci[1])}]</td>
            <td>${formatNum(sensitivityMeta.i2, 1)}%</td>
          </tr>
        </tbody>
      </table>
      <div class="muted" style="margin-top: 4px;">
        Effect change: ${formatNum(changeMagnitude)} (${changePercent}%)
        ${changeMagnitude > 0.1 ? ' <span class="pill pill--warn">Notable change</span>' : ""}
      </div>
    </div>
  `;
}

function renderRaw(topic) {
  const raw = (topic.trials || []).map(t => t.raw || t);
  dom.rawJson.textContent = JSON.stringify(raw, null, 2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateText(value, max = 180) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function appendQueryParam(href, key, value) {
  if (!value) return href;
  if (href.includes(`${key}=`) || href.includes(`${encodeURIComponent(key)}=`)) return href;
  return `${href}${href.includes("?") ? "&" : "?"}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function buildRunnerHref(href, topic) {
  let resolvedHref = String(href || "r-validation-runner.html");
  resolvedHref = appendQueryParam(resolvedHref, "topic", topic?.id || topic?.slug || "");
  resolvedHref = appendQueryParam(resolvedHref, "label", topic?.label || "");
  return resolvedHref;
}

function buildTopicValidationContext(topic, comparisons) {
  const trials = topic.trials || [];
  return {
    source: "esc-acs-app",
    topicId: topic.id,
    label: topic.label,
    query: topic.query || null,
    includedCount: trials.length,
    comparisonCount: comparisons.length,
    totalEnrollment: trials.reduce((sum, trial) => sum + (toPositiveNumber(trial.enrollment?.count) || 0), 0),
    demographicsCoverage: trials.reduce((sum, trial) => sum + (trial.demographics ? 1 : 0), 0),
    documentCoverage: trials.reduce((sum, trial) => sum + ((trial.documents || []).length > 0 ? 1 : 0), 0),
    comparisons: comparisons.map(comparison => ({
      studyId: comparison.studyId,
      title: comparison.title,
      t1: comparison.t1,
      t2: comparison.t2,
      measure: comparison.measure,
      effect: comparison.effect,
      se: comparison.se,
      n1: toPositiveNumber(comparison.n1),
      n0: toPositiveNumber(comparison.n0),
      totalN: getComparisonSampleSize(comparison)
    })),
    includedStudies: trials.map(trial => ({
      nctId: trial.nctId || null,
      title: trial.title || null,
      status: trial.status || null,
      enrollment: toPositiveNumber(trial.enrollment?.count),
      documentsCount: Array.isArray(trial.documents) ? trial.documents.length : 0,
      hasDemographics: Boolean(trial.demographics),
      outcome: trial.outcome ? {
        type: trial.outcome.type || null,
        title: trial.outcome.title || null,
        groups: (trial.outcome.groups || []).map(group => ({
          title: group.title || null,
          n: toPositiveNumber(group.n),
          events: toFiniteNumber(group.events),
          mean: toFiniteNumber(group.mean),
          sd: toFiniteNumber(group.sd)
        }))
      } : null,
      primaryOutcomes: (trial.primaryOutcomes || []).slice(0, 2).map(item => ({
        measure: item.measure || item.title || "",
        timeFrame: item.timeFrame || ""
      }))
    }))
  };
}

function postRunnerContextToIframe(iframe, context) {
  if (!iframe || !context) return;
  const sendContext = () => {
    if (!iframe.contentWindow) return;
    iframe.contentWindow.postMessage({
      type: "esc-topic-validation-context",
      payload: context
    }, "*");
  };

  iframe.addEventListener("load", sendContext, { once: true });
  window.setTimeout(sendContext, 250);
}

function renderTransparency(topic) {
  const trials = topic.trials || [];
  const comparisons = buildComparisons(topic).comparisons || [];
  const raw = trials.map(t => t.raw || t);
  const robCounts = countRobByLevel(topic);
  const queryText = topic.query || `BASE ACS query + ${topic.keywords.join(", ")}`;
  const topicSearchUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(`(${topic.label}) AND (meta-analysis OR systematic review)`)}`;
  const topicGuidelineUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(`(${topic.label}) AND randomized`)}`;
  const rValidationHref = buildRunnerHref(APP_CONFIG.rValidationHref || "r-validation-runner.html", topic);
  const observedTotalN = comparisons.reduce((sum, comparison) => sum + (getComparisonSampleSize(comparison) || 0), 0);
  const runnerContext = buildTopicValidationContext(topic, comparisons);

  dom.transparencySummary.innerHTML = `
    <div class="pill">${trials.length} trials captured</div>
    <div class="pill">${comparisons.length} contrasts analyzable</div>
    <div class="pill">${raw.length} raw records preserved</div>
    <div class="pill">Observed denominator total: ${observedTotalN || "NR"}</div>
    <div class="pill">ROB2 low: ${robCounts.low}</div>
    <div class="pill pill--warn">ROB2 not assessed: ${robCounts.notAssessed}</div>
    <div class="muted" style="margin-top: 12px;">
      <strong>Search provenance:</strong> ${escapeHtml(queryText)}
    </div>
    <div class="muted" style="margin-top: 8px;">
      <strong>Reviewer route:</strong> use this tab for provenance, the <code>Raw Records</code> tab for full record JSON, and the embedded validation runner below for topic-aware engine checks.
    </div>
  `;

  if (!trials.length) {
    dom.transparencyLedger.innerHTML = `<p class="muted">No trials loaded for this topic yet.</p>`;
  } else {
    const rows = trials.slice(0, 20).map(trial => {
      const rob = getRobForTrial(topic.id, trial.nctId);
      const overall = rob?.overall || "not assessed";
      const groups = trial.outcome?.groups?.length || 0;
      const excerpt = truncateText(trial.raw?.protocolSection?.descriptionModule?.briefSummary || trial.description || trial.title || "No abstract snippet available.", 180);
      return `
        <tr>
          <td>${escapeHtml(trial.nctId || "-")}</td>
          <td>${escapeHtml(trial.title || "-")}</td>
          <td>${escapeHtml(trial.status || "-")}</td>
          <td>${groups}</td>
          <td>${escapeHtml(overall)}</td>
          <td>${escapeHtml(excerpt)}</td>
        </tr>
      `;
    }).join("");
    dom.transparencyLedger.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>NCT</th>
            <th>Title</th>
            <th>Status</th>
            <th>Outcome Arms</th>
            <th>ROB2</th>
            <th>Record Excerpt</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="muted" style="margin-top: 8px;">Showing up to 20 records. Use the Raw Records tab for full JSON and field-level checking.</div>
    `;
  }

  const comparisonRows = comparisons.slice(0, 12).map(comparison => `
    <tr>
      <td>${escapeHtml(comparison.studyId || "-")}</td>
      <td>${escapeHtml(`${comparison.t1 || "Treatment"} vs ${comparison.t2 || "Comparator"}`)}</td>
      <td>${escapeHtml(comparison.measure || "-")}</td>
      <td>${getComparisonSampleSize(comparison) || "NR"}</td>
    </tr>
  `).join("");

  dom.transparencyBenchmarks.innerHTML = `
    <div class="muted" style="margin-bottom: 12px;">
      Benchmark reconciliation is a first-class review step here: compare the registry-native contrast ledger below against published syntheses, then inspect the topic-aware validation runner.
    </div>
    <div class="pill"><a href="${topicSearchUrl}" target="_blank" rel="noopener">PubMed meta-analysis search for this topic</a></div>
    <div class="pill"><a href="${topicGuidelineUrl}" target="_blank" rel="noopener">PubMed randomized-trial search for this topic</a></div>
    <div class="pill"><a href="${escapeHtml(rValidationHref)}" target="_blank" rel="noopener">Open the R validation runner</a></div>
    <table class="table" style="margin-top: 16px;">
      <thead>
        <tr>
          <th>Study</th>
          <th>Registry Contrast</th>
          <th>Measure</th>
          <th>Observed N</th>
        </tr>
      </thead>
      <tbody>${comparisonRows || '<tr><td colspan="4">No analyzable contrasts available.</td></tr>'}</tbody>
    </table>
    <iframe
      data-runner-frame
      src="${escapeHtml(rValidationHref)}"
      title="Topic-aware validation runner"
      loading="lazy"
      style="width: 100%; min-height: 420px; border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 18px; background: rgba(15, 23, 42, 0.88); margin-top: 16px;"
    ></iframe>
  `;

  postRunnerContextToIframe(dom.transparencyBenchmarks.querySelector('[data-runner-frame]'), runnerContext);
}

function renderForestPlot(comparisons, meta) {
  const canvas = dom.forestChart;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Filter out excluded studies if any
  const excludedSet = state.forestPlot.excludedStudies;
  const activeComparisons = comparisons.filter(c => !excludedSet.has(c.studyId));

  // Update excluded count display
  if (dom.forestExcludedCount) {
    const excludedCount = comparisons.length - activeComparisons.length;
    dom.forestExcludedCount.textContent = excludedCount > 0
      ? `${excludedCount} study(ies) excluded`
      : "";
  }

  // Re-calculate meta for active comparisons if needed
  const activeMeta = activeComparisons.length >= 2 ? metaAnalysis(activeComparisons) : meta;

  if (!comparisons.length) {
    drawEmptyState(ctx, canvas, "No pairwise data.");
    state.forestPlot.elements = [];
    return;
  }

  const effects = comparisons.map(c => c.effect);
  const ses = comparisons.map(c => c.se);
  const cis = comparisons.map((c, i) => [effects[i] - 1.96 * ses[i], effects[i] + 1.96 * ses[i]]);

  // Calculate weights (inverse variance)
  const variances = ses.map(se => se * se);
  const weights = variances.map(v => v > 0 ? 1 / v : 0);
  const maxWeight = Math.max(...weights);
  const normalizedWeights = weights.map(w => maxWeight > 0 ? w / maxWeight : 0);

  const min = Math.min(...cis.flat(), activeMeta?.random?.ci?.[0] || 0, 0);
  const max = Math.max(...cis.flat(), activeMeta?.random?.ci?.[1] || 0, 0);
  const padding = 50;
  const labelWidth = 150;
  const plotWidth = canvas.width - padding - labelWidth;
  const rowHeight = Math.min(28, (canvas.height - padding * 2.5) / (comparisons.length + 1));
  const range = max - min || 1;
  const scale = value => labelWidth + ((value - min) / range) * plotWidth;
  const zeroX = scale(0);

  // Store elements for hit testing
  state.forestPlot.elements = [];

  // Draw vertical line at zero (null effect)
  ctx.strokeStyle = "#a0a0a0";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(zeroX, padding / 2);
  ctx.lineTo(zeroX, canvas.height - padding);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw column headers
  ctx.fillStyle = "#666";
  ctx.font = "bold 10px Sora";
  ctx.fillText("Study", 10, padding / 2 + 4);
  ctx.fillText("Effect [95% CI]", canvas.width - 120, padding / 2 + 4);

  // Draw each study
  comparisons.forEach((comp, i) => {
    const y = padding + i * rowHeight + rowHeight / 2;
    const [l, u] = cis[i];
    const isExcluded = excludedSet.has(comp.studyId);
    const isHovered = state.forestPlot.hoveredIndex === i;

    // Calculate box size based on weight (min 4px, max 14px)
    const boxSize = 4 + normalizedWeights[i] * 10;

    // Store element bounds for hit testing
    state.forestPlot.elements.push({
      index: i,
      studyId: comp.studyId,
      x: scale(l),
      y: y - boxSize / 2,
      width: scale(u) - scale(l),
      height: boxSize,
      effect: comp.effect,
      se: comp.se,
      ci: [l, u],
      weight: weights[i],
      normalizedWeight: normalizedWeights[i],
      comparison: `${comp.t1} vs ${comp.t2}`,
      measure: comp.measure
    });

    // Draw CI line
    ctx.strokeStyle = isExcluded ? "#ccc" : (isHovered ? "#e67e22" : "#0f4c5c");
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(scale(l), y);
    ctx.lineTo(scale(u), y);
    ctx.stroke();

    // Draw effect point (square proportional to weight)
    ctx.fillStyle = isExcluded ? "#ccc" : (isHovered ? "#e67e22" : "#0b7285");
    ctx.fillRect(scale(comp.effect) - boxSize / 2, y - boxSize / 2, boxSize, boxSize);

    // Draw study label
    ctx.fillStyle = isExcluded ? "#aaa" : (isHovered ? "#e67e22" : "#1c1c1c");
    ctx.font = isHovered ? "bold 10px Sora" : "10px Sora";
    const label = (comp.studyId || "Unknown").substring(0, 20);
    ctx.fillText(label, 10, y + 4);

    // Draw effect estimate on the right
    ctx.fillStyle = isExcluded ? "#aaa" : "#333";
    ctx.font = "10px Source Code Pro, monospace";
    const effectText = `${formatNum(comp.effect)} [${formatNum(l)}, ${formatNum(u)}]`;
    ctx.fillText(effectText, canvas.width - 140, y + 4);
  });

  // Draw pooled effect diamond
  if (activeMeta) {
    const diamondY = padding + comparisons.length * rowHeight + rowHeight / 2;
    const mu = activeMeta.random?.mu || activeMeta.mu;
    const ciLow = activeMeta.random?.ci?.[0] || activeMeta.ci?.[0];
    const ciHigh = activeMeta.random?.ci?.[1] || activeMeta.ci?.[1];

    if (mu != null && ciLow != null && ciHigh != null) {
      // Draw diamond
      ctx.fillStyle = "#c95c3b";
      ctx.beginPath();
      ctx.moveTo(scale(mu), diamondY - 8);
      ctx.lineTo(scale(ciHigh), diamondY);
      ctx.lineTo(scale(mu), diamondY + 8);
      ctx.lineTo(scale(ciLow), diamondY);
      ctx.closePath();
      ctx.fill();

      // Draw pooled label
      ctx.fillStyle = "#c95c3b";
      ctx.font = "bold 10px Sora";
      ctx.fillText("Pooled (RE)", 10, diamondY + 4);

      // Draw pooled effect text
      ctx.font = "bold 10px Source Code Pro, monospace";
      ctx.fillText(`${formatNum(mu)} [${formatNum(ciLow)}, ${formatNum(ciHigh)}]`, canvas.width - 140, diamondY + 4);
    }
  }

  // Draw x-axis
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(labelWidth, canvas.height - padding + 10);
  ctx.lineTo(canvas.width - padding, canvas.height - padding + 10);
  ctx.stroke();

  // Draw x-axis labels
  ctx.fillStyle = "#666";
  ctx.font = "10px Sora";
  ctx.textAlign = "center";
  const tickValues = [min, min + range * 0.25, 0, max - range * 0.25, max].filter((v, i, arr) =>
    !arr.slice(0, i).some(prev => Math.abs(prev - v) < range * 0.1)
  );
  tickValues.forEach(val => {
    const x = scale(val);
    ctx.fillText(formatNum(val, 2), x, canvas.height - padding + 24);
  });
  ctx.textAlign = "left";

  // Set up event listeners if not already done
  if (!canvas._forestEventsAttached) {
    canvas._forestEventsAttached = true;

    canvas.addEventListener("mousemove", handleForestMouseMove);
    canvas.addEventListener("mouseleave", handleForestMouseLeave);
    canvas.addEventListener("click", handleForestClick);
  }
}

function handleForestMouseMove(e) {
  const canvas = dom.forestChart;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Find hovered element
  const hitIndex = state.forestPlot.elements.findIndex(el => {
    return x >= el.x - 10 && x <= el.x + el.width + 10 &&
           y >= el.y - 5 && y <= el.y + el.height + 5;
  });

  if (hitIndex !== state.forestPlot.hoveredIndex) {
    state.forestPlot.hoveredIndex = hitIndex;
    // Re-render to update highlight
    const topic = state.topics.find(t => t.id === state.activeTopicId);
    if (topic) {
      const { comparisons } = buildComparisons(topic);
      const meta = comparisons.length ? metaAnalysis(comparisons) : null;
      renderForestPlot(comparisons, meta);
    }
  }

  // Show/hide tooltip
  if (hitIndex >= 0 && dom.forestTooltip) {
    const el = state.forestPlot.elements[hitIndex];
    const isExcluded = state.forestPlot.excludedStudies.has(el.studyId);

    dom.forestTooltip.innerHTML = `
      <div class="tooltip-title">${el.studyId}</div>
      <div class="tooltip-row">
        <span class="tooltip-label">Comparison:</span>
        <span class="tooltip-value">${el.comparison}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Effect:</span>
        <span class="tooltip-value">${formatNum(el.effect)} (${el.measure})</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">95% CI:</span>
        <span class="tooltip-value">[${formatNum(el.ci[0])}, ${formatNum(el.ci[1])}]</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">SE:</span>
        <span class="tooltip-value">${formatNum(el.se)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Weight:</span>
        <span class="tooltip-value">${(el.normalizedWeight * 100).toFixed(1)}%</span>
      </div>
      ${isExcluded ? '<div class="tooltip-excluded">Click to include</div>' : '<div class="muted" style="margin-top:6px;font-size:11px;">Click to exclude from analysis</div>'}
    `;

    // Position tooltip
    const tooltipX = Math.min(e.clientX - rect.left + 15, canvas.width - 200);
    const tooltipY = Math.max(e.clientY - rect.top - 80, 10);
    dom.forestTooltip.style.left = tooltipX + "px";
    dom.forestTooltip.style.top = tooltipY + "px";
    dom.forestTooltip.classList.remove("hidden");
  } else if (dom.forestTooltip) {
    dom.forestTooltip.classList.add("hidden");
  }
}

function handleForestMouseLeave() {
  state.forestPlot.hoveredIndex = -1;
  if (dom.forestTooltip) {
    dom.forestTooltip.classList.add("hidden");
  }
  // Re-render to clear highlight
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (topic) {
    const { comparisons } = buildComparisons(topic);
    const meta = comparisons.length ? metaAnalysis(comparisons) : null;
    renderForestPlot(comparisons, meta);
  }
}

function handleForestClick(e) {
  const canvas = dom.forestChart;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Find clicked element
  const hitIndex = state.forestPlot.elements.findIndex(el => {
    return x >= el.x - 10 && x <= el.x + el.width + 10 &&
           y >= el.y - 5 && y <= el.y + el.height + 5;
  });

  if (hitIndex >= 0) {
    const el = state.forestPlot.elements[hitIndex];
    const studyId = el.studyId;

    // Toggle exclusion
    if (state.forestPlot.excludedStudies.has(studyId)) {
      state.forestPlot.excludedStudies.delete(studyId);
      log(`Included study "${studyId}" in analysis.`);
    } else {
      state.forestPlot.excludedStudies.add(studyId);
      log(`Excluded study "${studyId}" from analysis.`);
    }

    // Re-render
    const topic = state.topics.find(t => t.id === state.activeTopicId);
    if (topic) {
      const { comparisons } = buildComparisons(topic);
      const meta = comparisons.length ? metaAnalysis(comparisons) : null;
      renderForestPlot(comparisons, meta);
    }
  }
}

function resetForestExclusions() {
  state.forestPlot.excludedStudies.clear();
  log("Reset all study exclusions.");
  // Re-render
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (topic) {
    const { comparisons } = buildComparisons(topic);
    const meta = comparisons.length ? metaAnalysis(comparisons) : null;
    renderForestPlot(comparisons, meta);
  }
}

function renderNetworkPlot(effects, contrasts) {
  const canvas = dom.networkChart;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const nodes = effects.map(e => e.treatment);
  if (!nodes.length) {
    drawEmptyState(ctx, canvas, "No network data.");
    return;
  }
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 60;
  const positions = new Map();
  nodes.forEach((name, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    positions.set(name, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  });
  ctx.strokeStyle = "rgba(15, 76, 92, 0.3)";
  ctx.lineWidth = 1.5;
  contrasts.forEach(c => {
    const p1 = positions.get(c.t1);
    const p2 = positions.get(c.t2);
    if (!p1 || !p2) return;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });
  nodes.forEach(name => {
    const pos = positions.get(name);
    ctx.fillStyle = "#0f4c5c";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c1c1c";
    ctx.font = "11px Sora";
    ctx.fillText(name, pos.x + 12, pos.y + 4);
  });
}

function renderDosePlot(points, fit) {
  const canvas = dom.doseChart;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!points.length) {
    drawEmptyState(ctx, canvas, "No dose-response data.");
    return;
  }
  const padding = 50;
  const doses = points.map(p => p.dose);
  const effects = points.map(p => p.effect);
  const minX = Math.min(...doses);
  const maxX = Math.max(...doses);
  const minY = Math.min(...effects);
  const maxY = Math.max(...effects);
  const scaleX = x => padding + ((x - minX) / (maxX - minX || 1)) * (canvas.width - padding * 2);
  const scaleY = y => canvas.height - padding - ((y - minY) / (maxY - minY || 1)) * (canvas.height - padding * 2);
  ctx.strokeStyle = "#a0a0a0";
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();
  ctx.fillStyle = "#0b7285";
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(scaleX(p.dose), scaleY(p.effect), 4, 0, Math.PI * 2);
    ctx.fill();
  });
  if (fit && fit.fitted) {
    ctx.strokeStyle = "#c95c3b";
    ctx.beginPath();
    points.forEach((p, idx) => {
      const x = scaleX(p.dose);
      const y = scaleY(fit.fitted[idx]);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

function drawEmptyState(ctx, canvas, message) {
  ctx.fillStyle = "#5b5b5b";
  ctx.font = "12px Sora";
  ctx.fillText(message, canvas.width / 2 - 50, canvas.height / 2);
}

function renderFunnelPlot(comparisons, meta) {
  const canvas = dom.funnelChart;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!comparisons.length || !meta) {
    drawEmptyState(ctx, canvas, "Insufficient data for funnel plot.");
    return;
  }

  const funnel = funnelPlotData(comparisons, meta);
  if (!funnel) {
    drawEmptyState(ctx, canvas, "Cannot compute funnel plot.");
    return;
  }

  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const plotWidth = canvas.width - padding.left - padding.right;
  const plotHeight = canvas.height - padding.top - padding.bottom;

  // Compute scales
  const effectMin = Math.min(funnel.effectRange[0], meta.mu - 2 * funnel.seRange[1]);
  const effectMax = Math.max(funnel.effectRange[1], meta.mu + 2 * funnel.seRange[1]);
  const effectPadding = (effectMax - effectMin) * 0.1;

  const scaleX = effect => padding.left + ((effect - effectMin + effectPadding) / (effectMax - effectMin + 2 * effectPadding)) * plotWidth;
  const scaleY = se => padding.top + (se / funnel.seRange[1]) * plotHeight;

  // Draw pseudo-confidence bands (inverted triangle)
  ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
  ctx.beginPath();
  ctx.moveTo(scaleX(meta.mu), padding.top); // Top of funnel (SE=0)
  ctx.lineTo(scaleX(meta.mu - 1.96 * funnel.seRange[1]), scaleY(funnel.seRange[1])); // Bottom left
  ctx.lineTo(scaleX(meta.mu + 1.96 * funnel.seRange[1]), scaleY(funnel.seRange[1])); // Bottom right
  ctx.closePath();
  ctx.fill();

  // Draw vertical line at pooled effect
  ctx.strokeStyle = "#c95c3b";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(scaleX(meta.mu), padding.top);
  ctx.lineTo(scaleX(meta.mu), canvas.height - padding.bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw zero line (no effect)
  ctx.strokeStyle = "#a0a0a0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(scaleX(0), padding.top);
  ctx.lineTo(scaleX(0), canvas.height - padding.bottom);
  ctx.stroke();

  // Draw study points
  ctx.fillStyle = "#0b7285";
  funnel.points.forEach(point => {
    const x = scaleX(point.effect);
    const y = scaleY(point.se);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw axes
  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Y-axis
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, canvas.height - padding.bottom);
  // X-axis
  ctx.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
  ctx.stroke();

  // Labels
  ctx.fillStyle = "#1c1c1c";
  ctx.font = "11px Sora";
  ctx.textAlign = "center";
  ctx.fillText("Effect Size", canvas.width / 2, canvas.height - 10);

  ctx.save();
  ctx.translate(15, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Standard Error", 0, 0);
  ctx.restore();

  // Legend
  ctx.font = "10px Sora";
  ctx.textAlign = "left";
  ctx.fillStyle = "#c95c3b";
  ctx.fillText(`Pooled: ${formatNum(meta.mu)}`, padding.left + 5, padding.top + 15);
  ctx.fillStyle = "#1c1c1c";
  ctx.fillText(`k = ${funnel.points.length}`, padding.left + 5, padding.top + 28);
}

function clearCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function findReference(treatments) {
  const anchors = ["standard", "placebo", "control", "usual"];
  return treatments.find(t => anchors.some(a => t.toLowerCase().includes(a))) || treatments[0];
}

function formatNum(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return "-";
  return Number(value).toFixed(digits);
}

function compareCoverage() {
  const prior = dom.priorTrials.value
    .split(/\s+/)
    .map(v => v.trim())
    .filter(Boolean);
  const seen = new Set();
  state.topics.forEach(topic => {
    (topic.trials || []).forEach(trial => {
      if (trial.nctId) seen.add(trial.nctId);
    });
  });
  const missing = prior.filter(id => !seen.has(id));
  const extra = Array.from(seen).filter(id => !prior.includes(id));
  dom.coverageSummary.innerHTML = `
    <div class="pill">Prior trials: ${prior.length}</div>
    <div class="pill">Captured: ${prior.length - missing.length}</div>
    <div class="pill pill--warn">Missing: ${missing.length}</div>
    <div class="pill">New since prior: ${extra.length}</div>
  `;
}

function initWorker() {
  if (worker) worker.terminate();
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  worker.onmessage = event => {
    const msg = event.data;
    if (msg.type === "log") {
      log(msg.message);
    }
    if (msg.type === "topicProgress") {
      updateTopicData(msg.topicId, msg.trials, msg.query);
      renderTopicList();
      if (state.activeTopicId === msg.topicId) {
        renderTopicDetail();
        renderActiveTab(true);
      }
    }
    if (msg.type === "updateComplete") {
      dom.lastUpdate.textContent = msg.lastUpdate || new Date().toISOString();
      saveCache({
        lastUpdate: dom.lastUpdate.textContent,
        topics: state.topics
      }).then(() => {
        dom.updateBtn.disabled = false;
        log("Update complete.");
      });
    }
    if (msg.type === "error") {
      dom.updateBtn.disabled = false;
      log(msg.message);
    }
  };
}

function updateTopicData(topicId, trials, query) {
  state.topics = state.topics.map(topic =>
    topic.id === topicId ? { ...topic, trials, query } : topic
  );
  state.updateToken += 1;
}

function startUpdate() {
  dom.updateBtn.disabled = true;
  renderCache.clear();
  initWorker();
  const payload = {
    type: "update",
    settings: getSettings(),
    topics: state.topics.map(t => ({ id: t.id, label: t.label, keywords: t.keywords })),
    baseQuery: BASE_ACS_QUERY
  };
  worker.postMessage(payload);
  log("Started ClinicalTrials.gov update.");
}

async function loadFixture() {
  try {
    const res = await fetch("./fixtures/esc_acs_fixture.json");
    const data = await res.json();
    applyCache(data);
    log("Fixture loaded.");
  } catch (err) {
    log("Fixture load failed.");
  }
}

async function clearCache() {
  await clearCacheIDB();
  dom.lastUpdate.textContent = "Never";
  log("Cache cleared.");
}

// ============ DATASET IMPORT FUNCTIONS ============

function openDatasetModal() {
  state.selectedDatasetId = null;
  dom.datasetModal.classList.remove("hidden");
  renderDatasetList();
  dom.importDatasetConfirmBtn.disabled = true;
  dom.datasetPreview.classList.add("hidden");
}

function closeDatasetModal() {
  dom.datasetModal.classList.add("hidden");
  state.selectedDatasetId = null;
}

function getFilteredDatasets() {
  let datasets = [...DATASETS];

  const source = dom.datasetSourceFilter.value;
  const type = dom.datasetTypeFilter.value;
  const relevance = dom.datasetRelevanceFilter.value;
  const search = dom.datasetSearch.value.toLowerCase().trim();

  if (source !== "all") {
    datasets = datasets.filter(d => d.source === source);
  }

  if (type !== "all") {
    datasets = datasets.filter(d => d.type === type);
  }

  if (relevance !== "all") {
    datasets = datasets.filter(d => d.relevance === relevance);
  }

  if (search) {
    datasets = datasets.filter(d =>
      d.name.toLowerCase().includes(search) ||
      d.description.toLowerCase().includes(search) ||
      d.citation.toLowerCase().includes(search)
    );
  }

  return datasets;
}

function renderDatasetList() {
  const datasets = getFilteredDatasets();

  if (datasets.length === 0) {
    dom.datasetList.innerHTML = `<p class="muted">No datasets match your filters.</p>`;
    return;
  }

  dom.datasetList.innerHTML = datasets.map(dataset => {
    const summary = getDatasetSummary(dataset);
    const isSelected = state.selectedDatasetId === dataset.id;

    const relevanceClass = dataset.relevance === "acs" ? "dataset-tag--acs" :
                          dataset.relevance === "cardiovascular" ? "dataset-tag--cv" : "";

    return `
      <div class="dataset-item ${isSelected ? 'selected' : ''}" data-id="${dataset.id}">
        <div class="dataset-item-header">
          <div>
            <p class="dataset-item-title">${dataset.name}</p>
            <p class="dataset-item-desc">${dataset.description}</p>
          </div>
          <span class="dataset-item-source">${DATASET_SOURCES[dataset.source]?.name || dataset.source}</span>
        </div>
        <div class="dataset-item-tags">
          <span class="dataset-tag">${dataset.type}</span>
          <span class="dataset-tag">${dataset.effectMeasure}</span>
          <span class="dataset-tag">${summary.studies} studies</span>
          ${dataset.relevance ? `<span class="dataset-tag ${relevanceClass}">${dataset.relevance}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  dom.datasetList.querySelectorAll('.dataset-item').forEach(item => {
    item.addEventListener('click', () => selectDataset(item.dataset.id));
  });
}

function selectDataset(datasetId) {
  state.selectedDatasetId = datasetId;
  renderDatasetList();
  renderDatasetPreview(datasetId);
  dom.importDatasetConfirmBtn.disabled = false;
}

function renderDatasetPreview(datasetId) {
  const dataset = DATASETS.find(d => d.id === datasetId);
  if (!dataset) {
    dom.datasetPreview.classList.add("hidden");
    return;
  }

  dom.datasetPreview.classList.remove("hidden");

  const summary = getDatasetSummary(dataset);

  dom.previewTitle.textContent = dataset.name;
  dom.previewDescription.textContent = dataset.description;

  dom.previewStats.innerHTML = `
    <div class="preview-stat">
      <span class="preview-stat-label">Studies</span>
      <span class="preview-stat-value">${summary.studies}</span>
    </div>
    ${summary.totalParticipants ? `
      <div class="preview-stat">
        <span class="preview-stat-label">Participants</span>
        <span class="preview-stat-value">${summary.totalParticipants.toLocaleString()}</span>
      </div>
    ` : ''}
    ${summary.yearRange ? `
      <div class="preview-stat">
        <span class="preview-stat-label">Years</span>
        <span class="preview-stat-value">${summary.yearRange}</span>
      </div>
    ` : ''}
    <div class="preview-stat">
      <span class="preview-stat-label">Type</span>
      <span class="preview-stat-value">${summary.type}</span>
    </div>
    <div class="preview-stat">
      <span class="preview-stat-label">Effect</span>
      <span class="preview-stat-value">${summary.effectMeasure}</span>
    </div>
  `;

  dom.previewCitation.textContent = dataset.citation;

  // Render preview table (first 5 rows)
  const previewData = dataset.data.slice(0, 5);
  if (previewData.length > 0) {
    const headers = Object.keys(previewData[0]);
    const displayHeaders = headers.slice(0, 8); // Limit columns

    dom.previewTable.innerHTML = `
      <thead>
        <tr>${displayHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${previewData.map(row => `
          <tr>${displayHeaders.map(h => {
            let val = row[h];
            if (typeof val === 'number') val = val.toFixed ? val.toFixed(3) : val;
            return `<td>${val ?? ''}</td>`;
          }).join('')}</tr>
        `).join('')}
        ${dataset.data.length > 5 ? `<tr><td colspan="${displayHeaders.length}" class="muted">... ${dataset.data.length - 5} more rows</td></tr>` : ''}
      </tbody>
    `;
  }
}

function importSelectedDataset() {
  const dataset = DATASETS.find(d => d.id === state.selectedDatasetId);
  if (!dataset) return;

  const createAsTopic = dom.createTopicCheck.checked;
  const customName = dom.customTopicName.value.trim();

  if (createAsTopic) {
    // Convert dataset to topic format
    const comparisons = datasetToComparisons(dataset);

    // Create synthetic trials from the dataset
    const trials = dataset.data.map((study, idx) => {
      const comp = comparisons[idx] || {};
      return {
        nctId: `${dataset.id}_${idx}`,
        title: study.study || `Study ${idx + 1}`,
        status: "IMPORTED",
        startDate: study.year ? `${study.year}-01-01` : null,
        completionDate: study.year ? `${study.year}-12-31` : null,
        conditions: [dataset.relevance === "acs" ? "Acute Coronary Syndrome" : "Cardiovascular"],
        arms: [],
        outcome: {
          type: dataset.type === "continuous" ? "continuous" : "binary",
          title: dataset.name
        },
        _imported: true,
        _datasetId: dataset.id,
        _comparison: comp
      };
    });

    // Create new topic
    const topicId = `imported_${dataset.id}`;
    const topicLabel = customName || dataset.name;

    const newTopic = {
      id: topicId,
      label: topicLabel,
      keywords: [dataset.name, dataset.type],
      trials,
      query: `Imported from ${DATASET_SOURCES[dataset.source]?.name || dataset.source}`,
      _imported: true,
      _dataset: dataset,
      _comparisons: comparisons
    };

    // Add to state
    state.topics.push(newTopic);
    state.importedTopics.push(topicId);

    // Render and select
    renderTopicList();
    selectTopic(topicId);

    log(`Imported dataset "${dataset.name}" as new topic with ${trials.length} studies.`);
  }

  closeDatasetModal();
}

function setupEvents() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab, true));
  });
  dom.updateBtn.addEventListener("click", startUpdate);
  dom.fixtureBtn.addEventListener("click", loadFixture);
  dom.clearBtn.addEventListener("click", clearCache);
  dom.compareBtn.addEventListener("click", compareCoverage);
  dom.exportCsvBtn.addEventListener("click", exportToCsv);
  dom.exportJsonBtn.addEventListener("click", exportToJson);
  dom.exportPdfBtn.addEventListener("click", exportToPdf);
  dom.exportRBtn.addEventListener("click", exportToR);
  dom.addStudyBtn.addEventListener("click", openStudyEntryModal);

  // Study entry modal events
  dom.closeStudyEntryBtn.addEventListener("click", closeStudyEntryModal);
  dom.previewStudyBtn.addEventListener("click", previewStudyEntry);
  dom.addStudyConfirmBtn.addEventListener("click", addManualStudy);
  document.querySelectorAll('input[name="outcomeType"]').forEach(radio => {
    radio.addEventListener("change", toggleOutcomeSection);
  });
  dom.studyEntryModal.addEventListener("click", (e) => {
    if (e.target === dom.studyEntryModal) closeStudyEntryModal();
  });

  // Dataset import modal events
  dom.importDatasetBtn.addEventListener("click", openDatasetModal);
  dom.closeModalBtn.addEventListener("click", closeDatasetModal);
  dom.importDatasetConfirmBtn.addEventListener("click", importSelectedDataset);

  // Dataset filter events
  dom.datasetSourceFilter.addEventListener("change", renderDatasetList);
  dom.datasetTypeFilter.addEventListener("change", renderDatasetList);
  dom.datasetRelevanceFilter.addEventListener("change", renderDatasetList);
  dom.datasetSearch.addEventListener("input", renderDatasetList);

  // Close modal on backdrop click
  dom.datasetModal.addEventListener("click", (e) => {
    if (e.target === dom.datasetModal) closeDatasetModal();
  });

  // Escape key closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!dom.datasetModal.classList.contains("hidden")) closeDatasetModal();
      if (!dom.robModal.classList.contains("hidden")) closeRobModal();
      if (!dom.studyEntryModal.classList.contains("hidden")) closeStudyEntryModal();
    }
  });

  // ROB2 modal events
  dom.closeRobModalBtn.addEventListener("click", closeRobModal);
  dom.saveRobBtn.addEventListener("click", saveRobAssessment);
  dom.clearRobBtn.addEventListener("click", clearRobForm);
  dom.robModal.addEventListener("click", (e) => {
    if (e.target === dom.robModal) closeRobModal();
  });

  // Update ROB overall when domains change
  [dom.robD1, dom.robD2, dom.robD3, dom.robD4, dom.robD5].forEach(select => {
    select.addEventListener("change", updateRobOverall);
  });

  // Forest plot reset button
  if (dom.forestResetBtn) {
    dom.forestResetBtn.addEventListener("click", resetForestExclusions);
  }
}

function exportToCsv() {
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (!topic) {
    log("No topic selected for export.");
    return;
  }

  const { comparisons } = buildComparisons(topic);
  const trials = topic.trials || [];

  // Build CSV content
  const headers = ["NCT ID", "Title", "Status", "Start Date", "Treatment 1", "Treatment 2", "Effect Measure", "Effect Size", "SE"];
  const rows = comparisons.map(c => [
    c.studyId || "",
    (c.title || "").replace(/,/g, ";"),
    "",
    "",
    (c.t1 || "").replace(/,/g, ";"),
    (c.t2 || "").replace(/,/g, ";"),
    c.measure || "",
    c.effect != null ? c.effect.toFixed(4) : "",
    c.se != null ? c.se.toFixed(4) : ""
  ]);

  // Add trials without comparisons
  const comparisonIds = new Set(comparisons.map(c => c.studyId));
  trials.forEach(trial => {
    if (!comparisonIds.has(trial.nctId)) {
      rows.push([
        trial.nctId || "",
        (trial.title || "").replace(/,/g, ";"),
        trial.status || "",
        trial.startDate || "",
        "", "", "", "", ""
      ]);
    }
  });

  const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

  // Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${topic.id}_export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  log(`Exported ${rows.length} rows to CSV.`);
}

function exportToJson() {
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (!topic) {
    log("No topic selected for export.");
    return;
  }

  const { comparisons, warnings, exclusions } = buildComparisons(topic, true);
  const meta = comparisons.length >= 2 ? metaAnalysisAdvanced(comparisons) : null;
  const treatments = Array.from(new Set(comparisons.flatMap(c => [c.t1, c.t2])));
  const reference = findReference(treatments);
  const effects = treatments.length > 1 ? networkMeta(comparisons, treatments, reference) : [];
  const sucra = computeSucra(effects);
  const pscore = computePScore(effects);

  const exportData = {
    topic: {
      id: topic.id,
      label: topic.label,
      keywords: topic.keywords,
      query: topic.query
    },
    summary: {
      totalTrials: (topic.trials || []).length,
      trialsWithOutcome: (topic.trials || []).filter(t => t.outcome).length,
      comparisons: comparisons.length,
      treatments: treatments.length,
      exportedAt: new Date().toISOString()
    },
    metaAnalysis: meta ? {
      pooledEffect: meta.random.mu,
      pooledSe: meta.random.se,
      ci95: meta.random.ci,
      hksjCi: meta.hk.ci,
      predictionInterval: meta.pi,
      tau2: meta.tau2,
      i2: meta.i2,
      h2: meta.h2,
      q: meta.q,
      df: meta.df,
      k: meta.k
    } : null,
    networkMeta: {
      reference,
      effects: effects.map(e => ({
        treatment: e.treatment,
        effectVsRef: e.effect,
        sucra: sucra.find(s => s.treatment === e.treatment)?.sucra,
        pScore: pscore.find(p => p.treatment === e.treatment)?.score
      }))
    },
    comparisons: comparisons.map(c => ({
      studyId: c.studyId,
      title: c.title,
      treatment1: c.t1,
      treatment2: c.t2,
      measure: c.measure,
      effect: c.effect,
      se: c.se,
      dose: c.dose
    })),
    trials: (topic.trials || []).map(t => ({
      nctId: t.nctId,
      title: t.title,
      status: t.status,
      startDate: t.startDate,
      completionDate: t.completionDate,
      conditions: t.conditions,
      arms: t.arms,
      outcomeType: t.outcome?.type,
      outcomeTitle: t.outcome?.title
    })),
    exclusions,
    warnings
  };

  // Download
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${topic.id}_export.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  log(`Exported analysis to JSON.`);
}

// ============ PDF EXPORT ============
function exportToPdf() {
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (!topic) {
    log("No topic selected for export.");
    return;
  }

  const { comparisons } = buildComparisons(topic);
  const meta = comparisons.length >= 2 ? metaAnalysisAdvanced(comparisons) : null;
  const grade = meta ? gradeAssessment(comparisons, meta) : null;

  // Initialize jsPDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(topic.label, 14, y);
  y += 10;

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`ESC ACS Living Meta-Analysis | Generated: ${new Date().toLocaleDateString()}`, 14, y);
  y += 10;

  // Evidence Summary
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Evidence Summary", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryText = [
    `Studies included: ${comparisons.length}`,
    `Total participants: ${comparisons.reduce((sum, c) => sum + (c.n1 || 0) + (c.n0 || 0), 0) || 'N/A'}`,
  ];
  if (meta) {
    const pooledRR = Math.exp(meta.random.mu).toFixed(2);
    const ciLow = Math.exp(meta.random.ci[0]).toFixed(2);
    const ciHigh = Math.exp(meta.random.ci[1]).toFixed(2);
    summaryText.push(`Pooled effect (RR): ${pooledRR} [95% CI: ${ciLow}-${ciHigh}]`);
    summaryText.push(`Heterogeneity: I² = ${(meta.i2 * 100).toFixed(1)}%, τ² = ${meta.tau2.toFixed(3)}`);
  }
  summaryText.forEach(line => {
    doc.text(line, 14, y);
    y += 5;
  });
  y += 5;

  // GRADE Assessment
  if (grade) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("GRADE Certainty of Evidence", 14, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const certaintyText = `Overall certainty: ${grade.certainty.toUpperCase()} (${'⊕'.repeat(grade.score)}${'⊖'.repeat(4 - grade.score)})`;
    doc.text(certaintyText, 14, y);
    y += 5;

    const domains = [
      `Risk of bias: ${grade.domains.riskOfBias.rating} (${grade.domains.riskOfBias.downgrade} downgrade)`,
      `Inconsistency: ${grade.domains.inconsistency.rating} (${grade.domains.inconsistency.downgrade} downgrade)`,
      `Indirectness: ${grade.domains.indirectness.rating} (${grade.domains.indirectness.downgrade} downgrade)`,
      `Imprecision: ${grade.domains.imprecision.rating} (${grade.domains.imprecision.downgrade} downgrade)`,
      `Publication bias: ${grade.domains.publicationBias.rating} (${grade.domains.publicationBias.downgrade} downgrade)`
    ];
    domains.forEach(d => {
      doc.text(`  • ${d}`, 14, y);
      y += 5;
    });
    y += 5;
  }

  // Forest Plot
  if (dom.forestChart) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Forest Plot", 14, y);
    y += 7;

    try {
      const forestImg = dom.forestChart.toDataURL("image/png");
      doc.addImage(forestImg, "PNG", 14, y, 180, 80);
      y += 85;
    } catch (e) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("[Forest plot could not be exported]", 14, y);
      y += 10;
    }
  }

  // Check if need new page
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  // Study Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Included Studies", 14, y);
  y += 7;

  const tableData = comparisons.map(c => [
    c.title?.substring(0, 30) || c.studyId || "Unknown",
    c.t1?.substring(0, 15) || "",
    c.t2?.substring(0, 15) || "",
    c.effect != null ? c.effect.toFixed(3) : "",
    c.se != null ? c.se.toFixed(3) : ""
  ]);

  doc.autoTable({
    startY: y,
    head: [["Study", "Treatment", "Control", "Effect", "SE"]],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 76, 92] },
    margin: { left: 14, right: 14 }
  });

  y = doc.lastAutoTable.finalY + 10;

  // Methods section
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Methods", 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const methodsText = [
    "Meta-analysis was performed using a random-effects model with the DerSimonian-Laird estimator",
    "for between-study variance. Hartung-Knapp-Sidik-Jonkman adjustment was applied for confidence",
    "intervals. Heterogeneity was assessed using I² and τ² statistics. GRADE assessment of certainty",
    "of evidence was performed according to GRADE Working Group guidelines.",
    "",
    `Analysis performed using ${APP_CONFIG.analysisStudioName || APP_CONFIG.title || "ESC ACS Living Meta-Analysis Studio"}`
  ];
  methodsText.forEach(line => {
    doc.text(line, 14, y);
    y += 4;
  });

  // Save
  doc.save(`${topic.id}_report.pdf`);
  log(`Exported PDF report for "${topic.label}".`);
}

// ============ R SCRIPT EXPORT ============
function exportToR() {
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (!topic) {
    log("No topic selected for export.");
    return;
  }

  const { comparisons } = buildComparisons(topic);
  if (comparisons.length < 2) {
    log("Need at least 2 studies for R script export.");
    return;
  }

  const treatments = Array.from(new Set(comparisons.flatMap(c => [c.t1, c.t2])));
  const isNetwork = treatments.length > 2;

  let rScript = `# ============================================================
# ESC ACS Living Meta-Analysis - R Script Export
# Topic: ${topic.label}
# Generated: ${new Date().toISOString()}
# ============================================================

# Install required packages if needed
# install.packages(c("meta", "metafor", "netmeta"))

library(meta)
library(metafor)
${isNetwork ? 'library(netmeta)' : ''}

# ============================================================
# DATA
# ============================================================

dat <- data.frame(
  study = c(${comparisons.map(c => `"${(c.title || c.studyId || 'Study').replace(/"/g, "'").substring(0, 40)}"`).join(', ')}),
  TE = c(${comparisons.map(c => c.effect != null ? c.effect.toFixed(4) : 'NA').join(', ')}),
  seTE = c(${comparisons.map(c => c.se != null ? c.se.toFixed(4) : 'NA').join(', ')}),
  treat1 = c(${comparisons.map(c => `"${(c.t1 || 'Treatment').replace(/"/g, "'")}"`).join(', ')}),
  treat2 = c(${comparisons.map(c => `"${(c.t2 || 'Control').replace(/"/g, "'")}"`).join(', ')})
)

# Remove rows with missing data
dat <- dat[complete.cases(dat), ]

print("Data loaded:")
print(dat)

# ============================================================
# PAIRWISE META-ANALYSIS (using meta package)
# ============================================================

# Random-effects meta-analysis with HKSJ adjustment
m_meta <- metagen(
  TE = TE,
  seTE = seTE,
  studlab = study,
  data = dat,
  sm = "RR",  # Change to "OR", "HR", "MD", "SMD" as appropriate
  method.tau = "DL",
  hakn = TRUE,
  title = "${topic.label}"
)

# Summary
print(summary(m_meta))

# Forest plot
forest(m_meta,
       sortvar = TE,
       prediction = TRUE,
       print.tau2 = TRUE,
       print.I2 = TRUE,
       col.diamond = "steelblue",
       col.predict = "darkred")

# ============================================================
# PAIRWISE META-ANALYSIS (using metafor package)
# ============================================================

m_rma <- rma(yi = TE, sei = seTE, data = dat, method = "DL")

print(summary(m_rma))

# Forest plot with metafor
forest(m_rma, slab = dat$study)

# Funnel plot
funnel(m_rma)

# Egger's test for publication bias
regtest(m_rma)

# Leave-one-out analysis
leave1out(m_rma)

`;

  if (isNetwork) {
    rScript += `
# ============================================================
# NETWORK META-ANALYSIS (using netmeta package)
# ============================================================

# Prepare data for network meta-analysis
nma <- netmeta(
  TE = TE,
  seTE = seTE,
  treat1 = treat1,
  treat2 = treat2,
  studlab = study,
  data = dat,
  sm = "RR",  # Change as appropriate
  reference.group = "${treatments[0]}",
  details.chkmultiarm = TRUE,
  sep.trts = " vs "
)

# Summary
print(summary(nma))

# Network graph
netgraph(nma,
         plastic = FALSE,
         thickness = "w.random",
         number.of.studies = TRUE)

# Forest plot of network estimates
forest(nma,
       reference.group = "${treatments[0]}",
       sortvar = TE,
       smlab = "Network Meta-Analysis")

# League table
netleague(nma, digits = 2)

# Rankogram
set.seed(123)
rank <- rankogram(nma, nsim = 1000)
plot(rank)

# SUCRA values
print(netrank(nma, small.values = "good"))

# Inconsistency testing (node-splitting)
netsplit(nma)

`;
  }

  rScript += `
# ============================================================
# SAVE RESULTS
# ============================================================

# Save forest plot
png("forest_plot.png", width = 800, height = 600)
forest(m_meta, prediction = TRUE)
dev.off()

# Save summary to file
sink("meta_analysis_results.txt")
print(summary(m_meta))
sink()

cat("\\nAnalysis complete! Results saved.\\n")
`;

  // Download
  const blob = new Blob([rScript], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${topic.id}_analysis.R`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  log(`Exported R script for "${topic.label}".`);
}

// ============ MANUAL STUDY ENTRY ============
function openStudyEntryModal() {
  if (!state.activeTopicId) {
    log("Please select a topic first.");
    return;
  }
  dom.studyEntryModal.classList.remove("hidden");
  resetStudyEntryForm();
}

function closeStudyEntryModal() {
  dom.studyEntryModal.classList.add("hidden");
  resetStudyEntryForm();
}

function resetStudyEntryForm() {
  dom.entryStudyName.value = "";
  dom.entryStudyYear.value = "";
  document.querySelector('input[name="outcomeType"][value="binary"]').checked = true;
  toggleOutcomeSection();
  dom.entryPreview.classList.add("hidden");
  dom.addStudyConfirmBtn.disabled = true;

  // Clear all form fields
  document.querySelectorAll('#studyEntryModal input[type="number"], #studyEntryModal input[type="text"]:not(#entryStudyName)').forEach(input => {
    if (input.id !== 'entryStudyYear') input.value = "";
  });
}

function toggleOutcomeSection() {
  const outcomeType = document.querySelector('input[name="outcomeType"]:checked').value;

  dom.binaryOutcomeSection.classList.toggle("hidden", outcomeType !== "binary");
  dom.continuousOutcomeSection.classList.toggle("hidden", outcomeType !== "continuous");
  dom.precomputedSection.classList.toggle("hidden", outcomeType !== "precomputed");
}

function previewStudyEntry() {
  const studyName = dom.entryStudyName.value.trim();
  if (!studyName) {
    alert("Please enter a study name.");
    return;
  }

  const outcomeType = document.querySelector('input[name="outcomeType"]:checked').value;
  let preview = "";
  let isValid = false;

  if (outcomeType === "binary") {
    const t1Label = document.getElementById("entryTreat1Label").value || "Treatment";
    const t1Events = parseInt(document.getElementById("entryTreat1Events").value);
    const t1N = parseInt(document.getElementById("entryTreat1N").value);
    const t2Label = document.getElementById("entryTreat2Label").value || "Control";
    const t2Events = parseInt(document.getElementById("entryTreat2Events").value);
    const t2N = parseInt(document.getElementById("entryTreat2N").value);

    if (!isNaN(t1Events) && !isNaN(t1N) && !isNaN(t2Events) && !isNaN(t2N) && t1N > 0 && t2N > 0) {
      const result = computeLogRR(t1Events, t1N, t2Events, t2N);
      const rr = Math.exp(result.effect);
      const ciLow = Math.exp(result.effect - 1.96 * result.se);
      const ciHigh = Math.exp(result.effect + 1.96 * result.se);

      preview = `
        <strong>${studyName}</strong><br>
        ${t1Label}: ${t1Events}/${t1N} (${(t1Events/t1N*100).toFixed(1)}%)<br>
        ${t2Label}: ${t2Events}/${t2N} (${(t2Events/t2N*100).toFixed(1)}%)<br>
        <strong>RR: ${rr.toFixed(2)} [95% CI: ${ciLow.toFixed(2)}-${ciHigh.toFixed(2)}]</strong>
      `;
      isValid = true;
    } else {
      preview = "Please fill in all binary outcome fields.";
    }
  } else if (outcomeType === "continuous") {
    const t1Label = document.getElementById("entryContTreat1Label").value || "Treatment";
    const t1Mean = parseFloat(document.getElementById("entryContTreat1Mean").value);
    const t1SD = parseFloat(document.getElementById("entryContTreat1SD").value);
    const t1N = parseInt(document.getElementById("entryContTreat1N").value);
    const t2Label = document.getElementById("entryContTreat2Label").value || "Control";
    const t2Mean = parseFloat(document.getElementById("entryContTreat2Mean").value);
    const t2SD = parseFloat(document.getElementById("entryContTreat2SD").value);
    const t2N = parseInt(document.getElementById("entryContTreat2N").value);

    if (!isNaN(t1Mean) && !isNaN(t1SD) && !isNaN(t1N) && !isNaN(t2Mean) && !isNaN(t2SD) && !isNaN(t2N)) {
      const result = computeMeanDiff(t1Mean, t1SD, t1N, t2Mean, t2SD, t2N);
      const ciLow = result.effect - 1.96 * result.se;
      const ciHigh = result.effect + 1.96 * result.se;

      preview = `
        <strong>${studyName}</strong><br>
        ${t1Label}: mean=${t1Mean.toFixed(2)}, SD=${t1SD.toFixed(2)}, n=${t1N}<br>
        ${t2Label}: mean=${t2Mean.toFixed(2)}, SD=${t2SD.toFixed(2)}, n=${t2N}<br>
        <strong>MD: ${result.effect.toFixed(2)} [95% CI: ${ciLow.toFixed(2)}-${ciHigh.toFixed(2)}]</strong>
      `;
      isValid = true;
    } else {
      preview = "Please fill in all continuous outcome fields.";
    }
  } else if (outcomeType === "precomputed") {
    const measure = document.getElementById("entryEffectMeasure").value;
    const effect = parseFloat(document.getElementById("entryEffectValue").value);
    const ciLow = parseFloat(document.getElementById("entryCILower").value);
    const ciHigh = parseFloat(document.getElementById("entryCIUpper").value);
    const t1Label = document.getElementById("entryPreTreat1").value || "Treatment";
    const t2Label = document.getElementById("entryPreTreat2").value || "Control";

    if (!isNaN(effect) && !isNaN(ciLow) && !isNaN(ciHigh)) {
      const se = (Math.log(ciHigh) - Math.log(ciLow)) / (2 * 1.96);

      preview = `
        <strong>${studyName}</strong><br>
        ${t1Label} vs ${t2Label}<br>
        <strong>${measure}: ${effect.toFixed(2)} [95% CI: ${ciLow.toFixed(2)}-${ciHigh.toFixed(2)}]</strong><br>
        Calculated SE: ${se.toFixed(4)}
      `;
      isValid = true;
    } else {
      preview = "Please fill in effect estimate and confidence interval.";
    }
  }

  dom.entryPreviewContent.innerHTML = preview;
  dom.entryPreview.classList.remove("hidden");
  dom.addStudyConfirmBtn.disabled = !isValid;
}

function addManualStudy() {
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (!topic) return;

  const studyName = dom.entryStudyName.value.trim();
  const studyYear = parseInt(dom.entryStudyYear.value) || new Date().getFullYear();
  const outcomeType = document.querySelector('input[name="outcomeType"]:checked').value;

  let comparison = null;
  let trial = null;

  if (outcomeType === "binary") {
    const t1Label = document.getElementById("entryTreat1Label").value || "Treatment";
    const t1Events = parseInt(document.getElementById("entryTreat1Events").value);
    const t1N = parseInt(document.getElementById("entryTreat1N").value);
    const t2Label = document.getElementById("entryTreat2Label").value || "Control";
    const t2Events = parseInt(document.getElementById("entryTreat2Events").value);
    const t2N = parseInt(document.getElementById("entryTreat2N").value);

    const result = computeLogRR(t1Events, t1N, t2Events, t2N);

    comparison = {
      id: `manual_${Date.now()}`,
      study: studyName,
      year: studyYear,
      type: "binary",
      e1: t1Events,
      n1: t1N,
      e0: t2Events,
      n0: t2N,
      treat1: t1Label,
      treat2: t2Label
    };

    trial = {
      nctId: `MANUAL_${Date.now()}`,
      title: studyName,
      status: "MANUAL_ENTRY",
      startDate: `${studyYear}-01-01`,
      conditions: ["Manual Entry"],
      _manual: true,
      _comparison: comparison,
      outcome: {
        type: "binary",
        title: "Manual entry",
        groups: [
          { title: t1Label, events: t1Events, n: t1N },
          { title: t2Label, events: t2Events, n: t2N }
        ]
      }
    };
  } else if (outcomeType === "continuous") {
    const t1Label = document.getElementById("entryContTreat1Label").value || "Treatment";
    const t1Mean = parseFloat(document.getElementById("entryContTreat1Mean").value);
    const t1SD = parseFloat(document.getElementById("entryContTreat1SD").value);
    const t1N = parseInt(document.getElementById("entryContTreat1N").value);
    const t2Label = document.getElementById("entryContTreat2Label").value || "Control";
    const t2Mean = parseFloat(document.getElementById("entryContTreat2Mean").value);
    const t2SD = parseFloat(document.getElementById("entryContTreat2SD").value);
    const t2N = parseInt(document.getElementById("entryContTreat2N").value);

    comparison = {
      id: `manual_${Date.now()}`,
      study: studyName,
      year: studyYear,
      type: "continuous",
      m1: t1Mean,
      sd1: t1SD,
      n1: t1N,
      m0: t2Mean,
      sd0: t2SD,
      n0: t2N,
      treat1: t1Label,
      treat2: t2Label
    };

    trial = {
      nctId: `MANUAL_${Date.now()}`,
      title: studyName,
      status: "MANUAL_ENTRY",
      startDate: `${studyYear}-01-01`,
      conditions: ["Manual Entry"],
      _manual: true,
      _comparison: comparison,
      outcome: {
        type: "continuous",
        title: "Manual entry",
        groups: [
          { title: t1Label, mean: t1Mean, sd: t1SD, n: t1N },
          { title: t2Label, mean: t2Mean, sd: t2SD, n: t2N }
        ]
      }
    };
  } else if (outcomeType === "precomputed") {
    const measure = document.getElementById("entryEffectMeasure").value;
    const effect = parseFloat(document.getElementById("entryEffectValue").value);
    const ciLow = parseFloat(document.getElementById("entryCILower").value);
    const ciHigh = parseFloat(document.getElementById("entryCIUpper").value);
    const t1Label = document.getElementById("entryPreTreat1").value || "Treatment";
    const t2Label = document.getElementById("entryPreTreat2").value || "Control";

    // Convert to log scale for ratio measures
    const isRatio = ["HR", "OR", "RR"].includes(measure);
    const logEffect = isRatio ? Math.log(effect) : effect;
    const se = isRatio
      ? (Math.log(ciHigh) - Math.log(ciLow)) / (2 * 1.96)
      : (ciHigh - ciLow) / (2 * 1.96);

    comparison = {
      id: `manual_${Date.now()}`,
      study: studyName,
      year: studyYear,
      type: "precomputed",
      effect: logEffect,
      se: se,
      measure: isRatio ? `log${measure}` : measure,
      treat1: t1Label,
      treat2: t2Label,
      originalEffect: effect,
      originalCI: [ciLow, ciHigh]
    };

    trial = {
      nctId: `MANUAL_${Date.now()}`,
      title: studyName,
      status: "MANUAL_ENTRY",
      startDate: `${studyYear}-01-01`,
      conditions: ["Manual Entry"],
      _manual: true,
      _comparison: comparison,
      outcome: {
        type: "precomputed",
        title: `${measure}: ${effect} [${ciLow}-${ciHigh}]`
      }
    };
  }

  if (trial && comparison) {
    // Add to topic
    if (!topic.trials) topic.trials = [];
    topic.trials.push(trial);

    // Add to _comparisons if imported topic
    if (topic._comparisons) {
      topic._comparisons.push(comparison);
    }

    // Re-render
    renderTopicList();
    renderTopicDetail();
    closeStudyEntryModal();

    log(`Added manual study "${studyName}" to topic "${topic.label}".`);
  }
}

// ============================================================================
// ROB2 Risk of Bias Assessment Functions
// ============================================================================

function openRobModal(trialId) {
  const topic = state.topics.find(t => t.id === state.activeTopicId);
  if (!topic) return;

  const trial = (topic.trials || []).find(t => t.nctId === trialId);
  if (!trial) return;

  state.activeRobTrialId = trialId;
  dom.robStudyName.textContent = trial.title || trialId;

  // Load existing assessment if any
  const key = `${state.activeTopicId}_${trialId}`;
  const existing = state.robAssessments[key];

  if (existing) {
    dom.robD1.value = existing.d1 || "";
    dom.robD2.value = existing.d2 || "";
    dom.robD3.value = existing.d3 || "";
    dom.robD4.value = existing.d4 || "";
    dom.robD5.value = existing.d5 || "";
    dom.robD1Notes.value = existing.d1Notes || "";
    dom.robD2Notes.value = existing.d2Notes || "";
    dom.robD3Notes.value = existing.d3Notes || "";
    dom.robD4Notes.value = existing.d4Notes || "";
    dom.robD5Notes.value = existing.d5Notes || "";
  } else {
    clearRobForm();
  }

  updateRobOverall();
  dom.robModal.classList.remove("hidden");
}

function closeRobModal() {
  dom.robModal.classList.add("hidden");
  state.activeRobTrialId = null;
}

function clearRobForm() {
  dom.robD1.value = "";
  dom.robD2.value = "";
  dom.robD3.value = "";
  dom.robD4.value = "";
  dom.robD5.value = "";
  dom.robD1Notes.value = "";
  dom.robD2Notes.value = "";
  dom.robD3Notes.value = "";
  dom.robD4Notes.value = "";
  dom.robD5Notes.value = "";
  updateRobOverall();
}

function updateRobOverall() {
  const domains = [
    dom.robD1.value,
    dom.robD2.value,
    dom.robD3.value,
    dom.robD4.value,
    dom.robD5.value
  ];

  const nonEmpty = domains.filter(d => d !== "");
  if (nonEmpty.length === 0) {
    dom.robOverallCalc.textContent = "Not assessed";
    dom.robOverallCalc.className = "rob-overall-calc";
    return;
  }

  // ROB2 overall judgment rules:
  // High if any domain is high
  // Low only if all domains are low
  // Otherwise some concerns
  if (nonEmpty.includes("high")) {
    dom.robOverallCalc.textContent = "High risk";
    dom.robOverallCalc.className = "rob-overall-calc high";
  } else if (nonEmpty.every(d => d === "low") && nonEmpty.length === 5) {
    dom.robOverallCalc.textContent = "Low risk";
    dom.robOverallCalc.className = "rob-overall-calc low";
  } else {
    dom.robOverallCalc.textContent = "Some concerns";
    dom.robOverallCalc.className = "rob-overall-calc some";
  }
}

function saveRobAssessment() {
  if (!state.activeRobTrialId || !state.activeTopicId) return;

  const key = `${state.activeTopicId}_${state.activeRobTrialId}`;
  const domains = [dom.robD1.value, dom.robD2.value, dom.robD3.value, dom.robD4.value, dom.robD5.value];
  const nonEmpty = domains.filter(d => d !== "");

  let overall = "";
  if (nonEmpty.includes("high")) overall = "high";
  else if (nonEmpty.every(d => d === "low") && nonEmpty.length === 5) overall = "low";
  else if (nonEmpty.length > 0) overall = "some";

  state.robAssessments[key] = {
    d1: dom.robD1.value,
    d2: dom.robD2.value,
    d3: dom.robD3.value,
    d4: dom.robD4.value,
    d5: dom.robD5.value,
    d1Notes: dom.robD1Notes.value,
    d2Notes: dom.robD2Notes.value,
    d3Notes: dom.robD3Notes.value,
    d4Notes: dom.robD4Notes.value,
    d5Notes: dom.robD5Notes.value,
    overall
  };

  // Re-render to show updated ROB
  renderTopicDetail();
  closeRobModal();
  log(`Saved ROB2 assessment for trial ${state.activeRobTrialId}.`);
}

function getRobForTrial(topicId, trialId) {
  const key = `${topicId}_${trialId}`;
  return state.robAssessments[key] || null;
}

function renderRobTrafficLight(rob) {
  if (!rob) return '<span class="muted">-</span>';

  const domains = ["d1", "d2", "d3", "d4", "d5"];
  const labels = ["D1", "D2", "D3", "D4", "D5"];

  return `
    <div class="rob-traffic-light">
      ${domains.map((d, i) => {
        const val = rob[d] || "none";
        return `<span class="rob-domain rob-${val}" title="${labels[i]}: ${val || 'not assessed'}">${labels[i]}</span>`;
      }).join("")}
    </div>
  `;
}

function renderRobSummaryTable(topic) {
  const trials = topic.trials || [];
  if (trials.length === 0) return "<p class=\"muted\">No trials to assess.</p>";

  const rows = trials.map(trial => {
    const rob = getRobForTrial(topic.id, trial.nctId);
    const overallClass = rob?.overall || "none";
    const overallLabel = rob?.overall ? (rob.overall === "low" ? "Low" : rob.overall === "high" ? "High" : "Some") : "-";

    return `
      <tr>
        <td>${trial.title || trial.nctId}</td>
        <td><span class="rob-cell ${rob?.d1 || 'none'}">${(rob?.d1 || "-")[0].toUpperCase()}</span></td>
        <td><span class="rob-cell ${rob?.d2 || 'none'}">${(rob?.d2 || "-")[0].toUpperCase()}</span></td>
        <td><span class="rob-cell ${rob?.d3 || 'none'}">${(rob?.d3 || "-")[0].toUpperCase()}</span></td>
        <td><span class="rob-cell ${rob?.d4 || 'none'}">${(rob?.d4 || "-")[0].toUpperCase()}</span></td>
        <td><span class="rob-cell ${rob?.d5 || 'none'}">${(rob?.d5 || "-")[0].toUpperCase()}</span></td>
        <td><span class="rob-cell ${overallClass}">${overallLabel[0]}</span></td>
      </tr>
    `;
  }).join("");

  return `
    <table class="rob-summary-table">
      <thead>
        <tr>
          <th>Study</th>
          <th title="Randomization process">D1</th>
          <th title="Deviations from intended interventions">D2</th>
          <th title="Missing outcome data">D3</th>
          <th title="Measurement of outcome">D4</th>
          <th title="Selection of reported result">D5</th>
          <th>Overall</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="muted" style="margin-top: 8px; font-size: 11px;">
      L = Low risk, S = Some concerns, H = High risk, - = Not assessed
    </p>
  `;
}

function countRobByLevel(topic) {
  const trials = topic.trials || [];
  const counts = { low: 0, some: 0, high: 0, notAssessed: 0 };

  trials.forEach(trial => {
    const rob = getRobForTrial(topic.id, trial.nctId);
    if (!rob || !rob.overall) counts.notAssessed++;
    else if (rob.overall === "low") counts.low++;
    else if (rob.overall === "high") counts.high++;
    else counts.some++;
  });

  return counts;
}

// Global handler for ROB modal
if (typeof window !== "undefined") {
  window.__escAcs = window.__escAcs || {};
  window.__escAcs.openRobModal = openRobModal;
}

// ============================================================================
// DARK MODE (2026-01-25)
// ============================================================================
function initDarkMode() {
  const saved = localStorage.getItem("esc-acs-darkmode");
  if (saved === "true") {
    document.documentElement.classList.add("dark-mode");
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark-mode");
  localStorage.setItem("esc-acs-darkmode", isDark);
  return isDark;
}

// ============================================================================
// KEYBOARD SHORTCUTS (2026-01-25)
// ============================================================================
function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const topics = state.topics.filter(
      t => (t.trials || []).length >= ELIGIBILITY_TRIAL_MINIMUM
    );
    const currentIdx = topics.findIndex(t => t.id === state.selectedTopic);

    switch (e.key) {
      case "j": // Next topic
        if (currentIdx < topics.length - 1) {
          selectTopic(topics[currentIdx + 1].id);
        }
        break;
      case "k": // Previous topic
        if (currentIdx > 0) {
          selectTopic(topics[currentIdx - 1].id);
        }
        break;
      case "1": setActiveTab("overview"); break;
      case "2": setActiveTab("trials"); break;
      case "3": setActiveTab("pairwise"); break;
      case "4": setActiveTab("network"); break;
      case "5": setActiveTab("dose"); break;
      case "6": setActiveTab("grade"); break;
      case "7": setActiveTab("cumulative"); break;
      case "8": setActiveTab("diagnostics"); break;
      case "9": setActiveTab("raw"); break;
      case "d": // Toggle dark mode
        toggleDarkMode();
        break;
      case "?": // Show help
        showKeyboardHelp();
        break;
    }
  });
}

function showKeyboardHelp() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3>Keyboard Shortcuts</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td><kbd>j</kbd></td><td>Next topic</td></tr>
          <tr><td><kbd>k</kbd></td><td>Previous topic</td></tr>
          <tr><td><kbd>1-9</kbd></td><td>Switch tabs</td></tr>
          <tr><td><kbd>d</kbd></td><td>Toggle dark mode</td></tr>
          <tr><td><kbd>?</kbd></td><td>Show this help</td></tr>
        </table>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ============================================================================
// COPY TO CLIPBOARD (2026-01-25)
// ============================================================================
function copyTableToClipboard(tableSelector) {
  const table = document.querySelector(tableSelector);
  if (!table) return false;

  const rows = [];
  const headerCells = table.querySelectorAll("thead th");
  if (headerCells.length) {
    rows.push(Array.from(headerCells).map(th => th.textContent.trim()).join("\t"));
  }

  table.querySelectorAll("tbody tr").forEach(tr => {
    const cells = tr.querySelectorAll("td");
    rows.push(Array.from(cells).map(td => td.textContent.trim()).join("\t"));
  });

  const text = rows.join("\n");

  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied to clipboard!");
  }).catch(err => {
    console.error("Clipboard error:", err);
    showToast("Failed to copy", "error");
  });

  return true;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === "error" ? "#e74c3c" : "#2ecc71"};
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Add copy button to tables
function addCopyButtonToTable(tableContainer, tableSelector) {
  const btn = document.createElement("button");
  btn.className = "btn btn--small btn--outline";
  btn.innerHTML = "📋 Copy";
  btn.style.marginBottom = "8px";
  btn.onclick = () => copyTableToClipboard(tableSelector);

  const existing = tableContainer.querySelector(".copy-btn");
  if (existing) existing.remove();

  btn.classList.add("copy-btn");
  tableContainer.insertBefore(btn, tableContainer.firstChild);
}

// ============================================================================
// SVG EXPORT (2026-01-25)
// ============================================================================
function canvasToSVG(canvas, title = "chart") {
  // Convert canvas to data URL, then embed in SVG
  const dataUrl = canvas.toDataURL("image/png");
  const width = canvas.width;
  const height = canvas.height;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>${title}</title>
  <image xlink:href="${dataUrl}" width="${width}" height="${height}"/>
</svg>`;

  return svg;
}

function exportCanvasAsSVG(canvasId, filename = "chart.svg") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    showToast("Canvas not found", "error");
    return;
  }

  const svg = canvasToSVG(canvas, filename.replace(".svg", ""));
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`Exported ${filename}`);
}

function exportCanvasAsPNG(canvasId, filename = "chart.png") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    showToast("Canvas not found", "error");
    return;
  }

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  showToast(`Exported ${filename}`);
}

// Add export buttons to canvas containers
function addExportButtonsToCanvas(container, canvasId, chartName = "chart") {
  const btnContainer = document.createElement("div");
  btnContainer.className = "canvas-export-btns";
  btnContainer.style.cssText = "margin-top: 8px; display: flex; gap: 8px;";

  const svgBtn = document.createElement("button");
  svgBtn.className = "btn btn--small btn--outline";
  svgBtn.textContent = "Export SVG";
  svgBtn.onclick = () => exportCanvasAsSVG(canvasId, `${chartName}.svg`);

  const pngBtn = document.createElement("button");
  pngBtn.className = "btn btn--small btn--outline";
  pngBtn.textContent = "Export PNG";
  pngBtn.onclick = () => exportCanvasAsPNG(canvasId, `${chartName}.png`);

  btnContainer.appendChild(svgBtn);
  btnContainer.appendChild(pngBtn);

  const existing = container.querySelector(".canvas-export-btns");
  if (existing) existing.remove();

  container.appendChild(btnContainer);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================
if (typeof window !== "undefined") {
  window.__escAcs = window.__escAcs || {};
  window.__escAcs.toggleDarkMode = toggleDarkMode;
  window.__escAcs.copyTableToClipboard = copyTableToClipboard;
  window.__escAcs.exportCanvasAsSVG = exportCanvasAsSVG;
  window.__escAcs.exportCanvasAsPNG = exportCanvasAsPNG;
  window.__escAcs.showKeyboardHelp = showKeyboardHelp;

  // Phase 5: Advanced Visualizations
  window.__escAcs.renderNetworkGraph = renderNetworkGraph;
  window.__escAcs.renderEvidenceGapMap = renderEvidenceGapMap;
  window.__escAcs.renderAnimatedCumulative = renderAnimatedCumulative;
  window.__escAcs.renderRankogram = renderRankogram;
  window.__escAcs.renderRankHeatmap = renderRankHeatmap;
  window.__escAcs.renderInteractiveForest = renderInteractiveForest;
  window.__escAcs.render3DFunnel = render3DFunnel;
  window.__escAcs.renderGeographicMap = renderGeographicMap;
  window.__escAcs.VISUALIZATION_MODULE = VISUALIZATION_MODULE;

  // Phase 6: Collaboration & Workflow
  window.__escAcs.ScreeningQueue = ScreeningQueue;
  window.__escAcs.TruthCertValidator = TruthCertValidator;
  window.__escAcs.MultiFormatExporter = MultiFormatExporter;
  window.__escAcs.SessionManager = SessionManager;
  window.__escAcs.ProvenanceTracker = ProvenanceTracker;
  window.__escAcs.WorkflowManager = WorkflowManager;
  window.__escAcs.COLLABORATION_MODULE = COLLABORATION_MODULE;

  // AI/ML Features (Template-based, no external APIs)
  window.__escAcs.generateInterpretation = generateInterpretation;
  window.__escAcs.generateSmartSuggestions = generateSmartSuggestions;
  window.__escAcs.generateReportSection = generateReportSection;
  window.__escAcs.assessCertainty = assessCertainty;
  window.__escAcs.extractPICO = extractPICO;
  window.__escAcs.detectDuplicates = detectDuplicates;
  window.__escAcs.detectAnomalies = detectAnomalies;
  window.__escAcs.predictQuality = predictQuality;
  window.__escAcs.classifyRelevance = classifyRelevance;

  // Living Review Features
  window.__escAcs.createSearchStrategy = createSearchStrategy;
  window.__escAcs.buildCTGovQueryFromPreset = buildCTGovQueryFromPreset;
  window.__escAcs.buildAACTSQLQuery = buildAACTSQLQuery;
  window.__escAcs.recommendCTGovStrategyBundle = recommendCTGovStrategyBundle;
  window.__escAcs.assessESCLandmarkCoverage = assessESCLandmarkCoverage;
  window.__escAcs.summarizeTrialUniverse = summarizeTrialUniverse;
  window.__escAcs.searchPubMed = searchPubMed;
  window.__escAcs.searchClinicalTrials = searchClinicalTrials;
  window.__escAcs.searchClinicalTrialsMultiStrategy = searchClinicalTrialsMultiStrategy;
  window.__escAcs.searchAACT = searchAACT;
  window.__escAcs.runSurveillance = runSurveillance;
  window.__escAcs.assessSurveillanceRobustness = assessSurveillanceRobustness;
  window.__escAcs.detectEvidenceChange = detectEvidenceChange;
  window.__escAcs.generateAlerts = generateAlerts;
  window.__escAcs.CTGOV_STRATEGY_PRESETS = CTGOV_STRATEGY_PRESETS;
  window.__escAcs.CTGOV_STRATEGY_EVIDENCE = CTGOV_STRATEGY_EVIDENCE;
  window.__escAcs.CTGOV_CONDITION_CHALLENGE_HINTS = CTGOV_CONDITION_CHALLENGE_HINTS;
  window.__escAcs.ESC_CARDIOLOGY_QUERY_PACK = ESC_CARDIOLOGY_QUERY_PACK;
  window.__escAcs.ESC_GUIDELINE_PROFILES = ESC_GUIDELINE_PROFILES;
  window.__escAcs.ESC_GUIDELINE_LANDMARK_TRIALS = ESC_GUIDELINE_LANDMARK_TRIALS;
  window.__escAcs.AACT_VALIDATION_REFERENCE = AACT_VALIDATION_REFERENCE;
}

async function init() {
  applyAppConfig();
  applyDefaultStatusSelection();
  // Initialize new features
  initDarkMode();
  initKeyboardShortcuts();
  setupEvents();
  await loadWasm();
  await initDB();

  // Initialize Phase 5 & 6 collaboration features
  state.sessionManager = new SessionManager({
    storageKey: 'esc_acs_living_meta_session',
    autoSave: true
  });
  state.provenanceTracker = new ProvenanceTracker('esc-acs-living-meta', '2.5.0');
  state.truthCertValidator = new TruthCertValidator();
  state.exporter = new MultiFormatExporter();

  // Restore session state if available
  const savedSession = state.sessionManager.load();
  if (savedSession && savedSession.state) {
    log(`Session restored (${Object.keys(savedSession.state).length} state keys loaded)`);
  }

  // Log module versions
  log(`Visualization module v${VISUALIZATION_MODULE.version} loaded (${VISUALIZATION_MODULE.exports.length} functions)`);
  log(`Collaboration module v${COLLABORATION_MODULE.version} loaded (${COLLABORATION_MODULE.exports.length} classes)`);

  // Try to migrate from localStorage to IndexedDB
  await migrateToIndexedDB();

  const cache = await loadCache();
  if (cache) {
    applyCache(cache);
    const stats = await getCacheStats();
    log(`Cache loaded: ${stats.trialCount} trials, ${stats.sizeEstimate} (${stats.storageType})`);
  } else {
    renderTopicList();
  }
  applyDefaultOutcomeRule();
  const firstEligible = state.topics.find(
    t => (t.trials || []).length >= ELIGIBILITY_TRIAL_MINIMUM
  );
  if (firstEligible) {
    selectTopic(firstEligible.id);
  } else if (state.topics.length === 1) {
    selectTopic(state.topics[0].id);
  }
  if (APP_CONFIG.autoUpdateOnLoad) {
    startUpdate();
  }
}

init();
