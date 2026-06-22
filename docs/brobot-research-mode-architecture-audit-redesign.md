# BroBot Research Mode Architecture Audit & Redesign

## Executive Recommendation

Research Mode should become a workflow router, not a single prompt preset.

The current BroBot stack already has useful foundations: mode detection, structured output parsing, Read Next retrieval, PubMed lookup, OpenAlex citation counts, journal/type scoring, topic guards, source verification, and analytics. The main gap is that the research user journey is still treated like one generic chat mode. A surgeon asking for one citation, a fellow building a literature review, and a resident critiquing a methods section need different search depth, evidence weighting, context assembly, and output templates.

Build a next-generation Research Mode around eight internal submodes:

1. Reference Finder
2. Manuscript Reviewer
3. Literature Review Builder
4. Evidence Synthesis
5. Journal Scout
6. Systematic Review Assistant
7. Statistical Reviewer
8. Research Planning Mode

This design intentionally avoids curated libraries, manually authored knowledge bases, custom textbooks, editorial pipelines, and static article databases. The system should rely on high-quality retrieval, query planning, citation validation, context assembly, structured prompting, and user intent detection.

## Current-State Audit

### What Exists Today

Observed architecture:

- Main chat generation lives in `src/app/api/brobot/chat/route.ts`.
- Mode, depth, training level, output schemas, and response parsing live in `src/lib/brobot/chat`.
- Research mode currently has a compact prompt instruction: concise interpretation, evidence hierarchy, limitations, and citations only if retrieval exists.
- Intent classification can identify `research` and broad subintents such as `evidence_critique`, but it does not classify research workflows into specialized submodes.
- Read Next retrieval lives in `src/lib/brobot/reading`.
- PubMed retrieval uses E-utilities search, summary, and abstract fetch.
- Live reading retrieval ranks by topic relevance, article type, journal quality, citation count, and recency or landmark signal.
- Citation counts are fetched from OpenAlex when available.
- PubMed results are verified against topic terms before recommendation.
- A trusted-web fallback exists when PubMed retrieval fails.

### Core Limitation

BroBot has a general research answer mode plus an adjacent reading recommendation engine. It does not yet have a research-grade retrieval-to-answer pipeline where every citation-bearing statement is traceable to retrieved metadata and evidence snippets.

## Part 1: Likely Weaknesses In Generic AI Research Mode

### 1. Reference Quality Is Inconsistent

Why it occurs:

- Generic research modes optimize semantic answer relevance, not evidence hierarchy.
- They often treat a small retrospective series, a review, a registry study, and a meta-analysis as interchangeable.
- Search is often one-shot and does not distinguish landmark discovery from citation support.

Impact:

- Users may cite weak or tangential papers.
- Manuscripts become vulnerable to reviewer criticism.
- Senior surgeons lose trust quickly if the chosen references are not the obvious high-signal papers.

Redesign:

- Classify the research task before search.
- Use submode-specific retrieval profiles: precision-first for Reference Finder, recall-first for Literature Review Builder, citation-weighted for Journal Scout.
- Score every paper with explicit evidence components: relevance, study design, journal tier, citation signal, recency, orthopaedic subspecialty fit, and claim support.

### 2. Hallucinated Citations

Why it occurs:

- LLMs can generate plausible titles, authors, journals, years, and DOIs from memory-like patterns.
- Citation formatting is easier than citation validation.
- The answer prompt may ask for references before retrieval has supplied verified metadata.

Impact:

- False citations can enter manuscripts.
- Users waste time chasing nonexistent papers.
- Clinical and academic credibility is damaged.

Redesign:

- Never allow generated references unless they originate from retrieved source records.
- Require PMID, DOI, or URL validation for each citation.
- Separate candidate generation, metadata validation, claim-support scoring, and final citation formatting.
- Add a citation confidence state: `verified`, `metadata_verified_claim_partial`, `metadata_verified_claim_weak`, or `unverified_do_not_cite`.

### 3. Poor Evidence Hierarchy

Why it occurs:

- Generic ranking often favors lexical match or recency.
- It does not understand when systematic reviews matter more than individual cohorts, or when a landmark original paper is still required.
- It may overvalue high citation counts that reflect age rather than current relevance.

Impact:

- Literature reviews miss the best evidence.
- Journal club answers underweight bias and overstate conclusions.
- Users may cite outdated or superseded conclusions.

