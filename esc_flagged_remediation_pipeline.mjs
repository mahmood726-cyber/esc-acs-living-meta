#!/usr/bin/env node
/**
 * Remediation pipeline for flagged ESC guideline areas.
 *
 * - Reads latest ESC summary
 * - Targets flagged areas (or --areas override)
 * - Applies expanded term bundles + landmark recovery mode
 * - Writes PASS-only final pack
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createSearchStrategy,
  runSurveillance
} from './living-review.js';

const DEFAULT_GATEWAY = 'http://127.0.0.1:8787/aact/query';
const DEFAULT_SUMMARY = 'reports/esc_guideline_universe_summary_latest.json';

const REMEDIATION_TERMS = {
  acute_coronary_syndromes: [
    'acute coronary syndrome',
    'ACS',
    'myocardial infarction',
    'STEMI',
    'NSTEMI',
    'unstable angina',
    'heart attack',
    'non-ST elevation',
    'ST elevation'
  ],
  pulmonary_hypertension: [
    'pulmonary hypertension',
    'pulmonary arterial hypertension',
    'PAH',
    'CTEPH',
    'right heart failure'
  ],
  peripheral_arterial_disease: [
    'peripheral arterial disease',
    'PAD',
    'peripheral vascular disease',
    'claudication',
    'critical limb ischemia',
    'lower extremity artery disease'
  ]
};

function parseArgValue(flag, fallback = null) {
  const arg = process.argv.find(a => a.startsWith(`${flag}=`));
  if (!arg) return fallback;
  return arg.split('=').slice(1).join('=').trim() || fallback;
}

function parsePositiveInt(flag, fallback) {
  const raw = parseArgValue(flag, null);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function formatNowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function toCsv(rows = []) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(h => {
      const v = row[h] ?? '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

function buildRemediationStrategy(areaKey, gatewayUrl, maxResults) {
  const terms = REMEDIATION_TERMS[areaKey] || [areaKey.replace(/_/g, ' ')];
  const condition = terms[0];
  return createSearchStrategy({
    name: `ESC remediation ${areaKey}`,
    guidelineProfile: 'esc',
    sources: ['aact'],
    aactQuery: {
      guidelineProfile: 'esc',
      guidelineArea: areaKey,
      condition,
      synonyms: terms.slice(1),
      additionalTerms: terms,
      maxResults,
      useAreaTerms: false,
      completedOnly: true,
      status: ['COMPLETED']
    },
    aactGatewayUrl: gatewayUrl,
    requiredKeywords: [condition],
    preferredKeywords: terms.slice(1),
    exclusionKeywords: ['animal', 'in vitro'],
    acceptedDesigns: ['RCT', 'Observational'],
    requireAACTForFinalReview: true,
    requireAACTIncrementalCapture: false,
    enforceLandmarkCoverage: true,
    minLandmarkCoveragePct: 70,
    landmarkGuidelineAreas: [areaKey]
  });
}

async function main() {
  const gatewayUrl = parseArgValue('--gateway', DEFAULT_GATEWAY);
  const maxResults = parsePositiveInt('--max-results', 200);
  const summaryPath = parseArgValue('--summary', DEFAULT_SUMMARY);
  const explicitAreas = parseArgValue('--areas', '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  const stamp = formatNowStamp();
  const reportDir = path.join(process.cwd(), 'reports');

  const baseline = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  const flaggedAreas = baseline.perArea
    .filter(r => r.robustnessDecision !== 'PASS')
    .map(r => r.areaKey);
  const areas = explicitAreas.length > 0 ? explicitAreas : flaggedAreas;

  if (areas.length === 0) {
    console.log('No flagged areas to remediate.');
    return;
  }

  await fs.mkdir(reportDir, { recursive: true });

  const remediated = [];
  for (const areaKey of areas) {
    console.log(`Running remediation bundle for ${areaKey}...`);
    const strategy = buildRemediationStrategy(areaKey, gatewayUrl, maxResults);
    const results = await runSurveillance(strategy, []);
    const row = {
      areaKey,
      robustnessDecision: results.robustness?.decision || 'FLAG',
      robustnessScore: Number(results.robustness?.score || 0),
      landmarkCoveragePct: Number(results.landmarkCoverage?.overallCoveragePct || 0),
      aactRetrieved: Number(results.sources?.aact?.retrieved || 0),
      trialUniverseWithoutPICO: Number(results.trialUniverse?.withoutPICO?.totalStudies || 0),
      trialUniverseWithPICO: Number(results.trialUniverse?.withPICO?.totalStudies || 0),
      picoRetainedPct: Number(results.trialUniverse?.comparison?.retainedPct || 0),
      actionItems: (results.robustness?.actionItems || []).join(' | ')
    };
    remediated.push(row);

    const areaSnapshot = {
      generatedAt: new Date().toISOString(),
      areaKey,
      remediation: true,
      strategy,
      results
    };
    const areaPath = path.join(reportDir, `esc_remediation_${areaKey}_${stamp}.json`);
    await fs.writeFile(areaPath, JSON.stringify(areaSnapshot, null, 2), 'utf8');
    console.log(
      `[${row.robustnessDecision}] ${areaKey}: landmark=${row.landmarkCoveragePct}%, ` +
      `withoutPICO=${row.trialUniverseWithoutPICO}, withPICO=${row.trialUniverseWithPICO}`
    );
  }

  const passOnly = remediated.filter(r => r.robustnessDecision === 'PASS');
  const packagePayload = {
    generatedAt: new Date().toISOString(),
    baselineSummaryPath: summaryPath,
    gatewayUrl,
    remediatedAreaCount: remediated.length,
    passAreaCount: passOnly.length,
    remediated,
    passOnly
  };

  const jsonPath = path.join(reportDir, `esc_flagged_remediation_pack_${stamp}.json`);
  const csvPath = path.join(reportDir, `esc_flagged_remediation_pack_${stamp}.csv`);
  const passOnlyJson = path.join(reportDir, 'esc_pass_only_final_pack_latest.json');
  const passOnlyCsv = path.join(reportDir, 'esc_pass_only_final_pack_latest.csv');
  await fs.writeFile(jsonPath, JSON.stringify(packagePayload, null, 2), 'utf8');
  await fs.writeFile(csvPath, toCsv(remediated), 'utf8');
  await fs.writeFile(passOnlyJson, JSON.stringify(passOnly, null, 2), 'utf8');
  await fs.writeFile(passOnlyCsv, toCsv(passOnly), 'utf8');

  console.log(`\nRemediation pack written: ${jsonPath}`);
  console.log(`PASS-only final pack: ${passOnlyJson}`);
  console.log(`PASS count: ${passOnly.length}/${remediated.length}`);
}

main().catch(err => {
  console.error('Remediation pipeline failed:', err.message || err);
  process.exit(1);
});
