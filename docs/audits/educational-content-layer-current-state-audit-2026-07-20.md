# Educational Content Layer + Knowledge Graph current-state audit

Date: 2026-07-20 (America/Los_Angeles)  
Audit mode: repository read-only; one documentation file created; no database mutation, migration, deployment, flag change, commit, or push  
Production-data evidence cutoff: checked-in read-only snapshot generated `2026-07-20T03:26:35.684Z`

## Evidence and status rules

This report uses only these required labels: `VERIFIED_IMPLEMENTED`, `IMPLEMENTED_BUT_UNVERIFIED`, `PARTIALLY_IMPLEMENTED`, `PLANNED_ONLY`, `STALE_OR_SUPERSEDED`, `MISSING`, `BLOCKED`, and `UNKNOWN`. A migration proves repository intent, not deployment. Production counts below come from `reports/educational-content-layer/production-baseline-2026-07-19/production-baseline.json`; its audit script set the transaction read-only and rolled it back. The report file is newer than its directory name because it was generated after midnight UTC.

Primary evidence:

- `snaportho-web` at `7f399919b5c3b99b18862d05a22bfa567919d1e0`, branch `main`, remote `Baurpower/snaportho-web`.
- `snaportho-caseprep` at `43e381529cf5107b3b60c9c9a672c97e1efec2ff`, branch `main`.
- iOS `Xcode/Snap-Ortho` at `41c77fe699537ced8717e5de2660a2b543c5bdb8`, `Xcode/mycases` at `13576d7624f42f43934577004874d9fad9897545`, and Vapor backend at `457bda29feb20e87810ecc874ff422315a00667f`.
- No applicable `AGENTS.md` was found inside the workspace. The workspace root itself is not a Git repository.
- All repositories already contained unrelated dirty work. Most notably, `snaportho-web` has MyCases/student-workspace work and a `20260720` MyCases migration; CasePrep and both Swift projects also have unrelated changes. None was edited.
- `.test-dist`, `.next`, and extension `dist` were treated as generated output, never as implementation evidence.

## 1. Executive summary

SnapOrtho has reusable foundations, but not an Educational Content Layer runtime. `canonical_entities.id` is a real, deployed UUID identity and cards/questions have direct foreign-key link tables. Anki ingest preserves stable source identity and immutable card versions. Orthobullets has a production metadata registry, curriculum mappings, and a small set of canonical links. The browser extension has source implementations for Orthobullets, ROCK, and Himalaya that extract question/review state and can call BroBot explain APIs.

What works today is narrower: an Orthobullets ID can be resolved server-side to curriculum and active canonical IDs as context for BroBot. It cannot durably record a missed question, run an Anki recommendation, display three cards, open one specific canonical card, or record recommendation telemetry. ROCK and Himalaya extraction is not backed by durable question registries or canonical mappings.

The earliest broken link in the desired workflow is **durable attempt persistence**. The extension observes a reviewed answer but only emits page-state messages; no attempt API/table/write exists. Even if bypassed, there is no production recommendation service or UI. Mapping quality is an additional launch gate: the only structurally viable cohort is 30 patellar-instability questions and four cards, all retargeted through one coarse curriculum bridge entity. Human relevance labels are still blank.

The project is ready to continue, but foundation repair and launch-slice mapping validation must precede user-facing implementation. Do not expand providers, deck-wide mapping, mastery, graph-distance ranking, CasePrep, or BroBot resource suggestions yet.

## 2. Final verdict

`READY_AFTER_FOUNDATION_REPAIR`

The canonical KG, source registries, extension lifecycle, and card identity are sufficient to avoid redesign. The missing operational contracts—reviewed links, idempotent missed-attempt persistence, deterministic recommendation persistence, and a card-open acknowledgement—are bounded foundation work. The verdict is not `BLOCKED_PENDING_MAPPING_VALIDATION` because mapping validation can be completed as Phase 1 of the same small vertical slice; it does block launch, not implementation.

## 3. Current architecture