Redesign:

- Make evidence hierarchy a first-class ranking feature.
- Prefer systematic reviews/meta-analyses/guidelines for broad claims.
- Prefer RCTs or high-quality comparative cohorts for intervention claims.
- Prefer landmark original studies for named classifications, surgical techniques, or historical origin claims.
- Penalize case reports unless the user asks for rare complications, technique novelty, or hypothesis generation.

### 4. Weak Specialty Awareness

Why it occurs:

- Orthopaedic terms overlap with general medicine, radiology, rehab, oncology, rheumatology, and materials science.
- Generic retrieval does not know subspecialty journal ecosystems or procedure-specific vocabulary.
- Acronyms such as ASD, PJI, THA, TSA, ACL, SCFE, and ORIF are ambiguous outside orthopaedics.

Impact:

- Search drifts into irrelevant fields.
- Spine, sports, arthroplasty, trauma, and pediatrics require different evidence norms.
- Important journals and landmark papers are missed.

Redesign:

- Detect subspecialty, anatomy, procedure, implant/device, study type, population, and outcome terms.
- Expand queries with orthopaedic synonyms and MeSH-like variants.
- Apply negative guards to prevent topic drift.
- Rank journals differently by subspecialty.

### 5. Weak Literature Synthesis

Why it occurs:

- Generic answers summarize papers independently instead of comparing methods, populations, outcomes, and bias.
- Context windows contain duplicate abstracts but not structured evidence tables.
- Conflicting results are flattened into vague “more research is needed” language.

Impact:

- Users do not get publishable synthesis.
- Review sections lack themes, controversies, and gaps.
- Clinical questions are answered with unsupported certainty.

Redesign:

- Convert retrieved papers into structured evidence cards before generation.
- Extract PICO, design, sample, intervention/exposure, comparator, outcomes, effect direction, limitations, and applicability.
- Cluster evidence into themes and contradictions.
- Generate outputs from the evidence table, not raw article lists.

### 6. Poor Manuscript Support

Why it occurs:

- Generic modes answer questions but do not behave like a reviewer or research mentor.
- They rarely check whether each paragraph has a claim, citation, logic bridge, and vulnerability.
- They do not distinguish Introduction, Methods, Results, Discussion, Abstract, Tables, and Cover Letter needs.

Impact:

- Manuscript feedback is generic.
- Missing citations and reviewer objections remain hidden.
- Users still need a senior reviewer to tell them what will get attacked.

Redesign:

- Add Manuscript Reviewer as a dedicated submode.
- Require section-specific checklists.
- Produce major concerns, minor concerns, missing citations, reviewer vulnerabilities, and suggested revisions.
- Link each critique to manuscript text spans and, when possible, retrieved literature gaps.

### 7. Inability To Support Systematic Reviews

Why it occurs:

- Systematic review work requires transparent search strategies, inclusion/exclusion criteria, screening logic, extraction plans, and risk-of-bias tools.
- Generic AI tends to skip directly to conclusions.

Impact:

- Users may create irreproducible searches.
- Screening criteria become vague.
- The assistant may imply it has reviewed all literature when it has not.

Redesign:

- Systematic Review Assistant must explicitly separate planning from evidence claims.
- Generate database-specific search strings, PICO, inclusion/exclusion criteria, screening rubric, extraction schema, and risk-of-bias plan.
- Avoid unsupported prevalence, pooled effect, or “the literature shows” claims unless retrieval and extraction have actually been completed.

### 8. Weak Statistical Review

Why it occurs:

- Generic research answers often mention p-values and sample size but miss effect sizes, confidence intervals, multiplicity, missing data, matching quality, clustering, power, and model assumptions.

Impact:

- Methods and results sections may be statistically fragile.
- Reviewers can criticize underpowered analyses or unsupported causal language.

Redesign:

- Statistical Reviewer should parse the statistical plan/results separately.
- Check for confidence intervals, effect sizes, covariate rationale, multiple comparisons, missing data, matching balance, model appropriateness, and overclaiming.
- Output should mimic a methods/statistical reviewer, not a tutor.

## Part 2: Internal Research Submodes

### 1. Reference Finder

User intent:

- Find the best citation for a specific manuscript sentence or claim.
- Replace a weak citation with a stronger one.
- Support a background, epidemiology, treatment, complication, or evidence claim.

