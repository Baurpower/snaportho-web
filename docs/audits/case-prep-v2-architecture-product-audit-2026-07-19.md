# Case Prep V2 Architecture and Product Audit

Date: 2026-07-19

## Executive verdict

Case Prep V2 is now a credible **curated-content delivery path**, but it is not yet the definitive resident preparation platform described in the product vision.

The most important progress since the 2026-07-16 production-readiness audit is real:

- Case Readiness calls `/case-prep/v2` explicitly rather than relying on the legacy default.
- Certified content is rendered as the primary document instead of being supplemental to a generic curriculum template.
- A Case Prep session can be pinned to `canonical_slug`, `revision_id`, and `payload_hash` for stable follow-up answers.
- Generic BroBot now rejects draft, partial, deprecated, and non-live Case Prep content.
- The V2 response contract explicitly distinguishes curated, RAG fallback, clarification, and unavailable states.

Those changes move the end-to-end product from roughly 45% to approximately **55% of the intended V2 architecture**. The backend foundation is closer to 70%. The user experience is still an internal alpha because the system assembles one curated payload, not a resident-specific educational packet.

The decisive missing layer is a **Case Prep orchestrator** that assembles, ranks, caches, and tracks multiple typed resources around one canonical case identity:

```text
Case identity + learner + time budget
  -> instant certified core + cached High Yield Facts
  -> KG-derived concepts, anatomy, decisions, and complications
  -> optional questions, cards, videos, and literature
  -> BroBot grounded in the exact assembled packet
  -> learning events update mastery and the next packet
```

Do not rewrite all content or expand the UI first. Establish the identity, resource, retrieval, packet, telemetry, and publication contracts. Then improve a narrow launch cohort under a stronger clinical rubric.

## Evidence boundary

This audit directly inspected the current `snaportho-web` runtime, routes, schemas, UI, Supabase migrations, KG production access, Anki/KG mapping system, review tooling, and prior audit artifacts.

The separate `snaportho-caseprep` repository was not present in this workspace on 2026-07-19. Backend registry and Pinecone conclusions therefore combine:

- the verified 2026-07-16 cross-repository audit;
- the current web-to-backend contracts;
- current web behavior and integration evidence.

The certified-content inventory below is the last verified registry snapshot: 60 procedure records, 24 certified/live, 32 partial, 2 draft, and 2 missing. It must be regenerated from the backend before launch because the current workspace cannot prove that those counts or individual payloads remain unchanged.

No clinical content was rewritten as part of this audit.

## 1. Current architecture audit

### Runtime map

```text
Prepare curriculum/search
  -> /student-workspace/case-readiness/[topicId]
  -> topic title sent to web Case Prep V2 client
  -> backend /case-prep/v2
      -> canonical resolver
      -> certified curated payload OR labeled fallback/clarification/unavailable
  -> generic payload-to-text flattening
  -> certified: CuratedCasePrepDocument
  -> non-certified: deterministic StudyGuideSection templates

Pinned follow-up
  -> revision/hash-bound session
  -> /case-prep/v2/follow-up
  -> curated answer or not-in-curated-packet

Generic BroBot
  -> separate text-to-slug inference
  -> separate registry fetch
  -> top five sections, 520 characters each
  -> generic chat answer pipeline

Knowledge Graph
  -> production neighborhood RPC/API
  -> entities + relationships + claims + decision points + curriculum bridges
  -> not consumed by Case Readiness or its pinned follow-up contract

Pocket Pimped
  -> backend Pinecone is legacy/fallback retrieval
  -> Anki import and KG mapping exist in web/Supabase
  -> neither is an instant, typed High Yield Facts module in Case Prep
```

### Subsystem inventory and disposition