```text
Anki APKG/TSV
  -> anki_import_batches/decks/models/notes/cards/tags/media
  -> canonical_cards -> canonical_card_versions
  -> card_knowledge_links -> curriculum_nodes
  -> card_canonical_entity_links ----------------------+
                                                        |
Orthobullets metadata -> external_questions             v
  -> external_question_curriculum_mappings -> curriculum_nodes
  -> question_canonical_entity_links -------------> canonical_entities
                                                     <-> canonical_relationships
                                                     -> immutable KG release overlay

Orthobullets/ROCK/Himalaya DOM
  -> provider extraction -> question lifecycle/fingerprint
  -> side-panel Question Tutor -> authenticated Explain/Hint API
  -> Orthobullets ID KG lookup (context only)
  -X-> durable question attempt
  -X-> recommendation run/items
  -X-> Anki recommendation UI/open/telemetry

BroBot KG retrieval: release-aware shadow context, not resource recommendation.
CasePrep/reading/Anki prep add-on: separate local IDs or keyword/tag flows, not this link contract.
```

Source of clinical truth is `canonical_entities` plus governed `canonical_relationships`; the active overlay is release `kg-beta-20260716-002`. Source of Anki identity is `canonical_cards.id` backed by current immutable `canonical_card_versions`. Source of Orthobullets identity is `(external_questions.source_id, external_question_id)`. Curriculum nodes remain a bridge/evidence layer. There is no generic resource source of truth and no learner/recommendation source of truth.

### Architecture inventory

| Component | Source/write path | Read/runtime consumer | Tests/flags/deployment/data/reachability | Status |
|---|---|---|---|---|
| Canonical KG | governed migrations/scripts -> canonical tables -> release publisher | production neighborhood RPC and BroBot shadow retrieval | active beta release; real data; shadow does not influence answers | `VERIFIED_IMPLEMENTED` |
| Curriculum | import/mapping scripts -> curriculum tables | Orthobullets lookup, legacy mapping pipelines | real card/question mappings; coarse bridge | `VERIFIED_IMPLEMENTED` |
| Canonical cards/versions | APKG/TSV importer | audit/mapping scripts; no learner card recommender | 5,095 real current cards | `VERIFIED_IMPLEMENTED` |
| External questions | Orthobullets metadata importer | `kg-lookup.ts` | 7,557 real Orthobullets rows; no ROCK/Himalaya rows verified | `PARTIALLY_IMPLEMENTED` |
| Direct links | retarget/apply scripts; review assertions migration | KG lookup and offline audit scripts | real rows, almost all curriculum-derived; only one card entity production-eligible | `PARTIALLY_IMPLEMENTED` |
| Mapping workflow | Anki run/candidate/review tables and offline retarget scripts | administrative scripts/views | tested offline; question-specific generic candidate workflow absent | `PARTIALLY_IMPLEMENTED` |
| Provider extraction | extension DOM adapters/observers | side panel/background | source and synthetic tests for three providers; real fixtures absent | `IMPLEMENTED_BUT_UNVERIFIED` |
| Attempts/recommendations/open | none | none | no tables/routes/UI | `MISSING` |
| BroBot/CasePrep adjacency | shadow KG and separate keyword/tag systems | BroBot/CasePrep | disconnected from generic resource links | `PARTIALLY_IMPLEMENTED` |

## 4. Implementation-status matrix

| Component | Status | Evidence | Runtime connected | Main gap |
|---|---|---|---:|---|
| Canonical entity identity | `VERIFIED_IMPLEMENTED` | UUID table; active release; production snapshot | yes | merge/split reconciliation for future links |
| Canonical Anki cards | `VERIFIED_IMPLEMENTED` | 5,095 cards/versions, stable GUID+ordinal | admin only | learner retrieval/open |
| Question resource identity | `PARTIALLY_IMPLEMENTED` | unique Orthobullets source/native ID | Orthobullets lookup only | generic providers/fingerprint fallback |
| Generic resource model | `MISSING` | no matching migration/source model | no | provider-neutral registry/version/rights |
| Card-to-entity links | `PARTIALLY_IMPLEMENTED` | 377 rows; 4 cards production-eligible | offline/admin | direct reviewed content mappings |
| Question-to-entity links | `PARTIALLY_IMPLEMENTED` | 1,801 rows; 145 questions production-eligible | lookup context | direct reviewed concept mappings |
| Mapping review workflow | `PARTIALLY_IMPLEMENTED` | Anki candidates/actions plus 20260719 assertion migration | admin scripts | applied evidence for new assertions; shared provider workflow |
| Durable question attempts | `MISSING` | no schema/API/write | no | event, auth, idempotency, RLS/deletion |
| Recommendation query | `PLANNED_ONLY` | offline simulator/audit only | no | production deterministic query |
| Recommendation API | `MISSING` | no route | no | authenticated event-bound endpoint |
| Extension recommendation UI | `MISSING` | no message/state/render path | no | compact three-card view |
| Card-open contract | `MISSING` | existing add-on supports prep/tag sessions, not exact canonical-card open | no | command, resolver, acknowledgement |
| Impression telemetry | `MISSING` | no schema/write | no | run/item action events |
| Click telemetry | `MISSING` | no schema/write | no | correlated open lifecycle |
| RLS and ownership | `PARTIALLY_IMPLEMENTED` | source/admin tables and BroBot Anki RLS; no learner tables | unrelated flows | learner isolation/retention/deletion |

