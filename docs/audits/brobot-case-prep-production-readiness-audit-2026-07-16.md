# BroBot Case Prep Production Readiness Audit

Date: 2026-07-16  
Repositories audited:

- `snaportho-caseprep` — FastAPI runtime, curated registry, RAG fallback, content factory, registry data
- `snaportho-web` — Case Readiness/Prepare surfaces, BroBot chat, review UI, persistence and analytics

This supersedes the earlier same-day audit, which was performed before the `snaportho-caseprep` repository was available locally.

## Executive summary

BroBot Case Prep has a genuine curated-first backend architecture, but that architecture is not yet the production product path.

The CasePrep backend contains the right core design:

```text
resolve procedure
  -> certified, runtime-enabled curated payload exists?
       yes: return curated payload without GPT for core content
       no: controlled fallback with explicit metadata
```

It also has a meaningful content factory and guarded lifecycle:

```text
extract -> synthesize -> QA -> human review -> approve
  -> compile certified payload -> certify -> promote runtime
```

Draft compilation does not overwrite the live payload by default. Runtime promotion is separate, validated, actor-attributed, and append-only audited. Those are substantial production assets.

However, the deployed/product integration still violates the intended philosophy:

1. `POST /case-prep` defaults to legacy V1 RAG/GPT, not curated V2.
2. The web legacy Case Prep proxy calls `POST /case-prep`, not `/case-prep/v2`.
3. The newer BroBot chat does not call the V2 engine; it independently fetches registry sections and blends them into generic OpenAI chat.
4. The Case Readiness page uses incorrect hyphenated slugs against an underscore-based registry API, so direct curated retrieval fails for its mapped topics.
5. Even if that mapping is fixed, Case Readiness remains curriculum-template-first and uses registry sections only as supplemental “survival” content.
6. The backend has 60 procedure records, but only 24 are live certified; the required carpal tunnel release case is empty and uncertified.
7. Twenty-three of 24 certified procedures have no indications section under a transitional exception.
8. Several certified `postop_plan` sections contain study instructions instead of actual postoperative management.
9. The fallback RAG system is legacy, loosely constrained, lacks user-facing citations, and is not logged into a demand-to-curation queue.
10. Review history remains split: backend state changes have an audit log, but web section decisions are mutable in-place and content revisions lack first-class diff/rollback.

### Direct answers

**How close are we to a first beta?**

Approximately 4–8 focused engineering weeks from a tightly scoped internal/limited beta, assuming clinical content review capacity is available. The backend is not greenfield; the principal work is integration, safety consolidation, and launch-set content correction.

**Is the curated-first architecture already present?**

Yes in `snaportho-caseprep` V2. No in the actual default production and web product paths.

**Largest blockers**

- default/runtime routing does not use V2 curated-first;
- web-to-registry slug contract is broken;
- curated content is not the primary Case Readiness document;
- certified launch content has schema/content defects;
- review decisions are not tied to immutable content revisions;
- fallback events do not drive a manufacturing queue.

**What should be fixed first?**

Fix the cross-repository runtime contract: canonical resolver/slugs, V2 endpoint, certified-only source hierarchy, explicit source metadata, and demand logging. Then repair and re-review a narrow launch set.

### Verdict

**INTERNAL_ALPHA_READY**

The backend alone is near limited-beta infrastructure quality. The end-to-end product is internal-alpha quality because the curated-first path is not actually the default user experience.

## Evidence and validation performed

Read-only checks:

- inspected both repositories and git histories;
- traced all active Case Prep, Case Readiness, Prepare, BroBot, registry, review, factory, RAG, and analytics paths;
- ran registry validation and coverage scoring in check-only mode;
- inspected all 60 manifests and requested representative procedures;
- exercised the canonical procedure resolver without OpenAI;
- verified manifest payload hashes independently;
- inspected factory and promotion-guard tests.

Results:

- registry validator: 60 procedures, 0 errors, 25 warnings;
- content states: 24 certified, 32 partial, 2 draft, 2 missing;
- 24 procedures pass the live gate;
- only 2 procedures have current `generation_meta.json`;
- 23 certified procedures are missing indications;
- one live procedure has an unpromoted draft beside its certified payload;
- 3 certified payload hashes do not match their manifest `source_payload_hash`;
- local unit/integration tests could not run because the newly cloned repository has no installed Python environment (`pytest`, `pydantic`, and `fastapi` unavailable).

No production data or curated content was modified.

## Architecture map

### Backend default production flow

```text
POST /case-prep
  -> CASEPREP_DEFAULT_VERSION (default v1)
  -> V1 legacy engine
  -> GPT query refinement
  -> Pinecone retrieval
  -> GPT snippet filtering/reformatting
  -> separate legacy anatomy GPT pipeline
  -> response metadata says content_status=legacy
```

This is RAG/GPT-first.

### Backend curated V2 flow

```text
POST /case-prep/v2
  -> ENABLE_CASEPREP_V2 required
  -> canonical procedure resolver
       exact alias
       contains
       fuzzy
       optional GPT classifier
  -> curated content store
       runtime_enabled=true
       content_status=certified
       review_status=certified
       deprecated=false
       certified_payload.json exists
  -> HIT:
       return certified payload
       no GPT for core content
       rag_used=false
       explicit source/status metadata
  -> MISS:
       optional Pinecone RAG
       optional GPT reformat/anatomy
       explicit fallback_reason, warnings, ai_used and rag_used
```

This closely matches the requested philosophy, but is opt-in.

### Web Case Readiness flow

```text
/student-workspace/prepare
  -> CasePrepLauncher
  -> /student-workspace/case-readiness/[topicId]
  -> hard-coded topic mapping
  -> GET /caseprep/registry/procedures/{slug}
  -> build objectives from static curriculum fast/deep templates
  -> blend registry sections into survival sections
  -> render Case Readiness
```

Two defects prevent this from being curated-first:

- web slugs do not match canonical backend slugs;
- objectives remain template-derived even when curated content exists.

### Web BroBot chat flow

```text
/api/brobot/chat
  -> generic chat intent pipeline
  -> infer a CasePrep slug from text/mappings
  -> GET registry procedure
  -> admit live certified or live uncertified content
  -> select up to 5 sections, truncate each to 520 characters
  -> add packet to generic OpenAI prompt
  -> quality gate / revision / metadata passes
  -> persist conversation, tags, usage and evaluator job
```

The system prompt explicitly states “You are NOT CasePrep.” Curated material is optional context, not an authoritative answer source.

### Legacy web generated Case Prep

```text
/brobot/basic
  -> /api/brobot/ask
  -> POST backend /case-prep
  -> default V1 RAG/GPT
  -> optional case_prep_logs feedback
```

This is active duplication and bypasses V2.

### Factory flow

```text
procedure folder + source libraries
  -> extract_knowledge
  -> rule-based synthesis and optional LLM synthesis
  -> QA scoring
  -> generation_meta.json
  -> modules.json + manifest needs_review
  -> web/CLI human section review
  -> approve
  -> deterministic compile to certified_payload.draft.json
  -> guarded compile --promote to certified_payload.json
  -> certify manifest
  -> guarded runtime promotion
  -> rebuild registry index/export
```

### Review/publication flow

There are two state systems:

1. Backend files and audit log:
   - manifest lifecycle;
   - modules;
   - generated metadata;
   - compiled draft/live payload;
   - append-only lifecycle audit log.
2. Web Supabase section reviews:
   - one mutable row per procedure and section;
   - reviewer allowlist and role hierarchy;
   - required-section approval gate.

They are not bound by a shared revision ID or content hash.

## Active, legacy, duplicate, partial, and abandoned systems

