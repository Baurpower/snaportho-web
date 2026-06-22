# BroBot Research Mode Implementation Plan

## 1. Architecture Summary

Research Mode should ship as an internal workflow router behind the existing visible `research` mode. The UI can continue to show one Research Mode at first, while the server detects a more specific `researchSubmode`, builds a submode-specific retrieval plan, assembles verified evidence cards, and prompts the model with a strict output template.

Core rule: generated research answers may cite only retrieved and validated sources. The model can summarize, compare, critique, and suggest wording, but it cannot invent references.

Target server flow:

```text
POST /api/brobot/chat
  -> existing BroBot request validation
  -> existing mode/intent classification
  -> if effective mode !== research: current path
  -> if research:
       detectResearchSubmode()
       buildResearchQueryPlan()
       retrieve/validate sources when submode requires retrieval
       buildResearchEvidenceCards()
       buildResearchAnswerContext()
       build submode-specific prompt
       parse existing structured output
       audit citations before response
       persist researchSubmode + retrieval metadata
```

No curated content libraries, manually authored knowledge bases, static article databases, proprietary datasets, or editorial review pipelines are needed. The implementation uses live retrieval, validation, ranking, context assembly, structured prompting, and analytics.

## 2. Phase-By-Phase Implementation Plan

## Phase 1: Research Submode Router

Goal: detect the internal research workflow without changing the visible mode selector.

### Files To Modify

- `src/lib/brobot/chat/types.ts`
  - Add `BROBOT_RESEARCH_SUBMODES`.
  - Add `BroBotResearchSubmodeSchema`.
  - Add optional `researchSubmode` to `BroBotChatIntentSchema`.
  - Add optional `researchSubmode` to `BroBotChatRequestSchema` only for future quick-action hints.
- `src/lib/brobot/chat/intent-classifier.ts`
  - Update classifier contract to include `researchSubmode` when `mode` is `research`.
  - Keep deterministic routing outside the LLM as the primary path.
- `src/lib/brobot/chat/intent-expander.ts`
  - Pass through/normalize `researchSubmode`.
- `src/lib/brobot/chat/prompt-builder.ts`
  - Add research submode-specific prompt instructions.
  - Keep existing general research mode as fallback.
- `src/lib/brobot/chat/response-parser.ts`
  - If the JSON response includes `researchSubmode`, normalize it, but do not require it yet.
- `src/app/api/brobot/chat/route.ts`
  - Call the research router after intent classification.
  - Persist research submode in user/assistant message metadata and usage events.

### New Files To Create

- `src/lib/brobot/research/types.ts`
- `src/lib/brobot/research/submode-router.ts`
- `src/lib/brobot/research/index.ts`
- `src/lib/brobot/research/submode-router.test.ts`

### Type Definitions

```ts
export const BROBOT_RESEARCH_SUBMODES = [
  'reference_finder',
  'manuscript_reviewer',
  'literature_review_builder',
  'evidence_synthesis',
  'journal_scout',
  'systematic_review_assistant',
  'statistical_reviewer',
  'research_planning',
] as const;

export type BroBotResearchSubmode = typeof BROBOT_RESEARCH_SUBMODES[number];

export type ResearchSubmodeRoute = {
  submode: BroBotResearchSubmode;
  confidence: number;
  source: 'deterministic' | 'llm' | 'fallback';
  matchedRule?: string;
  signals: string[];
};
```

### Deterministic Routing Rules

Examples:

- `find a citation`, `support this claim`, `reference for this sentence`, `better citation` -> `reference_finder`
- `review my discussion`, `review introduction`, `critique my methods`, `manuscript section` -> `manuscript_reviewer`
- `literature review`, `review outline`, `background section on` -> `literature_review_builder`
- `does X increase Y`, `is X associated with Y`, `predict`, `risk factor for`, `compare evidence` -> `evidence_synthesis`
- `must-read papers`, `landmark papers`, `highest-impact`, `seminal` -> `journal_scout`
- `systematic review`, `meta-analysis plan`, `inclusion criteria`, `search strategy` -> `systematic_review_assistant`
- `stats section`, `statistical analysis`, `p-value`, `confidence interval`, `regression model`, `propensity` -> `statistical_reviewer`
- `TriNetX`, `database study`, `retrospective cohort`, `study design`, `research question`, `hypothesis` -> `research_planning`

Use LLM fallback only when deterministic confidence is below `0.65`.

### API Changes

No public API route is required in Phase 1. The existing `POST /api/brobot/chat` response can add optional metadata later, but initially the submode can remain server-side.

Recommended response addition:

```ts
researchSubmode?: BroBotResearchSubmode;
researchSubmodeConfidence?: number;
```