## 5. Database and data inventory

### Table/migration matrix

“Applied” and row counts are known only where present in the read-only production snapshot. RLS means repository migration evidence unless the snapshot explicitly inspected it.

| Table/model | Migration | Applied evidence | Rows/data evidence | RLS | Runtime reads | Runtime writes | Status |
|---|---:|---:|---:|---:|---:|---:|---|
| `canonical_entities` | yes | yes | 1,084 manifest graph entities; 1,023 in active overlay | yes/admin governance | yes | admin | `VERIFIED_IMPLEMENTED` |
| `canonical_relationships` | yes | yes | 2,248 manifest relationships; 2,187 in overlay | yes/admin governance | yes | admin | `VERIFIED_IMPLEMENTED` |
| `canonical_cards` | yes | yes | 5,095 | enabled, service/admin-oriented | no learner read | importer | `VERIFIED_IMPLEMENTED` |
| `canonical_card_versions` | yes | yes | 5,095 | same boundary | no learner read | importer | `VERIFIED_IMPLEMENTED` |
| `external_questions` | yes | yes | 7,557 Orthobullets | service/admin-oriented | KG lookup | importer | `VERIFIED_IMPLEMENTED` |
| `external_question_curriculum_mappings` | yes | yes | 7,557 questions covered | service/admin-oriented | KG lookup | importer | `VERIFIED_IMPLEMENTED` |
| `card_knowledge_links` | yes | yes | 1,111 mapped cards inferred from candidate baseline | service/admin-oriented | admin | mapper | `VERIFIED_IMPLEMENTED` |
| `card_canonical_entity_links` | yes | yes | 377 cards/rows; 4 production-eligible | service-role policy in migration | offline/admin | retarget scripts | `PARTIALLY_IMPLEMENTED` |
| `question_canonical_entity_links` | yes | yes | 1,801 questions/rows; 145 production-eligible | service-role policy in migration | KG lookup/admin | retarget scripts | `PARTIALLY_IMPLEMENTED` |
| Anki mapping runs/candidates/actions | yes | runs/candidates present | 1,111 auto-mapped; 4,619 needs-review candidates (statuses overlap card population by run semantics) | service/admin | admin views/scripts | mapper/reviewer | `PARTIALLY_IMPLEMENTED` |
| `educational_link_review_assertions` | yes (20260719) | unknown | unknown | enabled; service role policy | review views/scripts | review scripts | `IMPLEMENTED_BUT_UNVERIFIED` |
| BroBot Anki device/prep/session tables | reconciliation migration | yes, snapshot inspected | links 53, tokens 40; devices/prep/sessions/matches 0 | enabled, not forced | separate API/add-on | separate API/add-on | `PARTIALLY_IMPLEMENTED` |
| Generic resources/versions/links | no | no | none | none | no | no | `MISSING` |
| Learning/question-attempt events | no | no | none | none | no | no | `MISSING` |
| Recommendation runs/items/actions | no | no | none | none | no | no | `MISSING` |

The direct-link tables foreign-key to canonical identities, preserve method/confidence/evidence/review/lifecycle fields, and do not mutate graph topology. Unique active-link indexes and rollback batch keys support repeatable publication/rollback. They do not version links against the current card version, and the dominant bridge method is too coarse to establish content relevance. Provider-native uniqueness exists for Orthobullets. A generic `(provider, native_id)` plus fingerprint fallback, visibility/rights fields, and immutable resource version contract do not exist.

### Verified counts and coverage

