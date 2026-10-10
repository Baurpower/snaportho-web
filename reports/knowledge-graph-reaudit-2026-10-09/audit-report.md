# Knowledge graph and claims database re-audit

**Audit date:** October 9, 2026, America/Los_Angeles
**Live project:** snaportho — geznczcokbgybsseipjg
**Repository:** /Users/alexbaur/snaportho_dev/snaportho-web
**Checked-out HEAD:** 435310d9745accf15ebb8e2c12b1c67bffecede2, with local modifications
**Scope:** read-only live database assessment, local consumer/automation code, live RPC definitions, role probes, retrieval probes, and current remediation tests. No live data, policies, deployment settings, or application code were changed during this audit.

## Assessment

The graph has a substantial inventory and several useful safety foundations: immutable claim-version records, version-pinned source/card links, a shared publication policy, an entity proposal layer, a release registry, and budgeted enrichment jobs. The tested publication safeguards currently prevent most draft claims from reaching products through the shared serving path.

It is **not yet demonstrated to be a system that improves product knowledge automatically as more content arrives**. The main obstacles are publication evidence, relevance, graph semantics, integration with the new entity-role model, incomplete pagination, and absent product feedback measurements. A larger database currently means a larger inventory and review backlog; it does not establish a larger body of usable, validated knowledge.

Three findings need attention before unattended graph changes:

1. Two graph-control tables and a historical claims-review backup permit anonymous and authenticated writes without RLS.
2. Live v3 retrieval can return an unrelated claim and call the result “full” coverage.
3. Existing coverage and proposal-generation scripts can silently read only 1,000 rows from tables already exceeding that limit.

The recommended direction is an **evidence- and demand-driven incremental pipeline**, with separate gates for source fidelity, clinical validity, graph linking, publication, retrieval relevance, and product usefulness. The companion roadmap specifies implementation order and acceptance criteria.

## Evidence and limits

Evidence files in this directory:

- database-snapshot.json: catalog, exact counts, claims/links/graph/automation/security sections, first-500 readback, retrieval probes, graph topology analysis.
- audit-queries.sql: reproducible read-only SQL sections.
- api-pagination.json and probe-api-pagination.mjs: authenticated API counts demonstrating truncation.
- relationship-type-check.json and check-relationship-types.mjs: offline comparison of all active relationships against the current repository predicate registry.
- database-advisors.json: security and performance advisor output.
- retrieval-timing.json: two live EXPLAIN ANALYZE samples; not a production latency distribution.
- live-retrieval-definitions.sql: forensic snapshot of live v2/v3 functions. **Do not apply it as a migration.**
- automatic-improvement-roadmap.md: staged plan and proposed evaluation gates.

Observations were collected at separate times on October 9, rather than in one global repeatable-read transaction. The catalog timestamp is 17:11 UTC; later structural and API checks were collected through 23:06 UTC. Exact counts refer to their captured query times. Catalog approximate-row statistics are not used as exact totals.

This audit does not certify the medical correctness of all 8,672 claims or all relationships. It did not re-open every original Orthobullets source, image, or explanation, obtain a clinical expert adjudication, or send content to a model. Prior source-audit files exist, but they are not fresh source validation for this re-audit. Flags and metadata identify risk and missing evidence; they do not prove that a clinical statement is false.

Production deployment SHA, deployed environment flags, end-user traffic, external schedulers, and production latency were not verified. Local code includes remediation changes that may not be deployed. SQL RPC calls establish current database behavior, not the behavior of every browser/app route.

Anonymous reads were tested with a transaction-local database role. No anonymous write was attempted. Write capability is inferred from actual granted INSERT/UPDATE/DELETE privileges plus disabled RLS. HTTP Data API exposure of each object was not separately probed.

## 1. Inventory and readiness