| Subsystem | Current state | Strengths | Weaknesses / debt | Decision |
|---|---|---|---|---|
| Routing | V2 is explicit in Case Readiness and has dedicated web proxy routes | Correct version boundary; labeled outcomes; server-side auth identity | Generic BroBot and legacy `/api/brobot/ask` remain separate paths; 45-second timeout is incompatible with an instant first view | Keep V2 routes; retire/redirect legacy; converge chat through one orchestrator |
| Canonical identity | Backend resolver returns slug, kind, approach, confidence, alternatives | Better than hard-coded direct registry lookup; supports clarification | Web still contains a second hyphenated mapping/resolver for generic BroBot; curriculum topic IDs, registry slugs, KG slugs, and asset IDs are not one contract | Replace duplicate resolvers with a shared `CaseIdentity` service and alias table |
| V2 response model | Explicit curated/fallback/unavailable metadata, revision, hash, citations | Strong safety and observability primitives | `payload` is `unknown`; no typed modules, resource summaries, freshness, latency, or partial-result envelope | Evolve rather than replace |
| Curated registry | Last verified: 60 records, 24 live certified | Procedure-specific anatomy, approach, risks, questions; certified runtime gate | Quality inconsistency, semantic field misuse, missing indications, no immutable content revision system proven end-to-end | Keep as authoritative core, repair lifecycle and launch content |
| Case Readiness UI | Certified payload is primary; fallback templates remain | Clear trusted-core label; citations; fast/deep curriculum fallback | Generic JSON flattening destroys hierarchy; long document; no High Yield first; no progressive disclosure; progress denominator remains hidden template sections even when those sections are not rendered | Replace renderer and progress semantics; keep shell/navigation |
| Deterministic study guides | Rich topic-type templates and stable completion IDs | Useful fallback and non-procedure curriculum support | A parallel content system; extensive hard-coded topic logic; not derived from KG or resource graph | Keep for non-procedure curriculum and fallback; stop treating as certified Case Prep core |
| BroBot pinned follow-up | Revision/hash-bound contract exists | Excellent foundation for stable, source-aware conversation | Not visibly embedded in curated document; only curated/not-in-packet response; no KG or Pocket supplementation contract; no learner history | Keep and extend to packet-bound BroBot |
| Generic BroBot Case Prep context | Certified-only registry context, mode ranking | Draft leakage fixed; useful mode-sensitive section selection | Separate slug resolver; arbitrary five-section/520-character truncation; no revision/hash binding; no KG or learner state | Replace with the packet context service |
| Pocket Pimped Pinecone | Last verified as legacy V1/fallback retrieval | Existing corpus and vector infrastructure; potential for rapid fact recall | Not the first module; no visible index/chunk/version contract; weak filtering/citations/evaluation; unknown cache/latency; procedure filtering not proven | Rebuild as a dedicated High Yield retrieval product, not generic fallback RAG |
| Pocket Pimped Anki import | Cards imported; mapping/review tooling and reports exist | Valuable structured high-yield corpus; KG mapping workflow; card identity | Runtime Case Prep does not query it; deterministic mapping has gaps; card text is not normalized into fact claims | Keep; use as a governed source feeding facts/cards, not as raw UI content |
| Production KG | Versioned release, neighborhoods, entities, relationships, claims, decisions, bridges, review/provenance/risk metadata | Strongest differentiator; has governance and canonical objects | Only exposed by standalone APIs; topic search is lexical; Case Prep does not traverse or rank it; asset attachments are not generalized | Keep and make it the assembly backbone, not the source of prose |
| Educational assets | Anki mappings and imported Orthobullets question work exist in adjacent systems | Important source inventory already exists | No generalized resource/attachment model for videos, articles, questions, cards, anatomy modules, pearls, or related cases | Add a typed resource graph and attachment model |
| Progress | Topic completion IDs, selected time, BroBot session count | Stable IDs and persistence | Measures clicks/completion, not knowledge; confidence is local UI state; no question outcome, concept mastery, exposure, or forgetting model | Keep raw event history; replace completion-only learner model |
| Personalization | Recommendations use curriculum completion and static relationships | Useful navigation seed | Does not elevate repeated questions, misses, low-confidence concepts, or upcoming cases; no mastery estimates | Build learner-concept state from append-only events |
| Review | Reviewer roles, section review, edit/certify UI | Real human-review workflow | Mutable approvals, approval/content hash separation, no complete diff/rollback, edits may not invalidate decisions, two-write bullet move | Replace state mutation with immutable revisions and append-only review events |
| Certification/publication | Backend gate, live/certified signals, payload hash/revision in V2 | Correct conceptual separation of draft and runtime | Prior snapshot had 3/24 payload hash drifts; web certification checks and backend lifecycle were not a single transaction | Keep state machine; make hash-bound publication atomic and blocking |
| Analytics/demand | Legacy feedback log plus curriculum progress and BroBot telemetry | Existing event infrastructure | `case_prep_logs` stores opaque response JSON and lacks user/case/revision/retrieval fields; no demand-to-editorial queue | Replace with structured append-only Case Prep events |
| Runtime reliability | Explicit errors, graceful unavailable state, backend timeouts | Does not silently present failures as curated | Server rendering waits for backend; no instant shell/high-yield cache/stale-safe core; no demonstrated latency SLOs | Introduce staged response, cache, budgets, and instrumentation |