### Prompt Changes

Add a research prompt dispatcher:

```ts
function researchModeInstructions(input: {
  researchSubmode?: BroBotResearchSubmode;
}) { ... }
```

The fallback remains:

- concise interpretation
- evidence hierarchy
- limitations
- citations only if retrieval exists

### Retrieval Changes

None in Phase 1.

### UI Changes

None required. Preserve one visible Research Mode.

### Analytics Events

Add metadata to existing events:

- `research_submode`
- `research_submode_source`
- `research_submode_confidence`
- `research_submode_matched_rule`

Optional new event:

- `brobot_research_submode_detected`

### Tests

- `submode-router.test.ts`
  - All required routing examples.
  - Ambiguous prompt returns fallback with lower confidence.
  - Non-research modes do not get a research submode unless explicitly selected.
- Existing intent parser tests updated for optional `researchSubmode`.

### Risks And Safeguards

- Risk: LLM fallback overclassifies broad questions.
  - Safeguard: deterministic rules first, confidence threshold, fallback to `evidence_synthesis`.
- Risk: new schema breaks existing clients.
  - Safeguard: make all new fields optional.

## Phase 2: Citation-Safe Reference Finder

Goal: ship the highest-impact workflow first.

### Files To Modify

- `src/app/api/brobot/chat/route.ts`
  - If `researchSubmode === 'reference_finder'`, run retrieval before generation.
  - Add citation audit after model output.
- `src/lib/brobot/chat/prompt-builder.ts`
  - Add Reference Finder template and hard citation rules.
- `src/lib/brobot/reading/pubmed-client.ts`
  - Add support for caller-supplied query variants or search terms.
  - Consider exporting `searchPubMedByQuery(query, retmax)`.
- `src/lib/brobot/reading/citation-client.ts`
  - Reuse OpenAlex counts for candidates.
- `src/lib/brobot/reading/retrieval-engine.ts`
  - Reuse journal/type scoring where possible.
- `src/lib/brobot/reading/verifier.ts`
  - Add metadata validation helpers usable from research.

### New Files To Create

- `src/lib/brobot/research/claim-extractor.ts`
- `src/lib/brobot/research/query-planner.ts`
- `src/lib/brobot/research/reference-finder.ts`
- `src/lib/brobot/research/citation-validator.ts`
- `src/lib/brobot/research/citation-auditor.ts`
- `src/lib/brobot/research/reference-finder.test.ts`
- `src/lib/brobot/research/citation-validator.test.ts`

### Type Definitions

```ts
export type CitationConfidence =
  | 'verified'
  | 'usable_with_wording_adjustment'
  | 'background_only'
  | 'do_not_cite'
  | 'unverified';

export type ResearchCitationCandidate = {
  id: string;
  pmid?: string;
  doi?: string;
  title: string;
  authors?: string[];
  journal?: string;
  year?: number;
  publicationType?: string[];
  abstractSnippet?: string;
  claimSupportScore: number;
  evidenceLevelScore: number;
  journalScore: number;
  citationScore?: number;
  confidence: CitationConfidence;
  supportExplanation: string;
};

export type ReferenceFinderResult = {
  claim: string;
  bestCitation?: ResearchCitationCandidate;
  alternatives: ResearchCitationCandidate[];
  rejected: ResearchCitationCandidate[];
  queryPlan: ResearchQueryPlan;
  citationPolicy: 'retrieved_verified_only';
};
```

### API Changes

Optional response metadata:

```ts
research?: {
  submode: 'reference_finder';
  claim: string;
  citationCandidateCount: number;
  verifiedCitationCount: number;
  retrievalQueries: string[];
};
```

### Prompt Changes

Reference Finder system instruction:

```text
You are in Research Mode: Reference Finder.
Use only the retrieved citation candidates.
Do not invent titles, authors, journals, years, PMIDs, or DOIs.
If no candidate directly supports the claim, say that clearly.
Distinguish direct support from background support.
Do not cite background_only candidates as direct support.
Suggest narrower wording when evidence only partially supports the claim.
Use this structure:
Best citation
Why this supports your sentence
Strength of evidence
Suggested wording
Alternative citations
Do not cite for this exact claim
```

### Retrieval Changes

Reference Finder should:

1. Extract one atomic claim.
2. Build query variants:
   - exact claim concepts
   - synonym expansion
   - high-evidence filter
   - high-impact journal/landmark-oriented query
   - recent query if the claim is treatment/current-practice oriented
3. Retrieve 20-40 PubMed candidates.
4. Fetch abstracts and citation counts.
5. Validate metadata.
6. Score direct claim support.
7. Return 1 best citation, 3-5 alternatives, and rejected near-misses.

### Scoring