| Measure | Current evidence |
|---|---:|
| Canonical entities | 1,084 in release manifest graph; 1,023 referenced by active overlay |
| Canonical relationships | 2,248 in manifest graph; 2,187 referenced by overlay |
| Imported Anki notes/cards | 4,681 / 5,095, all active |
| Canonical cards/versions | 5,095 / 5,095, all with active current version |
| Native card ID and note GUID coverage | 5,095 each (100%) |
| Duplicate GUID+ordinal identities | 0 |
| Curriculum-mapped cards | 1,111 / 5,095 = 21.81% |
| Cards with any direct canonical row | 377 / 5,095 = 7.40% |
| Cards with production-eligible canonical link | 4 / 5,095 = 0.079% |
| Unmapped to any direct canonical row | 4,718 / 5,095 = 92.60% |
| Orthobullets questions | 7,557 active |
| Orthobullets curriculum coverage | 7,557 / 7,557 = 100% (supersedes prior 7,493 claim) |
| Questions with any direct canonical row | 1,801 / 7,557 = 23.83% |
| Questions production-eligible | 145 / 7,557 = 1.92% |
| Direct content-analysis mappings | 0 cards; 0 questions |
| Approved link rows | 377 card; 1,801 question, but all are curriculum-retargeted |
| Candidate mappings | Anki: 4,619 `needs_review`, 1,111 `auto_mapped`; question candidate count unknown |
| Learner events/recommendation runs/items | `MISSING` (therefore no applicable rows); live count not queryable because tables do not exist in audited migrations |
| ROCK/Himalaya persisted questions/mappings | `UNKNOWN`/no evidence found; production registry inspected as Orthobullets-only |

Coverage is highly concentrated. Patellar instability and the overlapping osteochondral neighborhood each report 30 questions sharing four cards through the same one entity. ACL and multiligament cohorts have 115 eligible questions but zero cards. Most other production neighborhoods have neither side linked. Overall percentages alone materially overstate readiness.

## 6. Anki master-deck audit

```text
APKG/TSV -> batch hash -> deck/model/note/card parse -> native IDs/GUIDs/fields/tags/template/CSS/media
-> canonical_cards -> immutable content-hash version -> curriculum candidate/run/review
-> legacy card_knowledge_links -> curriculum bridge retarget -> card_canonical_entity_links
-X-> learner recommendation retrieval -> exact-card launch
```

The importer preserves note GUID, native note/card IDs, card ordinal, deck hierarchy, tags, field snapshots/raw HTML, model/templates, content and identity hashes, and read-only scheduling metadata. Unique source keys and GUID+ordinal provide re-import stability; content changes produce card versions. Current production has one version per canonical card, so stale-version behavior is designed but not demonstrated with real multi-version data. Links are card-level, not explicitly pinned to version; a content change therefore needs a reconciliation job that does not currently exist.

Mapping v1 deterministically scores deck/tag/curriculum alias evidence (historical thresholds 0.90 high and 0.75 medium) and supports review actions. The direct links currently published are not rich card-content extraction: all 377 are `curriculum_node_bridge`. No manual content-review assertion is proven applied for the four launch cards; review CSV labels are not a deployed decision.

Card opening is `MISSING`. Web/extension/mobile/desktop cannot request “open canonical card X.” The separate reconstructed add-on can link devices, pull prep requests, match local cards by keyword/tag, and record study sessions, but it has zero operational device/session data in the snapshot and no exact GUID+ordinal launch command. Anki browser search is a plausible first fallback, not verified functionality.

## 7. Question-provider audit

| Capability | Orthobullets | ROCK | Himalaya | Other |
|---|---|---|---|---|
| Extract question | `IMPLEMENTED_BUT_UNVERIFIED` | `IMPLEMENTED_BUT_UNVERIFIED` | `IMPLEMENTED_BUT_UNVERIFIED` | `MISSING` |
| Stable identity | URL/DOM native ID + fingerprint fallback | DOM ID + fingerprint fallback | DOM ID + fingerprint fallback | `MISSING` |
| Stem/choices/images/explanation | source supports all | source supports all | source supports all | `MISSING` |
| Detect submitted answer | review-state rules | heuristic review state | explicit reviewed state | `MISSING` |
| Detect correctness | selected/correct keys when visible | selected/correct keys when visible | selected/correct flags/keys | `MISSING` |
| Long/virtualized/navigation handling | mutation observer, polling, active fingerprint | structured long-page extraction | active-container selection/observer | `MISSING` |
| Persist attempt | `MISSING` | `MISSING` | `MISSING` | `MISSING` |
| Resolve canonical entities | production ID lookup, sparse links | `MISSING` | `MISSING` | `MISSING` |
| Request recommendations | `MISSING` | `MISSING` | `MISSING` | `MISSING` |
| Display/open cards/telemetry | `MISSING` | `MISSING` | `MISSING` | `MISSING` |

