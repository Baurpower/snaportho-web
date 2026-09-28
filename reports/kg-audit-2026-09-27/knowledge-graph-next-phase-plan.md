# Knowledge Graph Next-Phase Plan — 2026-09-27

Gated stages. Each stage has an exit check; do not start the next stage until
the check passes. No stage says "ingest everything".

## Stage 0 — Live parity (half day, networked env)

Run read-only `SELECT` counts for educational_claims(+versions),
card/question_claim_links, external_questions, canonical_cards(+versions),
canonical_entities by status; active-vs-superseded links; fingerprint
NULL/dup check; algorithm_version distribution. Record project ref.
EXIT: counts published; report-vs-live deltas explained.

## Stage A — Graph invariants (1 week)

- Unify claim identity: one assertion-inclusive function; backfill-or-dual-read
  rule in code + contract tests; re-verify the 23 STRUCT groups.
- Freeze edge semantics: teaches/tests_primary/tests_secondary + explicit
  mentions decision; snapshot-pinned question links.
- Add `claim_entities` (multi-entity) and `claim_relationships` tables behind
  the existing verification gates; consumer filter audit for provisionals.
EXIT: verification SQL green; identity tests cover cross-era dedup.

## Stage B — Anki coverage completion (1–2 weeks)

Apply backfill for eligible cards with durable outcomes (canonical rows +
payloads for unresolved), idempotent reruns, per-release manifests.
EXIT: 100% eligible cards have a durable outcome; unresolved stay payloads.

## Stage C — Duplicate-claim review (overlaps B)

Human review of STRUCT clusters + embedding-assisted candidates; merges only
via `equivalent_to` edges + supersession, never silent collapse.
EXIT: all 23 clusters dispositioned; merge workflow documented.

## Stage D — Entity coverage (overlaps C)

Promote high-value proposed entities through the existing review packet;
fix the 88%-condition typing skew with semantic type resolution.
EXIT: top-decile unresolved claims resolved or explicitly deferred.

## Stage E — Orthobullets pilot (100 questions, stratified)

Extract TESTED claims (+ explanatory only if mentions decision says so);
dual-review correctness; measure card-match precision at tau 0.9.
EXIT: published precision/recall; thresholds set from data.

## Stage F — Cross-source overlap proof

Demonstrate ≥1 shared claim with both teaches and tests links in the pilot;
ship the gap queries (deck-heavy, question-heavy, orphan cards/questions).
EXIT: overlap exists on shared fingerprints, not pairwise mappings.

## Stage G — Scaled OB extraction (cohorts of ≤25)

Scale only after Stage E precision holds; provisional-entity SLA enforced.
EXIT: full 7,557-question registry linked or explicitly queued.

## Stage H — High-yield analytics

Materialized views + API for raw claim/entity metrics; composite scores later
and separately. EXIT: "most taught + most tested" queryable per claim.

## Smallest next milestone

Stage 0 + the identity decision (Stage A, first bullet): from a networked
checkout, publish live counts and land the unified-fingerprint rule with
tests. Everything downstream depends on it.