Search strategy:

- Precision-first.
- Parse the claim into concept, population, intervention/exposure, comparator, outcome, and claim type.
- Generate 3-5 targeted queries: exact phrase, synonym expansion, MeSH-like expansion, study-design filtered query, and landmark/high-impact query.

Retrieval strategy:

- PubMed first, with Crossref/OpenAlex-style metadata validation when available.
- Prefer systematic reviews, meta-analyses, guidelines, high-impact journals, and landmark originals.
- Require title/abstract semantic support for the specific claim.

Context assembly:

- Keep 5-8 candidate papers.
- For each: citation metadata, abstract snippets supporting the claim, study design, evidence level, directness, and limitations.
- Remove duplicates by PMID/DOI/title.

Output structure:

- Best reference.
- Why it supports the statement.
- Strength of evidence.
- Caveats or wording adjustment.
- Alternative references.
- Do-not-use candidates if near matches are misleading.

Success metrics:

- Percent of recommended citations with valid PMID/DOI.
- Claim-support precision judged by user click/save/accept.
- Reduction in “find a better reference” follow-ups.

### 2. Manuscript Reviewer

User intent:

- Review an Introduction, Methods, Results, Discussion, Abstract, or full manuscript excerpt.
- Identify weaknesses before submission.

Search strategy:

- Section-aware.
- Introduction/Discussion: targeted literature gap and citation checks.
- Methods/Results: statistical and reporting guideline checks, usually less broad retrieval.

Retrieval strategy:

- Retrieve only where needed to validate claims or identify missing literature.
- Prioritize recent systematic reviews, landmark papers, and directly competing studies.

Context assembly:

- Manuscript section map.
- Claim inventory: each major claim, current citation if present, citation adequacy, unsupported assertions.
- Retrieved evidence cards for missing or vulnerable claims.

Output structure:

- Major concerns.
- Minor concerns.
- Suggested revisions.
- Missing literature.
- Potential reviewer criticisms.
- Optional rewrite snippets for vulnerable paragraphs.

Success metrics:

- Number of actionable issues per review.
- User acceptance of suggested revisions.
- Missing citation detection precision.

### 3. Literature Review Builder

User intent:

- Build a publishable review outline around a topic.
- Understand major themes, landmark papers, controversies, and evidence gaps.

Search strategy:

- Recall-first.
- Use broad topic expansion plus narrower theme queries.
- Include older landmark search and recent review search.

Retrieval strategy:

- Pull 30-80 candidate records, then compress.
- Cluster by theme, design, outcome, and subspecialty.
- Include systematic reviews/meta-analyses, landmark cohorts, RCTs when present, registry studies, and high-impact narrative reviews.

Context assembly:

- Evidence map with 8-15 high-value papers after clustering.
- Themes, controversies, consensus areas, evidence gaps, and citation anchors.
- Deduplicate overlapping systematic reviews and superseded papers.

Output structure:

- Publishable literature review outline.
- Core thesis.
- Thematic sections.
- Landmark papers.
- Evidence table.
- Controversies.
- Gaps and future directions.
- Suggested citation placement.

Success metrics:

- Coverage of landmark papers.
- User saves/exports outline.
- Reduced follow-up requests for “what am I missing?”

### 4. Evidence Synthesis

User intent:

- Answer a focused clinical or research question.
- Compare evidence and explain conflicting findings.

Search strategy:

- Balanced retrieval.
- Query around PICO plus study-design filters.
- Include one recent review/meta-analysis plus key primary studies.

Retrieval strategy:

- Retrieve 15-30 candidates.
- Select 6-12 papers representing the highest-level evidence and important conflicting results.

Context assembly:

- Structured evidence table: study, population, exposure/intervention, comparator, outcomes, finding direction, limitations.
- Conflict map: why results differ.
- Consensus and uncertainty tags.

Output structure:

- Bottom line.
- Evidence summary.
- Study-by-study comparison.
- Why findings conflict.
- Practical interpretation.
- Limitations.
- What evidence would change the conclusion.

Success metrics:

- Correctly identifies consensus vs uncertainty.
- Low hallucinated citation rate.
- High user rating for journal-club usefulness.

### 5. Journal Scout

User intent:

- Find the highest-impact literature in an area.
- Identify must-read papers and journals.

Search strategy:

