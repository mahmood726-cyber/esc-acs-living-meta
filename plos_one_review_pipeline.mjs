import fs from "node:fs";
import path from "node:path";
import { ScreeningQueue } from "./collaboration.js";

const DEFAULT_FIXTURE_PATH = path.resolve("fixtures", "esc_acs_fixture.json");
const DEFAULT_LOG_PATH = path.resolve("reports", "plos_one_screening_log.csv");
const DEFAULT_DECLARATIONS_PATH = path.resolve("reports", "plos_one_declarations.json");
const DEFAULT_REPORT_PATH = path.resolve("reports", "plos_one_readiness_from_log.json");

const ALLOWED_DECISIONS = new Set(["include", "exclude", "maybe"]);

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function csvEscape(value) {
  const str = String(value ?? "");
  const escaped = str.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

function normalizeDecision(value) {
  const decision = String(value || "").trim().toLowerCase();
  return ALLOWED_DECISIONS.has(decision) ? decision : "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      field += "\"";
      i += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      field = "";
      if (row.length > 1 || (row.length === 1 && row[0].trim() !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== "")) {
      rows.push(row);
    }
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map(h => String(h || "").trim());
  return rows.slice(1).map(cells => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = idx < cells.length ? cells[idx] : "";
    });
    return obj;
  });
}

function loadFixtureStudies(fixturePath = DEFAULT_FIXTURE_PATH) {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const seen = new Set();
  const studies = [];

  (fixture.topics || []).forEach((topic, topicIdx) => {
    (topic.trials || []).forEach((trial, trialIdx) => {
      const id = String(trial.nctId || `${topic.id || "topic"}_${topicIdx}_${trialIdx}`);
      if (seen.has(id)) return;
      seen.add(id);
      studies.push({
        study_id: id,
        nct_id: trial.nctId || "",
        title: trial.title || "",
        topic_id: topic.id || "",
        topic_label: topic.label || "",
        reviewer1_decision: "",
        reviewer1_note: "",
        reviewer2_decision: "",
        reviewer2_note: "",
        final_decision: "",
        resolver_id: "",
        resolution_note: ""
      });
    });
  });

  return studies;
}

function writeScreeningTemplate(studies, logPath = DEFAULT_LOG_PATH, force = false) {
  if (!force && fs.existsSync(logPath)) {
    return { path: logPath, written: false };
  }

  ensureDirectory(logPath);

  const headers = [
    "study_id",
    "nct_id",
    "title",
    "topic_id",
    "topic_label",
    "reviewer1_decision",
    "reviewer1_note",
    "reviewer2_decision",
    "reviewer2_note",
    "final_decision",
    "resolver_id",
    "resolution_note"
  ];

  const lines = [headers.map(csvEscape).join(",")];
  studies.forEach(study => {
    lines.push(headers.map(h => csvEscape(study[h] || "")).join(","));
  });

  fs.writeFileSync(logPath, `${lines.join("\n")}\n`, "utf8");
  return { path: logPath, written: true };
}