The lifecycle computes a question fingerprint from stable ID or stem plus choices/images/page position and a separate review-state key. It suppresses unchanged mutation events and rejects stale asynchronous session commits. This reduces duplicate UI work, but it is not durable idempotency. Answer changes/retries, refreshes, and offline delivery have no event semantics because no event is written. An explanation view is classified separately from an authoritative incorrect attempt only in transient state; correctness is reliable only when `answered_review`, selected key, and correct key coexist.

Extraction output is sent only on user BroBot actions (Hint/Explain/chat) through background-authenticated routes. Those payloads may contain visible question content transiently. Existing privacy design and metadata import avoid persisting stems, choices, explanations, and images in `external_questions`; server logging uses identifiers/hashes and model telemetry, not an attempt row. This audit found no recommendation emission.

Tests passed, but the extractor suite ran **0/7 real Orthobullets fixtures** because copyrighted captures are gitignored and absent. Synthetic Orthobullets/ROCK and checked-in Himalaya fixtures passed. Hence provider reliability is not production-verified, especially against DOM drift, virtualized review lists, and ambiguous hidden containers.

## 8. Canonical mapping pipeline answers

1. An Anki card can resolve to canonical entities only for 377 cards, and only four pass current production eligibility: `PARTIALLY_IMPLEMENTED`.
2. An Orthobullets question can resolve by native ID; 1,801 have direct table rows and 145 production-eligible links: `PARTIALLY_IMPLEMENTED`.
3. ROCK/Himalaya do not use the same durable resolution contract: `MISSING`.
4. Links are stored as approved, but all current rows were inferred by curriculum bridge; approval state is not equivalent to direct clinical review: `PARTIALLY_IMPLEMENTED`.
5. Retargeting has dry-run/apply, unique indexes, and rollback batch keys, so it is mechanically regenerable; semantic repeatability after KG/card changes is unproven.
6. Content hashes and current versions can reveal card drift, but no link invalidator/reconciliation runtime exists: `PARTIALLY_IMPLEMENTED`.
7. Method, confidence, evidence, source mapping, and rollback provenance are retained. The coarse bridge is auditable but insufficient evidence for relevance.
8. Candidate/review workflows prevent automatic publication in the Anki mapper, but historical bridge links are already marked approved; high-risk content ambiguity is not fully gated.
9. Mapping does not require KG mutation; preserve that boundary.
10. Cards/questions share the two equivalent direct-link table shapes, not one generic resource link contract. Separate legacy curriculum and BroBot-Anki keyword systems remain.

Preserve canonical UUIDs, card ingest/versioning, external-question uniqueness, provider extractors, release eligibility, and administrative review tooling. Consolidate direct card/question link semantics and review assertions. Later deprecate runtime dependence on `concepts`, curriculum translation, product-local synonym maps, and keyword-only add-on matching. Delete nothing during the vertical slice; first measure consumers and backfill compatibility views.

## 9. End-to-end workflow trace

```text
Orthobullets question DOM              IMPLEMENTED_BUT_UNVERIFIED
 -> attempt/review detection           IMPLEMENTED_BUT_UNVERIFIED
 -> durable authenticated event        MISSING          <-- earliest break
 -> external question resolution       PARTIALLY_IMPLEMENTED (Orthobullets ID only)
 -> approved canonical entity links    PARTIALLY_IMPLEMENTED (sparse/coarse)
 -> deterministic Anki recommendation  PLANNED_ONLY (offline simulator only)
 -> persisted run/items                MISSING
 -> visible extension cards            MISSING
 -> exact Anki card open               MISSING
 -> impression/click/open telemetry    MISSING

ROCK/Himalaya question DOM             IMPLEMENTED_BUT_UNVERIFIED
 -> durable resource identity/mapping  MISSING           <-- earliest provider break
```