- Citation-weighted retrieval with journal/subspecialty filters.
- Run broad and targeted queries, then rank by impact and relevance.

Retrieval strategy:

- Pull candidate records from PubMed and citation metadata sources.
- Rank by citation count, journal quality, design, recency, relevance, and landmark signal.

Context assembly:

- Top 10-20 papers grouped by evidence role: landmark, recent high-impact, systematic review, guideline, practice-changing study.

Output structure:

- Must-read papers.
- Why each matters.
- Journal/source signal.
- Evidence type.
- Recency vs landmark note.
- Suggested reading order.

Success metrics:

- Click/open rate.
- User saves.
- Presence of major subspecialty journals in top results.

### 6. Systematic Review Assistant

User intent:

- Plan a systematic review or meta-analysis.
- Create search strings, criteria, screening, extraction, and bias plans.

Search strategy:

- Planning-first, not conclusion-first.
- Use PICO decomposition and database-specific syntax.
- Suggest PubMed/MEDLINE, Embase-style, Cochrane-style, and trial registry query patterns when relevant.

Retrieval strategy:

- Initial scoping search to estimate feasibility and terminology.
- Do not claim final included studies unless a full screening workflow exists.

Context assembly:

- PICO, synonyms, inclusion/exclusion criteria, candidate outcomes, study designs, screening conflicts, extraction fields, risk-of-bias tools.

Output structure:

- Research question.
- PICO.
- Search strategy.
- Inclusion criteria.
- Exclusion criteria.
- Screening framework.
- Data extraction plan.
- Risk-of-bias plan.
- PRISMA-ready workflow.
- Claims the assistant cannot make yet.

Success metrics:

- User exports search strings.
- Reduced ambiguity in criteria.
- Low incidence of unsupported conclusions.

### 7. Statistical Reviewer

User intent:

- Critique statistical reporting and methods.
- Identify missing confidence intervals, effect sizes, power concerns, p-value misuse, and reporting weaknesses.

Search strategy:

- Usually no broad literature search needed.
- Retrieve reporting guidelines or methods references only if the user asks for citations or the study design requires it.

Retrieval strategy:

- Prefer STROBE/CONSORT/PRISMA/reporting guideline sources and relevant biostatistical references when citations are needed.

Context assembly:

- Extract study design, sample size, outcomes, covariates, model type, tests, effect measures, p-values, CIs, missing data, subgroup analyses.

Output structure:

- Major statistical concerns.
- Missing reporting elements.
- Model/test appropriateness.
- Interpretation risks.
- Reviewer-style comments.
- Suggested methods/results wording.

Success metrics:

- Detection of missing CIs/effect sizes.
- User acceptance of reviewer comments.
- Reduction in overclaiming language.

### 8. Research Planning Mode

User intent:

- Design a new study: TriNetX, retrospective cohort, database study, systematic review, meta-analysis, case-control, or registry study.

Search strategy:

- Scoping-first.
- Retrieve prior work to identify novelty, exposure/outcome definitions, covariates, and publication positioning.

Retrieval strategy:

- Prioritize recent related studies, database studies using similar methods, and systematic reviews defining gaps.

Context assembly:

- Existing evidence landscape.
- Feasible study designs.
- Variables and operational definitions.
- Confounder map.
- Bias threats.
- Journal positioning.

Output structure:

- Research question.
- Hypothesis.
- Study design.
- Cohort/exposure definition.
- Outcomes.
- Matching/adjustment strategy.
- Confounders.
- Statistical plan.
- Sensitivity analyses.
- Limitations.
- Publication positioning.

Success metrics:

- User exports protocol.
- Follow-through into manuscript/project planning.
- Reduced need for re-prompting around methods details.

## Part 3: Search Architecture Redesign

### Submode Search Profiles

| Submode | Retrieval Bias | Candidate Volume | Final Context | Primary Objective |
| --- | --- | ---: | ---: | --- |
| Reference Finder | Precision-first | 20-40 | 5-8 | Best support for one claim |
| Manuscript Reviewer | Targeted | 10-30 per vulnerable claim | 5-12 | Find gaps and reviewer risks |
| Literature Review Builder | Recall-first | 50-120 | 12-20 | Build thematic evidence map |
| Evidence Synthesis | Balanced | 30-60 | 8-15 | Compare evidence and explain conflict |
| Journal Scout | Citation-weighted | 50-100 | 10-20 | Identify must-read/high-impact papers |
| Systematic Review Assistant | Scoping/planning | 20-60 | Variable | Build reproducible search plan |
| Statistical Reviewer | Minimal retrieval | 0-10 | 0-5 | Critique reporting and methods |
| Research Planning | Scoping-first | 20-50 | 8-12 | Define feasible publishable study |