| Area | Fresh observation | Meaning |
|---|---:|---|
| Claims / versions | 8,672 / 8,672 | Every active claim currently has exactly one version |
| Claims passing shared serving policy | 4 (0.046%) | Effective usable claim inventory is much smaller than stored inventory |
| Approved parents with unreviewed current versions | 7,058 | Parent approval is not version publication evidence |
| Canonical entities | 1,401 | All active; 1,193 meet trusted-view criteria |
| Canonical relationships | 2,248 | All active/approved; approval is not clinical verification |
| Active claim-entity edges | 5,645 | Canonical, proposed, and unresolved edges are mixed |
| Claims with a trusted canonical subject role | 1,993 (23.0%) | Approved teaches_about or tested_answer edge |
| Claims with a primary entity in trusted set | 3,376 (38.9%) | Legacy subject path differs from typed role path |
| Distinct claims with active card links | 3,305 | Card teaching evidence is not equivalent to publication |
| Distinct claims with active question links | 2,411 | Question-source association |
| Claims with neither active card nor question link | 3,003 (34.6%) | Needs provenance reconciliation; metadata may still contain source evidence |
| Quality flags / affected claims | 5,922 / 2,673 | Flags are review signals, often overlapping |
| Semantic duplicate groups / claims involved | 223 / 449 | Requires scoped equivalence review |
| Latest published deck's included cards | 3,670 | Distinct from 5,095 total canonical cards |
| External questions | 8,159 | Larger than the first-500 audit cohort |
| Automation proposals | 8,154 | Significant unresolved/generated backlog |
| Brobot retrieval events / graph feedback events | 0 / 0 | No measurable live learning loop in this database |
| Enrichment model invocations | 6 | Small pilot, not a completed full enrichment campaign |
| New Anki KG factory execution records | 0 | Framework tables exist; operational deployment not demonstrated |

There are 3309 active card-claim edges and 2545 active question-claim edges. Unique claim counts are lower because a claim may have multiple links. The card/question union reaches 5,669 claims; 47 claims have both types of active association. Coverage is counted on distinct claim IDs, not summed link rows.

### The first 500

The original inventory run is 3bf06315-fc96-47b2-99a8-bb70e52a0a27. Its run row remains paused with 171 completed; following each inventory question to its latest completed extraction across runs gives:

- 500 inventory questions; latest extraction outcome found for all 500.
- 489 accepted; 11 ai_review_unresolved.
- 2,130 active production question-claim edges and 2,039 distinct active claims.
- 2,039 current versions; **zero serving-eligible versions**.
- 685 approved parents with unreviewed current snapshots.
- 689 historical approval receipts; zero positive current publication receipts.
- 15 accepted repaired candidates; all 15 lack a final-review receipt in ob_claim_final_reviews.

These numbers answer different questions. “489 accepted” means the extraction workflow accepted the latest outcome. It does not mean that 489 questions have fully published, source-audited, clinically validated knowledge. Similarly, an old run's completed_count does not describe the cohort's latest cross-run state.

The unresolved native IDs are retained in the snapshot: 211139, 211447, 212341, 215157, 2892, 3151, 4600, 5503, 6087, 6764, 8853. Resolution should remain explicit rather than being forced to meet a completion percentage.

## 2. Prioritized findings

P0 means protect database integrity before unattended operation. P1 means address before expanding answer-influencing/product automation. P2 means improve coverage, governance, and scalability after those gates.