### What should be deleted or isolated

- Retire the legacy V1 Case Prep path after client migration.
- Delete the second Case Prep slug inference in generic BroBot once all callers use `CaseIdentity`.
- Stop importing registry content into BroBot through arbitrary character truncation.
- Stop using one mutable review row as the history of a section.
- Keep curriculum study-guide templates, but clearly isolate them from certified procedure preparation.
- Do not make the KG a synchronous requirement for the first meaningful paint. Cached derived modules should shield the user from graph latency or outages.

## 2. Curated content audit

### Overall judgment

The certified set contains valuable attending-like material, especially in anatomy, exposures, structures at risk, and practical questions. It does **not** consistently read like one attending teaching a resident how to think through tomorrow's operation.

It often feels AI-generated because it exhibits recognizable manufacturing artifacts:

- schema-first organization rather than a deliberate teaching arc;
- similar bullet cadence across unrelated procedures;
- generic pitfalls without mechanism, detection, recovery, or consequence;
- facts presented without a decision they change;
- missing variability and attending preference;
- weak connection between indication, plan, operative step, bailout, and postoperative consequence;
- process labels such as certification scores leaking into learner-facing prose;
- study/checklist content stored under `postop_plan`.

### Last verified certified-cohort findings

All 24 certified procedures require re-review under the new rubric before being called attending-certified:

| Finding | Verified scope | Why it matters |
|---|---:|---|
| Missing indications | 23/24 | The learner cannot connect patient selection to the operation |
| Payload/manifest hash mismatch | 3/24 | Published bytes may not be the reviewed bytes |
| Postoperative semantic mismatch | Multiple; systematic migration pattern | Night-before study instructions are presented as patient management |
| Learner-level adaptation | 24/24 share one core | Senior judgment cannot be recovered reliably from thin bullets |
| Explicit bailout framework | Not required by schema | The content teaches an ideal path, not surgical judgment under failure |
| Attending preference/controversy | Not first-class | Learners cannot distinguish invariant safety from preference-sensitive technique |

### Representative certified procedures

| Procedure | Attending-quality strengths | Weaknesses that feel generated | Re-review priority |
|---|---|---|---|
| Distal radius fracture ORIF | Useful anatomy and practical exposure content | ACL/knee landmark contamination; no indications; generic pitfalls; weak implant, fixation strategy, and fluoroscopy checkpoints; false postop semantics | Critical; do not ship unchanged |
| ACL reconstruction | Strong tunnel and structures-at-risk content | Missing indication framework, graft-selection reasoning, fixation/implant decisions, tunnel bailout strategies, and real rehab protocol | Critical |
| THA posterior | Strong posterior exposure and anatomy packet | Generic THA identity silently collapses to one approach; limited patient/implant decisions; postop section is a study checklist | Critical |

### Representative non-certified gaps

| Procedure | State in last verified snapshot | Implication |
|---|---|---|
| Carpal tunnel release | Partial, empty modules, no sources | The flagship hand case was not usable despite resolving canonically |
| Posterior hip approach | Content existed under `tha_posterior`, but phrase did not resolve | Procedure and approach identity were conflated |

### Content improvement strategy

Do not bulk-rewrite the 24 certified procedures. Re-certify a launch cohort of 5–8 cases through a new content contract.

Each core guide should answer, in this order:

1. **Operative thesis** — one sentence: what problem the operation solves and the biomechanical/anatomic objective.
2. **Indication and alternatives** — why this patient gets this operation; why not the major alternatives.
3. **Plan-changing inputs** — imaging, pattern, bone quality, soft tissue, comorbidity, and attending preference.
4. **Setup and exposure** — position, landmarks, intervals, structures at risk, and protection strategy.
5. **Procedure flow** — phases and checkpoints, not an exhaustive dictated-op-note sequence.
6. **Decision points** — condition, options, preferred choice, rationale, and evidence/attending variability.
7. **Failure recovery** — early warning, immediate action, bailout, and consequence.
8. **How to sound prepared** — concise answers, questions to ask, and what the resident should anticipate.
9. **Postoperative plan** — restrictions, prophylaxis, imaging, wound, milestones, and red flags.
10. **After-case reflection** — what happened, which decision differed, and what to reinforce.