Adjacent workflows are disconnected: Anki -> related questions is `MISSING`; CasePrep -> cards and BroBot -> cards use separate keyword/tag or prompt-context paths (`PARTIALLY_IMPLEMENTED`); weak-area dashboard is `MISSING`; entity -> all linked resources exists only as administrative SQL potential (`PLANNED_ONLY`).

## 10. Rights, privacy, security, and retention

Current Orthobullets persistence is appropriately metadata-only: provider/source IDs, specialty/topic, timestamps, sanitized metadata, curriculum/canonical links. The extension can transiently extract full stems, choices, explanations, references, and images for user-requested BroBot calls; these must not be copied into learner-event or recommendation tables without explicit rights review. No definitive legal conclusion is made here.

Minimum missed-attempt retention:

- authenticated `user_id`, provider, stable native ID when available, internal question ID;
- keyed SHA-256 fingerprint/idempotency hash, correctness boolean, occurrence/receipt times, extension version, request ID;
- snapshot of approved canonical entity/link IDs and KG release used;
- no stem, choice text, explanation, image, URL query secrets, or answer text; omit selected key initially;
- per-user deletion path and documented retention period.

Recommendation persistence should retain IDs, ranks, reason codes/entity overlap, version/link snapshots, impressions, click/open result, and latency—never card/question bodies. User tables need forced RLS or service-only access behind an authenticated API, ownership checks on every read, idempotent unique keys, deletion support, and admin access audit. Current BroBot Anki tables have RLS enabled but not forced; they do not establish the new learner-data policy.

Add provider-neutral rights/visibility metadata before generic expansion: `private`, `user_owned`, `organization_owned`, `licensed`, `link_only`, or `metadata_only`, plus availability/entitlement and retention policy. Clarify whether the curated master deck is internally licensed and whether users may receive card previews. Provider terms, analytics retention, and derived mapping evidence require product/legal review.

## 11. Tests and verification

| Check | Result | Interpretation |
|---|---|---|
| `npm run extension:orthobullets:test` | pass | lifecycle, fingerprint, synthetic extraction, contracts, UI helpers pass; real OB fixtures 0/7 |
| `npm run extension:orthobullets:build` | pass | local extension built |
| `npm run extension:orthobullets:verify-build` | pass | manifest/background/routing contract valid |
| `npm run education:patellar:test` | pass | CSV, foundation, direct-review, metrics unit tests pass |
| `npm run typecheck` | fail | pre-existing unrelated `.ts` import-option errors and workspace/call union-type errors |
| Static search for generic/event/recommendation schemas/routes | no implementation found | confirms missing runtime rather than disconnected code |
| Production baseline script/report | checked-in pass under read-only transaction | freshest data evidence; not rerun with credentials |
| Full web production build | not run | disproportionate after typecheck failure; extension build covers audited client |

Generated `.test-dist` and `dist` output was regenerated only for verification and produced no tracked Git diff. No migration lint against a live database was attempted. The working tree remains dirty only with pre-existing user work plus this report at workspace root.

## 12. Critical gaps

1. **Mapping-quality/data gap:** the candidate launch slice is one coarse entity, four cards, and 30 questions; precision@1/3 and mapping error remain unknown.
2. **Runtime/schema gap:** no durable user-owned missed-attempt table/API, server validation, retry/idempotency, or deletion policy.
3. **Recommendation gap:** no deterministic production query, persistence, zero-result behavior, dedupe evaluation, or latency evidence.
4. **Anki-client gap:** no exact canonical card -> GUID+ordinal -> desktop action contract or acknowledgement.
5. **Extension gap:** no recommendation message/state/UI/telemetry; real Orthobullets DOM regression fixtures unavailable.
6. **Security/rights gap:** learner RLS and minimum-retention policy are undecided; master-deck preview/open rights need confirmation.
7. **Model consolidation gap:** generic resources are absent, while legacy curriculum, direct links, and BroBot Anki keyword matching overlap.

## 13. Recommended MVP vertical slice

Use **Orthobullets missed question -> reviewed patellar-instability entity -> three curated cards**. This is the only cohort with structural coverage on both sides. It is a remediation cohort, not launch-ready.

