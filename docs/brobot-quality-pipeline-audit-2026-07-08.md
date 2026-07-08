# BroBot Quality Pipeline Audit

Date: 2026-07-08

Constraint: improve BroBot specificity through engineering, routing, retrieval, grounding, validation, and future KG hooks. Do not create a new canned content library, static question bank, or manual bulk topic/procedure files.

## Executive Summary

BroBot already has much of the right scaffolding: local and LLM intent expansion, mode-specific prompts, answer routes, branch chips, branch outcome ranking, answer rubrics, a quality gate, revision pass support, OITE and OR-prep metadata, and a separate CasePrep proxy. The quality problem is not a total absence of structure. It is that the structure is not yet connected to enough concrete context.

The biggest gap is the missing middle layer between intent and answer: BroBot extracts one topic string, one broad procedure category, and one subintent, then asks the model to infer the rest. There is no normalized clinical facet packet that says which anatomy, classification, indications, contraindications, complications, management pivots, test traps, exposure steps, consult missing data, or source snippets are expected for this turn.

The prompt is stronger than the current retrieval/context. The prompt asks for named anatomy and decision pivots, but `getCasePrepCertifiedContext()` is a stub, KG lookup is isolated to Orthobullets flows, and chat has no source-snippet retrieval layer. That means high-specificity answers depend heavily on the model's latent memory, which is exactly where "generic ChatGPT ortho answer" behavior creeps in.

The highest-leverage work is P0: add a structured clinical context extractor, implement a read-only certified/source context adapter, route answer contracts by mode/subintent, make the quality gate compare against expected facets, and unify branch/chip generation around missing concepts rather than generic categories.

## Current Pipeline Map

Primary open-ended chat route:

- `src/app/api/brobot/chat/route.ts`
  - normalizes request payload with `message`, `mode`, `responseDepth`, `trainingLevel`, branch metadata, and streaming flag.
  - gates user/guest access.
  - persists user conversations/messages for signed-in users.
  - loads recent `brobot_messages` history.
  - accepts local intent hints from `/api/brobot/intent` via `buildAcceptedIntent()`, otherwise runs `buildBroBotIntentExpansionMessages()` on `BROBOT_INTENT_MODEL`.
  - loads branch topics/questions from `branch_topics`, `branch_questions`, and `branch_outcomes`.
  - builds `BroBotAnswerContext` with recent history, CasePrep context, OR-prep metadata, and OITE metadata.
  - chooses `answerRoute` via `routeBroBotAnswer()`.
  - builds prompt with `buildBroBotChatMessages()`.
  - selects answer model via `getAnswerModelForRoute()`.
  - parses JSON with `parseBroBotChatResponse()`.
  - runs `runBroBotQualityGate()`.
  - optionally runs revision with `buildBroBotRevisionMessages()`.
  - optionally runs metadata pass with `buildBroBotMetadataMessages()`.
  - attaches persisted branch IDs, persists assistant output, tags, analytics, branch impressions, evaluator job.

Guided intent route:

- `src/app/api/brobot/intent/route.ts`
  - runs `preRouteBroBotIntent()` first.
  - calls the LLM intent expander only when local confidence is low/fallback.
  - returns mode, subintent, category, topic, ambiguity, missing context, branch options, and source.

Core chat modules:

