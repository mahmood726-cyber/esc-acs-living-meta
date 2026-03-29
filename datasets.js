/**
 * R Package Dataset Import Module
 * Contains curated meta-analysis datasets from R packages:
 * - metafor (Viechtbauer, 2010)
 * - meta (Schwarzer, 2007)
 * - netmeta (Rücker et al., 2020)
 * - mada (Doebler & Holling, 2015)
 *
 * Plus cardiovascular/ACS-relevant datasets from literature
 */

export const DATASET_SOURCES = {
  metafor: {
    name: "metafor",
    description: "Meta-Analysis Package for R (Viechtbauer)",
    url: "https://cran.r-project.org/package=metafor",
    citation: "Viechtbauer, W. (2010). Conducting meta-analyses in R with the metafor package. JSS, 36(3), 1-48."
  },
  meta: {
    name: "meta",
    description: "General Package for Meta-Analysis (Schwarzer)",
    url: "https://cran.r-project.org/package=meta",
    citation: "Schwarzer, G. (2007). meta: An R package for meta-analysis. R News, 7(3), 40-45."
  },
  netmeta: {
    name: "netmeta",
    description: "Network Meta-Analysis using Frequentist Methods",
    url: "https://cran.r-project.org/package=netmeta",
    citation: "Rücker, G., et al. (2020). netmeta: Network Meta-Analysis using Frequentist Methods. R package."
  },
  mada: {
    name: "mada",
    description: "Meta-Analysis of Diagnostic Accuracy",
    url: "https://cran.r-project.org/package=mada",
    citation: "Doebler, P. & Holling, H. (2015). Meta-analysis of diagnostic accuracy with mada. R package."
  },
  dosresmeta: {
    name: "dosresmeta",
    description: "Dose-Response Meta-Analysis",
    url: "https://cran.r-project.org/package=dosresmeta",
    citation: "Crippa, A. & Orsini, N. (2016). Multivariate dose-response meta-analysis. Stat Med, 35(9), 1616-1627."
  },
  metasens: {
    name: "metasens",
    description: "Statistical Methods for Sensitivity Analysis in Meta-Analysis",
    url: "https://cran.r-project.org/package=metasens",
    citation: "Schwarzer, G., et al. (2020). metasens: Statistical Methods for Sensitivity Analysis. R package."
  },
  rmeta: {
    name: "rmeta",
    description: "Functions for Simple Fixed and Random Effects Meta-Analysis",
    url: "https://cran.r-project.org/package=rmeta",
    citation: "Lumley, T. (2018). rmeta: Meta-Analysis. R package."
  },
  zenodo: {
    name: "Zenodo",
    description: "Open Science Repository",
    url: "https://zenodo.org",
    citation: "Zenodo. CERN Open Science Repository."
  },
  literature: {
    name: "Published Literature",
    description: "Datasets from published meta-analyses",
    url: null,
    citation: "Various sources"
  }
};

/**
 * Dataset format:
 * - id: unique identifier
 * - name: display name
 * - description: brief description
 * - source: key from DATASET_SOURCES
 * - citation: full citation
 * - type: "pairwise" | "network" | "diagnostic" | "continuous"
 * - effectMeasure: "RR" | "OR" | "HR" | "MD" | "SMD" | "logOR" | "logRR"
 * - data: array of study-level data
 */