| ID | Priority | Finding | Evidence | Practical consequence |
|---|---|---|---|---|
| F01 | P0 | Anonymous/authenticated writes without RLS on card_canonical_entity_links and kg_proposal_batch_memberships | security section; anon role readback | Mapping/control records can be modified by these roles at the database privilege layer |
| F02 | P0 | claims_review_backup_2026_10_07 is similarly readable/writable | 7,066 rows; no RLS, DML grants | Backup integrity and historical review material are unprotected |
| F03 | P1 | trusted_canonical_entities bypasses base-table RLS under owner rights | anon sees 1,193 view rows and zero base rows | View exposure differs from underlying table policy |
| F04 | P1 | Only four claims are serving-eligible; new cohort has zero | publication/coverage/cohort queries | Draft volume does not translate to grounding or exact claim-linked cards |
| F05 | P1 | Parent approval and current version review state diverge | 7,058 pairs | Dashboards/UI using parent approval can overstate readiness |
| F06 | P1 | Source/clinical publication stages are not operational in the new worker | jobs, attestations, worker code | Quality/entity enrichment alone cannot finish the publication workflow |
| F07 | P1 | Repair receipts are incomplete | first-500: 15 repaired accepted candidates, zero final receipts | Historical acceptances cannot establish final rewritten-text review |
| F08 | P1 | v3 relevance failure and misleading full-coverage label | femoral-neck probe returns groin-flap claim | Unrelated evidence can influence grounding if enabled |
| F09 | P1 | Release ID is returned but not used to constrain release membership in live v2/v3 | live definitions: no kg_production_objects reference | A packet's release label is not proof that all graph facts belong to that release |
| F10 | P1 | Coverage/generation reads truncate at API row cap | live API 1000 vs 1401/5095/8159; unpaginated code | Missing records can produce false gaps, duplicate proposals, and biased priorities |
| F11 | P1 | Consumers do not use claim_entities as subject retrieval input | both live RPC definitions; Anki reviewer primary_entity filter | New role-aware enrichment does not reliably expand product retrieval |
| F12 | P1 | Reused proposals do not accumulate supporting evidence | worker ON CONFLICT no-op update | Additional claims do not strengthen or diversify the proposal's evidence |
| F13 | P1 | Graph review/publication labels overstate clinical assurance | metadata and production objects | Automated beta relationships can be presented as approved/standard facts |
| F14 | P1 | No observed retrieval/feedback event history | three event tables zero | Cannot measure usefulness, regressions, or user demand |
| F15 | P1 | Telemetry fallback rewrites actual mode/influence to shadow/false | telemetry.ts:243 | Schema failures can create misleading analytics |
| F16 | P2 | Two prerequisite strongly connected components | all 1339 prerequisite edges analyzed | No valid strict topological learning order for those components |
| F17 | P2 | Three relationships violate current type registry | offline all-edge check | Canonical rows can drift from apply/generation rules |
| F18 | P2 | Alias and subject coverage is sparse | 1130/1193 no alias; 816 no subject claim | Retrieval recall and useful neighborhoods remain uneven |
| F19 | P2 | Semantic duplicates and sparse factory qualifiers | 223 groups; 5830/6168 empty qualifiers | Repetition can inflate apparent support; contextual distinctions can be lost |
| F20 | P2 | Generic proposal application is nontransactional | apply script TODO at 88–90 | Interrupted operations can leave partial canonical/apply state |
| F21 | P2 | Run lifecycle and historical costs are inconsistent | nine old running rows; nine cost mismatches | Operational dashboards and budget reconciliation can mislead |
| F22 | P2 | Packet token estimate is capped before enforcement | provider.ts:41–48 | Large packets can be understated by the budget estimator |
| F23 | P2 | Registry/normalized provenance trails are fragmented | provenance records/governance actions zero; metadata populated | Traceability requires joining several systems rather than a consistent evidence ledger |
| F24 | P1 | A v3 database sample exceeded the local retrieval deadline | v2 981 ms, v3 1458 ms, before HTTP overhead | A safe bypass may leave richer retrieval unused; performance must be measured before rollout |
| F25 | P2 | v3 term-coverage ratio can exceed one | carpal-tunnel probe termCoverage=2; numerator includes terms excluded from denominator | Ranking features are poorly calibrated, especially with only four eligible claims |

## 3. Claims database: correctness and evidence

### Identity and version integrity

The checked invariants are good:

- No missing current version, wrong claim ownership, or parent/current text, qualifier, or fingerprint drift.
- All claims have populated semantic identity.
- Active card/question links point to valid current claim versions.
- Active card links point to current, active canonical cards and valid included release entries.
- Checked question edges have valid external registry associations and matching question identities.
- Current claim-entity edges have valid current version references and trusted canonical targets, or valid active proposal targets.

These are structural guarantees. They do not substitute for the accuracy of an extracted medical assertion. Every claim currently having one version also means revision histories are not yet providing much demonstrated longitudinal correction history.

### Review-state inventory by origin