```ts
referenceFinderScore =
  0.40 * directClaimSupport +
  0.22 * evidenceLevelScore +
  0.12 * journalScore +
  0.10 * populationOutcomeFit +
  0.08 * citationOrLandmarkSignal +
  0.05 * recencyFit +
  0.03 * metadataCompleteness;
```

### UI Changes

None required initially. The structured answer appears in chat.

Later:

- Copy citation button.
- Citation confidence badge.
- Expandable "why this citation?" section.

### Analytics Events

- `brobot_research_reference_finder_started`
- `brobot_research_reference_finder_completed`
- Metadata:
  - `claim_hash`
  - `query_count`
  - `candidate_count`
  - `verified_count`
  - `best_confidence`
  - `no_direct_support`

### Tests

- Claim extraction from “Find a citation for this sentence: ...”
- Query generation includes high-evidence query.
- Deduplication by PMID/DOI/title.
- Candidate with missing PMID/DOI can be included only if URL/title metadata are valid.
- No strong candidate returns “no direct support” branch.
- Citation auditor rejects generated citations not in candidates.

### Risks And Safeguards

- Risk: abstract snippets do not fully support claim.
  - Safeguard: classify as `background_only` or `usable_with_wording_adjustment`.
- Risk: model formats an invented citation.
  - Safeguard: post-generation citation audit and fallback response if violation detected.

## Phase 3: Evidence Card Context Layer

Goal: create reusable evidence cards for all research submodes.

### Files To Modify

- `src/lib/brobot/research/types.ts`
- `src/lib/brobot/research/reference-finder.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/app/api/brobot/chat/route.ts`
- `src/lib/brobot/reading/pubmed-client.ts`

### New Files To Create

- `src/lib/brobot/research/evidence-card.ts`
- `src/lib/brobot/research/evidence-scorer.ts`
- `src/lib/brobot/research/subspecialty.ts`
- `src/lib/brobot/research/dedupe.ts`
- `src/lib/brobot/research/evidence-context.ts`
- `src/lib/brobot/research/evidence-card.test.ts`
- `src/lib/brobot/research/dedupe.test.ts`

### Type Definitions

```ts
export type ResearchEvidenceCard = {
  id: string;
  pmid?: string;
  doi?: string;
  title: string;
  authors?: string[];
  journal?: string;
  year?: number;
  publicationType?: string[];
  subspecialty?: string;
  studyDesign?: string;
  population?: string;
  sampleSize?: string;
  interventionOrExposure?: string;
  comparator?: string;
  outcomes?: string[];
  mainFinding?: string;
  effectSizeOrDirection?: string;
  limitations?: string[];
  claimSupportScore?: number;
  evidenceLevelScore?: number;
  journalScore?: number;
  citationScore?: number;
  recencyScore?: number;
  relevanceScore?: number;
  abstractSupportSnippets?: string[];
};
```

### API Changes

No new public route. Add optional internal response metadata:

```ts
research?: {
  submode: BroBotResearchSubmode;
  evidenceCardCount: number;
  retrievalQueries: string[];
  citationAuditPassed: boolean;
};
```

### Prompt Changes

Replace raw abstract blocks with compact evidence-card context:

```text
Retrieved evidence cards:
1. PMID: ...
   Title:
   Study design:
   Population:
   Finding:
   Limitations:
   Citation status:
```

### Retrieval Changes

- Convert PubMed/OpenAlex results to `ResearchEvidenceCard`.
- Deduplicate by:
  - PMID
  - DOI
  - normalized title
- Normalize publication types:
  - `guideline`
  - `meta_analysis`
  - `systematic_review`
  - `randomized_trial`
  - `cohort_study`
  - `case_control`
  - `case_series`
  - `case_report`
  - `narrative_review`
  - `other`
- Detect subspecialty using title/abstract/journal terms.

### Scoring

Add reusable functions:

- `scoreEvidenceLevel(publicationTypes, title, abstractText)`
- `scoreJournalQuality(journal, subspecialty)`
- `scoreRecency(year, submode, publicationType)`
- `scoreRelevance(card, queryPlan)`
- `scoreCitationSignal(citationCount)`

### UI Changes

None initially.

### Analytics Events

- Add metadata to research events:
  - `evidence_card_count`
  - `deduped_count`
  - `subspecialty`
  - `top_publication_types`

### Tests

- Evidence card generation from PubMedArticle.
- Publication type normalization.
- Subspecialty detection for spine/arthroplasty/sports/trauma/peds/hand/oncology.
- Deduplication by PMID, DOI, title.
- Scoring is stable and monotonic for higher evidence types.

### Risks And Safeguards

- Risk: over-extracting details absent from abstracts.
  - Safeguard: leave optional fields undefined; prompt says not to infer missing methods.