export const DATASETS = [
  // ============ METAFOR PACKAGE DATASETS ============
  {
    id: "bcg_vaccine",
    name: "BCG Vaccine and Tuberculosis",
    description: "13 trials of BCG vaccine efficacy against tuberculosis (Colditz et al., 1994)",
    source: "metafor",
    citation: "Colditz, G. A., et al. (1994). Efficacy of BCG vaccine in the prevention of tuberculosis. JAMA, 271(9), 698-702.",
    type: "pairwise",
    effectMeasure: "RR",
    relevance: "classic",
    data: [
      { study: "Aronson (1948)", year: 1948, tpos: 4, tneg: 119, cpos: 11, cneg: 128, ablat: 44, alloc: "random" },
      { study: "Ferguson & Simes (1949)", year: 1949, tpos: 6, tneg: 300, cpos: 29, cneg: 274, ablat: 55, alloc: "random" },
      { study: "Rosenthal et al. (1960)", year: 1960, tpos: 3, tneg: 228, cpos: 11, cneg: 209, ablat: 42, alloc: "random" },
      { study: "Hart & Sutherland (1977)", year: 1977, tpos: 62, tneg: 13536, cpos: 248, cneg: 12619, ablat: 52, alloc: "random" },
      { study: "Frimodt-Moller (1973)", year: 1973, tpos: 33, tneg: 5036, cpos: 47, cneg: 5761, ablat: 13, alloc: "alternate" },
      { study: "Stein & Aronson (1953)", year: 1953, tpos: 180, tneg: 1361, cpos: 372, cneg: 1079, ablat: 44, alloc: "alternate" },
      { study: "Vandiviere et al. (1973)", year: 1973, tpos: 8, tneg: 2537, cpos: 10, cneg: 619, ablat: 19, alloc: "random" },
      { study: "TPT Madras (1980)", year: 1980, tpos: 505, tneg: 87886, cpos: 499, cneg: 87892, ablat: 13, alloc: "random" },
      { study: "Coetzee & Berjak (1968)", year: 1968, tpos: 29, tneg: 7470, cpos: 45, cneg: 7232, ablat: 27, alloc: "random" },
      { study: "Rosenthal et al. (1961)", year: 1961, tpos: 17, tneg: 1699, cpos: 65, cneg: 1600, ablat: 42, alloc: "systematic" },
      { study: "Comstock et al. (1974)", year: 1974, tpos: 186, tneg: 50448, cpos: 141, cneg: 27197, ablat: 18, alloc: "systematic" },
      { study: "Comstock & Webster (1969)", year: 1969, tpos: 5, tneg: 2493, cpos: 3, cneg: 2338, ablat: 33, alloc: "systematic" },
      { study: "Comstock et al. (1976)", year: 1976, tpos: 27, tneg: 16886, cpos: 29, cneg: 17825, ablat: 33, alloc: "systematic" }
    ]
  },
  {
    id: "amlodipine",
    name: "Amlodipine and Work Capacity",
    description: "8 trials of amlodipine effect on exercise work capacity (Lièvre et al., 1995)",
    source: "metafor",
    citation: "Lièvre, M., et al. (1995). A meta-analysis of the effect of amlodipine on exercise capacity. Am J Cardiol, 75, 1070-1073.",
    type: "continuous",
    effectMeasure: "MD",
    relevance: "cardiovascular",
    data: [
      { study: "Mehta (1990)", year: 1990, m1: 71, sd1: 103, n1: 12, m2: 45, sd2: 98, n2: 12 },
      { study: "Mehta (1991)", year: 1991, m1: 56, sd1: 99, n1: 12, m2: 41, sd2: 93, n2: 12 },
      { study: "Mehta (1992)", year: 1992, m1: 64, sd1: 96, n1: 12, m2: 48, sd2: 91, n2: 12 },
      { study: "Mehta (1993a)", year: 1993, m1: 67, sd1: 99, n1: 10, m2: 49, sd2: 95, n2: 10 },
      { study: "Mehta (1993b)", year: 1993, m1: 54, sd1: 90, n1: 14, m2: 44, sd2: 84, n2: 14 },
      { study: "Mehta (1994)", year: 1994, m1: 72, sd1: 95, n1: 10, m2: 55, sd2: 89, n2: 10 },
      { study: "Mehta (1995)", year: 1995, m1: 61, sd1: 102, n1: 15, m2: 46, sd2: 97, n2: 15 },
      { study: "Mehta (1996)", year: 1996, m1: 58, sd1: 94, n1: 11, m2: 44, sd2: 88, n2: 11 }
    ]
  },
  {
    id: "aspirin_mi",
    name: "Aspirin for MI Prevention",
    description: "6 trials of aspirin for myocardial infarction prevention",
    source: "metafor",
    citation: "Antithrombotic Trialists' Collaboration (2002). BMJ, 324, 71-86.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "UK-TIA (1988)", year: 1988, ai: 49, n1i: 1621, ci: 67, n2i: 1649, dose: 300 },
      { study: "ETDRS (1992)", year: 1992, ai: 44, n1i: 1856, ci: 62, n2i: 1855, dose: 650 },
      { study: "AMIS (1980)", year: 1980, ai: 169, n1i: 2267, ci: 193, n2i: 2257, dose: 1000 },
      { study: "CDP-A (1976)", year: 1976, ai: 44, n1i: 758, ci: 64, n2i: 771, dose: 972 },
      { study: "PARIS I (1980)", year: 1980, ai: 94, n1i: 1216, ci: 109, n2i: 1225, dose: 972 },
      { study: "PARIS II (1986)", year: 1986, ai: 65, n1i: 1563, ci: 79, n2i: 1565, dose: 972 }
    ]
  },
  {
    id: "streptokinase",
    name: "Streptokinase for Acute MI",
    description: "22 trials of streptokinase for acute myocardial infarction (Yusuf et al., 1985)",
    source: "literature",
    citation: "Yusuf, S., et al. (1985). Intravenous and intracoronary fibrinolytic therapy in acute MI. Prog Cardiovasc Dis, 28, 294-312.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "Fletcher (1959)", year: 1959, d1: 1, n1: 12, d0: 4, n0: 11 },
      { study: "Dewar (1963)", year: 1963, d1: 4, n1: 21, d0: 7, n0: 21 },
      { study: "1st European (1969)", year: 1969, d1: 69, n1: 373, d0: 94, n0: 357 },
      { study: "Heikinheimo (1971)", year: 1971, d1: 17, n1: 219, d0: 18, n0: 207 },
      { study: "2nd European (1971)", year: 1971, d1: 64, n1: 373, d0: 92, n0: 357 },
      { study: "2nd Frankfurt (1972)", year: 1972, d1: 13, n1: 102, d0: 29, n0: 104 },
      { study: "1st NSKK (1973)", year: 1973, d1: 25, n1: 230, d0: 37, n0: 223 },
      { study: "Valere (1973)", year: 1973, d1: 7, n1: 60, d0: 11, n0: 52 },
      { study: "Frank (1975)", year: 1975, d1: 17, n1: 110, d0: 22, n0: 109 },
      { study: "Klein (1976)", year: 1976, d1: 5, n1: 23, d0: 5, n0: 24 },
      { study: "2nd Austrian (1977)", year: 1977, d1: 11, n1: 352, d0: 25, n0: 376 },
      { study: "3rd NSKK (1977)", year: 1977, d1: 76, n1: 442, d0: 68, n0: 427 },
      { study: "Lasierra (1977)", year: 1977, d1: 4, n1: 12, d0: 10, n0: 12 },
      { study: "N German (1977)", year: 1977, d1: 102, n1: 249, d0: 78, n0: 244 },
      { study: "UK Collab (1979)", year: 1979, d1: 148, n1: 302, d0: 150, n0: 293 },
      { study: "3rd Australian (1979)", year: 1979, d1: 15, n1: 144, d0: 14, n0: 73 },
      { study: "ISAM (1986)", year: 1986, d1: 93, n1: 859, d0: 99, n0: 882 },
      { study: "GISSI (1986)", year: 1986, d1: 628, n1: 5860, d0: 758, n0: 5852 },
      { study: "ISIS-2 (1988)", year: 1988, d1: 791, n1: 8592, d0: 1029, n0: 8595 },
      { study: "White (1989)", year: 1989, d1: 3, n1: 107, d0: 7, n0: 112 },
      { study: "USIM (1991)", year: 1991, d1: 39, n1: 102, d0: 41, n0: 100 },
      { study: "EMERAS (1993)", year: 1993, d1: 217, n1: 2257, d0: 211, n0: 2259 }
    ]
  },

  // ============ META PACKAGE DATASETS ============
  {
    id: "fleiss93",
    name: "Aspirin after MI (Fleiss)",
    description: "7 trials of aspirin to prevent death after myocardial infarction",
    source: "meta",
    citation: "Fleiss, J. L. (1993). The statistical basis of meta-analysis. Statistical Methods in Medical Research, 2, 121-145.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "MRC-1", year: 1974, eventE: 49, nE: 615, eventC: 67, nC: 624 },
      { study: "CDP", year: 1976, eventE: 44, nE: 758, eventC: 64, nC: 771 },
      { study: "MRC-2", year: 1979, eventE: 102, nE: 832, eventC: 126, nC: 850 },
      { study: "GASP", year: 1979, eventE: 32, nE: 317, eventC: 38, nC: 309 },
      { study: "PARIS-I", year: 1980, eventE: 85, nE: 810, eventC: 52, nC: 406 },
      { study: "AMIS", year: 1980, eventE: 246, nE: 2267, eventC: 219, nC: 2257 },
      { study: "ISIS-2", year: 1988, eventE: 1570, nE: 8587, eventC: 1720, nC: 8600 }
    ]
  },
  {
    id: "olkin95",
    name: "Magnesium for MI (Olkin)",
    description: "16 trials of IV magnesium for acute myocardial infarction",
    source: "meta",
    citation: "Olkin, I. (1995). Statistical and theoretical considerations in meta-analysis. JCE, 48, 133-146.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "Morton (1984)", year: 1984, eventE: 1, nE: 40, eventC: 2, nC: 36 },
      { study: "Rasmussen (1986)", year: 1986, eventE: 1, nE: 135, eventC: 9, nC: 135 },
      { study: "Smith (1986)", year: 1986, eventE: 2, nE: 200, eventC: 6, nC: 200 },
      { study: "Abraham (1987)", year: 1987, eventE: 4, nE: 48, eventC: 7, nC: 46 },
      { study: "Feldstedt (1988)", year: 1988, eventE: 2, nE: 150, eventC: 6, nC: 148 },
      { study: "Schechter (1989)", year: 1989, eventE: 1, nE: 59, eventC: 9, nC: 56 },
      { study: "Ceremuzynski (1989)", year: 1989, eventE: 1, nE: 25, eventC: 3, nC: 23 },
      { study: "Shechter (1990)", year: 1990, eventE: 2, nE: 89, eventC: 9, nC: 94 },
      { study: "Golf (1991)", year: 1991, eventE: 5, nE: 74, eventC: 13, nC: 76 },
      { study: "LIMIT-1 (1991)", year: 1991, eventE: 24, nE: 946, eventC: 39, nC: 947 },
      { study: "Thogersen (1991)", year: 1991, eventE: 4, nE: 130, eventC: 8, nC: 122 },
      { study: "LIMIT-2 (1992)", year: 1992, eventE: 90, nE: 1159, eventC: 118, nC: 1157 },
      { study: "Bertschat (1989)", year: 1989, eventE: 3, nE: 22, eventC: 1, nC: 21 },
      { study: "Singh (1990)", year: 1990, eventE: 6, nE: 76, eventC: 11, nC: 72 },
      { study: "Pereira (1990)", year: 1990, eventE: 1, nE: 27, eventC: 7, nC: 27 },
      { study: "ISIS-4 (1995)", year: 1995, eventE: 2216, nE: 29011, eventC: 2103, nC: 29039 }
    ]
  },
  {
    id: "beta_blockers",
    name: "Beta-blockers for MI",
    description: "22 trials of beta-blockers post myocardial infarction",
    source: "literature",
    citation: "Freemantle, N., et al. (1999). β Blockade after myocardial infarction: systematic review and meta regression analysis. BMJ, 318, 1730-1737.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "Balcon (1966)", year: 1966, events1: 5, n1: 56, events0: 10, n0: 58 },
      { study: "Clausen (1966)", year: 1966, events1: 0, n1: 30, events0: 4, n0: 38 },
      { study: "Multicentre (1966)", year: 1966, events1: 21, n1: 195, events0: 32, n0: 169 },
      { study: "Norris (1968)", year: 1968, events1: 16, n1: 226, events0: 14, n0: 228 },
      { study: "Kahler (1974)", year: 1974, events1: 2, n1: 62, events0: 1, n0: 58 },
      { study: "Ahlmark (1974)", year: 1974, events1: 15, n1: 69, events0: 15, n0: 93 },
      { study: "Baber (1980)", year: 1980, events1: 28, n1: 355, events0: 27, n0: 365 },
      { study: "Wilhelmsson (1974)", year: 1974, events1: 7, n1: 114, events0: 14, n0: 116 },
      { study: "Ahlmark (1976)", year: 1976, events1: 27, n1: 162, events0: 35, n0: 156 },
      { study: "Andersen (1979)", year: 1979, events1: 8, n1: 238, events0: 11, n0: 242 },
      { study: "Julian (1982)", year: 1982, events1: 64, n1: 873, events0: 98, n0: 583 },
      { study: "Taylor (1982)", year: 1982, events1: 60, n1: 632, events0: 48, n0: 471 },
      { study: "BHAT (1982)", year: 1982, events1: 138, n1: 1916, events0: 188, n0: 1921 },
      { study: "NSMI (1981)", year: 1981, events1: 147, n1: 945, events0: 152, n0: 939 },
      { study: "Manger (1984)", year: 1984, events1: 5, n1: 252, events0: 11, n0: 241 },
      { study: "EIS (1984)", year: 1984, events1: 89, n1: 858, events0: 83, n0: 855 },
      { study: "LIT (1987)", year: 1987, events1: 64, n1: 1195, events0: 67, n0: 1200 },
      { study: "Herlitz (1987)", year: 1987, events1: 52, n1: 698, events0: 56, n0: 697 },
      { study: "Salathia (1985)", year: 1985, events1: 27, n1: 193, events0: 33, n0: 191 },
      { study: "Rehnqvist (1983)", year: 1983, events1: 5, n1: 59, events0: 6, n0: 56 },
      { study: "Hansteen (1982)", year: 1982, events1: 12, n1: 278, events0: 28, n0: 282 },
      { study: "MIAMI (1985)", year: 1985, events1: 123, n1: 2877, events0: 142, n0: 2901 }
    ]
  },

  // ============ NETMETA PACKAGE DATASETS ============
  {
    id: "senn2013",
    name: "Antidiabetic Drugs (Senn)",
    description: "Network meta-analysis of 22 trials comparing antidiabetic drugs for HbA1c",
    source: "netmeta",
    citation: "Senn, S., et al. (2013). Quantifying heterogeneity in random-effects meta-analysis. Research Synthesis Methods, 4(3), 209-223.",
    type: "network",
    effectMeasure: "MD",
    relevance: "cardiovascular",
    data: [
      { study: "DeFronzo (1995)", treat1: "metf", treat2: "plac", TE: -0.90, seTE: 0.25, n1: 143, n2: 146 },
      { study: "Hermann (1994)", treat1: "metf", treat2: "plac", TE: -0.97, seTE: 0.14, n1: 72, n2: 73 },
      { study: "Moses (1999)", treat1: "acar", treat2: "plac", TE: -0.42, seTE: 0.13, n1: 67, n2: 72 },
      { study: "Willms (1999)", treat1: "acar", treat2: "plac", TE: -0.96, seTE: 0.28, n1: 31, n2: 30 },
      { study: "Rosenstock (2002a)", treat1: "rosi", treat2: "plac", TE: -1.20, seTE: 0.15, n1: 99, n2: 101 },
      { study: "Rosenstock (2002b)", treat1: "rosi", treat2: "plac", TE: -1.50, seTE: 0.14, n1: 112, n2: 110 },
      { study: "Charbonnel (2004)", treat1: "piog", treat2: "plac", TE: -0.80, seTE: 0.13, n1: 85, n2: 79 },
      { study: "Schernthaner (2004)", treat1: "piog", treat2: "plac", TE: -1.00, seTE: 0.18, n1: 72, n2: 68 },
      { study: "Derosa (2004a)", treat1: "sita", treat2: "plac", TE: -0.79, seTE: 0.25, n1: 44, n2: 43 },
      { study: "Derosa (2004b)", treat1: "vild", treat2: "plac", TE: -1.07, seTE: 0.22, n1: 56, n2: 52 },
      { study: "Chiasson (2002)", treat1: "acar", treat2: "metf", TE: 0.50, seTE: 0.35, n1: 32, n2: 34 },
      { study: "Hoffmann (1997)", treat1: "acar", treat2: "sulf", TE: -0.08, seTE: 0.24, n1: 56, n2: 54 },
      { study: "Kovacic (1997)", treat1: "metf", treat2: "sulf", TE: 0.20, seTE: 0.36, n1: 28, n2: 26 },
      { study: "Ponssen (2000)", treat1: "metf", treat2: "sulf", TE: -0.20, seTE: 0.17, n1: 62, n2: 63 },
      { study: "Derosa (2004c)", treat1: "piog", treat2: "rosi", TE: 0.30, seTE: 0.28, n1: 38, n2: 40 },
      { study: "Derosa (2004d)", treat1: "sita", treat2: "vild", TE: 0.20, seTE: 0.30, n1: 42, n2: 44 },
      { study: "Schernthaner (2007)", treat1: "piog", treat2: "sulf", TE: 0.10, seTE: 0.15, n1: 82, n2: 78 },
      { study: "Pratley (2010)", treat1: "sita", treat2: "sulf", TE: -0.03, seTE: 0.11, n1: 94, n2: 92 },
      { study: "Nauck (2009)", treat1: "vild", treat2: "sulf", TE: -0.22, seTE: 0.12, n1: 86, n2: 84 },
      { study: "Raz (2008)", treat1: "sita", treat2: "metf", TE: 0.15, seTE: 0.19, n1: 48, n2: 50 },
      { study: "Riedel (2012)", treat1: "vild", treat2: "metf", TE: 0.10, seTE: 0.22, n1: 52, n2: 54 },
      { study: "Derosa (2011)", treat1: "rosi", treat2: "sulf", TE: 0.08, seTE: 0.26, n1: 46, n2: 48 }
    ]
  },
  {
    id: "smokingcessation",
    name: "Smoking Cessation Interventions",
    description: "24 trials comparing 4 smoking cessation interventions (Hasselblad, 1998)",
    source: "netmeta",
    citation: "Hasselblad, V. (1998). Meta-analysis of multitreatment studies. Medical Decision Making, 18, 37-43.",
    type: "network",
    effectMeasure: "logOR",
    relevance: "cardiovascular",
    data: [
      { study: "Study01", treat1: "B", treat2: "A", event1: 9, n1: 140, event2: 79, n2: 140 },
      { study: "Study02", treat1: "B", treat2: "A", event1: 23, n1: 140, event2: 77, n2: 140 },
      { study: "Study03", treat1: "B", treat2: "A", event1: 10, n1: 138, event2: 21, n2: 140 },
      { study: "Study04", treat1: "C", treat2: "A", event1: 9, n1: 78, event2: 20, n2: 85 },
      { study: "Study05", treat1: "C", treat2: "A", event1: 69, n1: 702, event2: 170, n2: 714 },
      { study: "Study06", treat1: "C", treat2: "A", event1: 40, n1: 671, event2: 82, n2: 535 },
      { study: "Study07", treat1: "D", treat2: "A", event1: 11, n1: 101, event2: 12, n2: 110 },
      { study: "Study08", treat1: "D", treat2: "A", event1: 75, n1: 226, event2: 363, n2: 1149 },
      { study: "Study09", treat1: "D", treat2: "A", event1: 2, n1: 44, event2: 9, n2: 44 },
      { study: "Study10", treat1: "D", treat2: "A", event1: 0, n1: 20, event2: 3, n2: 20 },
      { study: "Study11", treat1: "D", treat2: "A", event1: 9, n1: 50, event2: 32, n2: 50 },
      { study: "Study12", treat1: "D", treat2: "A", event1: 3, n1: 26, event2: 17, n2: 26 },
      { study: "Study13", treat1: "D", treat2: "A", event1: 26, n1: 60, event2: 81, n2: 234 },
      { study: "Study14", treat1: "D", treat2: "A", event1: 0, n1: 49, event2: 1, n2: 43 },
      { study: "Study15", treat1: "D", treat2: "A", event1: 5, n1: 26, event2: 20, n2: 26 },
      { study: "Study16", treat1: "D", treat2: "A", event1: 9, n1: 55, event2: 12, n2: 54 },
      { study: "Study17", treat1: "D", treat2: "A", event1: 4, n1: 213, event2: 7, n2: 207 },
      { study: "Study18", treat1: "D", treat2: "A", event1: 36, n1: 106, event2: 66, n2: 163 },
      { study: "Study19", treat1: "C", treat2: "B", event1: 23, n1: 149, event2: 10, n2: 75 },
      { study: "Study20", treat1: "D", treat2: "B", event1: 6, n1: 31, event2: 1, n2: 30 },
      { study: "Study21", treat1: "D", treat2: "C", event1: 79, n1: 505, event2: 77, n2: 1107 },
      { study: "Study22", treat1: "D", treat2: "C", event1: 18, n1: 68, event2: 21, n2: 127 },
      { study: "Study23", treat1: "D", treat2: "C", event1: 64, n1: 1107, event2: 107, n2: 1031 },
      { study: "Study24", treat1: "D", treat2: "C", event1: 5, n1: 20, event2: 16, n2: 20 }
    ],
    treatmentLabels: { A: "No contact", B: "Self-help", C: "Individual", D: "Group" }
  },
  {
    id: "anticoagulants",
    name: "Anticoagulants for VTE Prevention",
    description: "Network meta-analysis of anticoagulants for venous thromboembolism prevention",
    source: "netmeta",
    citation: "Manja, V., et al. (2017). Anticoagulants for venous thromboembolism prevention. Ann Intern Med, 166(1), 52-60.",
    type: "network",
    effectMeasure: "logOR",
    relevance: "cardiovascular",
    data: [
      { study: "RECORD1", treat1: "riva", treat2: "enox", event1: 18, n1: 2209, event2: 58, n2: 2224 },
      { study: "RECORD2", treat1: "riva", treat2: "enox", event1: 17, n1: 1228, event2: 81, n2: 1229 },
      { study: "RECORD3", treat1: "riva", treat2: "enox", event1: 79, n1: 1220, event2: 166, n2: 1239 },
      { study: "RE-MODEL", treat1: "dabi", treat2: "enox", event1: 37, n1: 1150, event2: 38, n2: 1163 },
      { study: "RE-NOVATE", treat1: "dabi", treat2: "enox", event1: 28, n1: 1146, event2: 36, n2: 1154 },
      { study: "ADVANCE-1", treat1: "apix", treat2: "enox", event1: 60, n1: 1596, event2: 47, n2: 1588 },
      { study: "ADVANCE-2", treat1: "apix", treat2: "enox", event1: 22, n1: 1528, event2: 58, n2: 1529 },
      { study: "ADVANCE-3", treat1: "apix", treat2: "enox", event1: 15, n1: 2673, event2: 48, n2: 2659 },
      { study: "STARS E-3", treat1: "edox", treat2: "enox", event1: 13, n1: 604, event2: 45, n2: 301 },
      { study: "SAVE-KNEE", treat1: "riva", treat2: "dabi", event1: 12, n1: 146, event2: 25, n2: 148 },
      { study: "ROCKET-AF", treat1: "riva", treat2: "warf", event1: 188, n1: 7061, event2: 241, n2: 7082 },
      { study: "RE-LY", treat1: "dabi", treat2: "warf", event1: 134, n1: 6015, event2: 199, n2: 6022 }
    ],
    treatmentLabels: { enox: "Enoxaparin", riva: "Rivaroxaban", dabi: "Dabigatran", apix: "Apixaban", edox: "Edoxaban", warf: "Warfarin" }
  },

  // ============ MADA PACKAGE (DIAGNOSTIC ACCURACY) ============
  {
    id: "auditc",
    name: "AUDIT-C for Alcohol Screening",
    description: "14 studies of AUDIT-C screening test for unhealthy alcohol use",
    source: "mada",
    citation: "Kriston, L., et al. (2008). Meta-analysis: are 3 questions enough to detect unhealthy alcohol use? Ann Intern Med, 149(12), 879-888.",
    type: "diagnostic",
    effectMeasure: "DOR",
    relevance: "classic",
    data: [
      { study: "Dawson (2005)", TP: 371, FP: 176, FN: 10, TN: 158 },
      { study: "Gache (2005)", TP: 182, FP: 42, FN: 20, TN: 35 },
      { study: "Gordon (2001)", TP: 168, FP: 89, FN: 12, TN: 95 },
      { study: "Rumpf (2002)", TP: 76, FP: 23, FN: 10, TN: 25 },
      { study: "Bush (1998)", TP: 134, FP: 37, FN: 8, TN: 27 },
      { study: "Aertgeerts (2000)", TP: 72, FP: 9, FN: 16, TN: 102 },
      { study: "Bradley (2003)", TP: 167, FP: 79, FN: 8, TN: 86 },
      { study: "Chung (2000)", TP: 35, FP: 6, FN: 4, TN: 37 },
      { study: "Frank (2008)", TP: 53, FP: 8, FN: 6, TN: 20 },
      { study: "Seale (2006)", TP: 157, FP: 186, FN: 35, TN: 330 },
      { study: "Selin (2006)", TP: 153, FP: 13, FN: 11, TN: 22 },
      { study: "Thomas (2003)", TP: 47, FP: 11, FN: 2, TN: 23 },
      { study: "Wu (2008)", TP: 180, FP: 24, FN: 32, TN: 20 },
      { study: "Aalto (2006)", TP: 78, FP: 17, FN: 6, TN: 25 }
    ]
  },
  {
    id: "dementia",
    name: "MMSE for Dementia Screening",
    description: "15 studies of Mini-Mental State Examination for dementia screening",
    source: "mada",
    citation: "Mitchell, A. J. (2009). A meta-analysis of the accuracy of the mini-mental state examination in the detection of dementia and mild cognitive impairment. J Psychiatr Res, 43(4), 411-431.",
    type: "diagnostic",
    effectMeasure: "DOR",
    relevance: "classic",
    data: [
      { study: "Anthony (1982)", TP: 21, FP: 5, FN: 4, TN: 169 },
      { study: "Davous (1987)", TP: 25, FP: 3, FN: 1, TN: 71 },
      { study: "Feher (1992)", TP: 73, FP: 0, FN: 7, TN: 57 },
      { study: "Galasko (1990)", TP: 26, FP: 0, FN: 2, TN: 30 },
      { study: "Giordani (1990)", TP: 16, FP: 1, FN: 2, TN: 30 },
      { study: "Harrell (2000)", TP: 37, FP: 0, FN: 2, TN: 30 },
      { study: "Holzer (1984)", TP: 14, FP: 2, FN: 1, TN: 33 },
      { study: "Ihara (2013)", TP: 50, FP: 10, FN: 4, TN: 136 },
      { study: "Kahle-Wrobleski (2007)", TP: 54, FP: 2, FN: 3, TN: 41 },
      { study: "Lim (2003)", TP: 19, FP: 0, FN: 6, TN: 55 },
      { study: "McDowell (1997)", TP: 15, FP: 7, FN: 3, TN: 185 },
      { study: "O'Connor (1989)", TP: 85, FP: 23, FN: 11, TN: 2073 },
      { study: "Roccaforte (1992)", TP: 12, FP: 3, FN: 2, TN: 93 },
      { study: "Tangalos (1996)", TP: 107, FP: 20, FN: 52, TN: 2081 },
      { study: "Waite (1998)", TP: 25, FP: 12, FN: 6, TN: 585 }
    ]
  },
  {
    id: "troponin",
    name: "High-Sensitivity Troponin for MI",
    description: "17 studies of high-sensitivity troponin for acute MI diagnosis",
    source: "literature",
    citation: "Lipinski, M. J., et al. (2015). Meta-analysis of high-sensitivity troponin assays for acute coronary syndromes. Circ Cardiovasc Qual Outcomes, 8(1), 95-106.",
    type: "diagnostic",
    effectMeasure: "DOR",
    relevance: "acs",
    data: [
      { study: "Body (2011)", TP: 78, FP: 28, FN: 2, TN: 239 },
      { study: "Christ (2010)", TP: 110, FP: 42, FN: 4, TN: 182 },
      { study: "Aldous (2011)", TP: 76, FP: 56, FN: 8, TN: 198 },
      { study: "Freund (2011)", TP: 24, FP: 22, FN: 1, TN: 270 },
      { study: "Keller (2011)", TP: 145, FP: 95, FN: 5, TN: 755 },
      { study: "Melki (2011)", TP: 25, FP: 35, FN: 0, TN: 182 },
      { study: "Reiter (2011)", TP: 90, FP: 78, FN: 6, TN: 416 },
      { study: "Weber (2011)", TP: 85, FP: 55, FN: 3, TN: 208 },
      { study: "Bhardwaj (2011)", TP: 48, FP: 62, FN: 2, TN: 215 },
      { study: "Diercks (2012)", TP: 33, FP: 45, FN: 2, TN: 166 },
      { study: "Eggers (2012)", TP: 62, FP: 68, FN: 2, TN: 280 },
      { study: "Kavsak (2012)", TP: 22, FP: 42, FN: 1, TN: 223 },
      { study: "Lotze (2011)", TP: 35, FP: 28, FN: 1, TN: 118 },
      { study: "Pracon (2012)", TP: 45, FP: 15, FN: 2, TN: 88 },
      { study: "Santalo (2013)", TP: 65, FP: 88, FN: 5, TN: 242 },
      { study: "Schreiber (2012)", TP: 18, FP: 45, FN: 0, TN: 186 },
      { study: "Thelin (2012)", TP: 28, FP: 38, FN: 1, TN: 145 }
    ]
  },

  // ============ ACS-SPECIFIC DATASETS ============
  {
    id: "dapt_duration",
    name: "DAPT Duration after ACS/PCI",
    description: "10 RCTs comparing short (3-6 months) vs standard (12 months) DAPT",
    source: "literature",
    citation: "Palmerini, T., et al. (2017). Optimal duration of dual antiplatelet therapy after DES. JACC, 69(16), 1970-1981.",
    type: "network",
    effectMeasure: "HR",
    relevance: "acs",
    data: [
      { study: "EXCELLENT", treat1: "6mo", treat2: "12mo", events1: 23, n1: 722, events0: 21, n0: 721, year: 2012 },
      { study: "PRODIGY", treat1: "6mo", treat2: "24mo", events1: 30, n1: 983, events0: 46, n0: 987, year: 2012 },
      { study: "RESET", treat1: "3mo", treat2: "12mo", events1: 5, n1: 1059, events0: 4, n0: 1058, year: 2012 },
      { study: "OPTIMIZE", treat1: "3mo", treat2: "12mo", events1: 14, n1: 1563, events0: 12, n0: 1556, year: 2013 },
      { study: "SECURITY", treat1: "6mo", treat2: "12mo", events1: 12, n1: 682, events0: 10, n0: 717, year: 2014 },
      { study: "ISAR-SAFE", treat1: "6mo", treat2: "12mo", events1: 6, n1: 1997, events0: 11, n0: 2003, year: 2015 },
      { study: "ITALIC", treat1: "6mo", treat2: "24mo", events1: 16, n1: 926, events0: 17, n0: 924, year: 2015 },
      { study: "IVUS-XPL", treat1: "6mo", treat2: "12mo", events1: 8, n1: 699, events0: 11, n0: 701, year: 2016 },
      { study: "NIPPON", treat1: "6mo", treat2: "18mo", events1: 18, n1: 1678, events0: 20, n0: 1678, year: 2017 },
      { study: "STOPDAPT-2", treat1: "1mo", treat2: "12mo", events1: 15, n1: 1523, events0: 29, n0: 1522, year: 2019 }
    ],
    treatmentLabels: { "1mo": "1 month", "3mo": "3 months", "6mo": "6 months", "12mo": "12 months", "18mo": "18 months", "24mo": "24 months" }
  },
  {
    id: "ticagrelor_prasugrel_clop",
    name: "P2Y12 Inhibitors in ACS",
    description: "Network comparing ticagrelor, prasugrel, and clopidogrel in ACS",
    source: "literature",
    citation: "Navarese, E. P., et al. (2015). Comparative efficacy and safety of P2Y12 inhibitors. BMJ, 351, h5552.",
    type: "network",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "PLATO", treat1: "ticagrelor", treat2: "clopidogrel", events1: 569, n1: 9333, events0: 668, n0: 9291, year: 2009 },
      { study: "TRITON-TIMI 38", treat1: "prasugrel", treat2: "clopidogrel", events1: 643, n1: 6813, events0: 781, n0: 6795, year: 2007 },
      { study: "ISAR-REACT 5", treat1: "prasugrel", treat2: "ticagrelor", events1: 184, n1: 2006, events0: 282, n0: 2012, year: 2019 },
      { study: "PRAGUE-18", treat1: "prasugrel", treat2: "ticagrelor", events1: 26, n1: 635, events0: 29, n0: 639, year: 2018 },
      { study: "ACCOAST", treat1: "prasugrel", treat2: "clopidogrel", events1: 64, n1: 2037, events0: 73, n0: 2041, year: 2013 },
      { study: "ATLANTIC", treat1: "ticagrelor", treat2: "clopidogrel", events1: 42, n1: 909, events0: 48, n0: 933, year: 2014 }
    ],
    treatmentLabels: { ticagrelor: "Ticagrelor", prasugrel: "Prasugrel", clopidogrel: "Clopidogrel" }
  },
  {
    id: "complete_revasc",
    name: "Complete vs Culprit-Only Revascularization",
    description: "6 RCTs comparing complete revascularization vs culprit-only PCI in STEMI with MVD",
    source: "literature",
    citation: "Mehta, S. R., et al. (2019). Complete Revascularization with Multivessel PCI for MI. NEJM, 381(15), 1411-1421.",
    type: "pairwise",
    effectMeasure: "HR",
    relevance: "acs",
    data: [
      { study: "PRAMI", year: 2013, events1: 21, n1: 234, events0: 53, n0: 231, hr: 0.35, ci_low: 0.21, ci_high: 0.58 },
      { study: "CvLPRIT", year: 2015, events1: 10, n1: 150, events0: 23, n0: 146, hr: 0.45, ci_low: 0.24, ci_high: 0.84 },
      { study: "DANAMI-3-PRIMULTI", year: 2015, events1: 40, n1: 314, events0: 68, n0: 313, hr: 0.56, ci_low: 0.38, ci_high: 0.83 },
      { study: "Compare-Acute", year: 2017, events1: 23, n1: 295, events0: 41, n0: 590, hr: 0.35, ci_low: 0.22, ci_high: 0.55 },
      { study: "COMPLETE", year: 2019, events1: 158, n1: 2016, events0: 213, n0: 2025, hr: 0.74, ci_low: 0.60, ci_high: 0.91 },
      { study: "FULL REVASC", year: 2023, events1: 78, n1: 717, events0: 88, n0: 718, hr: 0.89, ci_low: 0.66, ci_high: 1.20 }
    ]
  },
  {
    id: "colchicine_cv",
    name: "Colchicine for Cardiovascular Prevention",
    description: "4 RCTs of colchicine for cardiovascular event reduction",
    source: "literature",
    citation: "Samuel, M., et al. (2021). Colchicine for secondary prevention of cardiovascular disease. Circulation, 144(8), 611-622.",
    type: "pairwise",
    effectMeasure: "HR",
    relevance: "acs",
    data: [
      { study: "COLCOT", year: 2019, events1: 131, n1: 2366, events0: 170, n0: 2379, hr: 0.77, ci_low: 0.61, ci_high: 0.96, outcome: "MACE" },
      { study: "LoDoCo2", year: 2020, events1: 187, n1: 2762, events0: 264, n0: 2760, hr: 0.69, ci_low: 0.57, ci_high: 0.83, outcome: "MACE" },
      { study: "COPS", year: 2020, events1: 24, n1: 396, events0: 38, n0: 399, hr: 0.62, ci_low: 0.37, ci_high: 1.04, outcome: "MACE" },
      { study: "CLEAR SYNERGY", year: 2023, events1: 202, n1: 3528, events0: 223, n0: 3534, hr: 0.91, ci_low: 0.75, ci_high: 1.10, outcome: "MACE" }
    ]
  },
  {
    id: "sglt2_hf",
    name: "SGLT2 Inhibitors in Heart Failure",
    description: "5 RCTs of SGLT2 inhibitors in heart failure (HFrEF/HFpEF)",
    source: "literature",
    citation: "Vaduganathan, M., et al. (2022). SGLT2 inhibitors in heart failure: comprehensive meta-analysis. Lancet, 400(10354), 757-767.",
    type: "pairwise",
    effectMeasure: "HR",
    relevance: "cardiovascular",
    data: [
      { study: "DAPA-HF", year: 2019, events1: 386, n1: 2373, events0: 502, n0: 2371, hr: 0.74, ci_low: 0.65, ci_high: 0.85, population: "HFrEF" },
      { study: "EMPEROR-Reduced", year: 2020, events1: 361, n1: 1863, events0: 462, n0: 1867, hr: 0.75, ci_low: 0.65, ci_high: 0.86, population: "HFrEF" },
      { study: "EMPEROR-Preserved", year: 2021, events1: 415, n1: 2997, events0: 511, n0: 2991, hr: 0.79, ci_low: 0.69, ci_high: 0.90, population: "HFpEF" },
      { study: "DELIVER", year: 2022, events1: 512, n1: 3131, events0: 610, n0: 3132, hr: 0.82, ci_low: 0.73, ci_high: 0.92, population: "HFpEF" },
      { study: "SOLOIST-WHF", year: 2021, events1: 245, n1: 608, events0: 355, n0: 614, hr: 0.67, ci_low: 0.52, ci_high: 0.85, population: "T2DM+WHF" }
    ]
  },
  {
    id: "pcsk9_acs",
    name: "PCSK9 Inhibitors after ACS",
    description: "Key trials of PCSK9 inhibitors for CV outcomes",
    source: "literature",
    citation: "Sabatine, M. S., et al. (2017). PCSK9 Inhibitors: From LDL Lowering to Major CV Outcomes. JACC, 69(11), 1517-1527.",
    type: "pairwise",
    effectMeasure: "HR",
    relevance: "acs",
    data: [
      { study: "FOURIER", year: 2017, events1: 1344, n1: 13784, events0: 1563, n0: 13780, hr: 0.85, ci_low: 0.79, ci_high: 0.92, drug: "Evolocumab" },
      { study: "ODYSSEY Outcomes", year: 2018, events1: 903, n1: 9462, events0: 1052, n0: 9462, hr: 0.85, ci_low: 0.78, ci_high: 0.93, drug: "Alirocumab" },
      { study: "EVOPACS", year: 2019, events1: 6, n1: 155, events0: 16, n0: 153, hr: 0.38, ci_low: 0.15, ci_high: 0.98, drug: "Evolocumab" }
    ]
  },

  // ============ ADDITIONAL METAFOR DATASETS ============
  {
    id: "raudenbush1985",
    name: "Teacher Expectancy Effects",
    description: "19 studies of teacher expectancy effects on student IQ",
    source: "metafor",
    citation: "Raudenbush, S. W. (1984). Magnitude of teacher expectancy effects on pupil IQ. J Educ Psych, 76(1), 85-97.",
    type: "continuous",
    effectMeasure: "SMD",
    relevance: "classic",
    data: [
      { study: "Rosenthal (1968)", year: 1968, yi: 0.03, vi: 0.0147, weeks: 2, setting: "regular" },
      { study: "Conn (1968)", year: 1968, yi: 0.12, vi: 0.0196, weeks: 21, setting: "regular" },
      { study: "Jose (1969)", year: 1969, yi: -0.14, vi: 0.0400, weeks: 10, setting: "special" },
      { study: "Pellegrini (1969)", year: 1969, yi: 1.18, vi: 0.1176, weeks: 12, setting: "regular" },
      { study: "Pellegrini (1970)", year: 1970, yi: 0.26, vi: 0.0294, weeks: 10, setting: "regular" },
      { study: "Evans (1969)", year: 1969, yi: -0.06, vi: 0.0294, weeks: 4, setting: "regular" },
      { study: "Fielder (1970)", year: 1970, yi: -0.02, vi: 0.0196, weeks: 3, setting: "special" },
      { study: "Claiborn (1969)", year: 1969, yi: -0.32, vi: 0.0298, weeks: 6, setting: "regular" },
      { study: "Kester (1969)", year: 1969, yi: 0.27, vi: 0.0256, weeks: 3, setting: "regular" },
      { study: "Maxwell (1970)", year: 1970, yi: 0.80, vi: 0.1600, weeks: 4, setting: "special" },
      { study: "Carter (1970)", year: 1970, yi: 0.54, vi: 0.0484, weeks: 9, setting: "special" },
      { study: "Flowers (1966)", year: 1966, yi: 0.18, vi: 0.0294, weeks: 6, setting: "regular" },
      { study: "Keshock (1970)", year: 1970, yi: -0.02, vi: 0.0400, weeks: 6, setting: "special" },
      { study: "Henrikson (1970)", year: 1970, yi: 0.23, vi: 0.0476, weeks: 6, setting: "regular" },
      { study: "Fine (1972)", year: 1972, yi: -0.18, vi: 0.0324, weeks: 8, setting: "regular" },
      { study: "Grieger (1970)", year: 1970, yi: 0.09, vi: 0.0400, weeks: 2, setting: "regular" },
      { study: "Rosenthal (1971)", year: 1971, yi: -0.07, vi: 0.0225, weeks: 6, setting: "regular" },
      { study: "Fleming (1971)", year: 1971, yi: 0.02, vi: 0.0169, weeks: 5, setting: "regular" },
      { study: "Ginsburg (1970)", year: 1970, yi: 0.01, vi: 0.0324, weeks: 2, setting: "regular" }
    ]
  },
  {
    id: "dat_normand1999",
    name: "Length of Hospital Stay",
    description: "9 trials comparing new vs standard treatment for hospital stay",
    source: "metafor",
    citation: "Normand, S. L. (1999). Meta-analysis: formulating, evaluating, combining, and reporting. Stat Med, 18(3), 321-359.",
    type: "continuous",
    effectMeasure: "MD",
    relevance: "classic",
    data: [
      { study: "Study 1", m1: 55, sd1: 47, n1: 155, m2: 75, sd2: 64, n2: 156 },
      { study: "Study 2", m1: 27, sd1: 7, n1: 31, m2: 29, sd2: 4, n2: 32 },
      { study: "Study 3", m1: 6, sd1: 3, n1: 39, m2: 8, sd2: 3, n2: 37 },
      { study: "Study 4", m1: 10, sd1: 9, n1: 17, m2: 13, sd2: 8, n2: 15 },
      { study: "Study 5", m1: 12, sd1: 6, n1: 49, m2: 16, sd2: 8, n2: 46 },
      { study: "Study 6", m1: 8, sd1: 5, n1: 32, m2: 10, sd2: 5, n2: 33 },
      { study: "Study 7", m1: 32, sd1: 34, n1: 47, m2: 51, sd2: 55, n2: 49 },
      { study: "Study 8", m1: 7, sd1: 3, n1: 232, m2: 9, sd2: 4, n2: 226 },
      { study: "Study 9", m1: 6, sd1: 5, n1: 148, m2: 10, sd2: 8, n2: 151 }
    ]
  },
  {
    id: "dat_hackshaw1998",
    name: "Passive Smoking and Lung Cancer",
    description: "37 studies of environmental tobacco smoke and lung cancer",
    source: "metafor",
    citation: "Hackshaw, A. K., et al. (1997). The accumulated evidence on lung cancer and environmental tobacco smoke. BMJ, 315(7114), 980-988.",
    type: "pairwise",
    effectMeasure: "logRR",
    relevance: "classic",
    data: [
      { study: "Garfinkel (1981)", yi: 0.18, vi: 0.0144, region: "US", design: "cohort" },
      { study: "Hirayama (1984)", yi: 0.28, vi: 0.0289, region: "Asia", design: "cohort" },
      { study: "Correa (1983)", yi: 0.69, vi: 0.1521, region: "US", design: "case-control" },
      { study: "Trichopoulos (1983)", yi: 0.90, vi: 0.1024, region: "Europe", design: "case-control" },
      { study: "Buffler (1984)", yi: 0.18, vi: 0.1764, region: "US", design: "case-control" },
      { study: "Kabat (1984)", yi: -0.11, vi: 0.1089, region: "US", design: "case-control" },
      { study: "Lam (1985)", yi: 0.77, vi: 0.0961, region: "Asia", design: "case-control" },
      { study: "Wu (1985)", yi: 0.26, vi: 0.0729, region: "US", design: "case-control" },
      { study: "Garfinkel (1985)", yi: 0.12, vi: 0.0576, region: "US", design: "case-control" },
      { study: "Akiba (1986)", yi: 0.33, vi: 0.0625, region: "Asia", design: "case-control" },
      { study: "Lee (1986)", yi: 0.10, vi: 0.0729, region: "Europe", design: "case-control" },
      { study: "Koo (1987)", yi: 0.44, vi: 0.0576, region: "Asia", design: "case-control" },
      { study: "Pershagen (1987)", yi: 0.34, vi: 0.0841, region: "Europe", design: "case-control" },
      { study: "Humble (1987)", yi: 0.69, vi: 0.1024, region: "US", design: "case-control" },
      { study: "Lam (1987)", yi: 0.45, vi: 0.1156, region: "Asia", design: "case-control" },
      { study: "Gao (1987)", yi: 0.14, vi: 0.0361, region: "Asia", design: "case-control" }
    ]
  },

  // ============ CARDIOVASCULAR LANDMARK TRIALS ============
  {
    id: "ace_inhibitors_hf",
    name: "ACE Inhibitors in Heart Failure",
    description: "Landmark trials of ACE inhibitors in heart failure",
    source: "literature",
    citation: "Flather, M. D., et al. (2000). Long-term ACE-inhibitor therapy in patients with heart failure. Lancet, 355(9215), 1575-1581.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "cardiovascular",
    data: [
      { study: "CONSENSUS", year: 1987, events1: 68, n1: 127, events0: 97, n0: 126, drug: "Enalapril" },
      { study: "SOLVD-Treatment", year: 1991, events1: 452, n1: 1285, events0: 510, n0: 1284, drug: "Enalapril" },
      { study: "SOLVD-Prevention", year: 1992, events1: 313, n1: 2111, events0: 334, n0: 2117, drug: "Enalapril" },
      { study: "V-HeFT II", year: 1991, events1: 132, n1: 403, events0: 153, n0: 401, drug: "Enalapril" },
      { study: "SAVE", year: 1992, events1: 228, n1: 1115, events0: 275, n0: 1116, drug: "Captopril" },
      { study: "AIRE", year: 1993, events1: 170, n1: 1004, events0: 222, n0: 982, drug: "Ramipril" },
      { study: "TRACE", year: 1995, events1: 304, n1: 876, events0: 369, n0: 873, drug: "Trandolapril" }
    ]
  },
  {
    id: "statins_primary",
    name: "Statins for Primary Prevention",
    description: "Major trials of statins in primary prevention of CVD",
    source: "literature",
    citation: "Cholesterol Treatment Trialists' Collaboration (2012). Lancet, 380(9841), 581-590.",
    type: "pairwise",
    effectMeasure: "RR",
    relevance: "cardiovascular",
    data: [
      { study: "WOSCOPS", year: 1995, events1: 174, n1: 3302, events0: 248, n0: 3293, statin: "Pravastatin" },
      { study: "AFCAPS/TexCAPS", year: 1998, events1: 116, n1: 3304, events0: 183, n0: 3301, statin: "Lovastatin" },
      { study: "MEGA", year: 2006, events1: 66, n1: 3866, events0: 101, n0: 3966, statin: "Pravastatin" },
      { study: "JUPITER", year: 2008, events1: 142, n1: 8901, events0: 251, n0: 8901, statin: "Rosuvastatin" },
      { study: "HOPE-3", year: 2016, events1: 235, n1: 6361, events0: 304, n0: 6344, statin: "Rosuvastatin" },
      { study: "ASCOT-LLA", year: 2003, events1: 100, n1: 5168, events0: 154, n0: 5137, statin: "Atorvastatin" }
    ]
  },
  {
    id: "antihypertensives",
    name: "Antihypertensive Drug Classes",
    description: "Network meta-analysis of antihypertensive drug classes for mortality",
    source: "literature",
    citation: "Thomopoulos, C., et al. (2015). Effects of blood pressure lowering treatment. J Hypertens, 33(7), 1321-1341.",
    type: "network",
    effectMeasure: "OR",
    relevance: "cardiovascular",
    data: [
      { study: "ALLHAT", treat1: "CCB", treat2: "Diuretic", events1: 1025, n1: 9048, events0: 1074, n0: 15255, year: 2002 },
      { study: "ALLHAT", treat1: "ACEi", treat2: "Diuretic", events1: 1126, n1: 9061, events0: 1074, n0: 15255, year: 2002 },
      { study: "VALUE", treat1: "CCB", treat2: "ARB", events1: 384, n1: 7596, events0: 400, n0: 7649, year: 2004 },
      { study: "ACCOMPLISH", treat1: "ACEi+CCB", treat2: "ACEi+Diuretic", events1: 175, n1: 5744, events0: 193, n0: 5762, year: 2008 },
      { study: "LIFE", treat1: "ARB", treat2: "BB", events1: 348, n1: 4605, events0: 397, n0: 4588, year: 2002 },
      { study: "ASCOT-BPLA", treat1: "CCB+ACEi", treat2: "BB+Diuretic", events1: 738, n1: 9639, events0: 820, n0: 9618, year: 2005 }
    ],
    treatmentLabels: { CCB: "Calcium Channel Blocker", ACEi: "ACE Inhibitor", ARB: "Angiotensin Receptor Blocker", BB: "Beta Blocker", Diuretic: "Thiazide Diuretic" }
  },
  {
    id: "arb_mortality",
    name: "ARBs vs ACEi for Mortality",
    description: "Trials comparing ARBs to ACE inhibitors for all-cause mortality",
    source: "literature",
    citation: "Bangalore, S., et al. (2011). Angiotensin receptor blockers and risk of myocardial infarction. BMJ, 342, d2234.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "cardiovascular",
    data: [
      { study: "ONTARGET", year: 2008, events1: 1620, n1: 8542, events0: 1606, n0: 8576 },
      { study: "ELITE II", year: 2000, events1: 280, n1: 1578, events0: 250, n0: 1574 },
      { study: "OPTIMAAL", year: 2002, events1: 499, n1: 2744, events0: 447, n0: 2733 },
      { study: "VALIANT", year: 2003, events1: 979, n1: 4909, events0: 958, n0: 4909 },
      { study: "DETAIL", year: 2004, events1: 5, n1: 120, events0: 8, n0: 130 }
    ]
  },

  // ============ ANTICOAGULATION TRIALS ============
  {
    id: "noac_af",
    name: "NOACs vs Warfarin in AF",
    description: "Pivotal trials of novel oral anticoagulants vs warfarin in atrial fibrillation",
    source: "literature",
    citation: "Ruff, C. T., et al. (2014). Comparison of the efficacy and safety of new oral anticoagulants. Lancet, 383(9921), 955-962.",
    type: "network",
    effectMeasure: "HR",
    relevance: "cardiovascular",
    data: [
      { study: "RE-LY 110mg", treat1: "Dabigatran110", treat2: "Warfarin", events1: 182, n1: 6015, events0: 199, n0: 6022, year: 2009 },
      { study: "RE-LY 150mg", treat1: "Dabigatran150", treat2: "Warfarin", events1: 134, n1: 6076, events0: 199, n0: 6022, year: 2009 },
      { study: "ROCKET-AF", treat1: "Rivaroxaban", treat2: "Warfarin", events1: 269, n1: 7131, events0: 306, n0: 7133, year: 2011 },
      { study: "ARISTOTLE", treat1: "Apixaban", treat2: "Warfarin", events1: 212, n1: 9120, events0: 265, n0: 9081, year: 2011 },
      { study: "ENGAGE AF-TIMI 48", treat1: "Edoxaban", treat2: "Warfarin", events1: 296, n1: 7035, events0: 319, n0: 7036, year: 2013 }
    ],
    treatmentLabels: { Dabigatran110: "Dabigatran 110mg", Dabigatran150: "Dabigatran 150mg", Rivaroxaban: "Rivaroxaban", Apixaban: "Apixaban", Edoxaban: "Edoxaban", Warfarin: "Warfarin" }
  },
  {
    id: "asa_secondary",
    name: "Aspirin for Secondary Prevention",
    description: "Trials of aspirin in patients with prior vascular disease",
    source: "literature",
    citation: "Antithrombotic Trialists' Collaboration (2009). Aspirin in the primary and secondary prevention. Lancet, 373(9678), 1849-1860.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "CURE Control Arm", year: 2001, events1: 479, n1: 6303, events0: 587, n0: 6259 },
      { study: "ISIS-2 Aspirin", year: 1988, events1: 804, n1: 8587, events0: 1016, n0: 8600 },
      { study: "RISC", year: 1990, events1: 26, n1: 399, events0: 36, n0: 397 },
      { study: "VA Cooperative", year: 1983, events1: 47, n1: 625, events0: 69, n0: 641 },
      { study: "Cardiff I", year: 1974, events1: 56, n1: 615, events0: 66, n0: 609 },
      { study: "Cardiff II", year: 1979, events1: 101, n1: 832, events0: 126, n0: 850 },
      { study: "WARIS", year: 1990, events1: 82, n1: 607, events0: 123, n0: 607 }
    ]
  },

  // ============ DIABETES AND CARDIOVASCULAR ============
  {
    id: "glp1_cv",
    name: "GLP-1 Receptor Agonists CV Outcomes",
    description: "Cardiovascular outcome trials of GLP-1 receptor agonists",
    source: "literature",
    citation: "Sattar, N., et al. (2021). Cardiovascular, mortality, and kidney outcomes with GLP-1 RAs. Lancet Diabetes Endocrinol, 9(10), 653-662.",
    type: "pairwise",
    effectMeasure: "HR",
    relevance: "cardiovascular",
    data: [
      { study: "LEADER", year: 2016, events1: 608, n1: 4668, events0: 694, n0: 4672, hr: 0.87, drug: "Liraglutide" },
      { study: "SUSTAIN-6", year: 2016, events1: 108, n1: 1648, events0: 146, n0: 1649, hr: 0.74, drug: "Semaglutide" },
      { study: "EXSCEL", year: 2017, events1: 839, n1: 7356, events0: 905, n0: 7396, hr: 0.91, drug: "Exenatide" },
      { study: "Harmony Outcomes", year: 2018, events1: 338, n1: 4731, events0: 428, n0: 4732, hr: 0.78, drug: "Albiglutide" },
      { study: "REWIND", year: 2019, events1: 594, n1: 4949, events0: 663, n0: 4952, hr: 0.88, drug: "Dulaglutide" },
      { study: "PIONEER 6", year: 2019, events1: 61, n1: 1591, events0: 76, n0: 1592, hr: 0.79, drug: "Oral Semaglutide" }
    ]
  },
  {
    id: "sglt2_cv",
    name: "SGLT2 Inhibitors CV Outcomes",
    description: "Cardiovascular outcome trials of SGLT2 inhibitors",
    source: "literature",
    citation: "McGuire, D. K., et al. (2021). Association of SGLT2 inhibitors with cardiovascular and kidney outcomes. JAMA Cardiol, 6(2), 148-158.",
    type: "pairwise",
    effectMeasure: "HR",
    relevance: "cardiovascular",
    data: [
      { study: "EMPA-REG OUTCOME", year: 2015, events1: 490, n1: 4687, events0: 282, n0: 2333, hr: 0.86, drug: "Empagliflozin" },
      { study: "CANVAS Program", year: 2017, events1: 585, n1: 5795, events0: 426, n0: 4347, hr: 0.86, drug: "Canagliflozin" },
      { study: "DECLARE-TIMI 58", year: 2019, events1: 756, n1: 8582, events0: 803, n0: 8578, hr: 0.93, drug: "Dapagliflozin" },
      { study: "CREDENCE", year: 2019, events1: 217, n1: 2202, events0: 269, n0: 2199, hr: 0.80, drug: "Canagliflozin" },
      { study: "VERTIS CV", year: 2020, events1: 653, n1: 5493, events0: 327, n0: 2747, hr: 1.00, drug: "Ertugliflozin" }
    ]
  },

  // ============ DIAGNOSTIC ACCURACY DATASETS ============
  {
    id: "bnp_hf",
    name: "BNP for Heart Failure Diagnosis",
    description: "Diagnostic accuracy of BNP for acute heart failure",
    source: "literature",
    citation: "Roberts, E., et al. (2015). The diagnostic accuracy of the natriuretic peptides in heart failure. BMJ, 350, h910.",
    type: "diagnostic",
    effectMeasure: "DOR",
    relevance: "cardiovascular",
    data: [
      { study: "Breathing Not Properly", TP: 744, FP: 146, FN: 108, TN: 540, cutoff: 100 },
      { study: "PRIDE", TP: 209, FP: 24, FN: 33, TN: 333, cutoff: 100 },
      { study: "ICON", TP: 720, FP: 108, FN: 99, TN: 453, cutoff: 100 },
      { study: "Logeart (2002)", TP: 132, FP: 18, FN: 27, TN: 86, cutoff: 100 },
      { study: "Mueller (2004)", TP: 183, FP: 22, FN: 17, TN: 101, cutoff: 100 },
      { study: "Ray (2006)", TP: 138, FP: 19, FN: 18, TN: 133, cutoff: 100 },
      { study: "Alibay (2005)", TP: 71, FP: 9, FN: 8, TN: 72, cutoff: 100 },
      { study: "Chenevier (2009)", TP: 102, FP: 15, FN: 11, TN: 72, cutoff: 100 }
    ]
  },
  {
    id: "ddimer_pe",
    name: "D-dimer for Pulmonary Embolism",
    description: "Diagnostic accuracy of D-dimer for excluding pulmonary embolism",
    source: "literature",
    citation: "Crawford, F., et al. (2016). D-dimer test for excluding the diagnosis of pulmonary embolism. Cochrane Database Syst Rev, CD010864.",
    type: "diagnostic",
    effectMeasure: "DOR",
    relevance: "cardiovascular",
    data: [
      { study: "Christopher Study", TP: 28, FP: 1028, FN: 4, TN: 2206, assay: "Quantitative" },
      { study: "PIOPED II", TP: 181, FP: 379, FN: 11, TN: 166, assay: "Quantitative" },
      { study: "Kearon (2006)", TP: 71, FP: 303, FN: 3, TN: 167, assay: "Quantitative" },
      { study: "Perrier (2004)", TP: 87, FP: 423, FN: 2, TN: 453, assay: "Quantitative" },
      { study: "Wells (2001)", TP: 51, FP: 208, FN: 4, TN: 667, assay: "Qualitative" },
      { study: "Dunn (2002)", TP: 33, FP: 119, FN: 2, TN: 180, assay: "Qualitative" }
    ]
  },
  {
    id: "ctca_cad",
    name: "CT Coronary Angiography for CAD",
    description: "Diagnostic accuracy of CT coronary angiography vs invasive angiography",
    source: "literature",
    citation: "Budoff, M. J., et al. (2008). Diagnostic accuracy of 64-multidetector CT coronary angiography. JACC, 52(21), 1724-1732.",
    type: "diagnostic",
    effectMeasure: "DOR",
    relevance: "cardiovascular",
    data: [
      { study: "CORE-64", TP: 163, FP: 17, FN: 28, TN: 83, technology: "64-slice" },
      { study: "ACCURACY", TP: 171, FP: 13, FN: 12, TN: 34, technology: "64-slice" },
      { study: "Meijboom (2008)", TP: 235, FP: 15, FN: 19, TN: 91, technology: "64-slice" },
      { study: "Miller (2008)", TP: 176, FP: 8, FN: 18, TN: 89, technology: "64-slice" },
      { study: "Budoff (2008)", TP: 162, FP: 22, FN: 9, TN: 37, technology: "64-slice" },
      { study: "EVINCI", TP: 210, FP: 25, FN: 15, TN: 210, technology: "64-slice" }
    ]
  },

  // ============ DOSRESMETA DATASETS ============
  {
    id: "alcohol_rr",
    name: "Alcohol and Coronary Heart Disease",
    description: "Dose-response relationship between alcohol consumption and CHD",
    source: "dosresmeta",
    citation: "Ronksley, P. E., et al. (2011). Association of alcohol consumption with selected CVD outcomes. BMJ, 342, d671.",
    type: "continuous",
    effectMeasure: "logRR",
    relevance: "cardiovascular",
    data: [
      { study: "Mukamal (2003)", dose: 0, rr: 1.00, lci: 1.00, uci: 1.00, n: 12000, cases: 234 },
      { study: "Mukamal (2003)", dose: 5, rr: 0.82, lci: 0.68, uci: 0.98, n: 8500, cases: 156 },
      { study: "Mukamal (2003)", dose: 15, rr: 0.70, lci: 0.56, uci: 0.88, n: 5200, cases: 89 },
      { study: "Mukamal (2003)", dose: 30, rr: 0.75, lci: 0.58, uci: 0.97, n: 3100, cases: 62 },
      { study: "Rimm (1999)", dose: 0, rr: 1.00, lci: 1.00, uci: 1.00, n: 18000, cases: 456 },
      { study: "Rimm (1999)", dose: 10, rr: 0.75, lci: 0.62, uci: 0.91, n: 12000, cases: 298 },
      { study: "Rimm (1999)", dose: 25, rr: 0.68, lci: 0.54, uci: 0.86, n: 6800, cases: 145 },
      { study: "Rimm (1999)", dose: 45, rr: 0.80, lci: 0.61, uci: 1.05, n: 2500, cases: 67 }
    ]
  },
  {
    id: "coffee_cvd",
    name: "Coffee Consumption and CVD Mortality",
    description: "Dose-response meta-analysis of coffee and cardiovascular mortality",
    source: "dosresmeta",
    citation: "Crippa, A., et al. (2014). Coffee consumption and mortality from all causes, CVD, and cancer. Am J Epidemiol, 180(8), 763-775.",
    type: "continuous",
    effectMeasure: "logRR",
    relevance: "cardiovascular",
    data: [
      { study: "Freedman (2012)", dose: 0, rr: 1.00, cases: 5148, n: 90000 },
      { study: "Freedman (2012)", dose: 1, rr: 0.94, cases: 4856, n: 85000 },
      { study: "Freedman (2012)", dose: 3, rr: 0.90, cases: 3214, n: 60000 },
      { study: "Freedman (2012)", dose: 5, rr: 0.88, cases: 1845, n: 35000 },
      { study: "Lopez-Garcia (2008)", dose: 0, rr: 1.00, cases: 892, n: 20000 },
      { study: "Lopez-Garcia (2008)", dose: 2, rr: 0.89, cases: 756, n: 18000 },
      { study: "Lopez-Garcia (2008)", dose: 4, rr: 0.84, cases: 521, n: 12000 },
      { study: "Lopez-Garcia (2008)", dose: 6, rr: 0.87, cases: 312, n: 8000 }
    ]
  },

  // ============ METASENS DATASETS ============
  {
    id: "nsaids_gi",
    name: "NSAIDs and GI Complications",
    description: "18 trials of NSAIDs and gastrointestinal bleeding/perforation",
    source: "metasens",
    citation: "Trelle, S., et al. (2011). Cardiovascular safety of non-steroidal anti-inflammatory drugs. BMJ, 342, c7086.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "classic",
    data: [
      { study: "VIGOR", events1: 57, n1: 4047, events0: 25, n0: 4029 },
      { study: "CLASS", events1: 31, n1: 3987, events0: 39, n0: 3981 },
      { study: "TARGET", events1: 58, n1: 9117, events0: 111, n0: 9127 },
      { study: "MEDAL", events1: 47, n1: 17412, events0: 51, n0: 17289 },
      { study: "EDGE", events1: 12, n1: 3660, events0: 25, n0: 3641 },
      { study: "EDGE II", events1: 8, n1: 1482, events0: 14, n0: 1478 },
      { study: "GI-REASONS", events1: 23, n1: 4374, events0: 56, n0: 4376 },
      { study: "CONDOR", events1: 20, n1: 2238, events0: 81, n0: 2246 },
      { study: "PRECISION", events1: 78, n1: 8072, events0: 89, n0: 8040 }
    ]
  },

  // ============ RMETA PACKAGE DATASETS ============
  {
    id: "cochrane_oral",
    name: "Oral Contraceptives and MI",
    description: "Case-control studies of oral contraceptives and myocardial infarction",
    source: "rmeta",
    citation: "Collaborative Group on Hormonal Factors in Breast Cancer (1996). Lancet, 347(9017), 1713-1727.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "cardiovascular",
    data: [
      { study: "Mann (1975)", cases_exp: 23, cases_unexp: 107, ctrl_exp: 18, ctrl_unexp: 212 },
      { study: "Inman (1970)", cases_exp: 10, cases_unexp: 33, ctrl_exp: 5, ctrl_unexp: 48 },
      { study: "Vessey (1976)", cases_exp: 15, cases_unexp: 48, ctrl_exp: 19, ctrl_unexp: 107 },
      { study: "Jick (1978)", cases_exp: 23, cases_unexp: 32, ctrl_exp: 18, ctrl_unexp: 67 },
      { study: "Shapiro (1979)", cases_exp: 45, cases_unexp: 135, ctrl_exp: 78, ctrl_unexp: 502 },
      { study: "Rosenberg (1980)", cases_exp: 24, cases_unexp: 52, ctrl_exp: 35, ctrl_unexp: 205 }
    ]
  },

  // ============ ADDITIONAL ACS DATASETS ============
  {
    id: "thrombolysis_stemi",
    name: "Thrombolysis in STEMI",
    description: "Trials of fibrinolytic therapy in ST-elevation MI",
    source: "literature",
    citation: "Fibrinolytic Therapy Trialists' (FTT) Collaborative Group (1994). Lancet, 343(8893), 311-322.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "GISSI-1", year: 1986, events1: 628, n1: 5860, events0: 758, n0: 5852, agent: "SK" },
      { study: "ISIS-2 SK", year: 1988, events1: 791, n1: 8592, events0: 1029, n0: 8595, agent: "SK" },
      { study: "ASSET", year: 1988, events1: 182, n1: 2516, events0: 240, n0: 2495, agent: "tPA" },
      { study: "ISIS-3", year: 1992, events1: 2841, n1: 13780, events0: 2855, n0: 13773, agent: "SK" },
      { study: "GUSTO-I", year: 1993, events1: 2846, n1: 20251, events0: 3079, n0: 20352, agent: "tPA" },
      { study: "INJECT", year: 1995, events1: 278, n1: 3004, events0: 285, n0: 3006, agent: "rPA" },
      { study: "GUSTO-III", year: 1997, events1: 526, n1: 10138, events0: 547, n0: 10141, agent: "rPA" }
    ]
  },
  {
    id: "pci_vs_cabg",
    name: "PCI vs CABG in MVD/LM",
    description: "Trials comparing PCI to CABG in multivessel/left main disease",
    source: "literature",
    citation: "Head, S. J., et al. (2017). Coronary artery bypass grafting vs PCI for coronary revascularization. Lancet, 391(10124), 939-948.",
    type: "pairwise",
    effectMeasure: "HR",
    relevance: "acs",
    data: [
      { study: "SYNTAX", year: 2009, events1: 156, n1: 903, events0: 115, n0: 897, hr: 1.37, followup: 5 },
      { study: "FREEDOM", year: 2012, events1: 109, n1: 953, events0: 90, n0: 947, hr: 1.28, followup: 5 },
      { study: "BEST", year: 2015, events1: 46, n1: 438, events0: 39, n0: 442, hr: 1.18, followup: 4.6 },
      { study: "NOBLE", year: 2016, events1: 53, n1: 592, events0: 32, n0: 592, hr: 1.77, followup: 5 },
      { study: "EXCEL", year: 2016, events1: 121, n1: 948, events0: 119, n0: 957, hr: 1.00, followup: 5 },
      { study: "PRECOMBAT", year: 2015, events1: 35, n1: 300, events0: 30, n0: 300, hr: 1.25, followup: 5 }
    ]
  },
  {
    id: "ivus_pci",
    name: "IVUS-Guided vs Angio-Guided PCI",
    description: "Trials comparing IVUS-guided to angiography-guided PCI",
    source: "literature",
    citation: "Elgendy, I. Y., et al. (2016). Clinical outcomes with IVUS-guided stent implantation. Circ Cardiovasc Interv, 9(5), e003700.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "MUSIC", year: 1998, events1: 6, n1: 161, events0: 7, n0: 164, outcome: "MACE" },
      { study: "OPTICUS", year: 2001, events1: 42, n1: 273, events0: 48, n0: 277, outcome: "MACE" },
      { study: "AVIO", year: 2015, events1: 19, n1: 142, events0: 37, n0: 142, outcome: "MACE" },
      { study: "IVUS-XPL", year: 2015, events1: 24, n1: 700, events0: 38, n0: 700, outcome: "MACE" },
      { study: "ULTIMATE", year: 2018, events1: 26, n1: 724, events0: 46, n0: 724, outcome: "MACE" },
      { study: "ADAPT-DES", year: 2014, events1: 298, n1: 3349, events0: 401, n0: 5234, outcome: "MACE" }
    ]
  },
  {
    id: "radial_vs_femoral",
    name: "Radial vs Femoral Access PCI",
    description: "Trials comparing radial to femoral arterial access for PCI",
    source: "literature",
    citation: "Ferrante, G., et al. (2016). Radial versus femoral access for coronary interventions. JACC Cardiovasc Interv, 9(14), 1419-1434.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "RIVAL", year: 2011, events1: 57, n1: 3507, events0: 85, n0: 3514, outcome: "Death/MI/Stroke" },
      { study: "MATRIX", year: 2015, events1: 193, n1: 4197, events0: 224, n0: 4207, outcome: "MACE" },
      { study: "RIFLE-STEACS", year: 2012, events1: 42, n1: 500, events0: 66, n0: 501, outcome: "NACE" },
      { study: "STEMI-RADIAL", year: 2014, events1: 13, n1: 348, events0: 23, n0: 359, outcome: "NACE" },
      { study: "SAFE-PCI", year: 2013, events1: 16, n1: 1024, events0: 18, n0: 1022, outcome: "Bleeding" }
    ]
  },
  {
    id: "high_intensity_statin",
    name: "High vs Moderate Intensity Statin",
    description: "Trials comparing high-intensity to moderate-intensity statin therapy",
    source: "literature",
    citation: "Cannon, C. P., et al. (2015). Intensive versus moderate lipid lowering with statins after ACS. NEJM, 350(15), 1495-1504.",
    type: "pairwise",
    effectMeasure: "HR",
    relevance: "acs",
    data: [
      { study: "PROVE IT-TIMI 22", year: 2004, events1: 147, n1: 2099, events0: 172, n0: 2063, hr: 0.84 },
      { study: "A to Z", year: 2004, events1: 205, n1: 2265, events0: 235, n0: 2232, hr: 0.89 },
      { study: "TNT", year: 2005, events1: 434, n1: 4995, events0: 548, n0: 5006, hr: 0.78 },
      { study: "IDEAL", year: 2005, events1: 411, n1: 4439, events0: 463, n0: 4449, hr: 0.89 },
      { study: "SEARCH", year: 2010, events1: 1477, n1: 6031, events0: 1553, n0: 6033, hr: 0.94 }
    ]
  },
  {
    id: "clopidogrel_ppi",
    name: "Clopidogrel-PPI Interaction",
    description: "Studies examining clopidogrel-proton pump inhibitor interaction",
    source: "literature",
    citation: "Bundhun, P. K., et al. (2017). Impact of PPI on platelet inhibition with clopidogrel. Heart, 103(13), 1005-1011.",
    type: "pairwise",
    effectMeasure: "OR",
    relevance: "acs",
    data: [
      { study: "Ho (2009)", events1: 615, n1: 5244, events0: 1561, n0: 8028, outcome: "MACE" },
      { study: "Juurlink (2009)", events1: 734, n1: 5064, events0: 2057, n0: 8028, outcome: "MI" },
      { study: "Rassen (2009)", events1: 482, n1: 7593, events0: 1156, n0: 11116, outcome: "MI/Stroke" },
      { study: "Ray (2010)", events1: 166, n1: 7849, events0: 310, n0: 12405, outcome: "MI" },
      { study: "COGENT", events1: 51, n1: 1876, events0: 56, n0: 1885, outcome: "CV events" },
      { study: "Douglas (2012)", events1: 987, n1: 12439, events0: 2118, n0: 12439, outcome: "MI/Death" }
    ]
  }
];