| Algorithm | Claims | Current version state | Serving eligible |
|---|---:|---|---:|
| card-claim-factory.v1 | 6,168 | unreviewed / generated_draft / machine_consensus | 0 |
| orthobullets-claims-prod.v1 | 2,287 | unreviewed / generated_draft / machine_consensus | 0 |
| legacy-unversioned | 139 | unreviewed / generated_draft | 0 |
| claims-v2.3 | 48 | unreviewed / generated_draft | 0 |
| claims-v2.2 | 19 | unreviewed / deprecated content_source | 0 |
| orthobullets-autonomous-claim.v3 | 7 | unreviewed / needs_review | 0 |
| orthobullets-autonomous-claim.v2 | 4 | approved / verified / machine_consensus | 4 |

The four serving claims use the retained legacy path. They are not four freshly completed claims with the new source-fidelity and clinical-validity attestations. All 6168 factory parents are approved, despite unreviewed versions. In the production algorithm, 677 parents are approved and 1610 are unreviewed.

There are 702 attestations: 696 historical approval records and six quality-rewrite receipts. There are **zero source-fidelity receipts, zero clinical-validity receipts, and zero eligible publication receipts** in the inspected data. Historical receipts preserve prior state; they should not be upgraded into clinical evidence.

There are 19 active claims whose version content_source is deprecated. The serving gate excludes them, but active-versus-deprecated state should be reconciled for inventory, generation, and review tools.

### Quality and context

The largest flag families include unresolved entity (1336), competing entities (724), multi-entity claim (724), blocked entity likeness (580), insufficient entity context (494), non-atomic extraction (435), list-like extraction (380), evidence outside source units (282), context-prefixed text (257), and question-shaped text (218). Flags overlap. All inspected severities are “review”; avoid counting each flag as an independent clinical error.

Only 25 distinct claims have image/vignette flags, but this is the output of existing flaggers, not a verified count of every image-dependent assertion. A future source audit must examine references to figures, options, pronouns, patient-specific findings, and whether an assertion is supportable without the original vignette.

6080 claims have empty qualifier objects, including 5830 of 6168 factory claims. Orthobullets production has much better structured qualifier coverage: only 40 of 2287 empty. Stored keys include anatomy (2178), setting (1492), procedure (1275), age_group (1100), severity (916), laterality (314), and contraindication (84).

The production contract allows exactly those seven qualifier keys. It has no structured time-frame field. Therefore “timing=0” in the exploratory coverage query reflects a schema limitation, **not proof that all text omitted timing**. Duration, post-operative phase, acute/chronic status, evidence date, and applicable time period should be modeled deliberately with a versioned contract change.

### Duplicate and contradiction handling

223 semantic-hash groups involve 449 active claims. Some duplicate pairs have differing primary entities or differing text. This deserves review but is not a license to merge all hash matches. A durable equivalence check must preserve population, indication, measurement units, threshold operator, polarity, timing, procedure, and certainty.

Repeated sources are not independent corroboration. A question, its explanation, a derived Anki card, and an LLM paraphrase may all originate from one source family. Count them as multiple associations and one underlying evidentiary origin where appropriate.

The audit does not establish an exhaustive contradiction inventory. Existing internally_conflicting extraction outcomes and proposal conflict states are useful, but neither proves that cross-source contradictions are consistently detected. A future contradiction registry needs scoped claim-version pairs, the contested dimension, applicability overlap, evidence origins, adjudication, and product handling.

### Provenance

3305 claims have active card associations and 2411 have active question associations, but 3003 have neither. Many claim metadata objects carry source fingerprints, algorithm tags, or extraction metadata; these 3003 must not be described as certainly source-free. They are missing the inspected normalized source-link paths.

Nineteen card-claim links lack evidence hashes; these are legacy claims-v2.3 links. Current factory links have hashes. Hashes establish identity/integrity, not the strength of clinical support.

ontology_provenance_records and ontology_governance_actions are empty. Other tables and metadata contain provenance and governance information, so there is not zero provenance overall. The problem is fragmentation: a consistent audit must reconstruct the source, exact version, evidence span, review result, release inclusion, and later revocation across multiple systems.

## 4. Graph semantics, ontology, and publication

### Entity resolution

Of 1401 active entities, 1193 meet trusted criteria: 1190 reviewed/approved and three canonical/approved. Another 208 are reviewed/unreviewed. All 2248 active relationships have trusted endpoints in the checked set.