Every item should be classified as one of:

- invariant safety principle;
- evidence-supported recommendation;
- common practice;
- attending preference;
- institution-specific workflow.

The review rubric should score clinical correctness, decision usefulness, operative realism, teaching sequence, specificity, redundancy, bailout coverage, provenance, and learner fit. A numerical factory QA score must never substitute for a clinician's approval of the exact content hash.

## 3. Critical weaknesses

Ranked by impact on the ten-minute resident experience:

1. **No instant High Yield Facts layer.** The page begins with a status/header and then the full curated document. Pocket Pimped is not a product module.
2. **No educational packet assembler.** Curated content, KG, cards, questions, and BroBot remain adjacent systems.
3. **No unified canonical identity.** Case Prep, curriculum, BroBot, KG, and assets can resolve the same topic differently.
4. **Certified does not yet mean attending-quality.** The prior certified cohort contains missing core domains and clear contamination.
5. **The renderer erases the content model.** `payload: unknown` is generically flattened into paragraphs, losing question/answer, risk, decision, source, and hierarchy semantics.
6. **BroBot is only partly integrated.** The pinned contract is strong, but the UI and general BroBot path still do not share one packet.
7. **KG value is mostly unused.** Case Prep does not consume its claims, decisions, anatomy, relationships, or curriculum bridges.
8. **Personalization measures activity, not mastery.** Completion checkboxes and session counts cannot drive adaptive education.
9. **Publication proof is incomplete.** Reviews must be immutable and bound to the exact published hash.
10. **No latency architecture.** A 45-second synchronous backend allowance is the opposite of “ten minutes before surgery.”

## 4. Proposed Case Prep V2 architecture

### Product boundary

Case Prep is an assembled, versioned learning session—not a page and not a single document.

```text
Case request
  -> Case Identity Service
  -> Case Prep Orchestrator
       -> Published Core Guide Store
       -> High Yield Facts Service
       -> KG Neighborhood Service
       -> Educational Resource Catalog
       -> Learner State Service
       -> Ranking / time-budget policy
  -> immutable CasePrepPacket
  -> web/mobile renderer + packet-bound BroBot
  -> append-only learning events
  -> mastery update + editorial demand queue
```

### Core contracts

#### CaseIdentity

```ts
type CaseIdentity = {
  caseId: string;
  canonicalSlug: string;
  entityKind: "procedure" | "approach" | "diagnosis" | "case_pattern";
  procedureId?: string;
  approachId?: string;
  diagnosisIds: string[];
  kgEntityIds: string[];
  aliases: string[];
  requiredClarifications: string[];
};
```

This mapping belongs in one governed database/service. Generate TypeScript/Python clients from the contract; do not maintain hand-authored slug maps in multiple repositories.

#### CasePrepPacket

```ts
type CasePrepPacket = {
  packetId: string;
  caseIdentity: CaseIdentity;
  coreRevision: { revisionId: string; payloadHash: string };
  learnerSnapshotId: string;
  timeBudgetMinutes: number;
  generatedAt: string;
  expiresAt: string;
  modules: PacketModule[];
  sourceManifest: SourceManifestEntry[];
  assemblyTrace: { latencyMs: Record<string, number>; degradedSources: string[] };
};
```

The packet is immutable for the session. New data creates a new packet; it does not mutate the context underneath an active BroBot conversation.

#### PacketModule

Use typed modules, not arbitrary JSON:

- `high_yield_facts`
- `operative_thesis`
- `indications_alternatives`
- `mental_model`
- `decision_points`
- `setup_exposure`
- `procedure_flow`
- `anatomy_at_risk`
- `pitfalls_bailouts`
- `attending_questions`
- `postop_plan`
- `knowledge_concepts`
- `questions`
- `flashcards`
- `videos`
- `articles`
- `related_cases`
- `reflection`

Each module carries provenance, review tier, freshness, estimated minutes, learner level, relevance score, and source-specific IDs.

### Source authority hierarchy