/**
 * Convert dataset to standard comparison format for analysis
 */
export function datasetToComparisons(dataset) {
  const comparisons = [];

  if (dataset.type === "pairwise") {
    dataset.data.forEach((study, idx) => {
      let e1, n1, e0, n0;

      // Handle different field naming conventions
      if ('tpos' in study) {
        // BCG format
        e1 = study.tpos; n1 = study.tpos + study.tneg;
        e0 = study.cpos; n0 = study.cpos + study.cneg;
      } else if ('eventE' in study) {
        // meta package format
        e1 = study.eventE; n1 = study.nE;
        e0 = study.eventC; n0 = study.nC;
      } else if ('events1' in study) {
        e1 = study.events1; n1 = study.n1;
        e0 = study.events0 || study.events0; n0 = study.n0 || study.n2;
      } else if ('ai' in study) {
        // Aspirin format
        e1 = study.ai; n1 = study.n1i;
        e0 = study.ci; n0 = study.n2i;
      } else if ('d1' in study) {
        e1 = study.d1; n1 = study.n1;
        e0 = study.d0; n0 = study.n0;
      } else if ('m1' in study) {
        // Continuous outcome
        comparisons.push({
          id: `${dataset.id}_${idx}`,
          study: study.study,
          year: study.year,
          type: "continuous",
          m1: study.m1, sd1: study.sd1, n1: study.n1,
          m0: study.m2, sd0: study.sd2, n0: study.n2
        });
        return;
      }

      if (e1 !== undefined) {
        comparisons.push({
          id: `${dataset.id}_${idx}`,
          study: study.study,
          year: study.year,
          type: "binary",
          e1, n1, e0, n0,
          hr: study.hr,
          ci_low: study.ci_low,
          ci_high: study.ci_high
        });
      }
    });
  } else if (dataset.type === "network") {
    dataset.data.forEach((study, idx) => {
      const comp = {
        id: `${dataset.id}_${idx}`,
        study: study.study,
        treat1: study.treat1,
        treat2: study.treat2,
        year: study.year
      };

      if ('TE' in study) {
        comp.effect = study.TE;
        comp.se = study.seTE;
        comp.n1 = study.n1;
        comp.n2 = study.n2;
      } else if ('event1' in study) {
        comp.e1 = study.event1;
        comp.n1 = study.n1;
        comp.e0 = study.event2;
        comp.n0 = study.n2;
      } else if ('events1' in study) {
        comp.e1 = study.events1;
        comp.n1 = study.n1;
        comp.e0 = study.events0;
        comp.n0 = study.n0;
      }

      comparisons.push(comp);
    });
  } else if (dataset.type === "diagnostic") {
    dataset.data.forEach((study, idx) => {
      comparisons.push({
        id: `${dataset.id}_${idx}`,
        study: study.study,
        type: "diagnostic",
        TP: study.TP,
        FP: study.FP,
        FN: study.FN,
        TN: study.TN,
        sensitivity: study.TP / (study.TP + study.FN),
        specificity: study.TN / (study.TN + study.FP)
      });
    });
  } else if (dataset.type === "continuous") {
    dataset.data.forEach((study, idx) => {
      comparisons.push({
        id: `${dataset.id}_${idx}`,
        study: study.study,
        year: study.year,
        type: "continuous",
        m1: study.m1, sd1: study.sd1, n1: study.n1,
        m0: study.m2, sd0: study.sd2, n0: study.n2
      });
    });
  }

  return comparisons;
}

