# Plan for continuous knowledge graph improvement

**Based on:** the October 9, 2026 live re-audit in audit-report.md.
**Status:** proposed implementation plan; no implementation, deployment, live mutation, model run, or scheduled automation was performed by this audit.
**Objective:** each new source or claim should increase validated coverage, improve relevant retrieval and learning support, or identify an actionable conflict. Improvements must remain traceable, bounded in cost, and reversible.

## 1. Define improvement before automating it

A graph becomes more useful when it answers more relevant questions accurately, exposes limitations, supplies appropriately matched learning material, and corrects stale or conflicting assertions. Counting claims, edges, approved parents, or model agreement alone does not measure this.

Use five independent readiness dimensions:

1. **Source fidelity:** the exact assertion is supported by an identified source span, with context preserved.
2. **Clinical validity:** an appropriate evidence/reviewer process establishes the statement's applicability and reliability.
3. **Ontology quality:** subject, contextual entities, predicates, types, and qualifiers are represented consistently.
4. **Publication:** the exact current version passes a documented policy and belongs to a specific published view/release.
5. **Product usefulness:** relevant retrieval, honest coverage, correct citations/card matching, and measured user outcomes.

A claim can succeed at one stage and fail another. Display all five rather than collapsing them into “approved.” Preserve extracted/accepted as workflow states separate from published/servable.

## 2. Target processing architecture

New information should follow this sequence:

Source revision → immutable source observation → candidate claim versions → deterministic checks → scoped equivalence/conflict detection → source/clinical review → typed entity links → eligible publication → product indexes → shadow evaluation → measured use → targeted repair proposals.

### Immutable source and evidence records

Represent source identity separately from a captured revision. Capture provider/native identity, access rights, content fingerprint, extraction timestamp, section/span references, structured table/image references, and whether the assertion depends on patient-specific context.

Evidence records should bind to exact claim_version_id, source revision, span fingerprint, dimension, verdict, reviewer identity/type, method/policy/model version, time, and relevant limitations. Retain failed/abstained judgments. An amended claim receives a new version and fresh evidence, rather than inheriting a stale positive receipt.

Keep source-family identity: an explanation, derived card, and generated paraphrase can share an origin. More associated records should not automatically increase independent-source confidence. Source count, source-family count, and reviewer-method count are separate measures.

Respect source access and licensing constraints in storage and product presentation. Keep user/patient content out of graph prompts and telemetry unless separately authorized and explicitly necessary.

### Durable incremental work

Use a durable event/outbox entry committed atomically with a source/claim/version change. A worker consumes stage-specific jobs with at-least-once delivery and idempotent effects.

Recommended idempotency key:
claim version + stage + policy version + source input hash + relevant ontology/release fingerprint.

Store dependencies so a change invalidates only affected work. Source revision invalidates its fidelity receipt; subject merge invalidates dependent entity links/ranking; a new deck version invalidates card entailment only; a new retrieval policy re-evaluates benchmark packets without repeating extraction.

Each stage should record inputs, outcome, retryability, reason codes, elapsed time, cost/usage, and output references. Leases need expiration, bounded retries, terminal states, and a deterministic run finalizer. Cancelled policy jobs remain historical but should be excluded from active backlog totals.

### Promotion and atomicity

Proposal application should atomically write canonical changes, evidence associations, affected aliases/edges, and an applied receipt. A retry should find the receipt and return the same result. Batch progress can be incremental, but an individual proposal should not be half-applied.

Canonical merge operations need preserved aliases, redirected references, collision checks, versioned merge history, and rollback. Do not use label-first limit(1) selection to settle ambiguous identity.

## 3. Make evidence compound

Replace the enrichment proposal conflict no-op with a normalized proposal_support association:

- Unique support identity binds proposal, claim version, source revision/family, asserted role, and evidence fingerprint.
- Repeated identical evidence is idempotent.
- Newly observed evidence is appended rather than overwriting prior support.
- Aggregate counts are derived from distinct support records.
- Confidence can be recalculated after new support, conflict, or a revoked source.
- Proposal history records why rank/status changed.

Do not define confidence as “two models agree.” Model agreement is a useful review signal, but correlated reviewers can repeat the same error. Use calibration against adjudicated examples, evidence quality, independent origins, scope match, and explicit abstention.

