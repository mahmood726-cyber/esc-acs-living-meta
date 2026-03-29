#!/usr/bin/env node
/**
 * ESC guideline surveillance pipeline with trial-universe reporting.
 *
 * Produces per-area and aggregate reports with:
 * - AACT retrieval counts
 * - Trial universe without PICO filtering
 * - Trial universe with PICO filtering
 * - Landmark coverage and robustness decisions
 *
 * Usage:
 *   node esc_guideline_universe_pipeline.mjs
 *   node esc_guideline_universe_pipeline.mjs --gateway=http://127.0.0.1:8787/aact/query --max-results=300
 *   node esc_guideline_universe_pipeline.mjs --areas=heart_failure,acute_coronary_syndromes
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createSearchStrategy,
  runSurveillance,
  ESC_GUIDELINE_PROFILES
} from './living-review.js';

const DEFAULT_GATEWAY = 'http://127.0.0.1:8787/aact/query';
const PROFILE_KEY = 'cardiology';

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

function buildInclusionCriteria(areaTerms = []) {
  const areaKeywords = areaTerms.slice(0, 8);
  return {
    requiredKeywords: areaKeywords.slice(0, 2),
    preferredKeywords: [...areaKeywords.slice(2), 'randomized', 'trial', 'double blind'],
    exclusionKeywords: ['protocol', 'retrospective', 'animal', 'in vitro'],
    acceptedDesigns: ['RCT', 'Observational']
  };
}

function buildAreaStrategy(areaKey, areaTerms, gatewayUrl, maxResults) {
  const primaryCondition = areaTerms[0] || areaKey.replace(/_/g, ' ');
  const inclusionCriteria = buildInclusionCriteria(areaTerms);
  return createSearchStrategy({
    name: `ESC ${areaKey} surveillance`,
    guidelineProfile: 'esc',
    sources: ['aact'],
    aactQuery: {
      guidelineProfile: 'esc',
      guidelineArea: areaKey,
      condition: primaryCondition,
      useAreaTerms: false,
      completedOnly: true,
      status: ['COMPLETED'],
      maxResults
    },
    aactGatewayUrl: gatewayUrl,
    requiredKeywords: inclusionCriteria.requiredKeywords,
    preferredKeywords: inclusionCriteria.preferredKeywords,
    exclusionKeywords: inclusionCriteria.exclusionKeywords,
    acceptedDesigns: inclusionCriteria.acceptedDesigns,
    requireAACTForFinalReview: true,
    requireAACTIncrementalCapture: false,
    enforceLandmarkCoverage: true,
    minLandmarkCoveragePct: 70,
    landmarkGuidelineAreas: [areaKey]
  });
}

async function main() {
  const gatewayUrl = parseArgValue('--gateway', DEFAULT_GATEWAY);
  const maxResults = parsePositiveInt('--max-results', 400);
  const explicitAreas = parseArgValue('--areas', '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  const reportDir = path.join(process.cwd(), 'reports');
  const stamp = formatNowStamp();

  const profile = ESC_GUIDELINE_PROFILES[PROFILE_KEY];
  if (!profile) {
    throw new Error(`Guideline profile "${PROFILE_KEY}" is not defined.`);
  }

  const areaKeys = explicitAreas.length > 0
    ? explicitAreas
    : Object.keys(profile.landmarkTrials || {});

  if (areaKeys.length === 0) {
    throw new Error('No ESC guideline areas selected.');
  }

  await fs.mkdir(reportDir, { recursive: true });

  const perArea = [];
  for (const areaKey of areaKeys) {
    const areaTerms = profile.areaQueryPack?.[areaKey] || [];
    const strategy = buildAreaStrategy(areaKey, areaTerms, gatewayUrl, maxResults);
    const results = await runSurveillance(strategy, []);

    const areaSnapshot = {
      generatedAt: new Date().toISOString(),
      areaKey,
      guidelineProfile: PROFILE_KEY,
      strategy,
      results
    };

    const areaPath = path.join(reportDir, `esc_surveillance_${areaKey}_${stamp}.json`);
    await fs.writeFile(areaPath, JSON.stringify(areaSnapshot, null, 2), 'utf8');

    perArea.push({
      areaKey,
      aactCount: Number(results.sources?.aact?.count || 0),
      aactRetrieved: Number(results.sources?.aact?.retrieved || 0),
      aactError: results.sources?.aact?.error || '',
      landmarkCoveragePct: Number(results.landmarkCoverage?.overallCoveragePct || 0),
      trialUniverseWithoutPICO: Number(results.trialUniverse?.withoutPICO?.totalStudies || 0),
      trialUniverseWithPICO: Number(results.trialUniverse?.withPICO?.totalStudies || 0),
      picoRetainedPct: Number(results.trialUniverse?.comparison?.retainedPct || 0),
      robustnessDecision: results.robustness?.decision || 'FLAG',
      robustnessScore: Number(results.robustness?.score || 0)
    });

    const status = results.sources?.aact?.error ? 'ERROR' : 'OK';
    console.log(
      `[${status}] ${areaKey}: AACT=${results.sources?.aact?.retrieved || 0}, ` +
      `withoutPICO=${results.trialUniverse?.withoutPICO?.totalStudies || 0}, ` +
      `withPICO=${results.trialUniverse?.withPICO?.totalStudies || 0}, ` +
      `landmark=${results.landmarkCoverage?.overallCoveragePct || 0}%`
    );
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    guidelineProfile: PROFILE_KEY,
    gatewayUrl,
    maxResultsPerArea: maxResults,
    areaCount: perArea.length,
    totals: {
      aactRetrieved: perArea.reduce((s, r) => s + r.aactRetrieved, 0),
      withoutPICO: perArea.reduce((s, r) => s + r.trialUniverseWithoutPICO, 0),
      withPICO: perArea.reduce((s, r) => s + r.trialUniverseWithPICO, 0),
      robustPassCount: perArea.filter(r => r.robustnessDecision === 'PASS').length
    },
    perArea
  };

  const summaryJsonPath = path.join(reportDir, `esc_guideline_universe_summary_${stamp}.json`);
  const summaryCsvPath = path.join(reportDir, `esc_guideline_universe_summary_${stamp}.csv`);
  const latestJsonPath = path.join(reportDir, 'esc_guideline_universe_summary_latest.json');
  const latestCsvPath = path.join(reportDir, 'esc_guideline_universe_summary_latest.csv');

  await fs.writeFile(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  await fs.writeFile(summaryCsvPath, toCsv(perArea), 'utf8');
  await fs.writeFile(latestJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  await fs.writeFile(latestCsvPath, toCsv(perArea), 'utf8');

  console.log(`\nSummary written: ${summaryJsonPath}`);
  console.log(`Summary CSV written: ${summaryCsvPath}`);
  console.log(
    `Totals -> AACT: ${summary.totals.aactRetrieved}, ` +
    `withoutPICO: ${summary.totals.withoutPICO}, withPICO: ${summary.totals.withPICO}, ` +
    `PASS: ${summary.totals.robustPassCount}/${summary.areaCount}`
  );
}

main().catch(err => {
  console.error('Pipeline failed:', err.message || err);
  process.exit(1);
});
