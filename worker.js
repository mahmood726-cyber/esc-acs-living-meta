import { extractDoseFromLabel } from "./analysis.js";

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

self.onmessage = async event => {
  const msg = event.data;
  if (msg.type !== "update") return;
  const { settings, topics, baseQuery } = msg;
  try {
    for (const topic of topics) {
      const query = buildQuery(baseQuery, topic.keywords || []);
      postMessage({ type: "log", message: `Querying ${topic.label}` });
      const trials = await fetchTrials(query, settings);
      postMessage({ type: "topicProgress", topicId: topic.id, trials, query });
    }
    postMessage({ type: "updateComplete", lastUpdate: new Date().toISOString() });
  } catch (err) {
    postMessage({ type: "error", message: "Update failed. Check network access or query limits." });
  }
};

function buildQuery(base, keywords) {
  if (!keywords.length) return base;
  const joined = keywords.map(k => `"${k}"`).join(" OR ");
  return `${base} AND (${joined})`;
}

async function fetchTrials(query, settings) {
  const results = [];
  let pageToken = null;
  let page = 0;
  do {
    const url = new URL(BASE_URL);
    url.searchParams.set("query.term", query);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Request failed");
    const payload = await response.json();
    const studies = payload.studies || [];
    for (const study of studies) {
      const trial = normalizeTrial(study, settings);
      if (trial) results.push(trial);
    }
    pageToken = payload.nextPageToken || null;
    page += 1;
  } while (pageToken && page < 20);
  return results;
}

function normalizeTrial(study, settings) {
  const protocol = study.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const status = protocol.statusModule || {};
  const design = protocol.designModule || {};
  const nctId = identification.nctId || identification.nctIdAlias || study.nctId;
  const title = identification.briefTitle || identification.officialTitle || identification.acronym || "";
  const overallStatus = status.overallStatus || "";
  const startDate = extractDate(status.startDateStruct || status.startDate);
  const completionDate = extractDate(status.completionDateStruct || status.completionDate);
  if (!filterStatus(overallStatus, settings.statuses)) return null;
  if (!filterStartDate(startDate, settings.startDate)) return null;
  if (!isRandomized(design)) return null;
  const conditions = extractConditions(protocol);
  if (settings.enforceConditionFilter !== false && conditions.length && !matchesCondition(conditions)) {
    return null;
  }
  const hasPostedResults = Boolean(study.hasResults || study.resultsSection);
  if (settings.requirePostedResults && !hasPostedResults) return null;

  const arms = extractArms(protocol);
  if (settings.requireComparatorArms && arms.length < 2) return null;
  const outcome = extractOutcome(study, settings.outcomeRule);
  if (settings.requireNumericOutcome && !outcome) return null;

  return {
    nctId,
    title,
    status: overallStatus,
    startDate,
    completionDate,
    studyType: design.studyType || "",
    allocation: design.allocation || (design.designInfo || {}).allocation || "",
    phase: design.phases || (design.phaseList || {}).phase || [],
    conditions,
    arms,
    outcome,
    hasPostedResults,
    raw: study
  };
}

function filterStatus(status, allowed) {
  if (!allowed || !allowed.length) return true;
  return allowed.includes(status);
}

function filterStartDate(startDate, minDate) {
  if (!minDate || !startDate) return true;
  return new Date(startDate) >= new Date(minDate);
}

function isRandomized(design) {
  const studyType = (design.studyType || "").toUpperCase();
  if (!studyType.includes("INTERVENTIONAL")) return false;
  const allocation =
    (design.allocation || (design.designInfo || {}).allocation || "").toUpperCase();
  const randomization =
    (design.designInfo || {}).allocation ||
    (design.designInfo || {}).randomization ||
    "";
  return allocation.includes("RANDOM") || randomization.toUpperCase().includes("RANDOM");
}

function extractArms(protocol) {
  const armsModule = protocol.armsInterventionsModule || {};
  const arms =
    armsModule.armGroupList?.armGroup ||
    armsModule.armGroups ||
    armsModule.armGroup ||
    [];
  return (Array.isArray(arms) ? arms : [arms]).map((arm, idx) => ({
    id: arm.armGroupId || arm.groupId || `${idx + 1}`,
    title: arm.armGroupLabel || arm.armGroupTitle || arm.title || arm.description || `Arm ${idx + 1}`,
    description: arm.armGroupDescription || arm.description || "",
    dose: extractDoseFromLabel(
      arm.armGroupLabel || arm.armGroupTitle || arm.title || arm.description || ""
    )
  }));
}