1. Attending-certified core revision for procedure-specific guidance.
2. Attending/curator-reviewed KG claims and decision points.
3. Governed Pocket Pimped facts/cards linked to canonical concepts.
4. Reviewed questions and educational assets.
5. Cited retrieval from approved sources for explicit gaps.
6. Model synthesis only to organize or explain supplied evidence; never to invent core clinical facts.

Conflicts do not get blended. The packet flags them as preference, controversy, or unresolved conflict.

### Performance design

Target service levels:

- page shell and cached core: p95 under 500 ms;
- High Yield Facts: p95 under 800 ms, with stale-safe cache;
- complete above-the-fold packet: p95 under 1.5 s;
- deep resources: progressive load under 3 s;
- BroBot first token: p95 under 2 s after packet load.

The certified core and a precomputed High Yield module should be cached by `caseId + coreRevision + factsIndexVersion + learnerBand`. KG enrichment and deep assets may stream later. The first view must survive Pinecone, KG, and LLM outages.

## 5. Recommended retrieval pipeline

### High Yield Facts pipeline

Pocket Pimped retrieval should be a separate bounded service, not the old general RAG fallback.

#### Offline ingestion

1. Parse cards/chunks into atomic candidate facts.
2. Preserve note/card/chunk identity, deck branch, source edition, media, and answer relationships.
3. Map candidates to canonical KG concepts and case identities.
4. Classify fact type: anatomy, landmark, safety, decision, board pearl, mnemonic, pimp question, complication.
5. Deduplicate exact and semantic equivalents.
6. Flag contradictions and version drift.
7. Human-review high-risk facts; publish an index version.

Embedding raw long card bodies is insufficient. Retrieval units should be atomic, source-preserving, and display-ready.

#### Online retrieval

1. Resolve the case and approach before vector search.
2. Expand the query deterministically from canonical identity, KG synonyms, anatomy, and procedure phase.
3. Apply hard metadata filters: published index, specialty, case/procedure/concept IDs, learner band, fact type, and source status.
4. Retrieve hybrid candidates: exact tag/alias + BM25/lexical + vector similarity.
5. Rerank using semantic match, graph distance, fact importance, review tier, diversity, and learner weakness.
6. Enforce diversity caps so anatomy does not crowd out decisions, safety, and questions.
7. Return 8–12 facts with stable IDs and provenance—no LLM rewrite required on the hot path.
8. Cache the base result; personalize ordering locally from learner-concept state.

Suggested score:

```text
0.30 semantic relevance
+ 0.20 canonical/metadata match
+ 0.15 KG proximity
+ 0.15 editorial importance
+ 0.10 review/provenance quality
+ 0.10 learner need
- redundancy penalty
- stale/conflict penalty
```

Do not hide the component scores during evaluation. Calibrate them from resident usefulness judgments and retrieval failures rather than assuming the weighted score is a probability.

### Retrieval budgets and degradation

| Source | Hot-path budget | Degraded behavior |
|---|---:|---|
| Certified core | 250 ms | Serve last verified revision |
| High Yield cache/index | 500 ms | Serve cached non-personalized facts |
| KG neighborhood | 400 ms | Omit graph enrichment; never block core |
| Learner state | 150 ms | Use training-level default ordering |
| Deep assets | 1,500 ms async | Load on expansion |
| LLM | Not required for first view | BroBot unavailable/retry; core remains usable |

### Evaluation set

Build a clinician-labeled test set for at least the launch cases, including ambiguous and adversarial queries. Measure:

- canonical resolution accuracy and clarification rate;
- Recall@20 and nDCG@10 for relevant facts;
- duplicate rate in top 10;
- unsupported-fact rate;
- correct approach/patient modifier filtering;
- source diversity;
- cache hit rate and p50/p95/p99 latency;
- resident “useful before this case” rating;
- attending correctness and harmful-omission review.

## 6. Educational resource model

The KG should connect resources; it should not own all resource bytes.

### Resource

```ts
type EducationalResource = {
  resourceId: string;
  type: "core_section" | "fact" | "anatomy_module" | "question" |
    "flashcard" | "video" | "article" | "journal_review" |
    "resident_pearl" | "related_case" | "reflection_prompt";
  title: string;
  bodyRef: string;
  provider: string;
  externalId?: string;
  version: string;
  reviewTier: "unreviewed" | "curator" | "attending";
  publicationStatus: "draft" | "staged" | "published" | "retired";
  provenance: ProvenanceRef[];
  durationSeconds?: number;
  learnerLevels: string[];
  rights?: { display: boolean; deepLinkOnly: boolean; expiresAt?: string };
};
```