- `src/lib/brobot/chat/pre-router.ts`: local mode/subintent/category inference and initial smart chips.
- `src/lib/brobot/chat/intent-expander.ts`: LLM intent expansion prompt and fallback branch library.
- `src/lib/brobot/chat/answer-router.ts`: decides `answer_now`, `answer_with_assumption`, `ask_clarification`, or `offer_branches`.
- `src/lib/brobot/chat/context-builder.ts`: builds answer context.
- `src/lib/brobot/chat/prompt-builder.ts`: mode/depth/level instructions, JSON answer contract, metadata prompt, revision prompt.
- `src/lib/brobot/chat/response-parser.ts`: parses model JSON and normalizes arrays/chips.
- `src/lib/brobot/chat/quality-gate.ts`: lexical warnings and revision trigger inputs.
- `src/lib/brobot/chat/chip-registry.ts`: curated topic/subintent chips.
- `src/lib/brobot/chat/branch-templates.ts`: mode/category branch templates.
- `src/lib/brobot/chat/answer-rubrics.ts`: selected branch and subintent rubrics.
- `src/lib/brobot/chat/entity-extractor.ts`: regex extraction for region, bone, procedure, fracture pattern, laterality.
- `src/lib/brobot/chat/or-prep-context.ts`: lightweight procedural metadata.
- `src/lib/brobot/chat/oite-context.ts`: lightweight exam metadata.
- `src/lib/brobot/chat/caseprep-context.ts`: intended certified CasePrep adapter, currently returns `null`.

Related but not fully integrated:

- `src/app/api/brobot/ask/route.ts`: CasePrep proxy to the external `/case-prep` endpoint.
- `src/lib/brobot/orthobullets/kg-lookup.ts`: Orthobullets question KG lookup, not general chat.
- `src/lib/brobot/reading/*`: reading recommendation retrieval/ranking, not answer grounding.
- `src/lib/brobot/evaluator/*`: evaluator queue/run scaffolding.

## Root Causes Of Generic Answers

1. **No structured clinical facet packet**
   - Current intent contains `mode`, `subintent`, `procedureCategory`, `procedureOrTopic`, ambiguity, missing context, and branches.
   - It does not contain normalized facets such as anatomy, classification systems, indications, contraindications, management pivots, complication categories, test traps, exposure/interval, implants, imaging views, consult slots, or source-backed snippets.
   - Result: prompt asks for specificity, but the answer model must discover what specificity means for each turn.

2. **Certified context is scaffolded but inactive**
   - `getCasePrepCertifiedContext()` in `src/lib/brobot/chat/caseprep-context.ts` always returns `null`.
   - `formatAnswerContextForPrompt()` already has room for certified sections, but chat never receives them.
   - Result: existing certified CasePrep/source material is not grounding chat answers.

3. **Retrieval is not part of the chat answer path**
   - Reading retrieval exists for recommendations, and Orthobullets KG lookup exists for Orthobullets flows.
   - Open-ended chat does not retrieve source snippets, certified payloads, registry procedure sections, canonical topic concepts, or KG-like neighborhoods.
   - Result: OITE traps and OR-specific anatomy often come from latent model memory instead of repo data.

4. **Mode/depth/level are prompt-only too often**
   - Mode/depth/level instructions are extensive in `prompt-builder.ts`.
   - The system does not enforce different required fields per mode beyond lexical quality gate warnings.
   - Result: "deep PGY-4 OR prep" and "quick PGY-1 clinic" can differ in wording more than actual content selection.

5. **Answer validation is lexical, not context-aware**
   - `quality-gate.ts` catches missing anatomy/trap/decision signals by token hits.
   - It cannot say "this ankle fracture answer missed mortise stability" unless that expectation is hardcoded.
   - Result: revision improves surface shape but not guaranteed clinical completeness.

6. **Branch systems are duplicated and drifting**
   - Branch libraries exist in `branch-templates.ts`, `intent-expander.ts`, and `chip-registry.ts`.
   - Labels/ids vary, e.g. `anatomy_at_risk` vs `structures_at_risk`, `complications` vs `pitfalls_complications`.
   - Result: branch persistence, ranking, rubric mapping, and click analytics are harder to keep coherent.

7. **Follow-up chips are often category-driven**
   - Ranking is sophisticated once branch rows exist, but initial chips can still be broad category prompts.
   - Chips are not built from "missing concepts in this answer" or "expected facets not covered."
   - Result: chips feel generic and do not reliably guide the next clinically useful branch.

8. **The answer planner is not wired into the prompt**
   - `answer-planner.ts` defines hidden checklist blocks and quiz instructions.
   - `prompt-builder.ts` does not import/use `buildAnswerPlanningBlock()` or `buildQuizInstructions()`.
   - Result: a strong planning scaffold exists but appears unused in the main answer prompt.

