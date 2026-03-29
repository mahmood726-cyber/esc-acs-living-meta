const DEFAULT_BASE_ACS_QUERY =
  '("acute coronary syndrome" OR "acute coronary syndromes" OR STEMI OR NSTEMI OR "unstable angina" OR "myocardial infarction" OR "acute MI" OR "AMI" OR (ACS AND (coronary OR myocardial OR stemi OR nstemi)) OR "ST-elevation" OR "non-ST elevation")';

const DEFAULT_TOPICS = [
  {
    id: "short_dapt",
    label: "Short DAPT (1-3 months) vs standard",
    keywords: ["short DAPT", "1 month DAPT", "3 months DAPT", "dual antiplatelet", "abbreviated DAPT", "shortened DAPT", "DAPT duration"]
  },
  {
    id: "deescalation_p2y12",
    label: "P2Y12 de-escalation (ticagrelor/prasugrel to clopidogrel)",
    keywords: ["de-escalation", "deescalation", "ticagrelor clopidogrel", "prasugrel clopidogrel", "P2Y12 switch", "antiplatelet switching", "step-down"]
  },
  {
    id: "aspirin_free",
    label: "Aspirin-free after PCI",
    keywords: ["aspirin free", "aspirin-free", "P2Y12 monotherapy", "stop aspirin", "aspirin discontinuation", "ticagrelor monotherapy", "clopidogrel monotherapy"]
  },
  {
    id: "ticagrelor_vs_prasugrel",
    label: "Ticagrelor vs prasugrel in ACS",
    keywords: ["ticagrelor prasugrel", "ticagrelor versus prasugrel", "ticagrelor vs prasugrel", "ISAR-REACT"]
  },
  {
    id: "prasugrel_vs_clopidogrel",
    label: "Prasugrel vs clopidogrel",
    keywords: ["prasugrel clopidogrel", "prasugrel versus clopidogrel", "prasugrel vs clopidogrel", "TRITON"]
  },
  {
    id: "ticagrelor_vs_clopidogrel",
    label: "Ticagrelor vs clopidogrel",
    keywords: ["ticagrelor clopidogrel", "ticagrelor versus clopidogrel", "ticagrelor vs clopidogrel", "PLATO"]
  },
  {
    id: "cangrelor_bridging",
    label: "Cangrelor bridging or peri-PCI",
    keywords: ["cangrelor", "bridging antiplatelet", "peri-procedural P2Y12", "CHAMPION"]
  },
  {
    id: "gpiibiiia",
    label: "GP IIb/IIIa inhibitors",
    keywords: ["GPIIb/IIIa", "GP IIb/IIIa", "glycoprotein IIb/IIIa", "tirofiban", "abciximab", "eptifibatide", "integrilin"]
  },
  {
    id: "bivalirudin",
    label: "Bivalirudin vs heparin",
    keywords: ["bivalirudin", "bivalirudin heparin", "direct thrombin inhibitor", "HORIZONS", "EUROMAX", "HEAT-PPCI"]
  },
  {
    id: "anticoag_af",
    label: "DOAC + antiplatelet in AF + ACS",
    keywords: ["atrial fibrillation ACS", "DOAC antiplatelet", "rivaroxaban", "apixaban", "dabigatran", "edoxaban", "dual pathway", "PIONEER", "RE-DUAL", "AUGUSTUS"]
  },
  {
    id: "triple_therapy",
    label: "Triple therapy duration",
    keywords: ["triple therapy", "triple antithrombotic", "anticoagulant DAPT", "OAC antiplatelet", "warfarin DAPT"]
  },
  {
    id: "early_invasive_nste",
    label: "Early invasive vs delayed in NSTE-ACS",
    keywords: ["early invasive", "delayed invasive", "immediate invasive", "timing invasive", "NSTEMI timing", "TIMACS", "VERDICT"]
  },
  {
    id: "complete_revasc",
    label: "Complete vs culprit-only revascularization",
    keywords: ["complete revascularization", "culprit-only", "culprit only", "multivessel PCI", "multivessel disease", "non-culprit", "PRAMI", "CvLPRIT", "DANAMI-3", "COMPLETE"]
  },
  {
    id: "staged_pci",
    label: "Staged PCI timing after STEMI",
    keywords: ["staged PCI", "staged revascularization", "timing PCI", "immediate complete", "multivessel STEMI", "in-hospital staged"]
  },
  {
    id: "thrombus_aspiration",
    label: "Thrombus aspiration",
    keywords: ["thrombus aspiration", "thrombectomy", "manual aspiration", "rheolytic", "TASTE", "TOTAL", "aspiration catheter"]
  },
  {
    id: "ivus_oct",
    label: "IVUS/OCT-guided PCI",
    keywords: ["IVUS", "OCT", "intravascular imaging", "intravascular ultrasound", "optical coherence", "imaging-guided PCI", "ILUMIEN", "ULTIMATE"]
  },
  {
    id: "ffr_ifr",
    label: "FFR/iFR-guided PCI",
    keywords: ["FFR", "iFR", "fractional flow reserve", "instantaneous wave-free", "physiology-guided", "FAME", "DEFINE-FLAIR", "iFR-SWEDEHEART"]
  },
  {
    id: "radial_access",
    label: "Radial vs femoral access",
    keywords: ["radial access", "femoral access", "transradial", "transfemoral", "access site", "MATRIX", "RIVAL", "RIFLE-STEACS"]
  },
  {
    id: "mcs_shock",
    label: "Mechanical circulatory support in ACS shock",
    keywords: ["cardiogenic shock", "mechanical circulatory", "IABP", "Impella", "ECMO", "ECLS", "intra-aortic balloon", "ventricular assist", "IABP-SHOCK"]
  },
  {
    id: "beta_blocker",
    label: "Beta-blocker duration post-MI",
    keywords: ["beta blocker", "beta-blocker", "metoprolol", "carvedilol", "bisoprolol", "post MI beta", "REDUCE-AMI"]
  },
  {
    id: "acei_arb_arni",
    label: "ACEI/ARB/ARNI post-MI",
    keywords: ["ACE inhibitor", "ACEI", "ARB", "ARNI", "sacubitril", "valsartan", "ramipril", "post MI", "angiotensin", "PARADISE-MI"]
  },
  {
    id: "mra_post_mi",
    label: "Mineralocorticoid receptor antagonists",
    keywords: ["eplerenone", "spironolactone", "MRA", "mineralocorticoid", "aldosterone antagonist", "EPHESUS", "ALBATROSS"]
  },
  {
    id: "statin_intensity",
    label: "High-intensity statin vs moderate",
    keywords: ["high intensity statin", "high-intensity statin", "atorvastatin 80", "rosuvastatin 20", "intensive lipid", "PROVE IT", "IDEAL"]
  },
  {
    id: "ezetimibe_combo",
    label: "Ezetimibe add-on after ACS",
    keywords: ["ezetimibe", "statin ezetimibe", "IMPROVE-IT", "lipid lowering add-on"]
  },
  {
    id: "pcsk9_early",
    label: "PCSK9 inhibitors early post-ACS",
    keywords: ["PCSK9", "evolocumab", "alirocumab", "inclisiran", "EVOPACS", "ODYSSEY", "FOURIER"]
  },
  {
    id: "colchicine",
    label: "Colchicine after ACS",
    keywords: ["colchicine", "COLCOT", "LoDoCo", "anti-inflammatory ACS", "CLEAR SYNERGY"]
  },
  {
    id: "il1_inhibitors",
    label: "IL-1 inhibitors",
    keywords: ["canakinumab", "anakinra", "IL-1", "interleukin-1", "CANTOS", "anti-inflammatory"]
  },
  {
    id: "omega3",
    label: "High-dose EPA/omega-3",
    keywords: ["omega-3", "omega 3", "EPA", "icosapent", "fish oil", "REDUCE-IT", "STRENGTH"]
  },
  {
    id: "sglt2_post_mi",
    label: "SGLT2 inhibitors post-MI",
    keywords: ["SGLT2", "SGLT-2", "sodium-glucose cotransporter", "dapagliflozin", "empagliflozin", "canagliflozin", "ertugliflozin", "DAPA-MI", "EMMY", "gliflozin"]
  },
  {
    id: "glp1_post_mi",
    label: "GLP-1 receptor agonists post-ACS",
    keywords: ["GLP-1", "GLP1", "glucagon-like peptide", "liraglutide", "semaglutide", "exenatide", "dulaglutide", "tirzepatide", "FIGHT", "LIVE"]
  },
  {
    id: "dpp4_post_mi",
    label: "DPP-4 inhibitors post-MI",
    keywords: ["DPP-4", "DPP4", "dipeptidyl peptidase", "sitagliptin", "saxagliptin", "linagliptin", "EXAMINE", "TECOS", "SAVOR"]
  },
  {
    id: "factor_xi",
    label: "Factor XI inhibitors",
    keywords: ["factor XI", "FXI", "asundexian", "milvexian", "abelacimab", "AXIOMATIC", "PACIFIC"]
  },
  {
    id: "genetic_testing",
    label: "Genotype-guided antiplatelet therapy",
    keywords: ["CYP2C19", "genotype", "pharmacogenomic", "genetic testing", "POPular Genetics", "TAILOR-PCI"]
  },
  {
    id: "platelet_function",
    label: "Platelet function testing guided therapy",
    keywords: ["platelet function testing", "PFT", "platelet reactivity", "VerifyNow", "ARCTIC", "ANTARCTIC"]
  },
  {
    id: "bleeding_risk",
    label: "High bleeding risk strategies",
    keywords: ["high bleeding risk", "HBR", "ARC-HBR", "LEADERS FREE", "ONYX ONE", "bleeding avoidance"]
  },
  {
    id: "ppi_dapt",
    label: "PPI co-therapy with DAPT",
    keywords: ["proton pump inhibitor", "PPI", "omeprazole", "pantoprazole", "COGENT", "gastroprotection"]
  },
  {
    id: "early_discharge",
    label: "Early discharge pathways",
    keywords: ["early discharge", "same-day discharge", "next-day discharge", "short stay", "rapid discharge", "accelerated pathway"]
  },
  {
    id: "rehab_digital",
    label: "Digital cardiac rehabilitation",
    keywords: ["cardiac rehabilitation", "digital rehab", "telehealth", "tele-rehab", "mobile health", "mHealth", "text message", "smartphone", "app-based"]
  },
  {
    id: "hybrid_antiplatelet",
    label: "Hybrid antiplatelet strategies",
    keywords: ["switching antiplatelet", "antiplatelet strategy", "hybrid", "tailored antiplatelet", "individualized"]
  },
  {
    id: "contrast_sparing",
    label: "Contrast-sparing PCI",
    keywords: ["contrast sparing", "zero contrast", "ultra-low contrast", "renal protection", "contrast-induced", "AKI prevention"]
  },
  {
    id: "lipid_apob",
    label: "ApoB or Lp(a) targeted therapy",
    keywords: ["ApoB", "apolipoprotein B", "Lp(a)", "lipoprotein(a)", "pelacarsen", "olpasiran", "ORION"]
  },
  {
    id: "stent_strategy",
    label: "Stent platform or bioresorbable scaffolds",
    keywords: ["bioresorbable", "BRS", "scaffold", "stent platform", "drug-eluting stent", "ABSORB", "polymer-free"]
  },
  {
    id: "oxygen_strategy",
    label: "Oxygen therapy strategy in ACS",
    keywords: ["oxygen therapy", "supplemental oxygen", "hyperoxia", "DETO2X", "AVOID", "oxygen saturation"]
  },
  {
    id: "indobufen",
    label: "Indobufen vs aspirin",
    keywords: ["indobufen", "aspirin alternative", "cyclooxygenase inhibitor"]
  },
  {
    id: "left_atrial_appendage",
    label: "Left atrial appendage closure + ACS",
    keywords: ["left atrial appendage", "LAA", "WATCHMAN", "appendage closure", "stroke prevention AF"]
  }
];