### Query Generation

Every research request should produce a query plan:

- User claim or question.
- Detected submode.
- Subspecialty.
- Population.
- Exposure/intervention.
- Comparator.
- Outcomes.
- Study design preferences.
- Must-have terms.
- Excluded meanings.
- Synonym expansions.

Example query variants:

- Exact phrase query.
- Synonym-expanded query.
- High evidence query: systematic review, meta-analysis, guideline, randomized trial.
- Landmark query: high citations, older seminal windows, named classifications.
- Recent query: last 5-10 years, depending on topic.
- Subspecialty journal query when source APIs permit journal filters.

### Source Prioritization

Default order:

1. PubMed/MEDLINE metadata and abstracts.
2. Crossref/OpenAlex-style citation and DOI validation.
3. Journal/publisher pages for DOI/title confirmation when available.
4. Trusted society/guideline sources when the task is guideline or practice-framework oriented.

Do not use model memory as a citation source.

### Citation Validation

Required validation gates:

- Metadata validation: PMID, DOI, title, journal, year.
- URL validation: PubMed URL or DOI URL resolves syntactically.
- Claim-support validation: title/abstract/full available snippet supports the claim.
- Evidence-type validation: publication type agrees with ranking label.
- Duplicate validation: same PMID/DOI/title merged.

Citation status labels:

- `Verified citation`: metadata valid and claim directly supported.
- `Usable with wording adjustment`: citation supports a narrower claim than user wrote.
- `Background only`: related but not direct support.
- `Do not cite for this claim`: metadata valid, claim mismatch.
- `Unverified`: not eligible for final answer.

## Part 4: Context Engineering Redesign

### Context Pipeline

1. Intent and submode detection.
2. Claim/PICO extraction.
3. Subspecialty and anatomy/procedure detection.
4. Query plan generation.
5. Multi-query retrieval.
6. Metadata validation.
7. Topic and negative-guard filtering.
8. Evidence card extraction.
9. Deduplication and clustering.
10. Submode-specific reranking.
11. Context budget allocation.
12. Structured answer generation.
13. Citation audit before response.

### Evidence Card Schema

Each retrieved paper should enter generation as a structured card:

```text
id
pmid
doi
title
authors
journal
year
publication_type
subspecialty
study_design
population
sample_size
intervention_or_exposure
comparator
outcomes
main_finding
effect_size_or_direction
limitations
claim_support_score
evidence_level_score
journal_score
citation_score
recency_score
relevance_score
abstract_support_snippets
```

### Redundancy Removal

Deduplicate by:

- PMID.
- DOI.
- Normalized title.
- Same trial reported in multiple secondary analyses.
- Multiple systematic reviews with overlapping search periods, where the newest/highest-quality review supersedes older reviews.

Keep older landmark papers when they establish:

- Classification.
- Named technique.
- Original disease description.
- Historically important management shift.

### Context Budget Rules

Reference Finder:

- 1 user claim.
- 5-8 evidence cards.
- 2-3 rejected near-misses.

Literature Review Builder:

- 12-20 cards, grouped by theme.
- 1 synthesis paragraph per theme.
- Keep controversies even if evidence is weak.

Evidence Synthesis:

- 8-15 cards.
- Prioritize comparative table over raw abstracts.
- Reserve context for conflicting studies.

Manuscript Reviewer:

- Manuscript excerpt first.
- Claim inventory second.
- Retrieved citations only for unsupported or vulnerable claims.

## Part 5: Output Templates

### Reference Finder Template

```text
Best citation
[Formatted citation with PMID/DOI]

Why this supports your sentence
- Direct support:
- Evidence type:
- Population fit:
- Outcome fit:

Strength of evidence
[Strong / moderate / limited] because ...

Suggested wording
[Use this if the claim needs narrowing.]

Alternative citations
1. ...
2. ...
3. ...

Do not cite for this exact claim
- ...
```

### Manuscript Reviewer Template