## Engineering Improvement Plan

### 1. Add A Clinical Context Extractor

Files:

- `src/lib/brobot/chat/types.ts`
- new `src/lib/brobot/chat/clinical-context.ts`
- `src/lib/brobot/chat/context-builder.ts`
- `src/lib/brobot/chat/pre-router.ts`
- `src/lib/brobot/chat/intent-expander.ts`

Change:

- Add an in-memory `BroBotClinicalContext` object, not necessarily persisted yet:
  - `entities`: region, bone, joint, diagnosis, procedure, implant/construct, classification, complication, laterality.
  - `caseSlots`: age, mechanism, acuity, open/closed, neurovascular status, imaging, labs, reduction/splint, prior surgery, wound status.
  - `taskFacets`: anatomy, classification, workup, imaging, indications, contraindications, treatment algorithm, surgical approach, exposure, steps, implants, complications, pitfalls, test traps, distractors, disposition.
  - `coverageRequirements`: mode-specific required sections/facets.
  - `missingCriticalSlots`: slots that materially change management.

Why:

- This creates the missing middle layer between intent and prompt. It lets the prompt say "include these selected facets" instead of "be specific."

How to test:

- Unit test 30 prompts against extracted entities/facets/slots.
- Snapshot prompt context for OR prep, OITE, clinic, consult, research.

Risk: Low to moderate. Keep additive and in-memory first.

### 2. Implement Read-Only Certified Context Adapter

Files:

- `src/lib/brobot/chat/caseprep-context.ts`
- `src/lib/brobot/chat/context-builder.ts`
- likely registry client files under CasePrep/review modules after schema inspection.

Change:

- Replace the stubbed `getCasePrepCertifiedContext()` with a read-only adapter that:
  - resolves procedure/topic slug from `procedureOrTopic`, branch label, and `procedureCategory`.
  - fetches existing certified/live CasePrep registry payload sections.
  - compresses sections to only branch-relevant snippets.
  - returns source labels and short snippets to `formatAnswerContextForPrompt()`.

Why:

- Uses existing certified payloads without creating new content. This is the fastest way to make OR prep answers less generic.

How to test:

- Unit test slug resolution for mapped procedures.
- Mock registry payloads and assert only relevant snippets are injected.
- Prompt snapshot test showing certified context present.

Risk: Moderate. Need careful snippet limits to avoid bloated prompts.

### 3. Add A Source Context Adapter Boundary

Files:

- new `src/lib/brobot/chat/source-context.ts`
- `src/lib/brobot/chat/context-builder.ts`
- future KG adapter implementation.

Change:

- Define a common `BroBotSourceContextProvider`:
  - input: clinical context, intent, mode, subintent, selected branch.
  - output: normalized `SourceConceptPacket[]` with `conceptType`, `label`, `snippet`, `source`, `confidence`, `ids`.
- First providers:
  - `caseprepProvider`
  - `topicRegistryProvider`
  - `branchHistoryProvider`
  - `kgProvider` as no-op/future interface.

Why:

- Future KG can plug in without changing the prompt builder, answer router, or quality gate.

How to test:

- Provider contract tests.
- Fallback behavior when all providers return empty.

Risk: Low if read-only and optional.

### 4. Make Mode-Specific Answer Contracts Deterministic

Files:

- `src/lib/brobot/chat/mode-contracts.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/chat/quality-gate.ts`
- `src/lib/brobot/chat/answer-rubrics.ts`

Change:

- Turn mode contracts into data:
  - OR prep: objective, setup/exposure, anatomy at risk, key steps/checks, decision points, pitfalls/bailout, attending priorities.
  - OITE: direct answer, tested concept, stem clues, distractors, trap, treatment threshold/algorithm, memory hook, next active recall.
  - Consult: urgency, red flags, missing critical info, workup/imaging/labs, temporizing management, definitive management/disposition, presentation.
  - Clinic: differential, history/exam, imaging, first-line management, escalation, red flags, counseling.
  - Research/general: keep concise and route-specific.