There is one duplicate normalized-label group, “orif,” containing two entities of the same type. No ambiguity was found among approved aliases. However, only 68 approved aliases exist and 1130 trusted entities have no approved alias. A low ambiguity count partly reflects sparse alias coverage.

816 trusted entities have no approved canonical teaches_about/tested_answer claim edge. 296 trusted entities are isolated from active canonical relationships. They may still have useful cards, questions, or curriculum links; graph isolation is not equivalent to uselessness.

374 claims have a primary_entity_id outside the trusted set. The primary field and typed role edges need a consistent resolution policy. Do not silently copy every mentioned entity into primary_entity_id: context, comparison, contraindication, and tested-answer roles have different retrieval meaning.

### Relationship distribution and semantics

1339 of 2248 edges are prerequisite_for (59.6%). Other families: involves_anatomy 338, part_of 203, has_complication 109, injured_in 108, has_imaging_finding 63, has_classification 33, and smaller families. Treatment/exam families are thin: treated_by four, tested_by five, at_risk_structure seven.

A dense learning-prerequisite scaffold can help educational sequencing, but it is not a substitute for clinical diagnostic/treatment relationships. The registry defines prerequisite_for as mastering one concept before another; those edges should not imply clinical causation, indication, or treatment.

A Tarjan strongly-connected-component check over all 1339 prerequisite edges found two cycles, each with three nodes:

- Periprosthetic Joint Infection, Knee Prosthetic Joint Infection, Hip Prosthetic Joint Infection.
- Polyethylene Wear Osteolysis, Bearing Surface Selection, Adverse Local Tissue Reaction.

If the intended model permits co-requisite clusters, represent that explicitly. If prerequisites are strict, adjudicate and repair the directed edges before using topological learning plans.

Comparing all 2248 active edges with the current type registry found three mismatches: two has_imaging_finding subjects typed procedure where condition is required, and one has_complication target typed condition where the registry requires a complication. The two procedure-typed subjects are Polyethylene Wear Osteolysis and Adverse Local Tissue Reaction. These labels/type combinations warrant ontology review; this audit does not prescribe their clinical reclassification without source review.

No dangling endpoints, self-loops, or untrusted endpoints were found in the checked relationship integrity query. This positive result is distinct from the cycle/type problems.

### Release and trust

The active release is kg-beta-20260716-002, review tier automated_beta, rollback tested. Its 83 neighborhoods contain 19 full and 64 partial neighborhoods. Production objects comprise 1023 entities, 2187 relationships, and 26 curriculum bridges.

All 2187 production relationship objects carry partial provenance status. All inspected production objects have nonempty source_record_ids and a verification hash, so “partial” does not mean no evidence exists. It means evidence completeness must be inspected against the intended publication standard. Of 1193 trusted entities, 170 are outside those entity release objects.

Every active relationship's clinical_verification metadata is false. For entities it is false on 1043 and unset on 358; for claims false on 139 and unset on 8533. These fields do not establish that the contents are false. They show that clinical verification is not represented as completed.

Live v2/v3 relationships filter approved/reviewed status and serialize reviewTier=approved and riskTier=standard. They do not consult clinical_verification or the production object's automated_beta/risk/provenance status. This can flatten several kinds of assurance into a stronger-looking runtime label.

The live retrieval definitions accept p_release_id, but only include it as returned metadata; they do not join kg_production_objects or enforce the supplied release's membership. A pinned release label therefore does not pin every returned entity/relationship. Release filtering or a clearly versioned live-graph contract is needed before claiming release-specific reproducibility.

## 5. Product retrieval and integration

### Live RPC probes

These were direct read-only SQL calls against live functions, with default general mode and representative queries. They are small diagnostic probes, not a comprehensive retrieval benchmark or latency test.

| Query | RPC | Entities | Facts | Claims | Exact linked cards | Coverage |
|---|---|---:|---:|---:|---:|---|
| carpal tunnel syndrome | v2 | 5 | 3 | 0 | 0 | unknown |
| carpal tunnel syndrome | v3 | 8 | 10 | 1 | 0 | full |
| femoral neck fracture | v2 | 5 | 10 | 0 | 0 | unknown |
| femoral neck fracture | v3 | 8 | 10 | 1 | 0 | full |
| perineurium | v2 | 1 | 0 | 0 | 0 | unknown |
| perineurium | v3 | 1 | 0 | 1 | 0 | full |