function writeDeclarationsTemplate(declarationsPath = DEFAULT_DECLARATIONS_PATH, force = false) {
  if (!force && fs.existsSync(declarationsPath)) {
    return { path: declarationsPath, written: false };
  }

  ensureDirectory(declarationsPath);
  const template = {
    primaryReviewers: ["reviewer1", "reviewer2"],
    protocolRegistrationId: "",
    protocolUrl: "",
    dataAvailabilityStatement: "",
    dataAvailabilityUrl: "",
    prismaChecklistUrl: "",
    searchStrategyAppendixUrl: "",
    screeningLogPath: "reports/plos_one_screening_log.csv"
  };
  fs.writeFileSync(declarationsPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  return { path: declarationsPath, written: true };
}

function loadDeclarations(declarationsPath = DEFAULT_DECLARATIONS_PATH) {
  if (!fs.existsSync(declarationsPath)) return {};
  return JSON.parse(fs.readFileSync(declarationsPath, "utf8"));
}

function buildQueueFromLogRows(rows) {
  const studies = rows.map((row, idx) => ({
    id: String(row.study_id || row.nct_id || `study_${idx}`),
    nctId: row.nct_id || "",
    title: row.title || "",
    topicId: row.topic_id || "",
    topicLabel: row.topic_label || ""
  }));

  const queue = new ScreeningQueue(studies, { requireDualReview: true });

  rows.forEach((row, idx) => {
    const studyId = String(row.study_id || row.nct_id || `study_${idx}`);
    const reviewer1Decision = normalizeDecision(row.reviewer1_decision);
    const reviewer2Decision = normalizeDecision(row.reviewer2_decision);
    const finalDecision = normalizeDecision(row.final_decision);
    const resolverId = String(row.resolver_id || "").trim();

    if (reviewer1Decision) {
      queue.recordDecision(studyId, reviewer1Decision, "reviewer1", row.reviewer1_note || "");
    }
    if (reviewer2Decision) {
      queue.recordDecision(studyId, reviewer2Decision, "reviewer2", row.reviewer2_note || "");
    }
    if (finalDecision && resolverId) {
      queue.resolveConflict(studyId, finalDecision, resolverId, row.resolution_note || "");
    }
  });

  return queue;
}

function computePLOSOneReport({
  logPath = DEFAULT_LOG_PATH,
  declarationsPath = DEFAULT_DECLARATIONS_PATH,
  reportPath = DEFAULT_REPORT_PATH
} = {}) {
  if (!fs.existsSync(logPath)) {
    throw new Error(`Screening log not found: ${logPath}`);
  }

  const rows = parseCsv(fs.readFileSync(logPath, "utf8"));
  if (rows.length === 0) {
    throw new Error(`Screening log has no rows: ${logPath}`);
  }

  const queue = buildQueueFromLogRows(rows);
  const declarations = loadDeclarations(declarationsPath);

  const criteria = {
    primaryReviewers: declarations.primaryReviewers,
    protocolRegistrationId: declarations.protocolRegistrationId || "",
    protocolUrl: declarations.protocolUrl || "",
    dataAvailabilityStatement: declarations.dataAvailabilityStatement || "",
    dataAvailabilityUrl: declarations.dataAvailabilityUrl || "",
    prismaChecklistUrl: declarations.prismaChecklistUrl || "",
    searchStrategyAppendixUrl: declarations.searchStrategyAppendixUrl || "",
    screeningLogPath: declarations.screeningLogPath || path.relative(path.dirname(reportPath), logPath),
    screeningLogExported: true
  };

  const report = queue.generatePLOSONEReadinessReport(criteria);

  ensureDirectory(reportPath);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const summary = {
    reportPath,
    decision: report.overall.decision,
    score: report.overall.score,
    checksPassed: report.overall.checksPassed,
    checksTotal: report.overall.checksTotal,
    failedChecks: report.checks.filter(c => !c.pass).map(c => c.id),
    studies: report.metrics.totalStudies
  };
  return { report, summary };
}

function printUsage() {
  console.log("Usage:");
  console.log("  node plos_one_review_pipeline.mjs --init");
  console.log("  node plos_one_review_pipeline.mjs --run");
  console.log("  node plos_one_review_pipeline.mjs --watch");
  console.log("");
  console.log("Outputs:");
  console.log(`  ${DEFAULT_LOG_PATH}`);
  console.log(`  ${DEFAULT_DECLARATIONS_PATH}`);
  console.log(`  ${DEFAULT_REPORT_PATH}`);
}

function startWatchMode() {
  const rerun = () => {
    try {
      const { summary } = computePLOSOneReport();
      console.log(`[watch] decision=${summary.decision} score=${summary.score} failed=${summary.failedChecks.length}`);
    } catch (error) {
      console.error(`[watch] ${error.message}`);
    }
  };

  let timer = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(rerun, 250);
  };

  const watchFiles = [DEFAULT_LOG_PATH, DEFAULT_DECLARATIONS_PATH];
  watchFiles.forEach(filePath => {
    ensureDirectory(filePath);
    if (!fs.existsSync(filePath)) return;
    fs.watch(filePath, schedule);
  });

  rerun();
  console.log(`[watch] Watching ${DEFAULT_LOG_PATH} and ${DEFAULT_DECLARATIONS_PATH}`);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const hasInit = args.has("--init");
  const hasRun = args.has("--run");
  const hasWatch = args.has("--watch");
  const force = args.has("--force");

  if (!hasInit && !hasRun && !hasWatch) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (hasInit) {
    const studies = loadFixtureStudies();
    const logResult = writeScreeningTemplate(studies, DEFAULT_LOG_PATH, force);
    const declarationsResult = writeDeclarationsTemplate(DEFAULT_DECLARATIONS_PATH, force);
    console.log(
      JSON.stringify(
        {
          action: "init",
          studies: studies.length,
          screeningLog: logResult,
          declarations: declarationsResult
        },
        null,
        2
      )
    );
  }

  if (hasRun) {
    const { summary } = computePLOSOneReport();
    console.log(JSON.stringify({ action: "run", ...summary }, null, 2));
  }

  if (hasWatch) {
    startWatchMode();
  }
}

main();