## Phase 4: Manuscript Reviewer

Goal: provide section-aware review with targeted retrieval only where needed.

### Files To Modify

- `src/app/api/brobot/chat/route.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/research/types.ts`
- `src/lib/brobot/research/query-planner.ts`

### New Files To Create

- `src/lib/brobot/research/manuscript-reviewer.ts`
- `src/lib/brobot/research/manuscript-section.ts`
- `src/lib/brobot/research/claim-inventory.ts`
- `src/lib/brobot/research/manuscript-reviewer.test.ts`
- `src/lib/brobot/research/claim-inventory.test.ts`

### Type Definitions

```ts
export type ManuscriptSectionType =
  | 'introduction'
  | 'methods'
  | 'results'
  | 'discussion'
  | 'abstract'
  | 'full_excerpt'
  | 'unknown';

export type ManuscriptClaim = {
  id: string;
  text: string;
  paragraphIndex: number;
  claimType:
    | 'background'
    | 'epidemiology'
    | 'methods'
    | 'results_interpretation'
    | 'comparison_to_literature'
    | 'limitations'
    | 'conclusion';
  hasCitationSignal: boolean;
  vulnerability: 'low' | 'moderate' | 'high';
  retrievalNeeded: boolean;
};
```

### API Changes

No route change. Persist metadata:

- `manuscript_section_type`
- `claim_count`
- `vulnerable_claim_count`
- `retrieval_needed_count`

### Prompt Changes

Manuscript Reviewer instruction:

```text
You are in Research Mode: Manuscript Reviewer.
Review the submitted manuscript section like a journal reviewer and academic orthopaedic surgeon.
Do not rewrite the whole section unless asked.
Identify major concerns, minor concerns, missing or weak citations, suggested revisions, potential reviewer criticisms, and the highest-yield next edit.
When retrieved citations are provided, use only those citations.
When no retrieval is provided, do not invent references; describe the citation need.
```

### Retrieval Changes

- Retrieve only for claims with `retrievalNeeded === true`.
- Cap retrieval to top 3 vulnerable claims in MVP.
- Use Reference Finder for each vulnerable claim.

### UI Changes

None initially.

Later:

- Paste-area affordance for manuscript text.
- Section quick chips: Introduction, Methods, Results, Discussion, Abstract.

### Analytics Events

- `brobot_research_manuscript_review_started`
- `brobot_research_manuscript_review_completed`
- Metadata:
  - `section_type`
  - `claim_count`
  - `major_concern_count`
  - `missing_citation_count`

### Tests

- Section detection from “Review my discussion section.”
- Claim inventory splits paragraphs and filters non-claims.
- Unsupported claims trigger retrieval.
- Methods/results text routes to statistical review signals when appropriate.

### Risks And Safeguards

- Risk: user pastes PHI.
  - Safeguard: preserve existing privacy practices and avoid logging raw manuscript text; store hashes/counts only in analytics.

## Phase 5: Literature Review Builder + Evidence Synthesis

Goal: separate recall-first review building from balanced clinical/research synthesis.

### Files To Modify

- `src/app/api/brobot/chat/route.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/research/query-planner.ts`
- `src/lib/brobot/research/evidence-scorer.ts`
- `src/lib/brobot/research/evidence-context.ts`

### New Files To Create

- `src/lib/brobot/research/literature-review-builder.ts`
- `src/lib/brobot/research/evidence-synthesis.ts`
- `src/lib/brobot/research/theme-clusterer.ts`
- `src/lib/brobot/research/literature-review-builder.test.ts`
- `src/lib/brobot/research/evidence-synthesis.test.ts`

### Type Definitions

```ts
export type ResearchRetrievalProfile =
  | 'precision_first'
  | 'balanced'
  | 'recall_first'
  | 'citation_weighted'
  | 'planning_scoping'
  | 'minimal';

export type EvidenceTheme = {
  id: string;
  label: string;
  summary: string;
  cardIds: string[];
  controversy?: string;
  evidenceGap?: string;
};
```

### API Changes

No new route. Add metadata:

- `retrieval_profile`
- `theme_count`
- `evidence_card_count`
- `landmark_count`
- `recent_review_count`

### Prompt Changes

Literature Review Builder:

```text
Create a publishable literature review outline.
Organize by evidence themes, landmark papers, controversies, and gaps.
Do not claim exhaustive coverage.
Use only retrieved citations.
```

Evidence Synthesis:

```text
Answer the focused question like a journal club discussion.
Compare studies by design, population, outcome, and limitations.
Explain consensus, conflict, and confidence.
Use only retrieved citations.
```

### Retrieval Changes

Literature Review Builder:

