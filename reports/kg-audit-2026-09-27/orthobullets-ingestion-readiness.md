# Orthobullets Ingestion Readiness — 2026-09-27

## Ready today

- **Native identity**: durable per-question keys (OBQ/SBQ codes; Himalaya
  definitionId with attempt-id exclusion), sha256 over
  provider+native+stem+sorted-choices, drift-not-new semantics, CI gates.
- **Metadata registry**: `external_questions` (source/id/specialty/topic/slug),
  import pipeline with review CSVs; corpus sized at 7,557 questions, 752
  specialty/topic pairs, 11 normalized specialties.
- **Claim commit path**: v4 generator+critic → `commit_orthobullets_machine_claim`
  (advisory-lock dedup, supersede-then-upsert, tests_primary links pinning
  claim version + source hash), run/item tracking with stages, leases,
  retries, token accounting.
- **Entity resolution**: 5-signal candidate search (question links, exact
  label, alias, curriculum bridge, trigram) with authoritative-or-provisional
  outcomes; confidence floor 0.90 for auto-accept.
- **Card convergence**: claim-overlap matcher (tau 0.9, delta 0.05, ≤3 cards,
  excludes needs_review) already links tested claims to teaching cards.
- **Licensing posture**: stems/choices/explanations never persisted (registry
  comment + request-contract enforcement). Only hashes retained.

## Missing (must resolve before large-scale ingestion)

1. **Question versioning.** No version/history table; drift detection is a
   single overwritten `source_fingerprint_hash`. A changed explanation silently
   re-hashes; tested-claim lineage across edits is unrecoverable. Smallest
   fix: `question_source_snapshots` (provider, native, version_no, fingerprint,
   observed_at, run_item) with links referencing the snapshot, not the live
   hash. Reuse the 0.99/0.95 drift gates.
2. **Tested-vs-explanatory separation.** The pipeline extracts ONE claim per
   question and labels it `tests_primary`. The audit's required invariant —
   `tests` distinct from `mentions` — is structurally absent (no mentions role,
   no citation table, evidence_locator is the fixed string
   'reviewed-question'). Decide explicitly: either add a `mentions` role +
   citation retention, or record wont-fix and accept that high-yield scoring
   cannot distinguish tested knowledge from explanation trivia.
3. **Claim-identity unification.** OB v3/v4 claims use assertion identity;
   card v1 claims use structural identity. Cross-source convergence ("cards
   and questions genuinely share claims") is unreliable until one function +
   backfill-or-dual-read rule is chosen (see claim-architecture-audit).
4. **Provisional-entity quarantine audit.** v4 creates `status=proposed` rows
   inside `canonical_entities`. Before scale: verify every consumer filters
   status/review_status, and cap provisional creation rate with a review SLA.
5. **Stratified pilot evidence.** No precision/recall numbers exist for
   tested-claim extraction. Run a 100-question stratified pilot (subspecialty ×
   format), dual-review tested-claim correctness and card matches, then set
   the tau/confidence thresholds from data instead of 0.90.

## Smallest safe unit of ingestion

One `orthobullets_claim_runs` cohort of ≤25 questions (existing cohort limit),
single subspecialty, dry-run card evaluation first, human review of all
committed claims/links before the next cohort. The machinery already supports
this; only the review SLA and pilot scorecard are missing.

## Scale estimate

7,557 questions × ~1 tested claim + ~1 link + entity links ≈ 8k claims, 8k
question links, ≤15k entity-link touches — trivially within Postgres. The
binding constraint is review capacity, not storage.