The femoral-neck v3 result is claim 188aee4f-e10e-4a0e-a868-7b8fa821f36e, a groin-flap assertion mentioning the lateral femoral cutaneous nerve. Its claim_fts/claim_token channels match one query term; pool score is 0.1857, entityScore zero. The query asks about a fracture, while the result addresses a different procedure and nerve. This is a concrete relevance failure without requiring a judgment of the claim's medical truth.

For carpal tunnel syndrome, the result is a claim about recurrent motor-branch injury during release. This is related but covers one narrow operative complication. Calling it full coverage for the broad topic is also too strong.

That probe also reports termCoverage=2 and idfCoverage=0. The live formula counts all matched terms in the numerator but only terms occurring in at least two eligible claims in the denominator (with a minimum denominator of one). With a four-claim eligible corpus, the purported coverage ratio can exceed one and many useful rare terms receive zero IDF weight. Align numerator/denominator semantics and calibrate sparse-corpus retrieval separately; adding a larger corpus does not replace relevance validation.

The live functions label coverage full whenever any ranked claim exists. That tests nonemptiness, not completeness or adequate facet coverage. Provider assembly preserves this label when a packet has claims. Replace it with explicit relevant/partial/insufficient coverage evidence and limitations.

v2 obtains claim candidates through published-card/entity paths; there are no card links to the four serving versions. v3 can retrieve those versions through text channels. Therefore zero v2 claims and nonzero v3 claims are consistent with the current data.

Two additional EXPLAIN ANALYZE calls, using default RPC arguments and the femoral-neck query, took **981.442 ms for v2 and 1458.370 ms for v3** at the database. These are individual SQL execution samples, excluding HTTP and application assembly, with uncontrolled cache state. They are not p50/p95 estimates. The v3 sample exceeds the local 1200 ms retrieval deadline and demonstrates a practical need for representative latency tests and query optimization before expanding v3 usage.

### Brobot

Local defaults are master shadow, grounding shadow, exact claim-linked Anki off, retrieval v2, and 1200 ms retrieval deadline. The allowlisted local environment flags are unset. Deployed values are unknown. A default shadow configuration is a deployment fact to verify, not a reason to assume users currently see graph-informed answers.

The new local dispatcher can select v2/v3 and refresh publication eligibility rather than serving indefinitely cached claims. Relevant tests pass. Deployment of those local edits has not been established.

Both live RPC definitions omit claim_entities. New typed subject/context edges therefore do not directly feed their claim selection. Legacy primary_entity_id and card/question associations remain important. The new enrichment worker should not be judged successful merely because it inserted edges that consumers do not use.

The packet estimator returns min(1200, estimated tokens). This can under-report a large payload before boundFacts compares it to a token budget. Claims/candidates also contribute to its JSON estimate. Replace the capped estimator with an honest measurement and enforce a bounded packet after all components are selected; test actual maximum-size packets.

### Anki

All 3309 active card-claim links are approved teaches edges with valid current versions in the inspected integrity checks. None reaches a serving-eligible claim version. The latest published release includes 3670 cards, while canonical_cards contains 5095 total.

Three release rows remain published simultaneously, with two drafts. Latest-release selection is explicit in the retrieval path, but older published states should have documented retirement/selection semantics.

Local Anki exact claim linking uses approved teaches relationships, current version matches, shared claim serving eligibility, and a published-release scope. These are useful safeguards. They also mean publishing claims is necessary before this route can return the currently linked inventory.

The Anki reviewer improvement helper finds claims with primary_entity_id in the selected entity set, then checks serving eligibility. It ignores typed claim_entities subjects. Claims newly resolved through role edges with null primary fields will still be missed by this consumer unless its query model changes.

The new anki_kg_factory_* execution tables are empty, as are reviewer outcome and expansion review-action tables. This does not mean no historical factory work exists: card_claim_backfill has four runs and 5988 backfill claim rows. Separate established legacy operations from new planned machinery.

Five improvement suggestions and two decisions exist, with zero adjudications. They do not constitute a validated continuous learning loop.

### Question extension and other products

