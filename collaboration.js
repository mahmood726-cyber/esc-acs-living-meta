/**
 * ESC ACS Living Meta-Analysis - Collaboration & Workflow Module
 *
 * PHASE 6: COLLABORATION & WORKFLOW (100% Complete)
 *
 * Integrates best features from:
 * - Screenr v6: Screening workflow, dual reviewer, conflict resolution
 * - TruthCert: Validation verdicts, audit trails
 * - CT.gov Search: Multi-format export (RIS, Covidence, Rayyan, ASReview)
 * - LEC-Pro: Provenance tracking, DOI-ready output
 * - IPD Meta Pro: Session management, undo/redo
 *
 * @module collaboration
 * @version 1.3.0
 * @date 2026-02-24
 */

// ============================================================================
// 6.1 MULTI-USER SCREENING WORKFLOW
// ============================================================================

/**
 * Screening Queue Manager
 * Dual-reviewer screening with conflict resolution
 */
export class ScreeningQueue {
  constructor(studies = [], options = {}) {
    this.studies = studies.map((s, i) => ({
      ...s,
      _id: s.id || `study_${i}`,
      _status: 'pending', // 'pending', 'screened', 'conflict', 'resolved'
      _decisions: {}, // {userId: 'include'|'exclude'|'maybe'}
      _notes: {},
      _timestamp: null
    }));

    this.options = {
      requireDualReview: options.requireDualReview ?? true,
      conflictResolution: options.conflictResolution ?? 'adjudicator', // 'adjudicator', 'consensus', 'senior'
      autoResolve: options.autoResolve ?? false
    };

    this.currentUser = options.currentUser || 'reviewer1';
    this.history = [];
  }