- Recall-first.
- Retrieve 50-120 candidates, compress to 12-20 evidence cards.
- Keep diversity across themes.
- Include landmark papers and recent reviews.

Evidence Synthesis:

- Balanced.
- Retrieve 30-60 candidates, compress to 8-15 cards.
- Prefer direct PICO fit and conflict/consensus value.

### UI Changes

None initially.

Later:

- Export outline button.
- Evidence table copy button.

### Analytics Events

- `brobot_research_literature_review_completed`
- `brobot_research_evidence_synthesis_completed`
- Metadata:
  - `query_count`
  - `candidate_count`
  - `evidence_card_count`
  - `theme_count`
  - `citation_audit_passed`

### Tests

- Literature review prompts route to recall-first.
- Evidence synthesis prompts route to balanced.
- Theme clustering creates nonempty themes.
- Evidence synthesis output context includes comparison table fields.

### Risks And Safeguards

- Risk: “literature review” output sounds exhaustive.
  - Safeguard: prompt and template must state it is a retrieved evidence map, not completed systematic screening.

## Phase 6: Systematic Review Assistant

Goal: support planning without pretending screening is complete.

### Files To Modify

- `src/app/api/brobot/chat/route.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/research/query-planner.ts`

### New Files To Create

- `src/lib/brobot/research/systematic-review-assistant.ts`
- `src/lib/brobot/research/pico.ts`
- `src/lib/brobot/research/systematic-review-assistant.test.ts`
- `src/lib/brobot/research/pico.test.ts`

### Type Definitions

```ts
export type ResearchPico = {
  population?: string;
  interventionOrExposure?: string;
  comparator?: string;
  outcomes: string[];
  studyDesigns?: string[];
};

export type SystematicReviewPlan = {
  question: string;
  pico: ResearchPico;
  pubmedSearch: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  screeningFramework: string[];
  extractionFields: Array<{ field: string; definition: string; notes?: string }>;
  riskOfBiasPlan: string[];
  unsupportedClaims: string[];
};
```

### API Changes

No public route. Add metadata:

- `pico_complete`
- `generated_search_strings`
- `planning_only: true`

### Prompt Changes

```text
You are in Research Mode: Systematic Review Assistant.
This is planning support only unless actual screening data are provided.
Generate PICO, search strategy, inclusion/exclusion criteria, screening framework, extraction schema, and risk-of-bias plan.
Explicitly state claims not yet supported.
Do not imply final included studies or pooled conclusions.
```

### Retrieval Changes

- Optional scoping retrieval only to discover terminology.
- Do not produce final included-study statements.

### UI Changes

Later:

- Export protocol/search strings.

### Analytics Events

- `brobot_research_systematic_review_plan_completed`
- Metadata:
  - `planning_only`
  - `has_pico_population`
  - `has_pico_outcomes`

### Tests

- Systematic review prompts route correctly.
- Output includes “claims not yet supported.”
- Guardrail blocks language implying completed screening.

### Risks And Safeguards

- Risk: user asks for final conclusions from unscreened search.
  - Safeguard: output must separate scoping impressions from systematic review findings.

## Phase 7: Statistical Reviewer

Goal: review methods/results reporting like a statistical reviewer.

### Files To Modify

- `src/app/api/brobot/chat/route.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/research/types.ts`

### New Files To Create

- `src/lib/brobot/research/statistical-reviewer.ts`
- `src/lib/brobot/research/statistical-checklist.ts`
- `src/lib/brobot/research/statistical-reviewer.test.ts`

### Type Definitions

```ts
export type StatisticalReviewFinding = {
  category:
    | 'confidence_intervals'
    | 'effect_sizes'
    | 'denominators'
    | 'model_details'
    | 'covariates'
    | 'balance_statistics'
    | 'multiple_comparisons'
    | 'missing_data'
    | 'power'
    | 'overclaiming';
  severity: 'major' | 'minor';
  finding: string;
  suggestedFix?: string;
};
```

### API Changes

No route change. Add metadata:

- `statistical_finding_count`
- `major_statistical_finding_count`
- `citations_requested`

### Prompt Changes

```text
You are in Research Mode: Statistical Reviewer.
Review the methods/results text like a statistical reviewer.
Check confidence intervals, effect sizes, denominators, model details, covariates, balance statistics, multiple comparisons, missing data handling, power, and overclaiming.
Retrieve/report guideline references only if citations were requested or provided.
Output reviewer-style comments and suggested wording.
```

### Retrieval Changes

- Default: no broad retrieval.
- If citations requested, retrieve reporting guideline references or methods references.

### UI Changes

Later:

- Quick-action chip: Review stats.

### Analytics Events