### Attachment

```ts
type ResourceAttachment = {
  attachmentId: string;
  resourceId: string;
  targetType: "case" | "procedure" | "approach" | "diagnosis" |
    "kg_entity" | "kg_claim" | "decision_point" | "operative_phase";
  targetId: string;
  relation: "teaches" | "tests" | "demonstrates" | "supports" |
    "contrasts" | "warns_about" | "precedes" | "reinforces";
  relevance: number;
  required: boolean;
  context: Record<string, string | number | boolean>;
  validFrom: string;
  validTo?: string;
};
```

### Why this model matters

- One anatomy module can attach to carpal tunnel syndrome, release, median nerve, and the recurrent motor branch without copying content.
- One question can test multiple concepts while being recommended for a specific case.
- A video can demonstrate an approach but remain distinct from the procedure's certified written guide.
- Rights and provider rules can prevent copied Orthobullets content while allowing a lawful deep link or locally owned question mapping.
- Attachments can be reviewed and versioned independently from resources.

The assembler queries attachments by case/KG neighborhood, then ranks resources by review tier, relevance, time budget, novelty, and learner need.

## 7. BroBot as the intelligent layer

BroBot should open from every module with the current packet already attached. It should not re-resolve the topic or independently re-fetch a truncated registry packet.

The BroBot request should include:

- `packetId` and packet hash;
- current module/resource/fact IDs;
- canonical case and approach;
- learner level and time remaining;
- relevant mastery state;
- conversation history scoped to the case;
- allowed supplemental retrieval policy.

Answer behavior:

1. Answer directly from packet sources when possible.
2. Cite the exact module, claim, fact, or resource.
3. If the answer is absent, traverse the approved KG neighborhood and retrieve approved sources.
4. Clearly label attending preference, controversy, or inference.
5. If evidence is insufficient, say so and offer the safest next question—not a plausible-sounding invention.
6. Log the unresolved question as editorial demand linked to the case and concepts.

Repeated user questions should not immediately rewrite the core guide. They should raise a review candidate: “42 residents asked why osteoporosis changes fixation; existing packet coverage is weak.”

## 8. Knowledge Graph integration

The production KG already returns entities, relationships, curriculum bridges, claims, and decision points with review/provenance/risk metadata. Case Prep currently uses effectively none of that at runtime.

Use it for:

- canonical concept expansion and synonyms;
- anatomy-at-risk neighborhoods;
- decision point and option/rationale assembly;
- complication mechanism and prevention links;
- prerequisite concepts and curriculum bridges;
- related-case recommendations;
- resource attachment discovery;
- conflict detection and provenance display;
- concept-level learner state.

Do not use it to:

- generate an unbounded graph visualization for a resident before a case;
- replace the attending-certified narrative core;
- synchronously block the first view;
- infer high-risk recommendations from unreviewed edges.

The correct interaction is **curated core sets the teaching spine; KG supplies reusable concepts and relationships; resources attach to those objects; the assembler selects the ten-minute packet**.

## 9. Resident workflow

### Ten-minute default

0:00–0:45 — **High Yield Facts**

- 8–12 scannable facts, with anatomy/safety/decision diversity.
- Tap to reveal source or expand the related concept.

0:45–1:30 — **Operative thesis and readiness check**

- State the goal in one sentence.
- Three calibration questions produce a starting readiness estimate; do not ask for a vague confidence rating alone.

1:30–3:00 — **Mental model and plan-changing decisions**

- Pattern → goal → construct/approach → checkpoints.
- Patient-specific modifiers first.

3:00–5:30 — **Setup, exposure, and procedure flow**

- Phases with landmarks and anticipated resident actions.

5:30–7:00 — **Pitfalls and bailouts**

- What goes wrong, how to notice early, what to do next.

7:00–8:00 — **How to sound prepared**

- Attending questions, concise answers, and useful questions for the resident to ask.

8:00–9:15 — **Active recall**

- 3–5 questions selected from concepts with highest importance and learner need.

9:15–10:00 — **Last look**

- Missed facts and a personalized scrub-in card.

After the case, a 60-second reflection captures the actual approach, unexpected decision, complication/near miss, and next concept to reinforce.