const DEFAULT_APP_CONFIG = {
  pageTitle: "ESC ACS 2027 Living Meta-Analysis",
  kicker: "ESC 2027 - Living Evidence",
  title: "ACS Living Meta-Analysis Studio",
  subtitle:
    "RCT-only, guideline-aligned topics with automated ClinicalTrials.gov extraction and advanced meta-analytic synthesis.",
  topicPanelTitle: "ACS Hot Topics (Auto-pruned to >=5 RCTs)",
  welcomeTitle: "Welcome to ESC ACS Living Meta-Analysis Studio",
  eligibilityTrialMinimum: 5,
  analysisStudioName: "ESC ACS Living Meta-Analysis Studio v1.0",
  defaultStatuses: ["COMPLETED", "ACTIVE_NOT_RECRUITING"],
  defaultOutcomeRule: "primary",
  requirePostedResults: false,
  requireNumericOutcome: false,
  requireComparatorArms: false,
  enforceConditionFilter: true,
  autoUpdateOnLoad: false
};

function normalizeOverrideTopic(topic, index) {
  const id = String(topic?.id || `topic_${index + 1}`).trim();
  const label = String(topic?.label || id).trim();
  const rawKeywords = Array.isArray(topic?.keywords) ? topic.keywords : [];
  const keywords = rawKeywords
    .map(keyword => String(keyword || "").trim())
    .filter(Boolean);

  return {
    id,
    label,
    keywords
  };
}

function normalizeOverrideConfig(config) {
  if (!config || typeof config !== "object") return DEFAULT_APP_CONFIG;
  const minTrialCount = Number(config.eligibilityTrialMinimum);
  return {
    ...DEFAULT_APP_CONFIG,
    ...config,
    eligibilityTrialMinimum:
      Number.isFinite(minTrialCount) && minTrialCount > 0
        ? Math.floor(minTrialCount)
        : DEFAULT_APP_CONFIG.eligibilityTrialMinimum
  };
}

const runtimeOverride = globalThis.__ESC_ACS_TOPICS_OVERRIDE__ || null;
const overrideTopics = Array.isArray(runtimeOverride?.topics)
  ? runtimeOverride.topics.map(normalizeOverrideTopic).filter(topic => topic.keywords.length > 0)
  : [];

export const BASE_ACS_QUERY =
  typeof runtimeOverride?.baseQuery === "string" && runtimeOverride.baseQuery.trim()
    ? runtimeOverride.baseQuery.trim()
    : DEFAULT_BASE_ACS_QUERY;

export const TOPICS = overrideTopics.length > 0 ? overrideTopics : DEFAULT_TOPICS;

export const APP_CONFIG = normalizeOverrideConfig(runtimeOverride?.appConfig);