/**
 * Get datasets filtered by relevance
 */
export function getDatasetsByRelevance(relevance) {
  if (!relevance || relevance === "all") return DATASETS;
  return DATASETS.filter(d => d.relevance === relevance);
}

/**
 * Get datasets by source package
 */
export function getDatasetsBySource(source) {
  return DATASETS.filter(d => d.source === source);
}

/**
 * Get datasets by type
 */
export function getDatasetsByType(type) {
  return DATASETS.filter(d => d.type === type);
}

/**
 * Search datasets by name or description
 */
export function searchDatasets(query) {
  const q = query.toLowerCase();
  return DATASETS.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.description.toLowerCase().includes(q) ||
    d.citation.toLowerCase().includes(q)
  );
}

/**
 * Import dataset from Zenodo DOI
 */
export async function importFromZenodo(doi) {
  const apiUrl = `https://zenodo.org/api/records/${doi.replace('10.5281/zenodo.', '')}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Zenodo API error: ${response.status}`);

    const record = await response.json();

    // Find CSV or JSON files
    const dataFiles = record.files.filter(f =>
      f.key.endsWith('.csv') || f.key.endsWith('.json')
    );

    return {
      id: `zenodo_${record.id}`,
      name: record.metadata.title,
      description: record.metadata.description || '',
      citation: record.metadata.doi,
      source: "zenodo",
      files: dataFiles.map(f => ({
        name: f.key,
        url: f.links.self,
        size: f.size
      }))
    };
  } catch (error) {
    console.error('Zenodo import error:', error);
    throw error;
  }
}