- `brobot_research_statistical_review_completed`
- Metadata:
  - `finding_count`
  - `major_count`
  - `checklist_categories_triggered`

### Tests

- Missing CIs detected.
- P-value-only results flagged.
- Propensity/matching text without balance stats flagged.
- Overclaiming causal language flagged.

### Risks And Safeguards

- Risk: assistant gives biostatistical advice beyond provided data.
  - Safeguard: require “based on the supplied text” framing and request missing model details.

## Phase 8: Research UX

Goal: make high-value research workflows discoverable without cluttering the mode selector.

### Files To Modify

- `src/components/brobot/BroBotChatPage.tsx`
- `src/lib/brobot/pending-request.ts`
- `src/lib/brobot/chat/types.ts`

### New Files To Create

- Optional: `src/components/brobot/ResearchQuickActions.tsx`
- Optional: `src/components/brobot/CitationConfidenceBadge.tsx`

### Type Definitions

Add `BroBotChatSourceSchema` values later only if needed:

- `research_quick_action`

Or reuse `example_prompt`/`manual` and send optional `researchSubmode` hint.

### API Changes

Allow optional request hint:

```ts
researchSubmode?: BroBotResearchSubmode;
```

Server still reruns deterministic routing and treats the client hint as weak input.

### Prompt Changes

None.

### Retrieval Changes

None.

### UI Changes

Initial quick-action chips:

- Find citation
- Review manuscript
- Build lit review
- Synthesize evidence
- Plan study
- Review stats

Placement:

- Show only when mode is `research`, or after a research answer.
- Do not add these to the global mode selector row.

Later UX:

- Copy citation.
- Export outline/protocol.
- Citation confidence badge.
- “Why this citation?” expandable explanation.

### Analytics Events

- `brobot_research_quick_action_clicked`
- Metadata:
  - `quick_action`
  - `requested_submode`
  - `current_mode`

### Tests

- Quick chips appear only for Research Mode.
- Clicking chip populates prompt/hint without changing visible mode.
- Existing pending request schema accepts optional research submode.

### Risks And Safeguards

- Risk: UI implies manual submode selection is required.
  - Safeguard: frame chips as shortcuts, keep auto-routing.

## 3. File-Level Change List

### New Research Module

- `src/lib/brobot/research/index.ts`
- `src/lib/brobot/research/types.ts`
- `src/lib/brobot/research/submode-router.ts`
- `src/lib/brobot/research/claim-extractor.ts`
- `src/lib/brobot/research/query-planner.ts`
- `src/lib/brobot/research/reference-finder.ts`
- `src/lib/brobot/research/citation-validator.ts`
- `src/lib/brobot/research/citation-auditor.ts`
- `src/lib/brobot/research/evidence-card.ts`
- `src/lib/brobot/research/evidence-scorer.ts`
- `src/lib/brobot/research/subspecialty.ts`
- `src/lib/brobot/research/dedupe.ts`
- `src/lib/brobot/research/evidence-context.ts`
- `src/lib/brobot/research/manuscript-reviewer.ts`
- `src/lib/brobot/research/manuscript-section.ts`
- `src/lib/brobot/research/claim-inventory.ts`
- `src/lib/brobot/research/literature-review-builder.ts`
- `src/lib/brobot/research/evidence-synthesis.ts`
- `src/lib/brobot/research/theme-clusterer.ts`
- `src/lib/brobot/research/systematic-review-assistant.ts`
- `src/lib/brobot/research/pico.ts`
- `src/lib/brobot/research/statistical-reviewer.ts`
- `src/lib/brobot/research/statistical-checklist.ts`

### Existing Files To Modify

- `src/app/api/brobot/chat/route.ts`
- `src/lib/brobot/chat/types.ts`
- `src/lib/brobot/chat/intent-classifier.ts`
- `src/lib/brobot/chat/intent-expander.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/chat/response-parser.ts`
- `src/lib/brobot/chat/index.ts`
- `src/lib/brobot/reading/pubmed-client.ts`
- `src/lib/brobot/reading/retrieval-engine.ts`
- `src/lib/brobot/reading/verifier.ts`
- `src/components/brobot/BroBotChatPage.tsx`
- `src/lib/brobot/pending-request.ts`

### Test Files To Add

- `src/lib/brobot/research/submode-router.test.ts`
- `src/lib/brobot/research/reference-finder.test.ts`
- `src/lib/brobot/research/citation-validator.test.ts`
- `src/lib/brobot/research/evidence-card.test.ts`
- `src/lib/brobot/research/dedupe.test.ts`
- `src/lib/brobot/research/manuscript-reviewer.test.ts`
- `src/lib/brobot/research/claim-inventory.test.ts`
- `src/lib/brobot/research/literature-review-builder.test.ts`
- `src/lib/brobot/research/evidence-synthesis.test.ts`
- `src/lib/brobot/research/systematic-review-assistant.test.ts`
- `src/lib/brobot/research/pico.test.ts`
- `src/lib/brobot/research/statistical-reviewer.test.ts`