```text
Major concerns
1. ...

Minor concerns
1. ...

Missing or weak citations
| Manuscript claim | Problem | Citation need | Candidate source |

Suggested revisions
- ...

Potential reviewer criticisms
- ...

Highest-yield next edit
...
```

### Literature Review Builder Template

```text
Proposed review thesis
...

Publishable outline
1. Background and clinical relevance
2. Current evidence by theme
3. Conflicting findings
4. Evidence gaps
5. Future directions

Landmark papers
| Paper | Why it matters | Evidence role |

Evidence themes
Theme 1: ...
- Key papers:
- Consensus:
- Limitations:

Controversies
- ...

Suggested citation placement
- ...
```

### Evidence Synthesis Template

```text
Bottom line
...

Evidence table
| Study | Design | Population | Finding | Limitations |

What the evidence agrees on
- ...

Why studies conflict
- ...

Clinical/research interpretation
- ...

Confidence in conclusion
[High / moderate / low]

What would change the answer
- ...
```

### Journal Scout Template

```text
Must-read papers
1. [Citation]
   Why it matters:
   Evidence role:
   Journal/source signal:

Recent high-impact papers
- ...

Landmark older papers
- ...

Suggested reading order
1. ...
```

### Systematic Review Assistant Template

```text
Review question
...

PICO
Population:
Intervention/exposure:
Comparator:
Outcomes:

Search strategy
PubMed:
...

Inclusion criteria
- ...

Exclusion criteria
- ...

Screening framework
- ...

Data extraction plan
| Field | Definition | Notes |

Risk-of-bias plan
- ...

Claims not supported yet
- ...
```

### Statistical Reviewer Template

```text
Major statistical concerns
1. ...

Missing reporting elements
- Confidence intervals:
- Effect sizes:
- Power/sample size:
- Missing data:
- Model assumptions:

P-value interpretation
- ...

Suggested wording
- ...

Reviewer-style comments
- ...
```

### Research Planning Template

```text
Research question
...

Hypothesis
...

Study design
...

Cohort definition
...

Exposure definition
...

Outcome definitions
...

Matching/adjustment strategy
...

Confounders
...

Statistical plan
...

Sensitivity analyses
...

Publication positioning
...
```

## Part 6: Orthopaedic-Specific Optimizations

### Subspecialty Detection

Detect and tag:

- Trauma.
- Arthroplasty.
- Sports.
- Spine.
- Hand.
- Shoulder/elbow.
- Foot/ankle.
- Pediatric orthopaedics.
- Orthopaedic oncology.
- Infection.
- Deformity.

### Journal Weighting By Subspecialty

Base high-impact journals:

- JBJS.
- Clinical Orthopaedics and Related Research.
- Journal of Bone and Joint Surgery.
- Bone & Joint Journal.
- JAAOS.
- Journal of Arthroplasty.
- AJSM.
- Arthroscopy.
- Spine.
- The Spine Journal.
- Journal of Orthopaedic Trauma.
- Journal of Shoulder and Elbow Surgery.
- Journal of Hand Surgery.
- Foot & Ankle International.
- Journal of Pediatric Orthopaedics.
- KSSTA.

Adaptations:

- Arthroplasty: Journal of Arthroplasty, Bone & Joint Journal, JBJS, CORR.
- Sports: AJSM, Arthroscopy, KSSTA.
- Spine: Spine, The Spine Journal, Journal of Neurosurgery: Spine, European Spine Journal.
- Trauma: Journal of Orthopaedic Trauma, Injury, JBJS, OTA-associated work.
- Pediatrics: Journal of Pediatric Orthopaedics, JPOSNA, JBJS.
- Hand: Journal of Hand Surgery, HAND, JBJS.
- Oncology: Clinical Orthopaedics and Related Research, JBJS, Bone & Joint Journal, sarcoma journals when appropriate.

### Topic-Specific Search Adaptations

Implant studies:

- Include implant class, registry, revision, survivorship, loosening, wear, complications.
- Favor registry studies, survivorship analyses, RCTs, and high-volume cohorts.

Fracture literature:

- Include AO/OTA terms, fixation method, union, nonunion, malunion, infection, reoperation.
- Landmark and technique papers may matter even when older.

Arthroplasty outcomes:

- Include THA/TKA/TSA, revision, survivorship, PROMs, infection, instability, periprosthetic fracture.
- Registry data and large comparative cohorts often rank highly.

Sports medicine:

- Include return to sport, graft choice, retear, revision, patient-reported outcomes, randomized trials.
- Recency matters more for technique and rehab questions.

Spine:

- Disambiguate ASD as adult spinal deformity vs adjacent segment disease.
- Include fusion, pseudarthrosis, reoperation, ODI, NDI, neurologic outcomes, sagittal alignment.

Oncology:

- Distinguish orthopaedic oncology from general oncology.
- Include limb salvage, endoprosthesis, recurrence, survival, metastasis, reconstruction.

Pediatrics:

- Include age, growth remaining, physis, remodeling, long-term outcomes.
- Evidence may include retrospective cohorts and consensus where RCTs are rare.

## Part 7: Ranking Algorithms

### Core Research Paper Score

```text
score =
  0.28 * claim_or_question_relevance
  0.20 * evidence_hierarchy
  0.14 * journal_subspecialty_quality
  0.12 * study_directness
  0.10 * citation_or_landmark_signal
  0.08 * recency_fit
  0.05 * abstract_support_strength
  0.03 * accessibility
```

### Reference Finder Score

```text
score =
  0.40 * direct_claim_support
  0.22 * evidence_hierarchy
  0.12 * journal_quality
  0.10 * population_outcome_fit
  0.08 * citation_or_landmark_signal
  0.05 * recency_fit
  0.03 * metadata_completeness
```

### Literature Review Score

```text
score =
  0.24 * thematic_relevance
  0.18 * evidence_hierarchy
  0.16 * landmark_or_practice_change_value
  0.14 * journal_quality
  0.12 * recency_fit
  0.10 * diversity_contribution
  0.06 * citation_signal
```

### Journal Scout Score

```text
score =
  0.25 * citation_signal
  0.22 * journal_quality
  0.18 * relevance
  0.14 * evidence_hierarchy
  0.11 * landmark_signal
  0.10 * recency_or_current_attention
```

### Evidence Synthesis Score

```text
score =
  0.25 * PICO_fit
  0.20 * evidence_hierarchy
  0.15 * directness_of_outcome
  0.12 * method_quality
  0.10 * conflict_or_consensus_value
  0.08 * journal_quality
  0.06 * recency_fit
  0.04 * citation_signal
```

## Part 8: Citation Support Workflow

1. User submits a sentence or paragraph.
2. System extracts atomic claims.
3. User intent routes to Reference Finder or Manuscript Reviewer.
4. Query planner generates exact, expanded, high-evidence, and landmark queries.
5. Retrieval collects candidates.
6. Metadata validator verifies PMID/DOI/title/journal/year.
7. Claim-support classifier scores directness.
8. Reranker selects best citation and alternatives.
9. LLM generates answer using only verified citation cards.
10. Citation auditor checks that every listed citation appears in retrieved context.
11. UI offers copyable citation and suggested wording.

Hard rule:

- If no verified citation directly supports the claim, the assistant should say so and propose narrower wording or related background references.

## Part 9: Manuscript Review Workflow

1. Detect manuscript section type.
2. Split text into paragraph claims.
3. Identify unsupported, overbroad, redundant, or logically weak claims.
4. Detect section-specific problems:
   - Introduction: gap, novelty, citation support, funnel logic.
   - Methods: design clarity, cohort definition, outcomes, covariates, statistics.
   - Results: overinterpretation, missing denominators, missing CIs/effect sizes.
   - Discussion: first paragraph summary, comparison to literature, limitations, conclusion strength.
   - Abstract: structured completeness, unsupported conclusion, numerical consistency.
5. Retrieve literature only for claims needing support or context.
6. Generate reviewer-style feedback.
7. Provide suggested revisions and missing literature.

## Part 10: Literature Review Workflow

1. Detect topic, scope, subspecialty, and intended output.
2. Run recall-first query set.
3. Validate and deduplicate results.
4. Classify by study type and theme.
5. Select landmark papers, recent reviews, high-quality primary studies, and conflicting evidence.
6. Build evidence map.
7. Generate publishable outline.
8. Provide suggested citation placement and evidence gaps.
9. Let user continue into section drafting, but keep citations tied to retrieved sources.

## Implementation Roadmap

### Phase 1: Research Submode Router

Expected user impact: high.