function extractConditions(protocol) {
  const module = protocol.conditionsModule || {};
  const list = module.conditions || module.conditionList?.condition || module.condition || [];
  const conditions = Array.isArray(list) ? list : [list];
  return conditions.filter(Boolean).map(c => String(c));
}

function matchesCondition(conditions) {
  const haystack = conditions.join(" ").toLowerCase();
  const tokens = [
    // ACS core terms
    "acute coronary",
    "acute myocardial",
    "myocardial infarct",
    "myocardial ischem",
    "myocardial ischaem",
    "stemi",
    "nstemi",
    "nste-acs",
    "unstable angina",
    "heart attack",
    "ami",
    // Coronary disease terms
    "coronary artery disease",
    "coronary heart disease",
    "coronary syndrome",
    "coronary event",
    "ischemic heart",
    "ischaemic heart",
    "cad",
    "chd",
    // Procedures
    "pci",
    "percutaneous coronary",
    "revascular",
    "stent",
    "angioplasty",
    "cabg",
    "bypass",
    // Related conditions
    "thromb",
    "angina",
    "cardiogenic shock",
    "left ventricular dysfunction",
    "lv dysfunction",
    "heart failure",
    // Broader cardiovascular (if also has coronary/MI context)
    "cardiovascular"
  ];
  // Primary match - any token found
  const primaryMatch = tokens.some(token => haystack.includes(token));
  if (primaryMatch) return true;

  // Secondary match for cardiovascular + intervention context
  if (haystack.includes("cardiovascular") || haystack.includes("cardiac")) {
    const interventionContext = [
      "antiplatelet", "statin", "aspirin", "clopidogrel", "ticagrelor",
      "prasugrel", "dapt", "pci", "intervention", "revascular"
    ];
    return interventionContext.some(term => haystack.includes(term));
  }

  return false;
}

function extractOutcome(study, rule) {
  const results = study.resultsSection || {};
  const module = results.outcomeMeasuresModule || {};
  const measures =
    module.outcomeMeasures ||
    module.outcomeMeasureList ||
    module.outcomeMeasure ||
    [];
  const list = Array.isArray(measures) ? measures : [measures];
  const filtered =
    rule === "primary"
      ? list.filter(m => (m.outcomeMeasureType || "").toUpperCase().includes("PRIMARY"))
      : list;
  for (const measure of filtered) {
    const grouped = extractOutcomeFromClasses(measure);
    if (grouped && grouped.length) {
      const type = inferOutcomeType(grouped);
      if (!type) continue;
      return {
        type,
        title: measure.outcomeMeasureTitle || measure.title || "",
        timeFrame: measure.outcomeMeasureTimeFrame || measure.timeFrame || "",
        unit: measure.outcomeMeasureUnit || measure.unit || "",
        groups: grouped
      };
    }
    const groupList =
      measure.outcomeMeasureGroupList?.outcomeMeasureGroup ||
      measure.outcomeMeasureGroupList ||
      measure.outcomeMeasureGroups ||
      [];
    const groups = (Array.isArray(groupList) ? groupList : [groupList]).map((g, idx) => ({
      id: g.outcomeMeasureGroupId || g.groupId || g.id || `${idx + 1}`,
      title: g.outcomeMeasureGroupTitle || g.groupTitle || g.title || g.description || `Group ${idx + 1}`
    }));
    const resultsList =
      measure.outcomeMeasureResultList?.outcomeMeasureResult ||
      measure.outcomeMeasureResults ||
      measure.outcomeMeasureResult ||
      measure.outcomeMeasureData ||
      measure.outcomeMeasureDataPoints ||
      [];
    const entries = Array.isArray(resultsList) ? resultsList : [resultsList];
    const merged = mergeOutcomeGroups(groups, entries);
    if (!merged.length) continue;
    const type = inferOutcomeType(merged);
    if (!type) continue;
    return {
      type,
      title: measure.outcomeMeasureTitle || measure.title || "",
      timeFrame: measure.outcomeMeasureTimeFrame || measure.timeFrame || "",
      unit: measure.outcomeMeasureUnit || measure.unit || "",
      groups: merged
    };
  }
  return null;
}