## 4. Type/Schema Additions

Add these schemas in `src/lib/brobot/research/types.ts`, then re-export through `src/lib/brobot/research/index.ts`.

High-priority schemas:

- `BroBotResearchSubmodeSchema`
- `CitationConfidenceSchema`
- `ResearchCitationCandidateSchema`
- `ResearchEvidenceCardSchema`
- `ResearchQueryPlanSchema`
- `ReferenceFinderResultSchema`
- `ManuscriptSectionTypeSchema`
- `ManuscriptClaimSchema`
- `ResearchPicoSchema`
- `StatisticalReviewFindingSchema`

Recommended `ResearchQueryPlan`:

```ts
export type ResearchQueryPlan = {
  submode: BroBotResearchSubmode;
  originalUserText: string;
  atomicClaim?: string;
  focusedQuestion?: string;
  topicTerms: string[];
  requiredTerms: string[];
  optionalTerms: string[];
  excludedTerms: string[];
  queryVariants: Array<{
    label: string;
    query: string;
    profile: ResearchRetrievalProfile;
  }>;
  subspecialty?: string;
  retrievalProfile: ResearchRetrievalProfile;
};
```

## 5. Prompt Template Additions

Add prompt blocks to `src/lib/brobot/chat/prompt-builder.ts` or split into:

- `src/lib/brobot/research/prompt-templates.ts`

Recommended export:

```ts
export function formatResearchSubmodeInstructions(input: {
  submode: BroBotResearchSubmode;
  evidenceContext?: string;
  citationPolicy?: 'retrieved_verified_only';
}): string;
```

Required templates:

- Reference Finder
- Manuscript Reviewer
- Literature Review Builder
- Evidence Synthesis
- Journal Scout
- Systematic Review Assistant
- Statistical Reviewer
- Research Planning

All templates include:

- no invented citations
- retrieved sources only
- distinguish direct support from background
- state limitations
- avoid systematic-review completion claims unless screening data exists

## 6. Retrieval And Scoring Functions

### Query Planner

`query-planner.ts` should expose:

```ts
export function buildResearchQueryPlan(input: {
  submode: BroBotResearchSubmode;
  userText: string;
  intentTopic?: string;
}): ResearchQueryPlan;
```

### Reference Finder

`reference-finder.ts` should expose:

```ts
export async function runReferenceFinder(input: {
  claim: string;
  fetchImpl?: typeof fetch;
  supabase?: unknown;
}): Promise<ReferenceFinderResult>;
```

### Evidence Cards

`evidence-card.ts` should expose:

```ts
export function pubMedArticleToEvidenceCard(input: {
  article: PubMedArticle;
  citationCount?: number;
  queryPlan: ResearchQueryPlan;
}): ResearchEvidenceCard;
```

### Scoring

`evidence-scorer.ts` should expose:

- `scoreEvidenceLevel`
- `scoreJournalQuality`
- `scoreRecency`
- `scoreRelevance`
- `scoreCitationSignal`
- `scoreReferenceCandidate`
- `scoreEvidenceSynthesisCard`
- `scoreLiteratureReviewCard`
- `scoreJournalScoutCard`

### Citation Auditor

`citation-auditor.ts` should expose:

```ts
export function auditGeneratedCitations(input: {
  answer: string;
  candidates: ResearchCitationCandidate[] | ResearchEvidenceCard[];
}): {
  passed: boolean;
  inventedCitationSignals: string[];
  missingSourceIds: string[];
};
```

## 7. UI Plan

Initial UI:

- Keep the visible mode selector unchanged.
- Add optional Research quick actions only inside Research Mode.
- Quick actions prefill a prompt or pass `researchSubmode` as a weak hint.

Recommended quick-action behavior:

| Chip | Prompt prefix | Hint |
| --- | --- | --- |
| Find citation | `Find a citation for this sentence:` | `reference_finder` |
| Review manuscript | `Review this manuscript section:` | `manuscript_reviewer` |
| Build lit review | `Build a literature review on:` | `literature_review_builder` |
| Synthesize evidence | `Synthesize the evidence for:` | `evidence_synthesis` |
| Plan study | `Help me design a study on:` | `research_planning` |
| Review stats | `Review this statistical analysis section:` | `statistical_reviewer` |

Later UI:

- Citation confidence badge.
- Copy citation button.
- Export outline/protocol button.
- Expand “why this citation?” detail.

