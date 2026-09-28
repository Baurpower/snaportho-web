# KG Identity vNext — Verification

## Corpus re-fingerprint (offline, read-only)

Source: `reports/education/card-claim-factory-2026-09-25/.../proposed-claims.json`
Tool: `scripts/report-claim-semantic-identity.ts` (default offline mode; no DB).

- total claims evaluated: 3,429
- unique semantic fingerprints: 3,429
- duplicate candidate groups: 0
- statuses: unique 3,382; legacy_collision_resolved 47; exact_semantic_candidate /
  possible_duplicate / possible_conflict / needs_review: 0
- normalized-assertion whitespace defects: 0; empty: 0; min length 20

## Legacy collision re-evaluation (key regression test)

All 23 STRUCT groups: **split_correctly 23, still_equivalent 0,
still_ambiguous 0.** Every known v1 false-equivalence separates under
semantic v1, including the Lachman-vs-TKA numeric collision and the
posterior/anterior directional collisions. Full per-group evidence:
`legacy-collision-review.md`.

## Contract tests

`src/lib/education/claim-semantic-identity.test.ts` — all assertions passed.
Covers: SQL/TS parity payload pin; normalization pins (entities, unicode,
tags, cloze, comparators, trailing dot + space-before-dot regression);
equivalence convergence; documented paraphrase non-convergence; predicate,
direction, comparator (incl. ≥/≤), population, and anatomy splits; numeric
collision regression; source independence; claim-type and qualifier
participation (+ order-insensitivity, empty ignored); legacy
never-equivalence (shared v1 hash, split semantic); record helpers.

Regression suites re-run after the change — all green:
`card-claim-factory`, `card-claim-factory-proposed-entities`,
`card-claim-factory-evaluation`, `card-claim-factory-entity-likeness`,
`card-claim-factory-context-specificity`, `card-claim-deck-loader`.

Typecheck on edited files (project module flags): clean.

## SQL verification (not yet runnable — live DB unreachable)

`supabase/verification/claim_semantic_identity.sql` (read-only,
`begin; set local transaction read only; ... rollback;`) covers: totals,
semantic coverage/NULLs, legacy algorithm distribution, duplicate semantic
groups (+ by review state), trigger parity breaches, legacy-hash integrity,
orphan versions, broken `current_version` pointers, version coverage, index
state, behavior pins (normalization stability, numeric-collision split,
comparator preservation), and hard zero-breach gates. Must be run from a
networked environment post-migration; see rollout plan.

## Performance check

- Identity computation is O(text length) per claim, no external calls.
- Candidate lookup uses the partial btree index on
  `semantic_fingerprint_hash where not null` — indexed point lookups, no full
  scans. Commit paths already hold advisory xact locks for dedup; the same
  pattern applies to future semantic reuse.
- Scale: 3,429-claim corpus re-fingerprints in seconds offline; +7,557 OB
  questions ≈ 8k claims is trivial; 10^4–10^5 claims remain comfortable for
  Postgres btree + jsonb. No new infrastructure needed.
- Deterministic UUIDs unchanged (stable); no ID churn in this phase.