More evidence may lower confidence by revealing a contradiction. The desired system should surface that change, preserve the prior view, and pause affected publication when appropriate.

## 4. Claim equivalence, scope, and conflicts

Build candidate matching over normalized subject, claim type/predicate, object, measurement, polarity, qualifiers, and text similarity. Use exact hashes for identity; use semantic retrieval for candidate generation, not automatic merging.

Expand a versioned qualifier contract where warranted:

- Population/age, anatomy/site, laterality, severity and classification.
- Indication, contraindication, setting, procedure and technique.
- Time frame and post-operative phase.
- Numeric operator, value, unit, range, and measurement method.
- Certainty, evidence date, applicability period, and source limitations.

Run deterministic preservation checks on numbers, signs, units, negation, comparisons, and temporal terms before model-assisted equivalence. Unsupported specificity must lead to abstention.

Represent contradictions as scoped claim-version pairs with contested dimensions, overlapping applicability, source origins, severity, and adjudication. Different populations or timelines may explain an apparent conflict. Never hide competing versions by choosing whichever has more duplicated associations.

Use 223 semantic duplicate groups as an initial review set. Review mismatched entity IDs and contextual distinctions first. Track duplicate collapse separately from evidence consolidation.

## 5. Ontology and relationship improvement

Use exact canonical labels and approved aliases first, then conservative semantic candidates with type constraints. Distinguish teaches_about, tested_answer, context, comparison, and contraindication. Keep proposed/unresolved entities out of authoritative subject retrieval.

A promotion packet should include representative supporting claims, origin diversity, alias ambiguity, type candidates, nearby entities, existing duplicates, conflicting evidence, and affected products. Human review should focus on ambiguous or consequential decisions.

Enforce the shared predicate registry at both generation and database apply time. Revalidate existing edges when the registry changes. Separate educational prerequisites from clinical diagnosis/treatment/causal edges.

For prerequisite cycles, adjudicate whether the relationship is a strict prerequisite, a co-requisite, a subtype relationship, or simple relatedness. For subtype concepts such as hip/knee variants, do not assume a bidirectional prerequisite graph is appropriate.

Prioritize aliases by observed failed queries and reviewer-approved terminology. A new alias must pass collision/type checks; abbreviation ambiguity should carry context rather than being globally asserted.

Grow clinical relationships from reviewed claim evidence. A new claim can propose an entity relationship, but publication should require predicate-specific scope and review rules. Thresholds, contraindications, at-risk structures, and treatment selection deserve stricter evidence than low-risk educational navigation.

## 6. Retrieval and product integration

### Retrieval

Use the same eligible claim-version read model across Brobot, exact Anki linking, reviewer support, and future consumers. Index typed approved canonical subject roles alongside lexical and card channels. Context entities may boost relevance, but they should not silently become the subject of an answer.

Enforce release membership or return a clearly defined live-graph snapshot identifier. Apply actual production risk/provenance/review tiers rather than labeling all reviewed edges standard.

Add a relevance gate before ranking output is accepted:

- Entity/topic coherence with the query and requested intent.
- Minimum meaningful term/phrase or subject support.
- Preservation of essential clinical facets.
- Exclusion/penalty for incidental single-word matches.
- No broad-query full-coverage assertion based on one narrow claim.

“Femoral neck fracture” returning a groin-flap claim becomes a permanent negative benchmark. “Carpal tunnel syndrome” retrieving a complication claim should be partial evidence with a stated limitation.

Measure packet tokens without clamping the estimate. Bound all payload components, then render a final packet and verify the actual limit.

### Brobot

Start with shadow retrieval. Record candidate/selected version IDs, graph release, retrieval policy, relevance/coverage outcome, actual answer influence, and error category. Store hashed or deliberately sanitized query features; do not retain raw sensitive messages as a default.

Verify that rendered citations correspond to selected current versions. A claim revoked between retrieval and generation must be rechecked or handled with an explicit snapshot consistency policy.

Enable answer influence on a narrow validated cohort only after relevance and publication gates pass. Increase coverage by adding eligible evidence, not relaxing the gates to fill packets.

### Anki

Keep graph-related card discovery separate from exact teaches matching. A related card is useful, but it should not be represented as teaching the exact claim.