## 8. Analytics Plan

Use existing `brobot_usage_events` where possible. Add metadata first before introducing tables.

Common metadata:

- `research_submode`
- `research_submode_source`
- `research_submode_confidence`
- `retrieval_profile`
- `query_count`
- `candidate_count`
- `verified_citation_count`
- `evidence_card_count`
- `citation_audit_passed`
- `subspecialty`
- `no_direct_support`

Recommended event types:

- `brobot_research_submode_detected`
- `brobot_research_retrieval_started`
- `brobot_research_retrieval_completed`
- `brobot_research_citation_audit_failed`
- `brobot_research_reference_finder_completed`
- `brobot_research_manuscript_review_completed`
- `brobot_research_literature_review_completed`
- `brobot_research_evidence_synthesis_completed`
- `brobot_research_systematic_review_plan_completed`
- `brobot_research_statistical_review_completed`
- `brobot_research_quick_action_clicked`

Do not log raw claims/manuscript text. Log hashes, lengths, counts, and category labels.

## 9. Testing Plan

### Unit Tests

- Research submode routing.
- Claim extraction.
- Query generation.
- Citation validation.
- Citation audit.
- Deduplication.
- Evidence card generation.
- Evidence scoring.
- Subspecialty detection.
- Manuscript section detection.
- Claim inventory.
- Statistical checklist.
- Systematic review guardrails.

### Integration Tests

- Reference Finder with mocked PubMed/OpenAlex:
  - returns verified citation
  - returns no-direct-support response
  - rejects hallucinated citation in generated answer
- Manuscript Reviewer with vulnerable claims:
  - retrieves only for vulnerable claims
  - does not invent missing citations
- Literature Review Builder:
  - uses recall-first query plan
  - returns themes and citation placement
- Evidence Synthesis:
  - uses balanced query plan
  - includes conflict/consensus framing

### Regression Tests

- Non-research modes unchanged.
- Existing Read Next tests continue passing.
- Existing chat response parser accepts old outputs.
- Streaming path includes research metadata without breaking SSE payloads.

### Guardrail Tests

- No retrieved source = no citation.
- `background_only` candidates are not presented as direct support.
- Systematic review planning output does not imply completed screening.
- Statistical Reviewer does not invent model details.

## 10. Highest-Impact First PR Sequence

### PR 1: Research Submode Router

Scope:

- New `research` module with submode types and deterministic router.
- Optional schema fields.
- Persist analytics metadata.
- Tests for routing examples.

Why first:

- Low risk, high leverage.
- Creates the internal switchboard for every later workflow.

### PR 2: Reference Finder MVP

Scope:

- Claim extraction.
- Query planner for Reference Finder.
- PubMed retrieval using existing reading client.
- Citation candidate scoring.
- Reference Finder prompt template.
- Citation-safe output.
- Tests with mocked retrieval.

Why second:

- Highest user impact and easiest to validate.
- Establishes the citation safety contract.

### PR 3: Citation Auditor + Evidence Cards

Scope:

- Evidence card schema and conversion.
- Deduplication.
- Citation post-generation audit.
- Evidence context formatting.

Why third:

- Makes all future research outputs safer and more structured.

### PR 4: Manuscript Reviewer

Scope:

- Section detection.
- Claim inventory.
- Targeted retrieval for vulnerable claims.
- Reviewer-style template.

Why fourth:

- High workflow value for academic users.
- Builds on Reference Finder and evidence cards.

### PR 5: Literature Review Builder + Evidence Synthesis

Scope:

- Retrieval profiles.
- Theme clustering.
- Evidence comparison table.
- Separate templates and scoring weights.

Why fifth:

- More complex retrieval/context assembly, but large value after safety primitives exist.

### PR 6: Systematic Review Assistant + Statistical Reviewer

Scope:

- PICO/search planning.
- Systematic review guardrails.
- Statistical checklist parser.
- Reviewer-style statistical comments.

Why sixth:

- Planning/checklist workflows are mostly prompt and parser work once routing exists.

### PR 7: Research UX Enhancements

Scope:

- Research quick-action chips.
- Citation confidence badges.
- Copy/export affordances.

Why last:

- Avoids exposing UX promises before backend safety is reliable.

## 11. Safeguards Checklist

Every research PR should preserve these rules:

- No retrieved source = no citation.
- No model-invented citations.
- Do not overstate evidence.
- Do not claim systematic review completion without screening.
- Do not cite `background_only` papers as direct support.
- Always distinguish direct support from related background.
- Always suggest narrower wording when evidence does not fully match the user’s claim.
- Do not log raw manuscript text or raw unpublished claims in analytics.
- Keep all new request/response fields optional until the UI depends on them.