The extension question-claims route exposes extraction/link outcomes that can include needs_review and has a separate single-claim pathway. Its accepted/extracted UI state should not imply clinical publication. A shared explicit state vocabulary is needed across the extension, reviewer, Brobot, and administrative dashboards.

Curriculum integration remains sparse in normalized graph bridges: 67 curriculum_node_entities records for 763 nodes, and zero concept_canonical_entities. There are 7557 external-question curriculum mappings, so useful external mapping exists separately. Normalize and measure the bridge between those layers before claiming curriculum-wide graph reasoning.

This audit does not establish that every other product, including X-ray workflows or future case-preparation features, consumes the graph. Add each product only after verifying its retrieval and decision paths rather than assigning benefits based on table existence.

## 6. Automation and operational behavior

### Existing activity

There are 8154 proposals. Large unresolved/generated pockets include 1631 generated entity proposals (1589 have zero supporting_source_count), 769 entity proposals needing review, 515 claim proposals needing review, and 217 decision-point proposals needing review.

Relationship proposals have empty source_signal_ids even where supporting_source_count is nonzero. Metadata and review artifacts may contain the actual sources; the audit does not establish that each proposal lacks evidence. It does establish inconsistency between normalized support fields and claimed support.

All 5762 proposal batch memberships have packet_state approved; 1487 still have pending apply_action, 4217 already_applied, and 58 inserted. Packet approval is not equivalent to applied state. Reconcile these stages explicitly.

The enrichment job inventory is dominated by 1306 cancelled pilot jobs and three superseded exhausted jobs. Recent completed work consists of seven entity jobs and two card jobs. The card jobs completed with no_card_match. The worker currently implements entity/card stages, not source_audit or clinical_evidence.

Six recorded enrichment invocations completed with 1323 prompt and 255 completion tokens, estimated cost $0.0009372. This is a tiny pilot baseline. Do not extrapolate full source/clinical review cost or product usefulness from it. Production extraction costs use historical event/run accounting; nine run/event cost mismatches need reconciliation.

No expired leases or stale-version jobs were found in the checked queue. Nine old production runs remain running, including rows whose completed_count equals expected_count. A deterministic finalizer and cross-run cohort status are needed.

### Where compounding improvement fails today

In scripts/run-ob-claim-enrichment.ts:131–133, a repeated proposal fingerprint reuses the row through an update that leaves updated_at unchanged. New claimVersionIds, source signal IDs, and independent support are not appended to the existing proposal. This is a direct break in the desired “more evidence makes proposals better” behavior.

Coverage fetching at scripts/lib/education/kg-canonical-coverage.ts:188–196 simply awaits a query. Its table reads have no full pagination. The generator at scripts/generate-kg-automation-proposals.ts:531–553 also issues unpaginated reads. A fetchAllRows helper exists elsewhere but is not consistently adopted.