| Component | Classification | Finding |
|---|---|---|
| Backend V1 engine | Active/default legacy | Production default RAG/GPT |
| Backend V2 curated engine | Active/opt-in | Correct target architecture |
| Per-procedure registry | Active | 60 procedures, 24 live |
| Content factory | Active/early | Real pipeline; only 2 current factory metadata artifacts |
| Registry review API | Active | Read/edit/certify |
| Factory promotion API | Active | Guarded runtime promotion |
| Web Case Readiness | Active | Main preparation UX, not curated-first |
| Web generic BroBot chat | Active | Optional registry grounding |
| `/brobot/basic` and `/api/brobot/ask` | Active legacy duplication | Generated prep using V1 |
| Removed `/reference/case-prep` | Abandoned/legacy | Present only in git history |
| Old anatomy/playbook/RAG files | Archived plus residual legacy | Large maintenance surface remains |
| KG factory in web repo | Adjacent, not Case Prep factory | Should not become a runtime dependency |

## Curated content assessment

### Inventory

- 60 canonical procedure folders;
- 24 live certified;
- 32 partial;
- 2 draft;
- 2 missing;
- seven specialty groups;
- per-procedure manifests, aliases, sources, modules, payloads, and review notes.

### Scores

| Dimension | Score |
|---|---:|
| Content schema | 76/100 |
| Retrieval | 61/100 backend; 25/100 end-to-end web |
| Usability | 56/100 |
| Maintainability | 58/100 |

Overall curated content support: **58/100**

### Schema strengths

The registry is practical and procedure-focused:

- indications;
- setup and positioning;
- approach landmarks;
- surgical layers;
- structures at risk with avoidance and consequence;
- implant strategy;
- reduction/fluoroscopy checkpoints;
- pitfalls;
- attending questions;
- postoperative plan;
- sources, provenance, limitations and warnings.

This is much closer to tomorrow’s-case preparation than a generic curriculum graph.

### Schema and content gaps

The schema does not explicitly require:

- operative objective and procedure sequence;
- decision pivots and bailout thresholds;
- resident responsibilities by phase;
- “things to say/ask” during the case;
- attending preference variability;
- after-case learning;
- learner-level variants;
- claim-level provenance for all simple bullet sections.

### Content-type coverage

- Procedure preparation: strong schema support.
- Approach preparation: strong within procedure records, but no standalone `posterior_hip_approach` identity; it is represented as `tha_posterior`.
- Fracture preparation: procedure-oriented fracture ORIF records exist, but diagnosis/classification/treatment selection is not consistently first-class.
- Diagnosis preparation: weak.
- Postoperative management: schema exists, but migrated content is often semantically wrong.

### Learner levels

The curated payload is shared across student, intern, junior, and senior levels. Adaptation occurs in BroBot prompting, not editorial content. A beta can use one trusted core plus level-specific presentation rules, but critical senior-level decision/bailout content should not be generated from thin core content.

### Content quality findings

Representative certified records have useful, practical anatomy and approach detail. They also show major curation debt:

- `distal_radius_fracture_orif` contains a knee/ACL landmark in its approach landmarks, a clear cross-topic contamination not caught by current validation.
- `distal_radius_fracture_orif` uses generic pitfalls and has no implant strategy or fluoroscopy checkpoints despite being an ORIF.
- `acl_reconstruction` has good tunnel/structure content but no indications, graft-selection framework, implant strategy, or rehabilitation protocol.
- `tha_posterior` is a strong posterior exposure/anatomy packet, but its “postop plan” is a study checklist.
- many payload overviews expose manufacturing language such as “Certified. Score 4. Source-backed from v3,” which feels machine-generated rather than curated product copy.
- migrated “night_before_review_checklist” content is mapped into the registry’s `postop_plan`, creating a systematic semantic mismatch.

## Representative case evaluation

| Case | Registry result | Factory/readiness finding |
|---|---|---|
| Carpal tunnel release | Canonically resolves, but partial, 0 coverage, empty modules, no sources | Not beta-ready; factory has no material to produce a trustworthy draft |
| Distal radius ORIF | Certified/live, 90 coverage | Useful anatomy; cross-topic contamination, no indications, weak fixation/fluoro content, incorrect postop semantics |
| Total hip arthroplasty | Resolves generically to `tha_posterior` | Posterior approach content is live and practical; generic THA silently assumes posterior approach |
| ACL reconstruction | Certified/live, 90 coverage | Good anatomy/tunnel content; missing indications, graft/implant decision content and real postop protocol |
| Posterior hip approach | Exact requested phrase does not resolve | Equivalent content exists as `tha_posterior`; alias/identity gap |