### Readiness score

Do not present a precise score based on page completion. Start with a labeled estimate—`not assessed`, `developing`, `case-ready`, `strong`—derived from recent concept evidence, calibration answers, and forgetting. Show why: “2 of 3 safety concepts correct; fixation selection not yet assessed.”

## 10. Personalization and longitudinal mastery

### Append-only learning events

Capture:

- packet opened/module viewed/fact expanded;
- question answered with correctness, latency, confidence, and attempt count;
- flashcard review and Anki result;
- BroBot question linked to concepts and whether resolved;
- readiness calibration;
- case performed and role;
- postoperative reflection;
- resource helpfulness;
- fallback/missing-content event.

### LearnerConceptState

Maintain per user/concept:

- exposure count and last exposure;
- correctness and response latency;
- confidence calibration;
- estimated mastery band;
- forgetting/next-review date;
- repeated confusion signals;
- clinical case exposure count;
- evidence provenance used to compute the state.

The packet ranker can then elevate TFCC, scaphoid blood supply, or fixation-in-osteoporosis content for the learner without changing the certified core for everyone.

Anki should contribute review events and provide deep-link/export actions. It should not be the sole learner model because Case Prep also observes questions, conversations, and actual case exposures.

## 11. Orthobullets comparison

This comparison uses Orthobullets' public product descriptions, not assumptions about private implementation.

### Where Orthobullets is better today

- Mature breadth of curated topics, questions, articles, videos, teaching cases, and study plans.
- Proven question history and reinforcement loop.
- Time-based goals, graduated complexity, adaptive calendars, and spaced reinforcement.
- Visible productization of longitudinal mastery and daily learning.