The live API probe returned exactly 1000 entities of 1401, 1000 cards of 5095, and 1000 questions of 8159, with no query error. This is silent incompleteness, not a hypothetical future scaling problem. Supabase documents a default maximum of 1000 rows and recommends pagination: [JavaScript select reference](https://supabase.com/docs/reference/javascript/select).

Generic apply-approved-kg-automation-proposals.ts explicitly performs several writes without a surrounding per-proposal transaction. Partial batch progress is not inherently wrong, but each proposal's canonical changes, provenance, and applied receipt must be atomic and retry-safe.

No KG scheduler appears in vercel.json. External schedulers or database cron were not exhaustively verified, so the correct conclusion is that automatic scheduling has not been demonstrated in this audit.

### Feedback and demand

brobot_kg_retrieval_events, kg_graph_feedback_events, and kg_graph_feedback_signals all contain zero rows. The growth queue has 12 open entries, all with unique_user_count zero. It cannot yet be treated as verified organic user demand. Its aggregate query counters overlap gap types and should not be summed as distinct user queries.

A validation script creates and removes controlled retrieval events/growth rows. This proves validation tooling exists, not that the current 12 rows are that script's seeds. Classify event origin explicitly before prioritizing work from queue totals.

telemetry.ts:243 falls back to answer_influenced=false and retrieval_mode=shadow on schema/check errors. If a request actually used claims in an enabled answer, its recorded fallback can misrepresent behavior. Preserve the actual outcome or label telemetry incomplete; do not invent a safe-looking outcome.

## 7. Access control and database advisors

Confirmed high-priority objects:

| Object | Rows | RLS | anon/auth read | anon/auth DML |
|---|---:|---|---|---|
| card_canonical_entity_links | 9352 | disabled | granted; anon read confirmed | granted |
| kg_proposal_batch_memberships | 5762 | disabled | granted; anon read confirmed | granted |
| claims_review_backup_2026_10_07 | 7066 | disabled | granted; anon read confirmed | granted |
| trusted_canonical_entities | 1193 view rows | owner-rights view | anon read confirmed | grants exist; actual view mutability not tested |

The transaction-local anon probe also returned zero rows from canonical_entities itself. This establishes view/base policy divergence. If public graph browsing is intentional, publish a deliberately restricted read model; mutation/control records should remain private.

Core new claim tables are better protected: claims, versions, question/card links, claim_entities, attestations, enrichment jobs, model budgets/invocations, and final reviews have RLS and service-only privileges in the inspected policy set. servable_claim_versions uses security_invoker and restricted access. Retain this pattern.

RLS-enabled tables without policies generally deny client-role access; that advisor category is not automatically a vulnerability. Likewise, public execute on a trigger function does not by itself prove direct exploitability. Review actual security-definer RPC behavior, grants, and search paths.

Security advisor inventory: 10 public tables without RLS, 19 owner-rights views, 53 mutable function search paths, 42 anon-executable and 43 authenticated-executable security-definer function findings, plus broader auth/extension/Postgres findings. The whole-project output includes objects outside this graph audit; investigate them in a separate application security pass.

Performance advisor inventory: 356 unindexed foreign keys, 186 auth-RLS initplan warnings, 165 unused-index observations, 14 multiple-permissive-policy warnings, three missing-primary-key observations, and two duplicate-index observations. Treat these as candidates, not instructions to delete indexes or modify all policies indiscriminately. Recent remediation foreign-key indexes exist; large historical advisor totals are not necessarily new regressions.

For the next implementation pass, pair privileges with RLS and test each role's allowed/denied operations. Owner-rights views require deliberate handling; Supabase describes security_invoker as the mechanism to apply underlying permissions/RLS to the caller. [Official RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security), [official view documentation](https://supabase.com/docs/guides/database/views).

## 8. Verification and confidence

The current command npm run education:ob:remediation:test passed 13 TypeScript suites and the publication database integration test. Coverage includes extraction/review contracts, identities, equivalence, production helpers, model budgeting, entity resolution, retrieval dispatch, privacy, policy, telemetry, and enrichment planning.

Passing these tests supports the behavior they exercise. It does not cover the discovered live relevance example, all graph semantics, large-table pagination, production deployment flags, anonymous write denial, exhaustive medical validity, end-user outcomes, or production latency.

Confidence:

- **High:** exact captured counts, specified role privileges/RLS state, current reference integrity checks, API truncation, first-500 readback, live RPC sample behavior, graph cycle/type analysis.
- **Moderate:** product implications inferred from reviewed local code and live function definitions; deployed code/environment not verified.
- **Not established:** clinical accuracy rate, complete contradiction rate, extraction recall against every source, p95 production latency, user learning improvement, and autonomous cost-effectiveness.

## 9. What to do next

Protect the graph-control tables and backup; verify view intent. Repair pagination and make status reporting version-aware. Add a minimum relevance gate and honest coverage to retrieval, and make release membership real. Connect consumers to typed claim subjects with role-aware semantics.

Then complete evidence/publication work on a small representative set, including all repaired candidates and the unresolved first-500 questions. Do not bulk-approve 7058 parents or bypass the publication gate to increase a coverage dashboard.

Only after those foundations should new claims trigger unattended enrichment. Start by automatically proposing changes and running shadow evaluations. Expand automated publication only for specific, validated low-risk operations, while routing ambiguous or high-consequence assertions for clinical review.

Use the companion roadmap as a concrete implementation sequence. Its targets are proposed acceptance gates, not performance already achieved.
