ESC ACS Living Meta-Analysis Validation

Offline rendering
- Serve the folder (example: `python -m http.server`) and open `esc-acs-living-meta/index.html`.
- Click "Load Offline Fixture".
- Select a topic and open each tab to confirm charts and tables render.

Live update (requires network access)
- Choose a start date and status filters.
- Click "Update from ClinicalTrials.gov" to fetch RCTs and extract outcomes.
- Use "Compare Coverage" to check trial IDs against prior meta-analyses.

Notes
- The worker stores full ClinicalTrials.gov records in memory and caches smaller payloads in localStorage.
- Tabs render lazily; plots are drawn only when a tab is active.

Recent validation runs
- Offline fixture (lastUpdate: 2026-01-02T16:00:00Z): topicCount 3, trialCount 15, pairwise 5 rows, network 4 rows, dose 0 rows (empty-state), diagnostics 5 rows.
- Live update (lastUpdate: 2026-01-04T10:29:21.514Z): topicCount 40, trialCount 7479, selected "Short DAPT (1-3 months) vs standard"; pairwise/network/dose/diagnostics tables empty for that topic; log noted "Cache skipped: payload too large."
- Live update (lastUpdate: 2026-01-04T12:20:16.889Z): topicCount 40, trialCount 7479; checked first 15 eligible topics and all had pairwise rows 0; selected "Short DAPT (1-3 months) vs standard"; network/dose/diagnostics rows 0.
- Live update after extractor update (outcomeRule=results, lastUpdate: 2026-01-05T12:52:58.540Z): topicCount 40, trialCount 7479; "Short DAPT (1-3 months) vs standard" pairwise rows 139.
- Live update after query/condition tightening (outcomeRule=results, lastUpdate: 2026-01-09T18:41:51.264Z): topicCount 39, trialCount 4195; "Short DAPT (1-3 months) vs standard" pairwise rows 56.
- Live update after dispersion parsing (outcomeRule=results, lastUpdate: 2026-01-09T18:55:49.605Z): topicCount 39, trialCount 4195; "Short DAPT (1-3 months) vs standard" pairwise rows 56.
- Coverage check using PubMed seed NCT04308551 (lastUpdate: 2026-01-09T20:29:00.680Z): Prior 1, Captured 0, Missing 1, New since prior 1562.
- Coverage check using PubMed meta_refs (274 NCTs, lastUpdate: 2026-01-10T17:21:00.024Z): Prior 274, Captured 20, Missing 254, New since prior 1542.
- Coverage files generated (lastUpdate: 2026-01-10T21:08:56.152Z): meta_refs/pubmed_nct_coverage.json, meta_refs/pubmed_nct_missing.txt, meta_refs/pubmed_nct_captured.txt.
- PubMed NCT filtering (strict ACS tokens): 42 ACS-like NCTs, 232 non-ACS. Lists saved to meta_refs/pubmed_nct_ids_acs.txt and meta_refs/pubmed_nct_ids_non_acs.txt.
- Coverage (ACS-filtered list, computed from pubmed_nct_coverage.json): Prior 42, Captured 20, Missing 22. Files: meta_refs/pubmed_nct_coverage_acs_strict.json, meta_refs/pubmed_nct_missing_acs_strict.txt, meta_refs/pubmed_nct_captured_acs_strict.txt.
- Missing ACS strict analysis: meta_refs/missing_acs_strict_analysis.json.