function extractOutcomeFromClasses(measure) {
  if (!measure || (!measure.groups && !measure.denoms && !measure.classes)) return null;
  const paramType = String(measure.paramType || "").toUpperCase();
  const dispersionType = String(measure.dispersionType || "").toUpperCase();
  const asMean =
    paramType.includes("MEAN") ||
    paramType.includes("GEOMETRIC_MEAN") ||
    paramType.includes("LEAST_SQUARES_MEAN");
  const asCount =
    !asMean &&
    (paramType.includes("COUNT") ||
      paramType.includes("NUMBER") ||
      paramType.includes("EVENT"));
  const groups = normalizeArray(measure.groups);
  const denoms = normalizeArray(measure.denoms);
  const classes = normalizeArray(measure.classes);
  if (!classes.length) return null;

  const groupMap = new Map();
  groups.forEach((g, idx) => {
    const id = g.id || g.groupId || g.group || g.title || `${idx + 1}`;
    const title = g.title || g.groupTitle || g.name || g.description || `Group ${idx + 1}`;
    groupMap.set(id, { id, title });
  });

  const nByGroup = new Map();
  denoms.forEach(denom => {
    normalizeArray(denom.counts).forEach((c, idx) => {
      const groupId = c.groupId || c.group || c.id || `${idx + 1}`;
      const n = parseNumber(c.value || c.count || c.numParticipants || c.n);
      if (groupId && n != null) nByGroup.set(groupId, n);
    });
  });

  const targetClass = classes.find(c => normalizeArray(c.categories).length) || classes[0];
  if (!targetClass) return null;
  const eventsByGroup = new Map();
  const categories = normalizeArray(targetClass.categories);
  const chosenCategory = pickCategory(categories);
  const categoryList = chosenCategory ? [chosenCategory] : categories;
  categoryList.forEach(category => {
    normalizeArray(category.measurements).forEach(measurement => {
      const groupId = measurement.groupId || measurement.group || measurement.id;
      const value = parseNumber(measurement.value || measurement.count || measurement.numParticipants);
      if (!groupId || value == null) return;
      if (asMean) {
        eventsByGroup.set(groupId, value);
      } else if (asCount || !paramType) {
        eventsByGroup.set(groupId, (eventsByGroup.get(groupId) || 0) + value);
      }
    });
  });

  const groupIds = new Set([...groupMap.keys(), ...nByGroup.keys(), ...eventsByGroup.keys()]);
  const merged = [];
  let idx = 0;
  groupIds.forEach(id => {
    idx += 1;
    const base = groupMap.get(id) || { id, title: `Group ${idx}` };
    const row = { ...base };
    if (nByGroup.has(id)) row.n = nByGroup.get(id);
    if (eventsByGroup.has(id)) {
      if (asMean) {
        row.mean = eventsByGroup.get(id);
        const dispersion = extractDispersionForGroup(
          categoryList,
          id,
          dispersionType,
          row.n
        );
        if (dispersion != null) row.sd = dispersion;
      } else {
        row.events = eventsByGroup.get(id);
      }
    }
    merged.push(row);
  });
  return merged;
}

function pickCategory(categories) {
  if (!categories.length) return null;
  if (categories.length === 1) return categories[0];
  const normalized = categories.map(c => ({
    raw: c,
    title: String(c.title || c.categoryTitle || "").toLowerCase()
  }));
  const preferred = normalized.find(c =>
    /(participant|event|events|case|cases|yes|positive)/.test(c.title)
  );
  if (preferred) return preferred.raw;
  const negative = normalized.find(c => /\bno\b|negative|none/.test(c.title));
  if (negative && normalized.length === 2) {
    return normalized.find(c => c !== negative)?.raw || categories[0];
  }
  return categories[0];
}