Engineering complexity: low to moderate.

Speed to implement: fast.

Answer quality effect: high.

Work:

- Extend intent classifier with `researchSubmode`.
- Add deterministic fallback rules for “find citation,” “review this manuscript,” “systematic review,” “stats,” “study design,” and “literature review.”
- Add submode-specific prompt templates without changing retrieval yet.

### Phase 2: Citation-Safe Reference Finder

Expected user impact: very high.

Engineering complexity: moderate.

Speed to implement: fast to medium.

Answer quality effect: very high.

Work:

- Reuse PubMed retrieval and OpenAlex citation counts.
- Add claim extraction and claim-support scoring.
- Add verified citation output schema.
- Enforce “no retrieved source, no citation.”

### Phase 3: Evidence Card Context Layer

Expected user impact: very high.

Engineering complexity: moderate to high.

Speed to implement: medium.

Answer quality effect: very high.

Work:

- Convert PubMed records into evidence cards.
- Extract PICO/design/outcome/limitations fields from abstracts.
- Add dedupe and clustering.
- Feed compact evidence cards into generation.

### Phase 4: Manuscript Reviewer

Expected user impact: high.

Engineering complexity: moderate.

Speed to implement: medium.

Answer quality effect: high.

Work:

- Add section detector.
- Add claim inventory.
- Add reviewer-style output contract.
- Add missing citation retrieval loop.

### Phase 5: Literature Review Builder and Evidence Synthesis

Expected user impact: high.

Engineering complexity: high.

Speed to implement: medium to slow.

Answer quality effect: very high.

Work:

- Add recall-first and balanced retrieval profiles.
- Add theme clustering.
- Add evidence comparison tables.
- Add synthesis-specific citation audit.

### Phase 6: Systematic Review Assistant

Expected user impact: moderate to high.

Engineering complexity: moderate.

Speed to implement: medium.

Answer quality effect: high for research users.

Work:

- Generate PICO and search strategies.
- Add inclusion/exclusion and screening templates.
- Add extraction and risk-of-bias schemas.
- Keep outputs explicitly planning-oriented unless full retrieval/screening has occurred.

### Phase 7: Statistical Reviewer

Expected user impact: moderate.

Engineering complexity: low to moderate.

Speed to implement: fast.

Answer quality effect: high for manuscript work.

Work:

- Add statistical reporting checklist.
- Add methods/results parser.
- Add reviewer-style comments and suggested wording.
- Retrieve reporting guidelines only when citations are requested.

### Phase 8: Research UX

Expected user impact: high.

Engineering complexity: moderate.

Speed to implement: medium.

Answer quality effect: indirect but important.

Work:

- Surface Research submode chips after mode selection.
- Add “Find citation,” “Review manuscript,” “Build lit review,” “Synthesize evidence,” “Plan study,” and “Review stats” affordances.
- Let users paste manuscript text or a single claim.
- Add copy/export actions for citations, outlines, and protocols.

## Recommendation Ranking

| Recommendation | User Impact | Complexity | Speed | Answer Quality |
| --- | --- | --- | --- | --- |
| Add Research submode router | High | Low-medium | Fast | High |
| Build citation-safe Reference Finder | Very high | Medium | Fast-medium | Very high |
| Add evidence card context layer | Very high | Medium-high | Medium | Very high |
| Add claim-support citation validation | Very high | Medium | Medium | Very high |
| Add Manuscript Reviewer workflow | High | Medium | Medium | High |
| Add Literature Review Builder | High | High | Medium-slow | Very high |
| Add Evidence Synthesis workflow | High | High | Medium-slow | Very high |
| Add Systematic Review Assistant planning mode | Moderate-high | Medium | Medium | High |
| Add Statistical Reviewer | Moderate | Low-medium | Fast | High |
| Add subspecialty journal weighting | High | Low-medium | Fast | High |
| Add research UX submode chips | High | Medium | Medium | Medium-high |
| Add export/copy citation tools | Medium-high | Low | Fast | Medium |

## Product Principle

Research Mode should never pretend to have read more than it retrieved. Its value is not creating orthopaedic content from memory. Its value is converting a surgeon or researcher’s intent into the right search strategy, validating citations, assembling compact evidence context, and producing outputs that feel like a senior academic surgeon, journal reviewer, medical librarian, and methods mentor are working together.