## Factory assessment

Score: **62/100**

### Strengths

- true extract/synthesize/QA/review/compile pipeline;
- optional LLM uses a source-only prompt;
- deterministic payload compiler;
- dry-run support;
- certified procedures refuse regeneration unless explicitly forced;
- default compilation writes `certified_payload.draft.json`, not live payload;
- live payload overwrite requires approved/certified status and actor;
- blocking QA issues prevent approval/promotion;
- runtime promotion is a separate action;
- state-changing lifecycle actions append to an audit log;
- promotion can be overridden only with a persisted reason.

### Weaknesses

- extraction is from existing local libraries, not a robust evidence-ingestion workflow;
- source coverage is sparse for many procedures;
- rule-based synthesis creates generic unsupported defaults, including generic postoperative protocols and placeholder-like indications;
- optional LLM failure silently falls back to rule-based synthesis;
- generated modules overwrite `modules.json`; forced generation on a certified procedure can replace the editable reviewed source while leaving the old live payload active;
- there is no immutable module revision directory or automatic pre-generation snapshot;
- duplicate detection is limited to text deduplication within extraction, not semantic duplicate cases or overlapping aliases;
- only 2/60 procedures contain current generation metadata, so most content predates the current factory;
- QA scores are heuristic and can miss clinically obvious contamination;
- no standardized reviewer packet showing old-versus-new diffs.

The factory can scale first drafts, but cannot yet be trusted to scale approved content without stronger evidence capture and immutable revisioning.

## Review assessment

Score: **55/100**

### Strengths

- reviewer allowlist and roles;
- internal API key guard fails closed outside local environments;
- section-by-section editing;
- required-section approval check;
- certification and promotion are separate backend operations;
- atomic single-file JSON replacement;
- validation warnings and coverage scoring;
- append-only lifecycle audit events;
- explicit override reasons.

### Weaknesses

- web review state stores one active mutable row per section; a later reviewer replaces the prior decision and identity;
- the Supabase policy allows any active reviewer to update any section review row, while frontend role checks are the only finer authorization;
- section approval is not tied to a module hash, payload hash, or revision ID;
- editing an approved section does not automatically invalidate its approval;
- lifecycle audit logs do not record every section edit or review decision;
- no first-class diff, revision history, rollback, supersession, or staged snapshot;
- “move bullet” performs two separate backend writes and can leave content removed from the source if the destination update fails;
- certification endpoint can certify without checking backend validation or factory blocking issues; the web only checks section approvals;
- backend overrides are powerful and operationally legitimate, but need stronger policy/alerting before beta.

Reviewed content is better protected than the prior audit concluded, but not enough to guarantee that the exact published bytes are the exact reviewed bytes.

## Fallback RAG assessment

| Dimension | Score |
|---|---:|
| Retrieval quality | 45/100 |
| Safety | 42/100 |
| Grounding | 38/100 |
| Usefulness as fallback | 50/100 |

Overall: **44/100**

### What exists

- Pinecone retrieval;
- query refinement;
- snippet retrieval;
- GPT filtering/reformatting;
- explicit V2 fallback metadata;
- feature flags;
- graceful unavailable/no-result behavior.

### Main problems

- V1 is fallback technology operating as the default product;
- retrieval does not visibly enforce canonical procedure/approach filters;
- answer payloads do not include user-facing citations to retrieved chunks;
- chunking/index provenance and ranking evaluation are not represented in this repository’s runtime contract;
- hallucination prevention is prompt-based;
- separate anatomy generation can introduce unsupported content;
- no request cache is visible in the CasePrep backend;
- no durable fallback event logging or future-curation linkage exists.