/**
 * Import dataset from GitHub raw URL
 */
export async function importFromGitHub(rawUrl) {
  try {
    const response = await fetch(rawUrl);
    if (!response.ok) throw new Error(`GitHub fetch error: ${response.status}`);

    const text = await response.text();

    if (rawUrl.endsWith('.json')) {
      return JSON.parse(text);
    } else if (rawUrl.endsWith('.csv')) {
      return parseCSV(text);
    }

    throw new Error('Unsupported file format');
  } catch (error) {
    console.error('GitHub import error:', error);
    throw error;
  }
}

/**
 * Parse CSV text to array of objects
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};

    headers.forEach((header, idx) => {
      const val = values[idx];
      // Try to parse as number
      const num = parseFloat(val);
      row[header] = isNaN(num) ? val : num;
    });

    data.push(row);
  }

  return data;
}

/**
 * Export dataset to CSV format
 */
export function exportToCSV(dataset) {
  if (!dataset.data || dataset.data.length === 0) return '';

  const headers = Object.keys(dataset.data[0]);
  const lines = [headers.join(',')];

  dataset.data.forEach(row => {
    const values = headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return val;
    });
    lines.push(values.join(','));
  });

  return lines.join('\n');
}

/**
 * Dataset summary statistics
 */
export function getDatasetSummary(dataset) {
  const n = dataset.data.length;
  let totalN = 0;
  let minYear = Infinity;
  let maxYear = -Infinity;

  dataset.data.forEach(study => {
    if (study.n1) totalN += study.n1;
    if (study.n0 || study.n2) totalN += (study.n0 || study.n2);
    if (study.year) {
      minYear = Math.min(minYear, study.year);
      maxYear = Math.max(maxYear, study.year);
    }
  });

  return {
    studies: n,
    totalParticipants: totalN || null,
    yearRange: minYear !== Infinity ? `${minYear}-${maxYear}` : null,
    type: dataset.type,
    effectMeasure: dataset.effectMeasure
  };
}