Exact matching requires current included card version, approved teaches association, full assertion entailment, applicable qualifiers, and serving-eligible claim version. Test thresholds, polarity, procedure, population, timing, and certainty.

Use approved typed subject edges in reviewer improvement lookup. Make novel-card proposals only for genuinely uncovered validated assertions. Deduplicate against the released deck before generation. Human-approved changes should feed regression cases and link corrections.

Use recall performance as a learning signal, not as evidence that a medical assertion is true. Personal learner state belongs in a separate layer from canonical knowledge.

### Curriculum and future products

Connect curriculum objectives to claim/entity coverage with explicit educational scope. Generate gap reports from fully paginated reads and distinct IDs.

Case preparation can benefit from procedure/anatomy/complication relationships once reviewed; X-ray workflows require separately validated image/diagnostic evidence. Do not inherit clinical approval from unrelated textual claim pipelines.

Each product needs its own benchmark, latency budget, disclosure/limitation behavior, and rollout gate.

## 7. Feedback, prioritization, and active review

Separate retrieval feedback, claim corrections, card mismatch reports, learner performance, and clinician adjudication. These have different evidentiary weight. A thumbs-up should not become a clinical-validity receipt.

Make event origin explicit: organic usage, controlled validation, benchmark, synthetic test, and operator action. Remove test signals from demand ranking. Count distinct requests/users without double-counting gap types.

Prioritize review by a proposed score:

Expected validated coverage gained × observed demand × product reuse × uncertainty reduction, divided by review cost; then adjust for clinical consequence, contradictions, and source quality.

This is a ranking aid, not automatic clinical authority. High-risk issues may require review even with low demand. Sparse neighborhoods should receive exploration opportunities so current traffic does not permanently bias the graph toward already-popular topics.

Use resolved reviewer disagreements as calibration examples. Preserve a held-out test set that is not used to tune prompts or thresholds.

## 8. Phased implementation and acceptance criteria

### Phase 0 — Protect and establish trustworthy baselines

Implement F01–F03 access-control remediation with explicit intended roles. Restrict backup/control tables, decide public-view intent, and add role-specific tests in an isolated environment before deployment.

Fix pagination and stable ordering for every full-inventory read. Add exact-count reconciliation and an explicit failure when a dataset is incomplete. Re-run coverage and proposal generation in dry-run mode and compare results before applying anything.

Create a version-aware status dashboard with extraction, review, publication, linkage, release inclusion, and product-use counts. Reconcile stale runs and cost summaries from authoritative ledgers.

Acceptance: unauthorized role tests deny mutations; required service/operator flows work; no full-table read silently truncates; first-500 outcome counts reconcile; parent-approved counts are not presented as serving counts.

### Phase 1 — Make retrieval safe and measurable

Fix relevance and coverage, release membership, trust-tier propagation, subject-role retrieval, token enforcement, and truthful telemetry fallback. Verify the deployed SHA/config and that controlled requests generate correctly classified telemetry.

Build a small hand-adjudicated benchmark spanning broad topics, narrow complications, abbreviations, mixed entities, negative matches, thresholds, variants, and query intent. Include the discovered femoral-neck negative example.

Acceptance: benchmark assertions match their sources; no prohibited draft version enters a packet; release revocation is respected; negative queries abstain; broad topics are not labeled complete by a single incidental claim; controlled telemetry accurately reflects actual influence.

### Phase 2 — Establish an evidence-reviewed publication pilot

Select 25–50 claims stratified across algorithm origins, numeric/contextual risks, duplicates, image dependence, and product relevance. Include all 15 repaired first-500 candidates and review the 11 unresolved questions.

Complete source-fidelity and clinical-validity reviews with qualified adjudication for the chosen risk level. Add positive publication receipts only after prerequisites are satisfied. Validate exact Anki entailment and typed entity roles.

Acceptance: every published pilot version has reproducible evidence and review history; no review is inherited after a text change; abstentions remain unpublished; related-vs-exact card matches are labeled correctly. Report yield, reviewer effort, error categories, and actual cost.

### Phase 3 — Implement incremental support and workers

Add durable event/outbox processing, normalized proposal support, invalidation dependencies, atomic apply RPCs, concurrency/lease safeguards, and stage budgets. Implement missing source/clinical stages with appropriately scoped review policies.