- Have `buildBroBotChatSystemPrompt()` include only selected contract items based on clinical context and response depth.

Why:

- Improves specificity without bloat: contracts choose what to include and omit.

How to test:

- Prompt snapshot tests per mode/depth/level.
- Evaluation harness checks section fit without requiring exact prose.

Risk: Moderate. Too rigid a contract can make answers formulaic; keep adaptive selection.

### 5. Wire The Hidden Answer Planner

Files:

- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/chat/answer-planner.ts`
- tests in `prompt-builder.test.ts`.

Change:

- Import `buildAnswerPlanningBlock()` and include it near the top of the answer system prompt.
- Include `buildQuizInstructions()` when subintent is `quiz` or OITE quiz route is selected.

Why:

- Existing code already defines the right anti-generic checklist but does not appear to be used.

How to test:

- Snapshot prompt contains planner block for OR prep/OITE/consult.
- Quiz prompt snapshot contains stem/choices/explanations contract.

Risk: Low. May increase prompt length; can gate to non-quick depth or high-risk modes.

### 6. Upgrade Quality Gate From Lexical To Facet-Aware

Files:

- `src/lib/brobot/chat/quality-gate.ts`
- new `src/lib/brobot/chat/answer-coverage.ts`
- `src/lib/brobot/chat/context-builder.ts`

Change:

- Add `expectedFacets` and `sourceConcepts` to quality gate input.
- Add warnings like:
  - `expected_classification_missing`
  - `source_anatomy_not_used`
  - `oite_distractor_layer_missing`
  - `consult_disposition_missing`
  - `or_prep_exposure_from_context_missing`
  - `answer_generic_for_known_topic`
- Keep lexical checks as backstop.

Why:

- Revision can repair clinically meaningful gaps, not just missing trigger words.

How to test:

- Unit tests with answers missing required facets.
- Revision prompt snapshots include exact missing facets.

Risk: Moderate. Avoid requiring unavailable facets when no source context exists.

### 7. Consolidate Branch/Chip Sources

Files:

- `src/lib/brobot/chat/branch-templates.ts`
- `src/lib/brobot/chat/intent-expander.ts`
- `src/lib/brobot/chat/chip-registry.ts`
- `src/lib/brobot/chat/answer-rubrics.ts`

Change:

- Make `branch-templates.ts` the single source for generic mode/category branches.
- Keep `chip-registry.ts` for curated high-frequency topic chips.
- Remove duplicated `MODE_BRANCH_LIBRARY` and `CATEGORY_BRANCH_TEMPLATES` from `intent-expander.ts`; import shared helpers instead.
- Normalize branch ids/categories and map every branch to a rubric/category.

Why:

- Improves traceability, ranking, analytics, and follow-up quality without adding content bulk.

How to test:

- Unit tests for no duplicate ids across generic templates.
- Branch selection returns stable ids.
- Existing prompt-builder/intent tests updated.

Risk: Low to moderate. Existing analytics may contain old ids; support aliases.

### 8. Generate Follow-Ups From Missing Concepts

Files:

- new `src/lib/brobot/chat/followup-builder.ts`
- `src/app/api/brobot/chat/route.ts`
- `src/lib/brobot/chat/prompt-builder.ts`

Change:

- After answer + quality gate, build follow-up candidates from:
  - expected facets not covered.
  - source concepts not used.
  - mode contract branches not selected.
  - user history and weak concepts.
- Feed these as fallback branches to metadata pass.

Why:

- Chips become a continuation of the actual learning gap instead of generic "Complications/Anatomy/Implants."

How to test:

- Synthetic answers missing classification/anatomy/trap produce targeted chip categories.
- CTR and continued-after-click become primary production metrics.

Risk: Low. Metadata-only and reversible.

### 9. Retrieval/Reranking By Task Type

Files:

- new `src/lib/brobot/chat/source-ranker.ts`
- `src/lib/brobot/chat/context-builder.ts`
- future KG provider.

Change:

- Rerank candidate snippets/concepts differently by mode:
  - OITE: classification, tested associations, traps, distractors, classic complications, algorithms.
  - OR prep: exposure, anatomy at risk, steps/checks, implants, failure modes, attending priorities.
  - Consult/clinic: red flags, workup, imaging, classification, initial/definitive management, disposition.
  - Research: evidence metadata and citation source only when available.

Why:

- The same topic needs different retrieved context depending on the learner task.

How to test:

- Ranking unit tests with mocked concept packets.

Risk: Low if deterministic and source-limited.

## P0/P1/P2 Roadmap

### P0: Highest-Leverage, Low-Risk

1. Wire `answer-planner.ts` into `prompt-builder.ts`.
   - Why: immediately improves answer planning using existing code.
   - Test: prompt snapshots, OITE quiz snapshot.
   - Risk: low.

2. Implement `BroBotClinicalContext` extraction.
   - Why: gives all later pipeline stages concrete facets and slots.
   - Test: 30 prompt unit tests.
   - Risk: low/moderate.

3. Implement certified CasePrep context adapter.
   - Why: activates existing source material in chat.
   - Test: mocked certified payloads, prompt context snapshots.
   - Risk: moderate.

4. Consolidate branch template duplication.
   - Why: stabilizes branch ids, rubrics, persistence, and analytics.
   - Test: branch id/category tests, existing intent tests.
   - Risk: low/moderate.

5. Fix metadata defaults and flags in production config review.
   - Why: prior report notes `BROBOT_SEPARATE_METADATA_PASS` defaults false; answer quality competes with product metadata when disabled.
   - Test: route logs show metadata pass model; answer pass returns empty metadata under flag.
   - Risk: low.

### P1: Deeper Pipeline Quality

1. Add mode contract selector and required facet builder.
   - Files: `mode-contracts.ts`, `prompt-builder.ts`, `context-builder.ts`.
   - Why: makes depth/mode/level change content selection.
   - Test: section/contract snapshots and evaluation harness.
   - Risk: moderate.

2. Add source concept provider/ranker.
   - Files: `source-context.ts`, `source-ranker.ts`, `context-builder.ts`.
   - Why: retrieves the right existing snippets for the task.
   - Test: mocked provider ranking.
   - Risk: moderate.

3. Upgrade quality gate to facet coverage.
   - Files: `quality-gate.ts`, `answer-coverage.ts`.
   - Why: catches clinically meaningful omissions before final answer.
   - Test: unit tests for missing OITE trap, OR anatomy, consult disposition.
   - Risk: moderate.

4. Add generic-answer detector.
   - Files: `quality-gate.ts`.
   - Why: detect answers that still make sense if the topic name is removed.
   - Test: generic answer fixtures fail; topic-specific answers pass.
   - Risk: low.

5. Follow-up chips from missing concepts.
   - Files: `followup-builder.ts`, chat route metadata pass.
   - Why: chips become targeted learning branches.
   - Test: missing concept fixtures.
   - Risk: low.

### P2: KG-Ready Architecture

1. Add `kgProvider` behind `BroBotSourceContextProvider`.
   - Files: `source-context.ts`, new `kg-source-provider.ts`.
   - Why: future KG drops into the same adapter boundary.
   - Test: no-op provider today; mocked KG provider contract.
   - Risk: low.

2. Add concept packet schema compatible with KG neighborhoods.
   - Fields: entity id, relation type, concept type, claim/snippet, source ids, evidence grade, confidence, freshness.
   - Why: answer pipeline should not care whether context came from KG, CasePrep, registry, or branch history.
   - Test: schema validation and ranking.
   - Risk: low/moderate.

3. Add evaluator scoring against contracts.
   - Files: `src/lib/brobot/evaluator/*`.
   - Why: offline QA can score specificity and mode fit without exact answer text.
   - Test: harness below.
   - Risk: moderate.

## KG Integration Boundary

Do not make BroBot wait for KG completion. Add a stable adapter now:

```ts
type BroBotSourceConceptPacket = {
  id: string;
  provider: 'caseprep' | 'registry' | 'kg' | 'branch_history' | 'reading';
  conceptType:
    | 'anatomy'
    | 'classification'
    | 'indication'
    | 'contraindication'
    | 'treatment_algorithm'
    | 'complication'
    | 'test_trap'
    | 'distractor'
    | 'exposure'
    | 'surgical_step'
    | 'implant'
    | 'imaging'
    | 'red_flag'
    | 'disposition'
    | 'evidence';
  label: string;
  snippet: string;
  sourceLabel?: string;
  sourceIds?: string[];
  confidence: number;
};
```

The answer pipeline should consume this packet regardless of provider. Today it can be populated by CasePrep/registry/branch history. Later the KG provider can add canonical entities, relationships, claims, evidence traces, and topic neighborhoods.

## Evaluation Harness

Create a deterministic prompt set in `src/lib/brobot/evaluator/quality-fixtures.ts` or `tests/brobot-quality-fixtures.ts`. Do not store ideal canned medical answers. Store prompt, requested mode/depth/level, and structural expectations.

Scoring dimensions:

- specificity: named structures, classifications, decision pivots, or source-backed concepts.
- clinical correctness risk: no dangerous omissions, no overconfident unsupported claims.
- test relevance: traps, distractors, stem clues, treatment thresholds when OITE.
- surgical usefulness: exposure, setup, anatomy at risk, steps/checks, failure modes when OR prep.
- absence of fluff: no generic intros, empty caveats, or broad filler.
- appropriate depth: quick/standard/deep changes answer size and nuance.
- mode fit: answer contract matches mode.
- follow-up quality: chips target missing or next logical concepts.

Representative prompts:

1. OR prep, standard, PGY-2: `Distal radius ORIF tomorrow. What do I need to know?`
   - Expect OR structure: objective, FCR/volar exposure, anatomy at risk, checks, pitfalls, attending priorities.
2. OR prep, quick, PGY-1: `Trigger finger release steps`
   - Expect landmarks, structure at risk, endpoint, concise no encyclopedic indications.
3. OR prep, deep, PGY-4: `Reverse TSA key surgical techniques`
   - Expect approach/exposure, glenoid/humeral decisions, instability/notching/failure modes, bailout/tradeoffs.
4. OR prep, standard, PGY-3: `How do I confirm carpal tunnel release is complete?`
   - Expect endpoint and structures, not generic complications.
5. OR prep, standard, PGY-2: `Intertroch nail start point`
   - Expect entry point/checks/failure modes structurally.
6. OR prep, deep, PGY-3: `Periacetabular osteotomy in a 21 year old`
   - Expect setup/exposure/anatomy/decision risks, with uncertainty if no certified context.

7. OITE, standard, PGY-2: `SCFE OITE points`
   - Expect direct framework, stem clues, stable/unstable pivot, trap/distractor layer, memory hook.
8. OITE, standard, PGY-2: `What is the Garden classification?`
   - Expect classification purpose, types, management implications, confused classifications.
9. OITE, deep, PGY-3: `Femoral shaft fracture OITE traps`
   - Expect distractors, tested complications/associations, stem clues.
10. OITE, standard, PGY-2: `Flexion extension gap imbalance questions`
   - Expect tested pivots and wrong-answer logic, not broad TKA overview.
11. OITE, quick, med student: `Quiz me on THA must-see anatomy`
   - Expect actual question stem, choices, answer/explanation, plausible distractors.
12. OITE, standard, PGY-2: `Hand infection pitfalls for boards`
   - Expect red flags, differentiators, traps, management pivots.

13. Consult, standard, PGY-1: `Ankle fracture consult. How should I think about it?`
   - Expect urgency/red flags, missing info, imaging/classification, temporizing care, presentation.
14. Consult, standard, PGY-2: `Treatment options for PJI`
   - Expect workup/labs/aspiration, acute/chronic distinction structurally, definitive options/disposition.
15. Consult, quick, PGY-1: `Open tibia in ED`
   - Expect emergent priorities and senior escalation, no branch blocking.
16. Consult, standard, PGY-2: `Painful TKA consult`
   - Expect infection/loosening/instability framework, labs/imaging/aspiration slots.
17. Consult, standard, PGY-1: `How should I present a distal radius fracture consult?`
   - Expect one-liner/presentation structure and missing critical info.

18. Clinic, standard, med student: `Shoulder pain workup`
   - Expect differential, history/exam, imaging sequence, red flags, escalation.
19. Clinic, standard, PGY-2: `Indications for ACL reconstruction`
   - Expect activity/instability/associated injuries/nonop vs op structurally.
20. Clinic, quick, PGY-1: `Differential diagnosis of hand infections`
   - Expect categorized differential, red flags, urgent management triggers.
21. Clinic, standard, PGY-2: `Achilles tendon rupture treatment options`
   - Expect workup, nonop/op factors, complications, counseling.

22. General, standard, PGY-2: `What is a neutralization plate?`
   - Expect definition plus construct purpose, decision pivot, pitfalls.
23. General, standard, PGY-2: `FDP and FDS anatomy facts I need to know`
   - Expect anatomy/course/function/surgical relevance/injury pattern.
24. General, quick, med student: `Primary vs secondary bone healing`
   - Expect concise conceptual contrast and construct relevance.

25. Research, standard, PGY-4: `My study is on TJA and AI cameras recognizing surgical steps`
   - Expect study design/PICO/endpoints/bias/clinical relevance, not generic AI prose.
26. Research, standard, PGY-3: `Limitations of AI in TJA step recognition`
   - Expect limitations categories and study design implications.
27. Research, deep, attending: `Critique this methods section: retrospective TKA cohort with AI video labels`
   - Expect design/bias/outcome/statistics/applicability structure.

## Specific Files To Inspect Or Modify

Primary:

- `src/app/api/brobot/chat/route.ts`
- `src/app/api/brobot/intent/route.ts`
- `src/lib/brobot/chat/types.ts`
- `src/lib/brobot/chat/pre-router.ts`
- `src/lib/brobot/chat/intent-expander.ts`
- `src/lib/brobot/chat/context-builder.ts`
- `src/lib/brobot/chat/caseprep-context.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/chat/answer-planner.ts`
- `src/lib/brobot/chat/answer-router.ts`
- `src/lib/brobot/chat/quality-gate.ts`
- `src/lib/brobot/chat/response-parser.ts`
- `src/lib/brobot/chat/chip-registry.ts`
- `src/lib/brobot/chat/branch-templates.ts`
- `src/lib/brobot/chat/answer-rubrics.ts`
- `src/lib/brobot/chat/entity-extractor.ts`
- `src/lib/brobot/chat/or-prep-context.ts`
- `src/lib/brobot/chat/oite-context.ts`

Secondary:

- `src/lib/brobot/orthobullets/kg-lookup.ts`
- `src/lib/brobot/reading/*`
- `src/lib/brobot/evaluator/*`
- `src/app/api/brobot/ask/route.ts`
- `src/lib/student-curriculum/student-caseprep-context.ts`
- `src/lib/student-curriculum/caseprep-topic-mapping.ts`

## Do Not Do

- Do not create a new static question bank.
- Do not manually write hundreds of procedure/topic files.
- Do not rely on "just improve the prompt" without context extraction, retrieval, validation, and tests.
- Do not make the answer longer as the main solution.
- Do not mix product metadata generation back into the answer pass when the separate metadata pass is available.
- Do not make KG completion a blocker.
- Do not touch payments, subscriptions, auth, or unrelated UI.
- Do not fabricate citations or source-backed claims when retrieval did not provide source text.
- Do not use branches as generic category labels when a missing concept or concrete next decision is available.