function extractDispersionForGroup(categories, groupId, dispersionType, nValue) {
  for (const category of categories) {
    for (const measurement of normalizeArray(category.measurements)) {
      const mGroupId = measurement.groupId || measurement.group || measurement.id;
      if (mGroupId !== groupId) continue;

      // Try direct SD first
      const directSd =
        parseNumber(measurement.sd) ??
        parseNumber(measurement.standardDeviation);
      if (directSd != null) {
        return directSd;
      }

      // Try spread/dispersion field
      const spread =
        parseNumber(measurement.spread) ??
        parseNumber(measurement.dispersion);

      if (spread != null) {
        // Standard Error → SD
        if (dispersionType.includes("STANDARD ERROR") || dispersionType.includes("SE")) {
          if (nValue) return spread * Math.sqrt(nValue);
          return spread * 4; // Fallback: assume n~16
        }
        // Standard Deviation
        if (dispersionType.includes("STANDARD DEVIATION") || dispersionType.includes("SD")) {
          return spread;
        }
        // Inter-quartile range → SD (SD ≈ IQR / 1.35)
        if (dispersionType.includes("INTER-QUARTILE") || dispersionType.includes("IQR")) {
          return spread / 1.35;
        }
        // Full range → SD (SD ≈ Range / 4 for normal distribution)
        if (dispersionType.includes("FULL RANGE") || dispersionType.includes("RANGE")) {
          return spread / 4;
        }
      }

      // Try CI bounds
      const lower = parseNumber(measurement.lowerLimit) ?? parseNumber(measurement.ciLower) ?? parseNumber(measurement.lowerBound);
      const upper = parseNumber(measurement.upperLimit) ?? parseNumber(measurement.ciUpper) ?? parseNumber(measurement.upperBound);

      if (lower != null && upper != null && upper > lower) {
        let zMultiplier = 1.96; // Default 95% CI

        // Detect CI level from dispersionType
        if (dispersionType.includes("90%") || dispersionType.includes("90 PERCENT")) {
          zMultiplier = 1.645;
        } else if (dispersionType.includes("99%") || dispersionType.includes("99 PERCENT")) {
          zMultiplier = 2.576;
        } else if (dispersionType.includes("80%") || dispersionType.includes("80 PERCENT")) {
          zMultiplier = 1.282;
        }

        // CI → SE → SD
        const se = (upper - lower) / (2 * zMultiplier);
        if (nValue && nValue > 1) {
          return se * Math.sqrt(nValue);
        }
        // If no n, estimate from typical trial size
        return se * Math.sqrt(50); // Conservative estimate
      }

      // Try extracting from structured CI object
      const ci = measurement.ci || measurement.confidenceInterval;
      if (ci) {
        const ciLower = parseNumber(ci.lower) ?? parseNumber(ci.lowerLimit);
        const ciUpper = parseNumber(ci.upper) ?? parseNumber(ci.upperLimit);
        if (ciLower != null && ciUpper != null && ciUpper > ciLower) {
          const se = (ciUpper - ciLower) / (2 * 1.96);
          if (nValue && nValue > 1) return se * Math.sqrt(nValue);
          return se * Math.sqrt(50);
        }
      }
    }
  }
  return null;
}

function mergeOutcomeGroups(groups, entries) {
  if (!entries.length) return [];
  const groupMap = new Map(groups.map(g => [g.id, { ...g }]));
  const merged = [];
  entries.forEach((entry, idx) => {
    const groupId =
      entry.outcomeMeasureGroupId || entry.groupId || entry.group || entry.groupTitle || `${idx + 1}`;
    const base = groupMap.get(groupId) || { id: groupId, title: entry.groupTitle || `Group ${idx + 1}` };
    const row = {
      ...base,
      n: parseNumber(entry.numParticipants || entry.participants || entry.sampleSize),
      events: parseNumber(entry.count || entry.events || entry.eventCount),
      mean: parseNumber(entry.mean || entry.value || entry.measure),
      sd: parseNumber(entry.sd || entry.standardDeviation || entry.dispersion)
    };
    merged.push(row);
  });
  return merged;
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function inferOutcomeType(groups) {
  const withEvents = groups.filter(g => g.events != null && g.n != null);
  if (withEvents.length >= 2) return "binary";
  const withMean = groups.filter(g => g.mean != null && g.sd != null && g.n != null);
  if (withMean.length >= 2) return "continuous";
  return null;
}

function parseNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (match) return Number.parseFloat(match[0]);
  }
  return null;
}

function extractDate(input) {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (input.date) return input.date;
  return null;
}