- Provider: authenticated Orthobullets extension only.
- Entity allowlist: exact patellar-instability UUID `1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a`; no relationship/neighborhood expansion.
- Content: the 30 known questions and four knee-sports/patellar cards only.
- Review: clinician reviews each question/entity and card/entity assertion directly, confidence >= 0.95; review all 90 ranked question-card pairs. Do not accept curriculum bridge alone.
- Event: persist only incorrect authoritative `answered_review` transitions, server-resolved by source ID, with hash idempotency and mapping snapshot.
- Ranking: exact approved entity overlap, current active card version, minimum mapping confidence, curated card quality, GUID+ordinal sibling dedupe, stable ID tiebreak; max three; no LLM or personalization.
- Presentation: compact side-panel cards after Explain becomes available; explicit “Open in Anki”; no full protected question content in response.
- Open: short-lived command resolved in desktop add-on by GUID+ordinal, with `opened/not_found/ambiguous/unsupported/failed` acknowledgement. If exact reviewer navigation is unsafe, open Anki browser filtered to the identity and say so.
- Telemetry: attempt accepted/deduped, run/items, impression, click, launch resolution, launch success/failure, dismiss/no-result; correlation IDs only.
- Exclusions: ROCK, Himalaya, correct answers, anonymous users, mastery, graph distance, adjacent ACL/osteochondral entities, mobile deep links, deck-wide mapping, CasePrep/BroBot integration.

Success criteria before provider expansion: >=95% direct mapping precision in clinician review; precision@1 >=90% and precision@3 >=80%; zero incorrect rank-1 cards; attempt event capture >=99% with duplicate rows <0.5%; no-result <5% inside allowlist; p95 recommendation API <=150 ms; extension added latency <=100 ms before async call; exact-card local resolution >=95% and verified open >=90%; no cross-user RLS leakage in tests; no protected bodies in database/log samples. Expand to ROCK/Himalaya only after these hold for two pilot weeks and each new provider has stable IDs/fingerprint fallback, 95% reviewed extraction correctness, durable canonical mappings, and a provider rights decision.

## 14. Ordered implementation plan

### Phase 0 — Contract stabilization

- Files/modules: add `src/lib/education/contracts`, migration/verification SQL, extension shared message types, and add-on protocol documentation; reuse `canonical_entities.id`, `canonical_cards.id`, and `external_questions.id`.
- Database/API: decide whether MVP uses compatibility views over existing card/question tables (recommended) or generic registry. Define visibility/retention, reviewed-link assertion, event, recommendation, and launch command contracts.
- Tests: SQL constraints/RLS; contract fixtures; no-body logging checks.
- Complete when one versioned contract and exact card-open state machine are approved. Dependency: product/legal rights decision. Rollback: documentation/types only; migration separately reversible.

### Phase 1 — Launch-slice mappings

- Files/modules: existing patellar packet/validation/metrics scripts and `educational_link_review_assertions` views.
- Database: publish only clinician-reviewed direct assertions; never change canonical topology. Pin card version and supersession behavior.
- Tests: invalid reviewer, duplicate active assertion, stale card, non-allowlisted entity, reproducible coverage report.
- Complete when all included cards/questions have direct reviewed assertions and pair relevance meets the success bar. Dependency: clinician reviewer. Rollback: deactivate assertion/publication batch.

### Phase 2 — Durable attempts

- Files/modules: new migration/verification; `src/lib/education/attempts`; authenticated route under `src/app/api/brobot/orthobullets`; extension controller/background messages.
- Database/API: service-written user-owned incorrect-attempt event, unique idempotency key, server question/link resolution, forced RLS/deletion.
- Tests: duplicate mutations/retries, refresh, answer change, explanation-only, stale fingerprint, wrong user, clock bounds, offline retry.
- Complete when DOM-to-row trace passes fixture and integration tests with zero protected bodies. Rollback: disable endpoint flag, retain/delete pilot rows per policy.

### Phase 3 — Deterministic recommendations

- Files/modules: `src/lib/education/recommendations/{repository,ranker,contracts}`, API route, SQL verification.
- Database/API: run/item persistence linked to attempt; exact-entity query; active-version and availability filters.
- Tests: deterministic fixtures, no links, fewer than three, sibling duplicate, stale/disallowed card, RLS, p95 benchmark.
- Complete at quality/latency bars. Dependency: Phase 1/2. Rollback: endpoint flag; immutable pilot runs remain auditable.

### Phase 4 — Extension presentation and card open