Acceptance: reprocessing the same event creates no duplicate effect/cost; repeated independent support is accumulated; same-origin duplicates do not inflate support; changed inputs invalidate the right stages; interrupted workers recover; each applied proposal has one atomic receipt.

### Phase 4 — Controlled continuous proposals

Run new-source ingestion and enrichment in proposal/shadow mode. Compare the incrementally maintained graph against a fully paginated reference rebuild. Use organic demand only after origin and telemetry checks.

Allow unattended application first for narrowly defined deterministic, reversible operations that have passed calibration—for example, deduplicated support association or proven exact identity maintenance. Do not automatically publish high-consequence clinical assertions based on model confidence.

Acceptance: coverage increases in validated units, precision remains above the agreed gate, review backlog/cost stay bounded, and rollback restores prior behavior.

### Phase 5 — Product rollout and expansion

Expand answer-influencing Brobot and exact Anki support by validated domain/release. Compare control and treatment cohorts with appropriate privacy controls. Add curriculum and additional products only after consumer-specific evaluations.

Acceptance: useful-answer/appropriate-card measures improve without worsening safety/relevance gates; release rollback and revocation work; latency/cost remain within agreed budgets. Failure reverts the affected feature/domain to shadow without disabling the evidence pipeline.

## 9. Metrics and proposed operating gates

These are proposed starting targets to calibrate, not achieved results.

| Metric | Baseline from audit | Proposed gate/measurement |
|---|---|---|
| Serving claims | 4; first-500 cohort 0 | Measure validated additions by exact version and risk class |
| Source/clinical receipts | 0 each | 100% of newly published pilot versions satisfy required dimensions |
| Inventory completeness | API reads truncate at 1000 | Exact-count/paginated reconciliation on every inventory job |
| Unauthorized graph mutation | Grants allow it on control tables | Zero permitted unauthorized mutation in role tests |
| Retrieval relevance | One concrete false match in tiny sample | Zero severe false matches on initial benchmark; report larger-set precision with confidence intervals |
| Coverage honesty | Any claim yields full | Coverage assessed against requested facets; broad queries can remain partial |
| Card entailment | No linked serving versions | Adjudicated exact-match precision; related links labeled separately |
| Typed subject coverage | 1993/8672 | Increase reviewed subjects without lowering resolution precision |
| Alias coverage | 63 trusted entities with aliases | Measure query-recall uplift and collision rate, not alias count alone |
| Feedback | 0 observed events | Controlled event success, then organic collection with origin labels |
| Queue health | Mostly cancelled historical pilot jobs | Separate active/terminal counts, stage latency, retry and abstention rates |
| Cost | Tiny six-call pilot | Cost per validated/servable claim and per useful retrieved answer |
| Prerequisite integrity | Two cyclic components | Zero unintended strict-prerequisite cycles |
| Relationship type integrity | Three mismatches | Zero unresolved violations in published objects |
| Deployment traceability | Unknown deployed SHA/config | Every production benchmark/report records SHA, policy, and release |

Measure p50/p95 retrieval latency at representative traffic and cold/warm states before choosing a production SLO. The local 1200 ms deadline is a configuration value, not an achieved latency result.

The audit's individual SQL samples were 981 ms for v2 and 1458 ms for v3, excluding network overhead. Optimize and benchmark the slow path before relying on it within a 1200 ms client deadline. Recalibrate term coverage and IDF for a sparse eligible corpus; the current live feature can produce coverage above one.

Define spend ceilings per stage, run, and day; reserve budgets before external calls, record actual usage, and pause when usage is unknown. A low-priced model should not substitute for missing evidence or qualified review.

## 10. How growth should produce compounding value

A new well-supported claim should:

- Resolve to existing entities, improving subject coverage without duplicating concepts.
- Add a distinct evidence association and strengthen or challenge existing support.
- Trigger a scoped conflict/equivalence review where needed.
- Reveal missing aliases or curriculum bridges through actual retrieval failures.
- Improve exact card discovery or propose a validated missing learning unit.
- Update only dependent indexes/evaluations.
- Produce a measurable useful retrieval or a clear, honest abstention.
- Feed reviewer corrections into future validation cases.

The graph's durable asset is the combination of scoped assertions, independent evidence, reviewed ontology, traceable versions, and measured product behavior. Volume helps only when that chain is intact.