  /**
   * Reviewer workload summary from recorded decisions.
   */
  getReviewerLoad() {
    const counts = new Map();
    this.studies.forEach(study => {
      Object.keys(study._decisions || {}).forEach(reviewer => {
        counts.set(reviewer, (counts.get(reviewer) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .map(([reviewer, decisions]) => ({ reviewer, decisions }))
      .sort((a, b) => {
        if (b.decisions !== a.decisions) return b.decisions - a.decisions;
        return a.reviewer.localeCompare(b.reviewer);
      });
  }

  /**
   * Resolve primary reviewers for agreement/coverage calculations.
   */
  resolvePrimaryReviewers(preferred = []) {
    const explicit = Array.isArray(preferred)
      ? preferred.map(r => String(r || '').trim()).filter(Boolean)
      : [];
    if (explicit.length >= 2) {
      return explicit.slice(0, 2);
    }

    const inferred = this.getReviewerLoad()
      .map(r => r.reviewer)
      .filter(r => r !== 'adjudicator');
    if (inferred.length >= 2) {
      return inferred.slice(0, 2);
    }

    return ['reviewer1', 'reviewer2'];
  }

  /**
   * Get next study for screening
   */
  getNextStudy(userId = this.currentUser) {
    // Adjudicator sees unresolved conflicts only.
    if (userId === 'adjudicator') {
      const conflicts = this.studies.filter(s => s._status === 'conflict');
      return conflicts[0] || null;
    }

    // Priority: studies not yet reviewed by this user
    const reviewerEligibleStatuses = new Set(['pending', 'screened']);
    const unreviewed = this.studies.filter(s =>
      reviewerEligibleStatuses.has(s._status) && !s._decisions[userId]
    );

    if (unreviewed.length > 0) {
      return unreviewed[0];
    }

    return null;
  }

  /**
   * Record screening decision
   */
  recordDecision(studyId, decision, userId = this.currentUser, notes = '') {
    const study = this.studies.find(s => s._id === studyId);
    if (!study) throw new Error(`Study ${studyId} not found`);

    // Record decision
    study._decisions[userId] = decision;
    study._notes[userId] = notes;
    study._timestamp = new Date().toISOString();

    // Add to history
    this.history.push({
      action: 'decision',
      studyId,
      userId,
      decision,
      timestamp: study._timestamp
    });

    // Check for conflicts or completion
    this._updateStudyStatus(study);

    return study;
  }

  /**
   * Update study status based on decisions
   */
  _updateStudyStatus(study) {
    const decisions = Object.values(study._decisions);

    if (decisions.length === 0) {
      study._status = 'pending';
      return;
    }

    if (!this.options.requireDualReview || decisions.length < 2) {
      study._status = 'screened';
      return;
    }

    // Check for agreement
    const uniqueDecisions = [...new Set(decisions)];
    if (uniqueDecisions.length === 1) {
      study._status = 'resolved';
      study._finalDecision = uniqueDecisions[0];
    } else {
      study._status = 'conflict';

      // Auto-resolve if enabled
      if (this.options.autoResolve) {
        this._autoResolveConflict(study);
      }
    }
  }

  /**
   * Auto-resolve conflicts
   */
  _autoResolveConflict(study) {
    const decisions = Object.values(study._decisions);

    // If any reviewer said 'include', include (conservative)
    if (decisions.includes('include')) {
      study._finalDecision = 'include';
      study._status = 'resolved';
      study._resolutionMethod = 'auto_conservative';
    }
    // If one said 'maybe', mark for full-text
    else if (decisions.includes('maybe')) {
      study._finalDecision = 'maybe';
      study._status = 'resolved';
      study._resolutionMethod = 'auto_maybe';
    }
  }

  /**
   * Resolve conflict manually
   */
  resolveConflict(studyId, finalDecision, resolverId, notes = '') {
    const study = this.studies.find(s => s._id === studyId);
    if (!study) throw new Error(`Study ${studyId} not found`);

    study._finalDecision = finalDecision;
    study._status = 'resolved';
    study._resolutionMethod = 'manual';
    study._resolverId = resolverId;
    study._resolutionNotes = notes;
    study._resolutionTimestamp = new Date().toISOString();

    this.history.push({
      action: 'resolve_conflict',
      studyId,
      userId: resolverId,
      finalDecision,
      timestamp: study._resolutionTimestamp
    });

    return study;
  }

  /**
   * Get screening statistics
   */
  getStatistics() {
    const stats = {
      total: this.studies.length,
      pending: this.studies.filter(s => s._status === 'pending').length,
      screened: this.studies.filter(s => s._status === 'screened').length,
      conflicts: this.studies.filter(s => s._status === 'conflict').length,
      resolved: this.studies.filter(s => s._status === 'resolved').length,
      included: this.studies.filter(s => s._finalDecision === 'include').length,
      excluded: this.studies.filter(s => s._finalDecision === 'exclude').length,
      maybe: this.studies.filter(s => s._finalDecision === 'maybe').length
    };

    stats.progress = stats.total > 0
      ? (((stats.resolved + stats.screened) / stats.total) * 100).toFixed(1)
      : '0.0';

    const dualReviewed = this.studies.filter(s => Object.keys(s._decisions || {}).length >= 2);
    const unanimousDual = dualReviewed.filter(s => {
      const unique = [...new Set(Object.values(s._decisions || {}).filter(Boolean))];
      return unique.length === 1;
    });
    stats.agreementRate = dualReviewed.length > 0
      ? ((unanimousDual.length / dualReviewed.length) * 100).toFixed(1)
      : 'N/A';

    return stats;
  }

  /**
   * Compute inter-reviewer agreement statistics (Cohen's kappa)
   */
  getReviewerAgreement(reviewerA = 'reviewer1', reviewerB = 'reviewer2', categories = ['include', 'exclude', 'maybe']) {
    const matrix = {};
    categories.forEach(a => {
      matrix[a] = {};
      categories.forEach(b => {
        matrix[a][b] = 0;
      });
    });

    let compared = 0;
    this.studies.forEach(study => {
      const decisionA = study._decisions?.[reviewerA];
      const decisionB = study._decisions?.[reviewerB];
      if (!categories.includes(decisionA) || !categories.includes(decisionB)) return;
      matrix[decisionA][decisionB] += 1;
      compared += 1;
    });

    const rowTotals = {};
    const colTotals = {};
    categories.forEach(c => {
      rowTotals[c] = categories.reduce((sum, b) => sum + matrix[c][b], 0);
      colTotals[c] = categories.reduce((sum, a) => sum + matrix[a][c], 0);
    });

    const diagonal = categories.reduce((sum, c) => sum + matrix[c][c], 0);
    const observedAgreement = compared > 0 ? diagonal / compared : 0;
    const expectedAgreement = compared > 0
      ? categories.reduce((sum, c) => {
          const pa = rowTotals[c] / compared;
          const pb = colTotals[c] / compared;
          return sum + pa * pb;
        }, 0)
      : 0;

    let kappa = NaN;
    if (compared > 0 && Math.abs(1 - expectedAgreement) > 1e-12) {
      kappa = (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
    }

    return {
      reviewerA,
      reviewerB,
      categories,
      compared,
      matrix,
      rowTotals,
      colTotals,
      observedAgreement,
      expectedAgreement,
      kappa,
      interpretation: interpretKappa(kappa)
    };
  }

  /**
   * Detailed conflict report for adjudication and audit
   */
  getConflictReport() {
    const unresolved = this.studies.filter(s => s._status === 'conflict');
    const resolvedConflicts = this.studies.filter(s =>
      s._status === 'resolved' &&
      (s._resolutionMethod || hasConflictingDecisions(s._decisions))
    );

    const missingResolver = resolvedConflicts.filter(s =>
      s._resolutionMethod === 'manual' && !s._resolverId
    );
    const missingNotes = resolvedConflicts.filter(s =>
      s._resolutionMethod === 'manual' && !(s._resolutionNotes || '').trim()
    );

    return {
      unresolvedCount: unresolved.length,
      resolvedCount: resolvedConflicts.length,
      missingResolverCount: missingResolver.length,
      missingResolutionNotesCount: missingNotes.length,
      unresolvedStudies: unresolved.map(s => ({
        id: s._id,
        title: s.title || '',
        decisions: s._decisions
      })),
      resolvedStudies: resolvedConflicts.map(s => ({
        id: s._id,
        title: s.title || '',
        finalDecision: s._finalDecision,
        resolutionMethod: s._resolutionMethod || 'implicit',
        resolverId: s._resolverId || null,
        resolutionTimestamp: s._resolutionTimestamp || null
      }))
    };
  }

  /**
   * BMJ-style multi-person review readiness gate
   */
  generateBMJReadinessReport(criteria = {}) {
    const primaryReviewers = this.resolvePrimaryReviewers(criteria.primaryReviewers);
    const thresholds = {
      minDualReviewCoverage: criteria.minDualReviewCoverage ?? 0.95,
      minKappa: criteria.minKappa ?? 0.60,
      maxUnresolvedConflicts: criteria.maxUnresolvedConflicts ?? 0,
      maxPendingRate: criteria.maxPendingRate ?? 0.05,
      minAuditTrailCompleteness: criteria.minAuditTrailCompleteness ?? 0.99,
      requireResolutionNotes: criteria.requireResolutionNotes ?? true
    };

    const stats = this.getStatistics();
    const conflictReport = this.getConflictReport();
    const agreement = this.getReviewerAgreement(primaryReviewers[0], primaryReviewers[1]);

    const dualReviewed = this.studies.filter(s =>
      primaryReviewers.every(r => !!s._decisions?.[r])
    ).length;
    const dualReviewCoverage = stats.total > 0 ? dualReviewed / stats.total : 0;
    const pendingRate = stats.total > 0 ? stats.pending / stats.total : 0;

    const decisionCount = this.studies.reduce(
      (sum, s) => sum + Object.keys(s._decisions || {}).length, 0
    );
    const decisionHistoryCount = this.history.filter(h => h.action === 'decision').length;
    const auditTrailCompleteness = decisionCount > 0
      ? Math.min(1, decisionHistoryCount / decisionCount)
      : 1;

    const checks = [
      {
        id: 'dual_review_coverage',
        label: 'Dual-review coverage',
        value: dualReviewCoverage,
        threshold: thresholds.minDualReviewCoverage,
        operator: '>=',
        pass: dualReviewCoverage >= thresholds.minDualReviewCoverage,
        severity: 'critical',
        recommendation: 'Ensure each study has decisions from two independent reviewers.'
      },
      {
        id: 'inter_rater_reliability',
        label: 'Inter-rater reliability (Cohen kappa)',
        value: Number.isFinite(agreement.kappa) ? agreement.kappa : null,
        threshold: thresholds.minKappa,
        operator: '>=',
        pass: Number.isFinite(agreement.kappa) && (agreement.kappa + 1e-12) >= thresholds.minKappa,
        severity: 'critical',
        recommendation: 'Calibrate screening criteria and retrain reviewers before continuing.'
      },
      {
        id: 'unresolved_conflicts',
        label: 'Unresolved screening conflicts',
        value: conflictReport.unresolvedCount,
        threshold: thresholds.maxUnresolvedConflicts,
        operator: '<=',
        pass: conflictReport.unresolvedCount <= thresholds.maxUnresolvedConflicts,
        severity: 'critical',
        recommendation: 'Adjudicate all disagreements before synthesis.'
      },
      {
        id: 'pending_screening_rate',
        label: 'Pending screening rate',
        value: pendingRate,
        threshold: thresholds.maxPendingRate,
        operator: '<=',
        pass: pendingRate <= thresholds.maxPendingRate,
        severity: 'warning',
        recommendation: 'Complete screening queue to reduce selection bias.'
      },
      {
        id: 'audit_trail_completeness',
        label: 'Decision audit trail completeness',
        value: auditTrailCompleteness,
        threshold: thresholds.minAuditTrailCompleteness,
        operator: '>=',
        pass: auditTrailCompleteness >= thresholds.minAuditTrailCompleteness,
        severity: 'critical',
        recommendation: 'Record all reviewer decisions in the audit history.'
      },
      {
        id: 'resolution_documentation',
        label: 'Conflict resolution documentation',
        value: thresholds.requireResolutionNotes
          ? conflictReport.missingResolutionNotesCount + conflictReport.missingResolverCount
          : conflictReport.missingResolverCount,
        threshold: 0,
        operator: '<=',
        pass: thresholds.requireResolutionNotes
          ? conflictReport.missingResolutionNotesCount === 0 && conflictReport.missingResolverCount === 0
          : conflictReport.missingResolverCount === 0,
        severity: 'critical',
        recommendation: 'Document adjudicator identity and rationale for each manual resolution.'
      }
    ];

    const criticalChecks = checks.filter(c => c.severity === 'critical');
    const passCount = checks.filter(c => c.pass).length;
    const score = checks.length > 0 ? (passCount / checks.length) * 100 : 100;
    const criticalPass = criticalChecks.every(c => c.pass);

    return {
      generatedAt: new Date().toISOString(),
      standard: 'BMJ multi-person systematic review readiness',
      reviewers: {
        primary: primaryReviewers
      },
      thresholds,
      overall: {
        decision: criticalPass ? 'PASS' : 'FAIL',
        score: Number(score.toFixed(1)),
        checksPassed: passCount,
        checksTotal: checks.length
      },
      metrics: {
        totalStudies: stats.total,
        dualReviewed,
        dualReviewCoverage,
        pendingRate,
        agreement,
        conflicts: conflictReport,
        auditTrailCompleteness
      },
      checks,
      actionItems: checks
        .filter(c => !c.pass)
        .map(c => ({
          id: c.id,
          severity: c.severity,
          recommendation: c.recommendation
        }))
    };
  }

  /**
   * PLOS-style multi-person review readiness gate
   * Emphasizes transparent decision rationale and reporting traceability.
   */
  generatePLOSReadinessReport(criteria = {}) {
    const primaryReviewers = this.resolvePrimaryReviewers(criteria.primaryReviewers);

    const thresholds = {
      minDualReviewCoverage: criteria.minDualReviewCoverage ?? 0.95,
      minKappa: criteria.minKappa ?? 0.60,
      maxUnresolvedConflicts: criteria.maxUnresolvedConflicts ?? 0,
      maxPendingRate: criteria.maxPendingRate ?? 0.05,
      minAuditTrailCompleteness: criteria.minAuditTrailCompleteness ?? 0.99,
      minDecisionNoteCoverage: criteria.minDecisionNoteCoverage ?? 0.90,
      minAdjudicatorIndependence: criteria.minAdjudicatorIndependence ?? 1.0,
      requireResolutionNotes: criteria.requireResolutionNotes ?? true,
      requireProtocolRegistration: criteria.requireProtocolRegistration ?? true,
      requireDataAvailabilityStatement: criteria.requireDataAvailabilityStatement ?? true,
      requirePrismaChecklist: criteria.requirePrismaChecklist ?? false,
      requireSearchStrategyAppendix: criteria.requireSearchStrategyAppendix ?? false,
      requireScreeningLogExport: criteria.requireScreeningLogExport ?? false
    };

    const stats = this.getStatistics();
    const conflictReport = this.getConflictReport();
    const agreement = this.getReviewerAgreement(primaryReviewers[0], primaryReviewers[1]);

    const dualReviewed = this.studies.filter(s =>
      primaryReviewers.every(r => !!s._decisions?.[r])
    ).length;
    const dualReviewCoverage = stats.total > 0 ? dualReviewed / stats.total : 0;
    const pendingRate = stats.total > 0 ? stats.pending / stats.total : 0;

    const decisionEntries = [];
    this.studies.forEach(study => {
      primaryReviewers.forEach(reviewer => {
        if (!study._decisions?.[reviewer]) return;
        decisionEntries.push({
          reviewer,
          note: study._notes?.[reviewer] || ''
        });
      });
    });
    const documentedDecisionCount = decisionEntries.filter(e => String(e.note).trim().length > 0).length;
    const decisionNoteCoverage = decisionEntries.length > 0
      ? documentedDecisionCount / decisionEntries.length
      : 1;

    const decisionCount = this.studies.reduce(
      (sum, s) => sum + Object.keys(s._decisions || {}).length, 0
    );
    const decisionHistoryCount = this.history.filter(h => h.action === 'decision').length;
    const auditTrailCompleteness = decisionCount > 0
      ? Math.min(1, decisionHistoryCount / decisionCount)
      : 1;

    const manualResolved = this.studies.filter(s =>
      s._status === 'resolved' && s._resolutionMethod === 'manual'
    );
    const independentAdjudications = manualResolved.filter(s =>
      s._resolverId && !primaryReviewers.includes(s._resolverId)
    ).length;
    const adjudicatorIndependence = manualResolved.length > 0
      ? independentAdjudications / manualResolved.length
      : 1;

    const protocolDeclared = !!(
      criteria.protocolRegistrationId ||
      criteria.protocolUrl ||
      criteria.protocolProvided
    );
    const dataAvailabilityDeclared = !!(
      criteria.dataAvailabilityStatement ||
      criteria.dataAvailabilityUrl ||
      criteria.dataAvailabilityProvided
    );
    const prismaChecklistDeclared = !!(
      criteria.prismaChecklistProvided ||
      criteria.prismaChecklistUrl ||
      criteria.prismaChecklistFile
    );
    const searchStrategyAppendixDeclared = !!(
      criteria.searchStrategyAppendixProvided ||
      criteria.searchStrategyAppendixUrl ||
      criteria.searchStrategyAppendixFile
    );
    const screeningLogExported = !!(
      criteria.screeningLogExported ||
      criteria.screeningLogPath ||
      criteria.screeningLogUrl
    );

    const checks = [
      {
        id: 'dual_review_coverage',
        label: 'Dual-review coverage',
        value: dualReviewCoverage,
        threshold: thresholds.minDualReviewCoverage,
        operator: '>=',
        pass: dualReviewCoverage >= thresholds.minDualReviewCoverage,
        severity: 'critical',
        recommendation: 'Ensure each study has decisions from two independent reviewers.'
      },
      {
        id: 'inter_rater_reliability',
        label: 'Inter-rater reliability (Cohen kappa)',
        value: Number.isFinite(agreement.kappa) ? agreement.kappa : null,
        threshold: thresholds.minKappa,
        operator: '>=',
        pass: Number.isFinite(agreement.kappa) && (agreement.kappa + 1e-12) >= thresholds.minKappa,
        severity: 'critical',
        recommendation: 'Recalibrate screening criteria before final inclusion decisions.'
      },
      {
        id: 'unresolved_conflicts',
        label: 'Unresolved screening conflicts',
        value: conflictReport.unresolvedCount,
        threshold: thresholds.maxUnresolvedConflicts,
        operator: '<=',
        pass: conflictReport.unresolvedCount <= thresholds.maxUnresolvedConflicts,
        severity: 'critical',
        recommendation: 'Resolve all conflicts with explicit adjudication before synthesis.'
      },
      {
        id: 'audit_trail_completeness',
        label: 'Decision audit trail completeness',
        value: auditTrailCompleteness,
        threshold: thresholds.minAuditTrailCompleteness,
        operator: '>=',
        pass: auditTrailCompleteness >= thresholds.minAuditTrailCompleteness,
        severity: 'critical',
        recommendation: 'Log every screening decision to maintain full traceability.'
      },
      {
        id: 'decision_rationale_coverage',
        label: 'Decision rationale coverage',
        value: decisionNoteCoverage,
        threshold: thresholds.minDecisionNoteCoverage,
        operator: '>=',
        pass: decisionNoteCoverage >= thresholds.minDecisionNoteCoverage,
        severity: 'critical',
        recommendation: 'Add concise rationale notes for reviewer decisions.'
      },
      {
        id: 'adjudicator_independence',
        label: 'Adjudicator independence',
        value: adjudicatorIndependence,
        threshold: thresholds.minAdjudicatorIndependence,
        operator: '>=',
        pass: adjudicatorIndependence >= thresholds.minAdjudicatorIndependence,
        severity: 'critical',
        recommendation: 'Use an independent adjudicator for manual conflict resolution.'
      },
      {
        id: 'resolution_documentation',
        label: 'Conflict resolution documentation',
        value: thresholds.requireResolutionNotes
          ? conflictReport.missingResolutionNotesCount + conflictReport.missingResolverCount
          : conflictReport.missingResolverCount,
        threshold: 0,
        operator: '<=',
        pass: thresholds.requireResolutionNotes
          ? conflictReport.missingResolutionNotesCount === 0 && conflictReport.missingResolverCount === 0
          : conflictReport.missingResolverCount === 0,
        severity: 'critical',
        recommendation: 'Document resolver identity and rationale for each manual resolution.'
      },
      {
        id: 'protocol_registration',
        label: 'Protocol registration/declaration',
        value: protocolDeclared ? 1 : 0,
        threshold: 1,
        operator: '>=',
        pass: thresholds.requireProtocolRegistration ? protocolDeclared : true,
        severity: 'critical',
        recommendation: 'Declare protocol registration ID or provide protocol URL.'
      },
      {
        id: 'data_availability_statement',
        label: 'Data availability declaration',
        value: dataAvailabilityDeclared ? 1 : 0,
        threshold: 1,
        operator: '>=',
        pass: thresholds.requireDataAvailabilityStatement ? dataAvailabilityDeclared : true,
        severity: 'critical',
        recommendation: 'Add a data availability statement covering screening decisions and conflict logs.'
      },
      {
        id: 'prisma_checklist',
        label: 'PRISMA checklist declaration',
        value: prismaChecklistDeclared ? 1 : 0,
        threshold: 1,
        operator: '>=',
        pass: thresholds.requirePrismaChecklist ? prismaChecklistDeclared : true,
        severity: 'critical',
        recommendation: 'Provide PRISMA 2020 checklist link or file reference.'
      },
      {
        id: 'search_strategy_appendix',
        label: 'Search strategy appendix availability',
        value: searchStrategyAppendixDeclared ? 1 : 0,
        threshold: 1,
        operator: '>=',
        pass: thresholds.requireSearchStrategyAppendix ? searchStrategyAppendixDeclared : true,
        severity: 'critical',
        recommendation: 'Share full reproducible search strategy in supplementary material.'
      },
      {
        id: 'screening_log_export',
        label: 'Screening log export available',
        value: screeningLogExported ? 1 : 0,
        threshold: 1,
        operator: '>=',
        pass: thresholds.requireScreeningLogExport ? screeningLogExported : true,
        severity: 'critical',
        recommendation: 'Export and archive screening/adjudication logs for editorial verification.'
      },
      {
        id: 'pending_screening_rate',
        label: 'Pending screening rate',
        value: pendingRate,
        threshold: thresholds.maxPendingRate,
        operator: '<=',
        pass: pendingRate <= thresholds.maxPendingRate,
        severity: 'warning',
        recommendation: 'Complete screening queue before manuscript lock.'
      }
    ];

    const criticalChecks = checks.filter(c => c.severity === 'critical');
    const passCount = checks.filter(c => c.pass).length;
    const score = checks.length > 0 ? (passCount / checks.length) * 100 : 100;
    const criticalPass = criticalChecks.every(c => c.pass);

    return {
      generatedAt: new Date().toISOString(),
      standard: 'PLOS multi-person systematic review readiness',
      profile: 'PLOS',
      thresholds,
      reviewers: {
        primary: primaryReviewers,
        adjudicatorRequired: true
      },
      declarations: {
        protocolRegistrationId: criteria.protocolRegistrationId || null,
        protocolUrl: criteria.protocolUrl || null,
        dataAvailabilityStatement: criteria.dataAvailabilityStatement || null,
        dataAvailabilityUrl: criteria.dataAvailabilityUrl || null,
        prismaChecklistUrl: criteria.prismaChecklistUrl || null,
        searchStrategyAppendixUrl: criteria.searchStrategyAppendixUrl || null,
        screeningLogPath: criteria.screeningLogPath || null
      },
      overall: {
        decision: criticalPass ? 'PASS' : 'FAIL',
        score: Number(score.toFixed(1)),
        checksPassed: passCount,
        checksTotal: checks.length
      },
      metrics: {
        totalStudies: stats.total,
        dualReviewed,
        dualReviewCoverage,
        pendingRate,
        agreement,
        conflicts: conflictReport,
        auditTrailCompleteness,
        decisionNoteCoverage,
        adjudicatorIndependence,
        prismaChecklistDeclared,
        searchStrategyAppendixDeclared,
        screeningLogExported
      },
      checks,
      actionItems: checks
        .filter(c => !c.pass)
        .map(c => ({
          id: c.id,
          severity: c.severity,
          recommendation: c.recommendation
        }))
    };
  }

  /**
   * PLOS ONE profile: stricter transparency and reproducibility defaults.
   */
  generatePLOSONEReadinessReport(criteria = {}) {
    const report = this.generatePLOSReadinessReport({
      minDualReviewCoverage: 0.98,
      minKappa: 0.60,
      maxUnresolvedConflicts: 0,
      maxPendingRate: 0.02,
      minAuditTrailCompleteness: 1.0,
      minDecisionNoteCoverage: 0.95,
      minAdjudicatorIndependence: 1.0,
      requireResolutionNotes: true,
      requireProtocolRegistration: true,
      requireDataAvailabilityStatement: true,
      requirePrismaChecklist: true,
      requireSearchStrategyAppendix: true,
      requireScreeningLogExport: true,
      ...criteria
    });

    return {
      ...report,
      standard: 'PLOS ONE multi-person systematic review readiness',
      profile: 'PLOS_ONE'
    };
  }

  /**
   * Export screening results
   */
  exportResults(format = 'json') {
    const results = this.studies.map(s => ({
      id: s._id,
      title: s.title,
      status: s._status,
      finalDecision: s._finalDecision,
      decisions: s._decisions,
      notes: s._notes,
      resolutionMethod: s._resolutionMethod
    }));

    if (format === 'json') {
      return JSON.stringify(results, null, 2);
    }

    if (format === 'csv') {
      const headers = ['id', 'title', 'status', 'finalDecision', 'reviewer1', 'reviewer2', 'notes'];
      const rows = results.map(r => [
        r.id,
        `"${(r.title || '').replace(/"/g, '""')}"`,
        r.status,
        r.finalDecision || '',
        r.decisions?.reviewer1 || '',
        r.decisions?.reviewer2 || '',
        `"${Object.values(r.notes || {}).join('; ').replace(/"/g, '""')}"`
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    if (format === 'bmj') {
      return JSON.stringify(this.generateBMJReadinessReport(), null, 2);
    }

    if (format === 'plos') {
      return JSON.stringify(this.generatePLOSReadinessReport(), null, 2);
    }

    if (format === 'plos_one' || format === 'plos-one' || format === 'plosone') {
      return JSON.stringify(this.generatePLOSONEReadinessReport(), null, 2);
    }

    return results;
  }
}

// ============================================================================
// 6.2 TRUTHCERT VALIDATION SYSTEM
// ============================================================================

/**
 * TruthCert Validator
 * Validation verdicts with audit trails
 */
export class TruthCertValidator {
  constructor() {
    this.validators = new Map();
    this.auditLog = [];

    // Register default validators
    this._registerDefaultValidators();
  }

  /**
   * Register default MVP validators (from LEC-Pro)
   */
  _registerDefaultValidators() {
    // Validator 1: Effect Direction
    this.registerValidator('effect_direction', {
      name: 'Effect Direction Validator',
      description: 'Verifies effect direction matches reported outcome',
      validate: (data) => {
        const issues = [];

        if (data.effectLabel && data.effect !== undefined) {
          const labelSuggestsReduction = /reduction|decrease|lower|fewer|protective/i.test(data.effectLabel);
          const effectIsNegative = data.effect < 0;

          if (labelSuggestsReduction !== effectIsNegative) {
            issues.push({
              field: 'effect',
              severity: 'high',
              message: `Effect direction mismatch: label suggests ${labelSuggestsReduction ? 'reduction' : 'increase'} but effect is ${effectIsNegative ? 'negative' : 'positive'}`
            });
          }
        }

        return {
          passed: issues.length === 0,
          issues
        };
      }
    });

    // Validator 2: Inconsistent N
    this.registerValidator('inconsistent_n', {
      name: 'Sample Size Consistency',
      description: 'Checks for inconsistent sample sizes across reported data',
      validate: (data) => {
        const issues = [];

        if (data.n1 && data.n0 && data.totalN) {
          if (data.n1 + data.n0 !== data.totalN) {
            issues.push({
              field: 'n',
              severity: 'high',
              message: `Sample sizes don't sum: ${data.n1} + ${data.n0} ≠ ${data.totalN}`
            });
          }
        }

        if (data.events1 !== undefined && data.n1 && data.events1 > data.n1) {
          issues.push({
            field: 'events1',
            severity: 'critical',
            message: `Events exceed sample size: ${data.events1} > ${data.n1}`
          });
        }

        if (data.events0 !== undefined && data.n0 && data.events0 > data.n0) {
          issues.push({
            field: 'events0',
            severity: 'critical',
            message: `Events exceed sample size: ${data.events0} > ${data.n0}`
          });
        }

        return {
          passed: issues.length === 0,
          issues
        };
      }
    });

    // Validator 3: Units/Timepoint
    this.registerValidator('units_timepoint', {
      name: 'Units and Timepoint Validator',
      description: 'Verifies units and timepoints are consistent',
      validate: (data) => {
        const issues = [];

        // Check for missing units
        if (data.effect !== undefined && !data.effectUnit) {
          issues.push({
            field: 'effectUnit',
            severity: 'medium',
            message: 'Effect measure units not specified'
          });
        }

        // Check for missing timepoint
        if (!data.followUpTime && !data.timepoint) {
          issues.push({
            field: 'timepoint',
            severity: 'low',
            message: 'Follow-up timepoint not specified'
          });
        }

        // Check unit consistency
        if (data.effectUnit && data.expectedUnit) {
          if (data.effectUnit.toLowerCase() !== data.expectedUnit.toLowerCase()) {
            issues.push({
              field: 'effectUnit',
              severity: 'high',
              message: `Unit mismatch: got ${data.effectUnit}, expected ${data.expectedUnit}`
            });
          }
        }

        return {
          passed: issues.filter(i => i.severity !== 'low').length === 0,
          issues
        };
      }
    });

    // Validator 4: Duplicates
    this.registerValidator('duplicates', {
      name: 'Duplicate Detector',
      description: 'Identifies potential duplicate entries',
      validate: (data, allData) => {
        const issues = [];

        if (allData && Array.isArray(allData)) {
          const currentId = data.id || data.nctId || data.title;

          allData.forEach((other, i) => {
            if (other === data) return;

            const otherId = other.id || other.nctId || other.title;

            // Check NCT ID match
            if (data.nctId && other.nctId && data.nctId === other.nctId) {
              issues.push({
                field: 'nctId',
                severity: 'high',
                message: `Duplicate NCT ID: ${data.nctId} (index ${i})`
              });
            }

            // Check title similarity
            if (data.title && other.title) {
              const similarity = jaroWinkler(data.title.toLowerCase(), other.title.toLowerCase());
              if (similarity > 0.9) {
                issues.push({
                  field: 'title',
                  severity: 'medium',
                  message: `Possible duplicate title (${(similarity * 100).toFixed(1)}% similar): "${other.title.slice(0, 50)}..."`
                });
              }
            }
          });
        }

        return {
          passed: issues.filter(i => i.severity === 'high').length === 0,
          issues
        };
      }
    });
  }

  /**
   * Register a custom validator
   */
  registerValidator(id, validator) {
    this.validators.set(id, validator);
  }

  /**
   * Run validation on data
   */
  validate(data, allData = null) {
    const results = {
      timestamp: new Date().toISOString(),
      dataId: data.id || data.nctId || 'unknown',
      validators: {},
      overallVerdict: 'PASS',
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0
    };

    this.validators.forEach((validator, id) => {
      const result = validator.validate(data, allData);
      results.validators[id] = {
        name: validator.name,
        passed: result.passed,
        issues: result.issues
      };

      result.issues.forEach(issue => {
        results.totalIssues++;
        if (issue.severity === 'critical') results.criticalIssues++;
        if (issue.severity === 'high') results.highIssues++;
      });
    });

    // Determine verdict
    if (results.criticalIssues > 0) {
      results.overallVerdict = 'FAIL';
    } else if (results.highIssues > 0) {
      results.overallVerdict = 'FLAG';
    }

    // Add to audit log
    this.auditLog.push({
      timestamp: results.timestamp,
      dataId: results.dataId,
      verdict: results.overallVerdict,
      issues: results.totalIssues
    });

    return results;
  }

  /**
   * Generate TruthCert certificate
   */
  generateCertificate(validationResult, metadata = {}) {
    return {
      version: '1.0',
      type: 'TruthCert',
      timestamp: validationResult.timestamp,
      dataId: validationResult.dataId,
      verdict: validationResult.overallVerdict,
      verdictDescription: this._getVerdictDescription(validationResult.overallVerdict),
      summary: {
        totalValidators: Object.keys(validationResult.validators).length,
        passedValidators: Object.values(validationResult.validators).filter(v => v.passed).length,
        totalIssues: validationResult.totalIssues,
        criticalIssues: validationResult.criticalIssues,
        highIssues: validationResult.highIssues
      },
      details: validationResult.validators,
      metadata: {
        ...metadata,
        generatedBy: 'ESC ACS Living Meta-Analysis TruthCert Module',
        certificateId: `TC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      },
      disclaimer: 'This certificate certifies reproducibility and traceability of the validation process, not absolute correctness of the underlying data.'
    };
  }

  _getVerdictDescription(verdict) {
    const descriptions = {
      'PASS': 'All validations passed. Data appears consistent and complete.',
      'FLAG': 'Minor issues detected. Manual review recommended.',
      'FAIL': 'Critical issues found. Data should not be used without correction.'
    };
    return descriptions[verdict] || 'Unknown verdict';
  }

  /**
   * Export audit log
   */
  exportAuditLog(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.auditLog, null, 2);
    }

    const headers = ['timestamp', 'dataId', 'verdict', 'issues'];
    const rows = this.auditLog.map(entry =>
      [entry.timestamp, entry.dataId, entry.verdict, entry.issues].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

// ============================================================================
// 6.3 MULTI-FORMAT EXPORT
// ============================================================================

/**
 * Multi-Format Exporter
 * Export to RIS, Covidence, Rayyan, ASReview, PRISMA
 */
export class MultiFormatExporter {
  /**
   * Export to RIS format (EndNote, Zotero, Mendeley)
   */
  static toRIS(studies) {
    return studies.map(study => {
      const lines = [
        'TY  - JOUR',
        `TI  - ${study.title || 'Untitled'}`,
        `AU  - ${study.authors || study.author || 'Unknown'}`,
        `PY  - ${study.year || study.publicationYear || ''}`,
        `JO  - ${study.journal || ''}`,
        `VL  - ${study.volume || ''}`,
        `IS  - ${study.issue || ''}`,
        `SP  - ${study.startPage || ''}`,
        `EP  - ${study.endPage || ''}`,
        `DO  - ${study.doi || ''}`,
        `UR  - ${study.url || ''}`,
        `AB  - ${study.abstract || ''}`,
        `N1  - NCT: ${study.nctId || ''}`,
        'ER  - '
      ];
      return lines.filter(l => !l.endsWith(' - ')).join('\n');
    }).join('\n\n');
  }

  /**
   * Export to Covidence CSV format
   */
  static toCovidence(studies) {
    const headers = ['Title', 'Authors', 'Year', 'Journal', 'Volume', 'Issue', 'Pages', 'DOI', 'Abstract', 'URL', 'Notes'];

    const rows = studies.map(study => [
      `"${(study.title || '').replace(/"/g, '""')}"`,
      `"${(study.authors || study.author || '').replace(/"/g, '""')}"`,
      study.year || study.publicationYear || '',
      `"${(study.journal || '').replace(/"/g, '""')}"`,
      study.volume || '',
      study.issue || '',
      study.pages || `${study.startPage || ''}-${study.endPage || ''}`.replace('-', ''),
      study.doi || '',
      `"${(study.abstract || '').replace(/"/g, '""')}"`,
      study.url || '',
      `"NCT: ${study.nctId || ''}"`
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export to Rayyan CSV format
   */
  static toRayyan(studies) {
    const headers = ['key', 'title', 'authors', 'year', 'journal', 'volume', 'pages', 'abstract', 'url', 'notes'];

    const rows = studies.map((study, i) => [
      study.id || study.nctId || `study_${i}`,
      `"${(study.title || '').replace(/"/g, '""')}"`,
      `"${(study.authors || study.author || '').replace(/"/g, '""')}"`,
      study.year || study.publicationYear || '',
      `"${(study.journal || '').replace(/"/g, '""')}"`,
      study.volume || '',
      study.pages || '',
      `"${(study.abstract || '').replace(/"/g, '""').slice(0, 5000)}"`,
      study.url || '',
      `"NCT: ${study.nctId || ''}"`
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export to ASReview project format
   */
  static toASReview(studies, projectName = 'meta-analysis') {
    // ASReview uses a CSV with specific columns
    const headers = ['record_id', 'title', 'abstract', 'authors', 'keywords', 'doi', 'url', 'included'];

    const rows = studies.map((study, i) => [
      study.id || study.nctId || i,
      `"${(study.title || '').replace(/"/g, '""')}"`,
      `"${(study.abstract || '').replace(/"/g, '""')}"`,
      `"${(study.authors || study.author || '').replace(/"/g, '""')}"`,
      `"${(study.keywords || []).join('; ')}"`,
      study.doi || '',
      study.url || '',
      study.included !== undefined ? (study.included ? 1 : 0) : ''
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate PRISMA 2020 Flow Diagram Data
   */
  static toPRISMAFlow(searchResults) {
    const {
      identified = {},
      duplicatesRemoved = 0,
      screenedTitle = 0,
      excludedTitle = 0,
      screenedFullText = 0,
      excludedFullText = [],
      included = 0
    } = searchResults;

    // Sum identified from all sources
    const totalIdentified = Object.values(identified).reduce((a, b) => a + b, 0);

    return {
      identification: {
        databases: identified,
        totalFromDatabases: totalIdentified,
        otherSources: 0,
        totalIdentified
      },
      screening: {
        duplicatesRemoved,
        afterDuplicates: totalIdentified - duplicatesRemoved,
        titleAbstractScreened: screenedTitle || (totalIdentified - duplicatesRemoved),
        excludedTitleAbstract: excludedTitle
      },
      eligibility: {
        fullTextAssessed: screenedFullText,
        excludedFullText: Array.isArray(excludedFullText)
          ? excludedFullText
          : [{ reason: 'Various', n: excludedFullText }],
        totalExcludedFullText: Array.isArray(excludedFullText)
          ? excludedFullText.reduce((s, e) => s + e.n, 0)
          : excludedFullText
      },
      included: {
        quantitativeSynthesis: included,
        qualitativeSynthesis: included
      },
      generated: new Date().toISOString()
    };
  }

  /**
   * Generate PRISMA Flow Diagram as Markdown
   */
  static toPRISMAMarkdown(flowData) {
    const { identification, screening, eligibility, included } = flowData;

    return `# PRISMA 2020 Flow Diagram

## Identification

**Records identified from:**
${Object.entries(identification.databases).map(([db, n]) => `- ${db}: n = ${n}`).join('\n')}

**Total records identified:** n = ${identification.totalIdentified}

## Screening

**Records removed before screening:**
- Duplicate records removed: n = ${screening.duplicatesRemoved}

**Records screened:** n = ${screening.titleAbstractScreened}
**Records excluded:** n = ${screening.excludedTitleAbstract}

## Eligibility

**Reports sought for retrieval:** n = ${eligibility.fullTextAssessed}
**Reports not retrieved:** n = 0

**Reports assessed for eligibility:** n = ${eligibility.fullTextAssessed}

**Reports excluded:**
${eligibility.excludedFullText.map(e => `- ${e.reason}: n = ${e.n}`).join('\n')}

**Total excluded:** n = ${eligibility.totalExcludedFullText}

## Included

**Studies included in review:** n = ${included.quantitativeSynthesis}
**Studies included in meta-analysis:** n = ${included.quantitativeSynthesis}

---
*Generated: ${flowData.generated}*
*PRISMA 2020 (Page et al., BMJ 2021)*
`;
  }
}

// ============================================================================
// 6.4 SESSION MANAGEMENT WITH UNDO/REDO
// ============================================================================

/**
 * Session Manager with Undo/Redo
 * From IPD Meta Pro
 */
export class SessionManager {
  constructor(options = {}) {
    this.sessionId = options.sessionId || `session_${Date.now()}`;
    this.storageKey = options.storageKey || 'esc_acs_session';
    this.maxUndoSteps = options.maxUndoSteps || 50;

    this.state = {};
    this.undoStack = [];
    this.redoStack = [];
    this.dirty = false;
    this.autoSaveInterval = null;

    if (options.autoSave) {
      this.enableAutoSave(options.autoSaveInterval || 30000);
    }
  }

  /**
   * Set state with undo support
   */
  setState(newState, description = 'State update') {
    // Save current state to undo stack
    if (Object.keys(this.state).length > 0) {
      this.undoStack.push({
        state: JSON.parse(JSON.stringify(this.state)),
        description,
        timestamp: new Date().toISOString()
      });

      // Limit undo stack size
      if (this.undoStack.length > this.maxUndoSteps) {
        this.undoStack.shift();
      }
    }

    // Clear redo stack on new action
    this.redoStack = [];

    // Update state
    this.state = { ...this.state, ...newState };
    this.dirty = true;

    return this.state;
  }

  /**
   * Undo last action
   */
  undo() {
    if (this.undoStack.length === 0) {
      return null;
    }

    // Save current state to redo stack
    this.redoStack.push({
      state: JSON.parse(JSON.stringify(this.state)),
      timestamp: new Date().toISOString()
    });

    // Restore previous state
    const previousState = this.undoStack.pop();
    this.state = previousState.state;
    this.dirty = true;

    return {
      state: this.state,
      description: previousState.description
    };
  }

  /**
   * Redo last undone action
   */
  redo() {
    if (this.redoStack.length === 0) {
      return null;
    }

    // Save current state to undo stack
    this.undoStack.push({
      state: JSON.parse(JSON.stringify(this.state)),
      timestamp: new Date().toISOString()
    });

    // Restore redo state
    const redoState = this.redoStack.pop();
    this.state = redoState.state;
    this.dirty = true;

    return this.state;
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Save session to localStorage
   */
  save() {
    const sessionData = {
      sessionId: this.sessionId,
      state: this.state,
      savedAt: new Date().toISOString(),
      version: '1.0'
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
      this.dirty = false;
      return true;
    } catch (e) {
      console.error('Failed to save session:', e);
      return false;
    }
  }

  /**
   * Load session from localStorage
   */
  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const sessionData = JSON.parse(data);
        this.sessionId = sessionData.sessionId;
        this.state = sessionData.state;
        this.dirty = false;
        return sessionData;
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    }
    return null;
  }

  /**
   * Enable auto-save
   */
  enableAutoSave(intervalMs = 30000) {
    this.disableAutoSave();
    this.autoSaveInterval = setInterval(() => {
      if (this.dirty) {
        this.save();
      }
    }, intervalMs);
  }

  /**
   * Disable auto-save
   */
  disableAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Export session as JSON
   */
  exportSession() {
    return JSON.stringify({
      sessionId: this.sessionId,
      state: this.state,
      exportedAt: new Date().toISOString(),
      undoStackSize: this.undoStack.length
    }, null, 2);
  }

  /**
   * Import session from JSON
   */
  importSession(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      this.setState(data.state, 'Import session');
      this.sessionId = data.sessionId || this.sessionId;
      return true;
    } catch (e) {
      console.error('Failed to import session:', e);
      return false;
    }
  }

  /**
   * Clear session
   */
  clear() {
    this.state = {};
    this.undoStack = [];
    this.redoStack = [];
    this.dirty = false;
    localStorage.removeItem(this.storageKey);
  }
}

// ============================================================================
// 6.5 PROVENANCE TRACKING (LEC-Pro Style)
// ============================================================================

/**
 * Provenance Tracker
 * Track data lineage and transformations
 */
export class ProvenanceTracker {
  constructor() {
    this.entries = [];
    this.currentTransaction = null;
  }

  /**
   * Start a new transaction
   */
  startTransaction(description) {
    this.currentTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      description,
      startTime: new Date().toISOString(),
      operations: []
    };
  }

  /**
   * Record an operation
   */
  recordOperation(operation) {
    const entry = {
      timestamp: new Date().toISOString(),
      ...operation
    };

    if (this.currentTransaction) {
      this.currentTransaction.operations.push(entry);
    } else {
      this.entries.push(entry);
    }

    return entry;
  }

  /**
   * End current transaction
   */
  endTransaction() {
    if (this.currentTransaction) {
      this.currentTransaction.endTime = new Date().toISOString();
      this.entries.push(this.currentTransaction);
      const tx = this.currentTransaction;
      this.currentTransaction = null;
      return tx;
    }
    return null;
  }

  /**
   * Record data extraction
   */
  recordExtraction(source, fields, extractedData) {
    return this.recordOperation({
      type: 'extraction',
      source,
      fields,
      dataHash: this._hashData(extractedData),
      recordCount: Array.isArray(extractedData) ? extractedData.length : 1
    });
  }

  /**
   * Record data transformation
   */
  recordTransformation(inputHash, outputHash, transformationType, parameters = {}) {
    return this.recordOperation({
      type: 'transformation',
      transformationType,
      inputHash,
      outputHash,
      parameters
    });
  }

  /**
   * Record validation
   */
  recordValidation(dataHash, validatorId, result) {
    return this.recordOperation({
      type: 'validation',
      dataHash,
      validatorId,
      passed: result.passed,
      issueCount: result.issues?.length || 0
    });
  }

  /**
   * Generate provenance report
   */
  generateReport() {
    return {
      generated: new Date().toISOString(),
      totalOperations: this.entries.length,
      operationsByType: this._groupByType(),
      timeline: this.entries.map(e => ({
        timestamp: e.timestamp || e.startTime,
        type: e.type || 'transaction',
        summary: e.description || e.type
      })),
      fullLog: this.entries
    };
  }

  /**
   * Export as JSON-LD for DOI registration
   */
  toJSONLD() {
    return {
      '@context': 'https://schema.org/',
      '@type': 'Dataset',
      name: 'ESC ACS Living Meta-Analysis Data',
      dateCreated: new Date().toISOString(),
      creator: {
        '@type': 'Organization',
        name: 'ESC ACS Living Meta-Analysis Team'
      },
      distribution: {
        '@type': 'DataDownload',
        encodingFormat: 'application/json'
      },
      provenance: this.entries.map(e => ({
        '@type': 'Action',
        startTime: e.timestamp || e.startTime,
        description: e.description || e.type
      }))
    };
  }

  _hashData(data) {
    // Simple hash for provenance tracking
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }

  _groupByType() {
    const groups = {};
    this.entries.forEach(e => {
      const type = e.type || 'transaction';
      groups[type] = (groups[type] || 0) + 1;
    });
    return groups;
  }
}

// ============================================================================
// 6.6 WORKFLOW TASKS & ASSIGNMENTS
// ============================================================================

/**
 * Workflow Task Manager
 * Task assignment and progress tracking
 */
export class WorkflowManager {
  constructor() {
    this.tasks = [];
    this.users = new Map();
    this.notifications = [];
  }

  /**
   * Create a new task
   */
  createTask(task) {
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      priority: 'normal',
      ...task
    };

    this.tasks.push(newTask);
    return newTask;
  }

  /**
   * Assign task to user
   */
  assignTask(taskId, userId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.assignedTo = userId;
    task.assignedAt = new Date().toISOString();
    task.status = 'assigned';

    this._notify(userId, `New task assigned: ${task.title || task.id}`);

    return task;
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId, status, notes = '') {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const previousStatus = task.status;
    task.status = status;
    task.statusHistory = task.statusHistory || [];
    task.statusHistory.push({
      from: previousStatus,
      to: status,
      timestamp: new Date().toISOString(),
      notes
    });

    if (status === 'completed') {
      task.completedAt = new Date().toISOString();
    }

    return task;
  }

  /**
   * Get tasks for user
   */
  getTasksForUser(userId) {
    return this.tasks.filter(t => t.assignedTo === userId);
  }

  /**
   * Get workflow statistics
   */
  getStatistics() {
    return {
      total: this.tasks.length,
      pending: this.tasks.filter(t => t.status === 'pending').length,
      assigned: this.tasks.filter(t => t.status === 'assigned').length,
      inProgress: this.tasks.filter(t => t.status === 'in_progress').length,
      completed: this.tasks.filter(t => t.status === 'completed').length,
      byPriority: {
        high: this.tasks.filter(t => t.priority === 'high').length,
        normal: this.tasks.filter(t => t.priority === 'normal').length,
        low: this.tasks.filter(t => t.priority === 'low').length
      },
      completionRate: this.tasks.length > 0
        ? (this.tasks.filter(t => t.status === 'completed').length / this.tasks.length * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Add notification
   */
  _notify(userId, message) {
    this.notifications.push({
      userId,
      message,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId) {
    return this.notifications.filter(n => n.userId === userId);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Jaro-Winkler string similarity
 */
function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function hasConflictingDecisions(decisions = {}) {
  const unique = [...new Set(Object.values(decisions).filter(Boolean))];
  return unique.length > 1;
}

function interpretKappa(kappa) {
  if (!Number.isFinite(kappa)) return 'Not estimable';
  if (kappa < 0) return 'Less than chance agreement';
  if (kappa < 0.20) return 'Slight agreement';
  if (kappa < 0.40) return 'Fair agreement';
  if (kappa < 0.60) return 'Moderate agreement';
  if (kappa < 0.80) return 'Substantial agreement';
  return 'Almost perfect agreement';
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export const COLLABORATION_MODULE = {
  name: 'collaboration',
  version: '1.3.0',
  description: 'Phase 6: Collaboration & Workflow (100% Complete)',
  exports: [
    'ScreeningQueue',
    'TruthCertValidator',
    'MultiFormatExporter',
    'SessionManager',
    'ProvenanceTracker',
    'WorkflowManager'
  ],
  features: [
    'Dual-reviewer screening with conflict resolution',
    'Cohen kappa agreement metrics and conflict diagnostics',
    'BMJ multi-person review readiness gate with fail criteria',
    'PLOS multi-person review readiness gate with transparency criteria',
    'PLOS ONE profile with stricter reproducibility defaults',
    'TruthCert validation verdicts with audit trails',
    'Export to RIS, Covidence, Rayyan, ASReview',
    'PRISMA 2020 flow diagram generation',
    'Session management with undo/redo',
    'Provenance tracking (DOI-ready)',
    'Workflow task management'
  ]
};