V2 correctly treats RAG as fallback in code. Production does not.

## Demand collection assessment

Existing:

- legacy prompt/response/helpfulness logs in web;
- BroBot conversations, messages and tags;
- usage events;
- training level and mode in BroBot;
- automated answer-quality evaluations;
- source-gap queues for editorial source acquisition.

Missing:

- canonical requested case on every Case Prep event;
- curated hit/miss/fallback outcome;
- matched content revision/hash;
- resolver confidence and alternatives in analytics;
- fallback reason and retrieved source IDs;
- repeat demand aggregation;
- case-readiness completion by topic;
- satisfaction segmented by curated versus fallback;
- manufacturing queue linked to demand;
- draft/review/publish status linked back to demand.

The existing source-gap queue is content-supply-driven, not user-demand-driven.

## Production readiness matrix

| Issue | Severity | Evidence | Recommended fix | Beta blocker |
|---|---|---|---|---|
| Production defaults to V1 | Critical | Config default `v1`; web ask calls `/case-prep` | Make web explicitly call V2, then canary default | Yes |
| Web canonical slugs are wrong | Critical | Hyphens/generic names versus underscore registry slugs | Share generated canonical contract or resolve server-side | Yes |
| Case Readiness is template-first | Critical | Objectives built from curriculum templates | Render published payload/modules as primary document | Yes |
| Generic chat is not source-authoritative | High | Curated packet is optional/truncated; prompt says not CasePrep | Add dedicated Case Prep chat contract | Yes |
| Live draft context permitted in chat | High | Web admits `caseprep_draft` for live content | Certified published content only | Yes |
| Certified content defects | Critical | Missing indications, false postop semantics, contamination | Re-review narrow launch set with revised rubric | Yes |
| Carpal tunnel release absent | High | Empty modules/no sources | Curate before launch if in beta set | Scope-dependent |
| Posterior hip phrase unresolved | High | Resolver returns none | Add alias/canonical approach mapping | Yes for requested launch set |
| Generic THA assumes posterior | High | Alias resolves “THA” to `tha_posterior` | Require approach selection/clarification | Yes |
| Approval not tied to revision | Critical | Supabase reviews have no content hash | Immutable revisions and hash-bound approvals | Yes |
| Section review overwritten | High | One mutable row per procedure/section | Append-only review event ledger | Yes |
| Edits do not invalidate approval | Critical | Independent modules file and review table | Invalidate on content hash change | Yes |
| Move is non-transactional | High | Two section PATCH requests | Single backend atomic move | Yes |
| Payload hash drift | High | 3/24 certified manifests mismatch actual payload | Validate hashes as blocking runtime gate | Yes |
| Validator misses clinical contamination | High | ACL landmark in distal-radius content passed | Add cross-procedure semantic/adversarial checks | Yes |
| No real postoperative protocols | High | Study checklist stored as postop plan | Separate pre-case checklist and postop protocol | Yes |
| No demand queue | High | No structured hit/miss event | Add append-only demand events and admin ranking | Yes |
| No visible citations in RAG fallback | High | Retrieval metadata not returned as citations | Return and render source citations | Yes |
| Factory environment not reproducible locally | Medium | No venv; tests cannot start | Add lockfile/container/bootstrap + CI | Yes |
| CORS allows all origins | Medium | Backend middleware `allow_origins=["*"]` | Restrict production origins | Yes |
| API startup assumes OpenAI | Medium | OpenAI client initialized unconditionally | Allow curated-only startup without OpenAI | Yes |
| No cache/latency controls for V2 resolver/fallback | Medium | File cache only; no request/retrieval cache | Add resolver and fallback cache/metrics | No |
| Legacy and archived surface area | Medium | Multiple pipelines/data generations remain | Isolate V1 and delete after migration window | No |

## Correct production architecture

