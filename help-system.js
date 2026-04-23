/**
 * ESC ACS Living Meta-Analysis - Help & Tutorial System
 *
 * Provides:
 * - Quick Start Wizard for new users
 * - Interactive guided tour
 * - Contextual help tooltips
 * - Keyboard shortcut reference
 * - GRADE and NMA explanation panels
 *
 * @module help-system
 * @version 1.0.0
 * @date 2026-01-26
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const HELP_CONFIG = {
  storageKey: 'esc-acs-help-prefs',
  tourAutoStart: true,
  tooltipDelay: 500
};

// ============================================================================
// CONTEXTUAL HELP DEFINITIONS
// ============================================================================

const CONTEXTUAL_HELP = {
  // Topic sidebar
  topicList: {
    title: 'ACS Topics',
    content: 'Select from 47 pre-configured topics aligned with ESC Guidelines. Topics with ≥5 RCTs show automated meta-analysis.',
    position: 'right'
  },

  // Control buttons
  updateBtn: {
    title: 'Fetch Evidence',
    content: 'Automatically search ClinicalTrials.gov for RCTs matching this topic. Results are cached for offline use.',
    position: 'bottom'
  },

  ctgovStrategy: {
    title: 'CT.gov Strategy Profiles',
    content: 'Use validated S1-S10 query profiles (Condition-only, Randomized, Treatment-purpose) and combine S1+S3+S10 for high-recall surveillance.',
    position: 'bottom'
  },

  aactGateway: {
    title: 'AACT Integration',
    content: 'AACT can be queried via secure SQL gateway for registry-complete recall. Configure gateway URL for production-grade surveillance.',
    position: 'bottom'
  },

  plosReadiness: {
    title: 'PLOS Multi-Person Gate',
    content: 'Use the PLOS readiness gate to enforce dual-review coverage, adjudicator independence, and protocol/data-availability declarations.',
    position: 'bottom'
  },

  plosOneReadiness: {
    title: 'PLOS ONE Profile',
    content: 'PLOS ONE mode adds stricter defaults: PRISMA checklist, search appendix, and exported screening logs are required.',
    position: 'bottom'
  },

  aactLocalGateway: {
    title: 'Local AACT Gateway',
    content: 'Run the local AACT bridge on 127.0.0.1:8787 to use machine-local credentials without exposing database secrets in the browser.',
    position: 'bottom'
  },

  landmarkCoverage: {
    title: 'ESC Landmark Coverage',
    content: 'The surveillance gate now checks coverage of ESC landmark NCT IDs by guideline area; require this for decision-grade runs.',
    position: 'bottom'
  },

  importDatasetBtn: {
    title: 'Import R Dataset',
    content: 'Load validated datasets from metafor, meta, netmeta, or mada R packages for testing and training.',
    position: 'bottom'
  },

  // Analysis tabs
  'tab-overview': {
    title: 'Evidence Overview',
    content: 'Quick summary showing total studies, participants, pooled effect, heterogeneity (I²), and key warnings.',
    position: 'bottom'
  },

  'tab-pairwise': {
    title: 'Pairwise Meta-Analysis',
    content: 'Forest plot with random-effects pooling. Click any study to exclude it and see updated results instantly.',
    position: 'bottom'
  },

  'tab-network': {
    title: 'Network Meta-Analysis',
    content: 'Compare multiple treatments simultaneously. Shows treatment rankings (P-scores) and network consistency.',
    position: 'bottom'
  },

  'tab-grade': {
    title: 'GRADE Assessment',
    content: 'Automated certainty of evidence rating across 5 domains. Generates Summary of Findings table for guidelines.',
    position: 'bottom'
  },

  // Forest plot
  forestChart: {
    title: 'Interactive Forest Plot',
    content: 'Click any study row to exclude it from the analysis. The pooled effect updates automatically. Click "Reset" to restore all studies.',
    position: 'top'
  },

  // Network chart
  networkChart: {
    title: 'Network Graph',
    content: 'Node size = sample size, edge thickness = number of studies. Hover for details. Drag nodes to rearrange.',
    position: 'top'
  },

  // GRADE table
  gradeTable: {
    title: 'GRADE Certainty',
    content: 'Each domain is assessed: Risk of Bias, Inconsistency (I²), Indirectness, Imprecision (vs OIS), Publication Bias. Click domains for details.',
    position: 'top'
  },

  // Export buttons
  exportPdfBtn: {
    title: 'PDF Report',
    content: 'Generate publication-ready PDF with forest plot, GRADE assessment, and Summary of Findings table.',
    position: 'bottom'
  },

  exportRBtn: {
    title: 'R Script Export',
    content: 'Download complete R code using metafor/netmeta packages. Run in R to verify results independently.',
    position: 'bottom'
  }
};

// ============================================================================
// INTERACTIVE TOUR STEPS
// ============================================================================

const TOUR_STEPS = [
  {
    target: '.hero__title',
    title: 'Welcome to ESC ACS Living Meta-Analysis',
    description: 'This platform helps you synthesize RCT evidence for ACS guideline development. Let\'s take a quick tour.',
    position: 'bottom'
  },
  {
    target: '#topicList',
    title: 'Topic Selection',
    description: '47 pre-configured topics cover all major ESC ACS guideline questions. Click any topic to begin analysis.',
    position: 'right'
  },
  {
    target: '#updateBtn',
    title: 'Load Evidence',
    description: 'Click here to automatically fetch RCTs from ClinicalTrials.gov. Data is cached for offline use.',
    position: 'bottom'
  },
  {
    target: '.tabs',
    title: 'Analysis Tabs',
    description: 'Navigate through different views: Overview, Forest Plot, Network Analysis, GRADE Assessment, and more.',
    position: 'bottom'
  },
  {
    target: '#forestChart',
    title: 'Interactive Forest Plot',
    description: 'Click any study to exclude it - the pooled effect updates instantly. Great for sensitivity analysis.',
    position: 'top',
    waitForElement: true
  },
  {
    target: '#tab-grade',
    title: 'GRADE Assessment',
    description: 'Automated certainty rating following GRADE methodology. Generates publication-ready Summary of Findings.',
    position: 'bottom'
  },
  {
    target: '.export-buttons',
    title: 'Export Options',
    description: 'Generate PDF reports, R scripts for verification, or CSV/JSON for further analysis.',
    position: 'bottom'
  },
  {
    target: '#helpBtn',
    title: 'Help Always Available',
    description: 'Click here anytime or press "?" for help. You can restart this tour from the help menu.',
    position: 'left'
  }
];

// ============================================================================
// GRADE HELP CONTENT
// ============================================================================

const GRADE_HELP = {
  overview: `
    <h3>GRADE Certainty of Evidence</h3>
    <p>GRADE (Grading of Recommendations Assessment, Development and Evaluation) provides a systematic approach to rating the certainty of evidence.</p>

    <h4>Certainty Levels</h4>
    <table class="help-table">
      <tr><td>⊕⊕⊕⊕ HIGH</td><td>Very confident the true effect is close to the estimate</td></tr>
      <tr><td>⊕⊕⊕◯ MODERATE</td><td>Moderately confident; true effect likely close to estimate</td></tr>
      <tr><td>⊕⊕◯◯ LOW</td><td>Limited confidence; true effect may be substantially different</td></tr>
      <tr><td>⊕◯◯◯ VERY LOW</td><td>Very little confidence in the estimate</td></tr>
    </table>

    <h4>Downgrading Domains (RCTs start at HIGH)</h4>
    <ol>
      <li><strong>Risk of Bias</strong> - Study-level methodological limitations</li>
      <li><strong>Inconsistency</strong> - Unexplained heterogeneity (I² > 50%)</li>
      <li><strong>Indirectness</strong> - Population, intervention, or outcome differences</li>
      <li><strong>Imprecision</strong> - Wide confidence intervals, small sample size</li>
      <li><strong>Publication Bias</strong> - Funnel plot asymmetry, small-study effects</li>
    </ol>
  `,

  riskOfBias: `
    <h4>Risk of Bias Domain</h4>
    <p>Based on ROB2 assessment across studies:</p>
    <ul>
      <li><strong>No downgrade:</strong> Majority low risk</li>
      <li><strong>-1 Serious:</strong> >25% high risk or >50% some concerns</li>
      <li><strong>-2 Very serious:</strong> >50% high risk</li>
    </ul>
  `,

  inconsistency: `
    <h4>Inconsistency Domain</h4>
    <p>Based on statistical heterogeneity:</p>
    <ul>
      <li><strong>No downgrade:</strong> I² < 40%</li>
      <li><strong>-1 Serious:</strong> I² 40-75%, prediction interval crosses null</li>
      <li><strong>-2 Very serious:</strong> I² > 75%, unexplained</li>
    </ul>
  `,

  imprecision: `
    <h4>Imprecision Domain</h4>
    <p>Based on Optimal Information Size (OIS):</p>
    <ul>
      <li><strong>No downgrade:</strong> Total N > OIS, CI excludes important effects</li>
      <li><strong>-1 Serious:</strong> N < OIS OR CI includes important benefit/harm</li>
      <li><strong>-2 Very serious:</strong> N < OIS AND CI includes both benefit and harm</li>
    </ul>
  `
};

// ============================================================================
// NMA HELP CONTENT
// ============================================================================

const NMA_HELP = {
  overview: `
    <h3>Network Meta-Analysis</h3>
    <p>NMA allows comparison of multiple treatments simultaneously, even when direct head-to-head trials are lacking.</p>

    <h4>Key Concepts</h4>
    <ul>
      <li><strong>Direct evidence:</strong> From trials directly comparing treatments</li>
      <li><strong>Indirect evidence:</strong> Inferred through common comparator</li>
      <li><strong>Mixed evidence:</strong> Combines direct and indirect</li>
    </ul>

    <h4>Interpreting Results</h4>
    <ul>
      <li><strong>League table:</strong> Effects of row vs column treatment</li>
      <li><strong>P-scores:</strong> Probability of being best (0-100%)</li>
      <li><strong>SUCRA:</strong> Surface under cumulative ranking curve</li>
    </ul>
  `,

  inconsistency: `
    <h4>Inconsistency in NMA</h4>
    <p>Inconsistency means direct and indirect evidence disagree:</p>
    <ul>
      <li><strong>Node-splitting:</strong> Tests each comparison separately</li>
      <li><strong>Design-by-treatment:</strong> Global test across network</li>
      <li><strong>p > 0.10:</strong> No evidence of inconsistency</li>
      <li><strong>p < 0.05:</strong> Significant inconsistency (investigate)</li>
    </ul>
  `,

  rankings: `
    <h4>Treatment Rankings</h4>
    <p><strong>P-score</strong> interpretation:</p>
    <ul>
      <li>P-score = 1: Always best</li>
      <li>P-score = 0.5: Average</li>
      <li>P-score = 0: Always worst</li>
    </ul>
    <p>Note: Rankings have uncertainty - check confidence intervals!</p>
  `
};

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

const KEYBOARD_SHORTCUTS = [
  { key: '?', description: 'Open help menu' },
  { key: 'Ctrl+Z', description: 'Undo last action' },
  { key: 'Ctrl+Shift+Z', description: 'Redo' },
  { key: 'Ctrl+S', description: 'Save to cache' },
  { key: 'Ctrl+E', description: 'Export CSV' },
  { key: 'Ctrl+P', description: 'Export PDF' },
  { key: 'D', description: 'Toggle dark mode' },
  { key: 'Esc', description: 'Close modal/menu' },
  { key: '1-9', description: 'Switch to tab 1-9' },
  { key: '↑/↓', description: 'Navigate topic list' },
  { key: 'Enter', description: 'Select topic' }
];

// ============================================================================
// HELP SYSTEM CLASS
// ============================================================================

class HelpSystem {
  constructor() {
    this.prefs = this.loadPrefs();
    this.currentWizardStep = 1;
    this.currentTourStep = 0;
    this.tooltipTimeout = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupContextualHelp();

    // Show quick start for first-time users
    if (!this.prefs.hasSeenQuickStart) {
      setTimeout(() => this.showQuickStart(), 500);
    }
  }

  loadPrefs() {
    try {
      const stored = localStorage.getItem(HELP_CONFIG.storageKey);
      return stored ? JSON.parse(stored) : { hasSeenQuickStart: false, hasSeenTour: false };
    } catch (e) {
      return { hasSeenQuickStart: false, hasSeenTour: false };
    }
  }

  savePrefs() {
    try {
      localStorage.setItem(HELP_CONFIG.storageKey, JSON.stringify(this.prefs));
    } catch (e) {
      console.warn('Could not save help preferences');
    }
  }

  setupEventListeners() {
    // Help FAB button
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.toggleHelpMenu());
    }

    // Help menu items
    document.querySelectorAll('.help-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        this.handleHelpAction(action);
      });
    });

    // Help menu close
    const closeBtn = document.querySelector('.help-menu-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideHelpMenu());
    }

    // Quick start wizard navigation
    const nextBtn = document.getElementById('wizardNextBtn');
    const prevBtn = document.getElementById('wizardPrevBtn');
    const finishBtn = document.getElementById('wizardFinishBtn');
    const skipBtn = document.getElementById('wizardSkipBtn');
    const wizardCloseBtn = document.getElementById('wizardCloseBtn');
    const quickStartModal = document.getElementById('quickStartModal');

    if (nextBtn) nextBtn.addEventListener('click', () => this.wizardNext());
    if (prevBtn) prevBtn.addEventListener('click', () => this.wizardPrev());
    if (finishBtn) finishBtn.addEventListener('click', () => this.finishQuickStart());
    if (skipBtn) skipBtn.addEventListener('click', () => this.hideQuickStart());
    if (wizardCloseBtn) wizardCloseBtn.addEventListener('click', () => this.hideQuickStart());
    if (quickStartModal) {
      quickStartModal.addEventListener('click', event => {
        if (event.target === quickStartModal) {
          this.hideQuickStart();
        }
      });
    }

    // Wizard dots
    document.querySelectorAll('.wizard-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const step = parseInt(dot.dataset.step);
        this.goToWizardStep(step);
      });
    });

    // Tour navigation
    const tourNext = document.querySelector('.tour-next');
    const tourPrev = document.querySelector('.tour-prev');
    const tourClose = document.querySelector('.tour-close');

    if (tourNext) tourNext.addEventListener('click', () => this.tourNext());
    if (tourPrev) tourPrev.addEventListener('click', () => this.tourPrev());
    if (tourClose) tourClose.addEventListener('click', () => this.endTour());

    // Keyboard shortcut for help
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const activeEl = document.activeElement;
        if (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
          e.preventDefault();
          this.toggleHelpMenu();
        }
      }
      if (e.key === 'Escape') {
        this.hideHelpMenu();
        this.hideQuickStart();
        this.endTour();
      }
    });

    // Click outside to close menus
    document.addEventListener('click', (e) => {
      const helpMenu = document.getElementById('helpMenu');
      const helpBtn = document.getElementById('helpBtn');
      if (helpMenu && !helpMenu.classList.contains('hidden')) {
        if (!helpMenu.contains(e.target) && e.target !== helpBtn) {
          this.hideHelpMenu();
        }
      }
    });
  }

  setupContextualHelp() {
    // Add hover tooltips to elements with help definitions
    Object.keys(CONTEXTUAL_HELP).forEach(id => {
      const element = document.getElementById(id) || document.querySelector(`.${id}`);
      if (element) {
        element.addEventListener('mouseenter', (e) => {
          this.showContextualHelp(id, element);
        });
        element.addEventListener('mouseleave', () => {
          this.hideContextualHelp();
        });

        // Add help indicator
        if (!element.querySelector('.help-indicator')) {
          const indicator = document.createElement('span');
          indicator.className = 'help-indicator';
          indicator.innerHTML = '?';
          indicator.title = 'Hover for help';
          // Only add to buttons and headers
          if (element.tagName === 'BUTTON' || element.tagName === 'H3' || element.tagName === 'H4') {
            element.style.position = 'relative';
            element.appendChild(indicator);
          }
        }
      }
    });
  }

  showContextualHelp(id, element) {
    clearTimeout(this.tooltipTimeout);
    this.tooltipTimeout = setTimeout(() => {
      const help = CONTEXTUAL_HELP[id];
      if (!help) return;

      const tooltip = document.getElementById('helpTooltip');
      if (!tooltip) return;

      const content = tooltip.querySelector('.help-tooltip-content');
      content.innerHTML = `<strong>${help.title}</strong><p>${help.content}</p>`;

      // Position tooltip
      const rect = element.getBoundingClientRect();
      const pos = help.position || 'top';

      tooltip.className = `help-tooltip help-tooltip--${pos}`;

      if (pos === 'top') {
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 10}px`;
      } else if (pos === 'bottom') {
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.bottom + 10}px`;
      } else if (pos === 'right') {
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
      } else if (pos === 'left') {
        tooltip.style.left = `${rect.left - 10}px`;
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
      }

      tooltip.classList.remove('hidden');
    }, HELP_CONFIG.tooltipDelay);
  }

  hideContextualHelp() {
    clearTimeout(this.tooltipTimeout);
    const tooltip = document.getElementById('helpTooltip');
    if (tooltip) {
      tooltip.classList.add('hidden');
    }
  }

  toggleHelpMenu() {
    const menu = document.getElementById('helpMenu');
    if (menu) {
      menu.classList.toggle('hidden');
    }
  }

  hideHelpMenu() {
    const menu = document.getElementById('helpMenu');
    if (menu) {
      menu.classList.add('hidden');
    }
  }

  handleHelpAction(action) {
    this.hideHelpMenu();

    switch (action) {
      case 'quickstart':
        this.showQuickStart();
        break;
      case 'tour':
        this.startTour();
        break;
      case 'shortcuts':
        this.showShortcuts();
        break;
      case 'grade':
        this.showGradeHelp();
        break;
      case 'nma':
        this.showNMAHelp();
        break;
      case 'manual':
        window.open('USER_MANUAL.md', '_blank');
        break;
    }
  }

  // ============================================================================
  // QUICK START WIZARD
  // ============================================================================

  showQuickStart() {
    const modal = document.getElementById('quickStartModal');
    if (modal) {
      this.currentWizardStep = 1;
      this.updateWizardUI();
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  hideQuickStart() {
    const modal = document.getElementById('quickStartModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  wizardNext() {
    if (this.currentWizardStep < 4) {
      this.currentWizardStep++;
      this.updateWizardUI();
    }
  }

  wizardPrev() {
    if (this.currentWizardStep > 1) {
      this.currentWizardStep--;
      this.updateWizardUI();
    }
  }

  goToWizardStep(step) {
    this.currentWizardStep = step;
    this.updateWizardUI();
  }

  updateWizardUI() {
    // Update steps visibility
    document.querySelectorAll('.wizard-step').forEach(step => {
      step.classList.toggle('active', parseInt(step.dataset.step) === this.currentWizardStep);
    });

    // Update dots
    document.querySelectorAll('.wizard-dot').forEach(dot => {
      dot.classList.toggle('active', parseInt(dot.dataset.step) === this.currentWizardStep);
    });

    // Update buttons
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');
    const finishBtn = document.getElementById('wizardFinishBtn');

    if (prevBtn) prevBtn.disabled = this.currentWizardStep === 1;
    if (nextBtn) nextBtn.classList.toggle('hidden', this.currentWizardStep === 4);
    if (finishBtn) finishBtn.classList.toggle('hidden', this.currentWizardStep !== 4);
  }

  finishQuickStart() {
    const dontShow = document.getElementById('dontShowAgain');
    if (dontShow && dontShow.checked) {
      this.prefs.hasSeenQuickStart = true;
      this.savePrefs();
    }
    this.hideQuickStart();
  }

  // ============================================================================
  // INTERACTIVE TOUR
  // ============================================================================

  startTour() {
    this.currentTourStep = 0;
    this.showTourStep();
  }

  showTourStep() {
    const overlay = document.getElementById('tourOverlay');
    if (!overlay) return;

    const step = TOUR_STEPS[this.currentTourStep];
    if (!step) {
      this.endTour();
      return;
    }

    const target = document.querySelector(step.target);
    if (!target) {
      // Skip missing elements
      this.tourNext();
      return;
    }

    // Update tour content
    overlay.querySelector('.tour-step-indicator').textContent =
      `Step ${this.currentTourStep + 1} of ${TOUR_STEPS.length}`;
    overlay.querySelector('.tour-title').textContent = step.title;
    overlay.querySelector('.tour-description').textContent = step.description;

    // Position spotlight
    const spotlight = overlay.querySelector('.tour-spotlight');
    const rect = target.getBoundingClientRect();
    const padding = 10;

    spotlight.style.left = `${rect.left - padding}px`;
    spotlight.style.top = `${rect.top - padding}px`;
    spotlight.style.width = `${rect.width + padding * 2}px`;
    spotlight.style.height = `${rect.height + padding * 2}px`;

    // Position tooltip
    const tooltip = overlay.querySelector('.tour-tooltip');
    const pos = step.position || 'bottom';

    if (pos === 'bottom') {
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.bottom + 20}px`;
    } else if (pos === 'top') {
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 20}px`;
    } else if (pos === 'right') {
      tooltip.style.left = `${rect.right + 20}px`;
      tooltip.style.top = `${rect.top}px`;
    } else if (pos === 'left') {
      tooltip.style.left = `${rect.left - tooltip.offsetWidth - 20}px`;
      tooltip.style.top = `${rect.top}px`;
    }

    // Update buttons
    overlay.querySelector('.tour-prev').disabled = this.currentTourStep === 0;
    overlay.querySelector('.tour-next').textContent =
      this.currentTourStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next';

    overlay.classList.remove('hidden');

    // Scroll target into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  tourNext() {
    if (this.currentTourStep < TOUR_STEPS.length - 1) {
      this.currentTourStep++;
      this.showTourStep();
    } else {
      this.endTour();
    }
  }

  tourPrev() {
    if (this.currentTourStep > 0) {
      this.currentTourStep--;
      this.showTourStep();
    }
  }

  endTour() {
    const overlay = document.getElementById('tourOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    this.prefs.hasSeenTour = true;
    this.savePrefs();
  }

  // ============================================================================
  // HELP MODALS
  // ============================================================================

  showShortcuts() {
    const html = `
      <div class="help-modal-content">
        <h3>Keyboard Shortcuts</h3>
        <table class="shortcuts-table">
          <tbody>
            ${KEYBOARD_SHORTCUTS.map(s => `
              <tr>
                <td><kbd>${s.key}</kbd></td>
                <td>${s.description}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    this.showHelpModal('Keyboard Shortcuts', html);
  }

  showGradeHelp() {
    this.showHelpModal('GRADE Assessment', GRADE_HELP.overview);
  }

  showNMAHelp() {
    this.showHelpModal('Network Meta-Analysis', NMA_HELP.overview);
  }

  showHelpModal(title, content) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('helpContentModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'helpContentModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="helpModalTitle"></h2>
            <button class="modal-close" onclick="document.getElementById('helpContentModal').classList.add('hidden')">&times;</button>
          </div>
          <div class="modal-body" id="helpModalBody"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.querySelector('#helpModalTitle').textContent = title;
    modal.querySelector('#helpModalBody').innerHTML = content;
    modal.classList.remove('hidden');
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize help system when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.helpSystem = new HelpSystem();
  });
} else {
  window.helpSystem = new HelpSystem();
}

// Export for module use
export { HelpSystem, CONTEXTUAL_HELP, TOUR_STEPS, GRADE_HELP, NMA_HELP, KEYBOARD_SHORTCUTS };