- Files/modules: shared messages, question session/controller/panel, background route; add-on command poll/resolver/ack modules.
- Database/API: launch request/ack and action telemetry.
- Tests: UI states, provider performance, absent add-on, missing/changed/ambiguous card, acknowledgement, no repeated impressions.
- Complete when three cards render and exact open is verified end-to-end. Dependency: desktop add-on release path. Rollback: UI flag and command expiry.

### Phase 5 — Evaluation

- Files/modules: read-only evaluation/report scripts and reviewer packets.
- Tests/metrics: mapping precision, precision@k, duplicate/no-result rates, event reliability, open rate/success, latency, usefulness interviews, privacy sample.
- Complete after gates hold for two weeks. Rollback: stop pilot; preserve anonymized aggregate only per retention policy.

### Phase 6 — Expansion

- Only then add ROCK registry/mappings, then Himalaya; expand deck/entity coverage; later add reverse questions, mastery, CasePrep, and BroBot.
- Each provider repeats identity, extraction, rights, mapping, RLS, reliability, and evaluation gates. Rollback boundary is provider allowlist/flag.

## 15. Direct answers to architectural questions

1. Shared canonical identity today: `canonical_entities.id`, reached through separate card/question link tables.
2. It is usable and deployed, but link coverage/review quality is insufficient.
3. Generic educational resources: no.
4. Anki cards are first-class canonical cards, not generic educational resources.
5. Orthobullets questions are first-class provider records; ROCK/Himalaya are not.
6. Card mappings are both curriculum and canonical-table rows, but canonical rows are curriculum-retargeted, not direct analysis.
7. Same for questions: 100% curriculum coverage, sparse bridge-derived canonical links.
8. No reviewed launch slice with direct clinical assertions on both sides; patellar instability is only a remediation candidate.
9. Question attempts are not durable.
10. Transient extraction can distinguish incorrect from explanation-only when all review keys are visible; no durable system enforces it.
11. A missed question cannot trigger a recommendation today.
12. The extension cannot display Anki recommendations today.
13. There is no functioning exact-card open contract.
14. First complete-flow break: durable attempt persistence; for ROCK/Himalaya, durable resource identity/mapping breaks earlier.
15. Smallest safe milestone: directly review the patellar mappings and freeze the event/recommendation/open contracts before code expansion.
16. Stale artifacts: the 7,493/7,557 curriculum count and “BroBot Anki DDL absent” claim are superseded; generic-resource-first plans are not implemented; production-eligible claims without direct review are unsafe.
17. Duplication exists across legacy curriculum mappings, two direct link tables, generic-resource plans, and separate BroBot-Anki keyword matching.
18. Preserve canonical/import/release/provider assets; consolidate link/review contracts; later deprecate runtime curriculum/concept and keyword-only paths after consumer audit; delete nothing now.
19. Do not expand providers, whole-deck mapping, graph-distance ranking, mastery, CasePrep, or BroBot recommendations yet.
20. Expansion proof is the quantified two-week quality/reliability/security/open-card gate listed in Section 13, repeated with provider-specific extraction and rights review.

## 16. Next agent prompt

```text
Implement Phase 0 only for the Orthobullets -> patellar-instability -> Anki vertical slice in snaportho-web.

Read docs/audits/educational-content-layer-current-state-audit-2026-07-20.md and preserve all unrelated dirty work. Do not apply migrations, mutate Supabase, publish mappings, deploy, commit, push, or change canonical KG topology. Produce repository code/migrations/tests only.

Scope:
1. Define versioned TypeScript contracts for an authenticated incorrect-question attempt, deterministic three-card recommendation response, and exact Anki launch request/acknowledgement.
2. Add a migration plus SQL verification for user-owned idempotent attempt events, recommendation runs/items/actions, and short-lived card-launch commands/acks. Use service-role writes behind APIs, forced RLS, explicit ownership/deletion behavior, and no question/card bodies.
3. Reuse external_questions, canonical_cards/current versions, question_canonical_entity_links, card_canonical_entity_links, and canonical_entities.id. Do not introduce educational_resources yet and do not mutate canonical_relationships.
4. Encode the patellar entity UUID allowlist and approved direct-review requirement, but do not publish or fabricate reviews.
5. Add contract, constraint, RLS, idempotency, retention-safety, and stale-version tests. Do not implement provider UI, recommendation ranking, or the add-on runtime in this phase.

Finish with exact files changed, tests run, migration-not-applied confirmation, rollback boundary, and remaining decisions requiring product/legal or clinician review.
```