```text
User requests case
  -> one canonical resolver shared by web and backend
  -> published certified revision exists?
       YES
         -> serve curated Case Prep document directly
         -> pin revision/hash to session
         -> BroBot follow-ups answer from that revision
         -> clearly label curated source
         -> collect completion, questions and satisfaction
       NO
         -> bounded RAG from approved sources
         -> return citations and fallback label
         -> log structured demand event
         -> aggregate topic into editorial queue
         -> draft -> review -> stage -> publish
```

Do not add the web knowledge graph to this runtime decision. The existing registry and alias resolver are sufficient.

## Prioritized implementation plan

### Phase 0 — critical blockers

1. Create one shared canonical Case Prep resolver contract.
   - Remove hard-coded web slug translation.
   - Use backend canonical slugs and aliases.
   - Distinguish procedure from approach.
2. Route the web Case Prep product explicitly to V2.
   - Do not rely on backend default-version configuration.
   - Return and persist source/status/revision metadata.
3. Make Case Readiness curated-native.
   - Certified hit: render registry modules/payload directly.
   - Miss: show labeled fallback.
4. Create a dedicated Case Prep BroBot mode.
   - Certified content is primary and binding.
   - No `caseprep_draft` in user runtime.
5. Introduce immutable revisions.
   - revision ID and content hash;
   - approvals tied to revision;
   - edits create a new revision and invalidate approval;
   - explicit staged/published revision;
   - rollback pointer.
6. Repair launch-set content.
   - indications;
   - postoperative protocol;
   - approach identity;
   - decision/bailout content;
   - contamination review.
7. Make payload hash mismatch a blocking live validation.
8. Add structured demand-event logging.
9. Restore a reproducible backend environment and green CI.

### Phase 1 — first beta

1. Launch a narrow certified set rather than all 24.
2. Include the five representative cases only after clinical re-review.
3. Add explicit sections:
   - operative objective;
   - indications/contraindications;
   - setup;
   - approach;
   - steps;
   - anatomy at risk;
   - decision points and bailouts;
   - attending questions;
   - resident responsibilities;
   - things to say/ask;
   - postoperative expectations;
   - after-case review.
4. Implement cited, procedure-filtered RAG fallback.
5. Add E2E tests across both repositories:
   - curated hit;
   - ambiguous approach;
   - curated miss;
   - registry outage;
   - RAG outage;
   - edited-after-approval invalidation;
   - publish and rollback.
6. Retire or redirect `/brobot/basic`.

### Phase 2 — demand-driven scaling

1. Rank topics by unique users, repeat misses, training level, dissatisfaction and fallback cost.
2. Create a minimal editorial queue:
   - requested;
   - prioritized;
   - drafting;
   - reviewing;
   - staged;
   - published;
   - declined.
3. Generate drafts into immutable new revisions.
4. Add reviewer diff packets and source-by-claim displays.
5. Track curated-hit rate and fallback rate over time.
6. Promote common follow-up questions into curated modules.

### Phase 3 — operational maturity

1. Content ownership and review SLA.
2. Re-review/freshness dates.
3. Source monitoring and provenance audits.
4. Canary publication and rollback.
5. Reviewer calibration and disagreement review.
6. Cost, latency, retrieval, miss and quality dashboards.
7. Remove V1 after all supported clients migrate.

## Final question

> How close is BroBot Case Prep to becoming a curated-first orthopaedic case preparation platform where real user demand continuously drives what gets curated next?

The backend is approximately **70% of the way to the desired curated-first technical architecture**. The end-to-end product is approximately **45% of the way there**.

The hardest foundational work is already present: a curated registry, certified runtime gate, deterministic compiler, controlled fallback engine, review UI, explicit promotion, and analytics infrastructure. The missing work is now mostly consolidation and operational safety.

It is not yet demand-driven. User misses and fallback usage do not create a canonical editorial queue, and the web product does not reliably consume the curated backend. Once V2 becomes the explicit Case Prep route, canonical identity is unified, launch content is repaired, and fallback events become manufacturing demand, BroBot can become the intended flywheel without introducing a larger curriculum or knowledge-graph architecture.

**INTERNAL_ALPHA_READY**