Orthobullets describes Anconeus as selecting important questions a learner is deficient in, progressing from flashcards to board questions and case-based polls, and using time-based goals. Its study plans include large reviewed question, article, video, and teaching-case libraries. Sources: [Anconeus AI](https://www.orthobullets.com/topicview?id=422965&newformat=false), [General MOC study plan](https://www.orthobullets.com/products/322190/general-moc-90-day-study-plan), and [Recon annual study plan](https://www.orthobullets.com/products/422778/recon-annual-study-plan).

### Where SnapOrtho is already better or structurally advantaged

- Procedure-specific certified payloads can encode setup, exposure, structures at risk, pitfalls, and attending questions more directly than a broad reference topic.
- Revision-pinned BroBot sessions can discuss the exact guide the learner is reading.
- The production KG can connect anatomy, claims, decisions, complications, and curriculum concepts rather than relying only on topic membership.
- Pocket Pimped and local Anki mappings can supply resident-native language and high-yield recall.
- Resident schedule/case workflow can drive preparation at the moment of care.

These are architectural advantages, not yet finished product advantages.

### Where SnapOrtho can become dramatically better

- Make tomorrow's operation—not the board blueprint—the primary unit of learning.
- Explain why decisions change for this fracture pattern, bone quality, approach, or attending.
- Combine certified operative judgment, KG relationships, high-yield facts, and conversation in one packet.
- Turn unresolved real resident questions and after-case reflections into a governed editorial flywheel.
- Preserve one continuous loop from pre-op preparation to intraoperative observation to spaced reinforcement.

Do not try to beat Orthobullets first on corpus breadth. Beat it on **context, operative judgment, workflow, and continuity**, then use the resource model to grow breadth safely.

## 12. Phased implementation plan

### Phase 0 — foundation and safety (2–4 weeks)

Outcome: one trustworthy Case Prep identity and packet contract.

- Create `CaseIdentity` and remove duplicate web/BroBot slug resolution.
- Define typed core/module schemas; eliminate `payload: unknown` at the product boundary.
- Add immutable core revisions, hash-bound append-only reviews, atomic publication, and rollback.
- Add structured Case Prep request, retrieval, packet, and fallback events.
- Instrument latency by resolver/core/facts/KG/learner/assets.
- Regenerate the certified inventory and re-run payload hash validation.

Exit criteria:

- 100% launch-case identity tests pass, including approach ambiguity.
- Published bytes equal approved bytes.
- V2 core renders without generic JSON flattening.
- First-view performance is measurable.

### Phase 1 — resident-first experience (4–6 weeks)

Outcome: independently useful ten-minute preparation for 5–8 launch cases.

- Build the dedicated High Yield Facts index and cached retrieval endpoint.
- Implement the ten-minute module order and progressive disclosure.
- Embed packet-bound BroBot actions in every module.
- Re-review and certify launch cases under the new clinical rubric.
- Add calibration questions, active recall, and a truthful readiness band.
- Ensure core + cached facts work during KG/LLM outages.

Recommended launch cohort: carpal tunnel release, distal radius ORIF, ACL reconstruction, posterior THA, TKA, intertrochanteric fracture fixation/TFN, cubital tunnel release, and trigger finger release—only cases that pass the new review gate should ship.

Exit criteria:

- p95 cached first view under 1.5 seconds.
- attending review passes every launch packet.
- top-10 fact duplicate rate below 10% and unsupported-fact rate zero in the labeled launch evaluation set.
- residents can complete the default path in ten minutes.

### Phase 2 — deep educational integration (5–8 weeks)

Outcome: Case Prep becomes an educational graph without becoming cluttered.

- Implement `EducationalResource` and `ResourceAttachment`.
- Assemble reviewed KG claims, decisions, anatomy, complications, and curriculum bridges.
- Attach videos, articles, resident pearls, questions, cards, and related cases.
- Add rights/deep-link rules and independent resource publication.
- Add graph-aware supplemental retrieval to BroBot.
- Build editorial tooling for unresolved questions and missing resources.

Exit criteria:

- every displayed resource has provenance, review status, and canonical targets;
- KG failure does not block core preparation;
- BroBot cites packet/KG resources by stable ID;
- no resource is copied into multiple procedure payloads.

### Phase 3 — personalized learning (6–10 weeks)

Outcome: the packet changes based on demonstrated learner need.

- Add append-only learning events and `LearnerConceptState`.
- Integrate Anki review results and mapped question outcomes.
- Personalize fact and question ordering, not certified clinical truth.
- Elevate repeated BroBot confusion and missed concepts.
- Add post-op reflection and follow-up recommendations.
- Add user-facing explanations for every recommendation.

Exit criteria:

- personalization can be traced to specific learning evidence;
- cold-start users receive sensible training-level defaults;
- a user can reset/export learning state;
- offline evaluation shows improved recall or efficiency over non-personalized ordering.

### Phase 4 — longitudinal mastery (8–12 weeks)

Outcome: pre-op preparation becomes a residency-long competency loop.

- Add case history, role/entrustment, spaced reinforcement, and rotation goals.
- Add concept decay and review scheduling.
- Track preparation-to-question-to-case-to-reflection sequences.
- Provide resident dashboards and carefully scoped faculty views.
- Calibrate readiness against question and case outcomes.
- Establish content freshness, reviewer ownership, and re-certification SLAs.

Exit criteria:

- mastery is evidence-based and explainable;
- competency language is not inferred from page views alone;
- privacy and faculty visibility rules are explicit;
- editorial demand is ranked by usage, misses, unresolved questions, safety importance, and content gaps.

## 13. First implementation backlog

The first ten tickets should be:

1. Generate a current certified-registry inventory and content-hash audit.
2. Define and publish the `CaseIdentity` schema and alias migration.
3. Define typed `CasePrepPacket` and module schemas.
4. Replace `payloadSections()` generic flattening with a typed renderer.
5. Create append-only `case_prep_events` with case, revision, packet, source, latency, and outcome fields.
6. Bind review approvals to immutable content revisions and invalidate them on edit.
7. Build the Pocket Pimped fact ingestion/evaluation fixture for carpal tunnel and distal radius.
8. Implement cached `high_yield_facts` retrieval with provenance and hard filters.
9. Embed pinned BroBot in the Case Readiness document and remove independent re-resolution.
10. Re-review carpal tunnel, distal radius, ACL, and posterior THA using the new rubric before expanding the cohort.

## Final recommendation

The right next move is not more page polish and not a broad content-generation run. Build the packet architecture and prove it on a narrow set of high-frequency cases.

Case Prep will be materially better than Orthobullets when it reliably answers four questions within seconds:

1. What do I absolutely need to know before I scrub?
2. Why are we doing this operation this way for this patient?
3. What will my attending expect me to anticipate, recognize, and say?
4. What should I reinforce after this case based on what I personally missed?

The repository already contains most of the raw strategic assets. V2 now needs the orchestration, governance, and learning loop that make them one product.
