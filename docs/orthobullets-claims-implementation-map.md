# Orthobullets v5 Production: Implementation Map

Date: 2026-09-28. Worktree dirty at start (57 changed/untracked paths); all
pre-existing modifications preserved. Overlapping diffs inspected before
editing: `question-claims/route.ts` (+symptom), `autonomous-claim.ts`
(+symptom), `20260927170000` (+trigger guard) — all unrelated; none touched
by this work.

## Caller / writer inventory (verified)

- v5 callers: `claim-extractor-v5.ts` self, its test, `run-ob-claim-extraction-pilot.ts`,
  `eval-ob-claims-regression.ts`. No production callers.
- v4 production writer: `src/app/api/brobot/extension/question-claims/route.ts`
  (extraction + entity RPC + commit RPC + card linking), plus
  `question-claim-runs/route.ts` (run ledger only).
- `external_questions` writers: v4 route (upsert), `orthobullets-import.ts`
  (REST upsert + source_aliases + curriculum mappings). v5 writes none.
- `educational_claims` writers: v4 commit RPC only (route itself only reads).
- `question_claim_links` writers: v4 commit RPC only.
- `card_claim_links` writers: v4 route `persistCardLinks` only. v5 never touches.
- `canonical_entities` writers: `apply-pilot-approved.ts`,
  `apply-approved-kg-automation-proposals.ts`, `kg-entity-promotion-apply.ts`,
  reviewer proposals route. v5 never touches.
- Entity-link writers: `apply-legacy-retargeting.ts`, v4 entity RPC. v5 never touches.

## Production schema facts (read-only, 2026-09-28)

- `primary_entity_id` already NULLABLE on claims + versions; semantic columns
  deployed. v5 persists NULL entity (no canonical prerequisite).
- `question_claim_links_active_uidx (provider, native_question_id, claim_id)
  WHERE is_active` exists: duplicate active edges already impossible.
- `educational_claims_active_identity_uidx (fingerprint_hash,
  semantic_fingerprint_hash)` partial exists (requires predicate/object non-empty).
- Link checks: role tests_primary/tests_secondary; review_status 5 values;
  approval 3 values; evidence_hashes 64-hex concat; metadata must pass
  `educational_metadata_is_safe` (no stem/choices/explanation keys).
- Qualifier keys fixed: anatomy, age_group, setting, severity, laterality,
  procedure, contraindication (string <= 80).
- `importance_level` L1..L4 semantics undocumented: v5 leaves default L2,
  records v5 importance in metadata + link role. Deliberate non-mapping.

## New files (all additive)

- `src/lib/brobot/orthobullets/claim-extraction-contract-v1.ts` — immutable
  `ob-claims-production.v1` contract: types, validators, deterministic
  identities (attempt/candidate/durable/link), safety checks. Pure.
- `src/lib/brobot/orthobullets/claim-review-pipeline.ts` — generator →
  factual+quality review (one call, separate judgments) → coverage review →
  ≤1 repair → final validator. Injected model client. No I/O.
- `src/lib/brobot/orthobullets/ob-question-identity.ts` — RESOLVED |
  UNRESOLVED | CONFLICT resolver. No stem fuzzy matching. No row creation.
- `src/lib/brobot/orthobullets/ob-claim-resolution.ts` — exact → semantic →
  retrieval → equivalence review → reuse | create | unresolved.
- `src/lib/brobot/orthobullets/ob-production-runner-lib.ts` — lease/heartbeat/
  backoff/error-classification/budget orchestration. Injected DB + model.
- `scripts/run-ob-claims-production.ts` — `ob:claims:run` / `ob:claims:resume`,
  `--dry-run` / `--apply` (+ all required flags). No Anki/entity calls.
- Migrations `ob_claim_*` (runs, items, extraction events, candidates,
  decisions, resolutions, identity resolutions) + RPCs (lease, heartbeat,
  persist, complete). Created with `supabase migration new`.
- Tests `ob-*.test.ts` (stub model + fake DB) + regression JSON expanded to 50
  abstract cases (no source text).
- Docs: `orthobullets-claims-production.md`, `orthobullets-claims-muse-runbook.md`.

## v4 isolation (explicit)

1. No edits to the v4 route or v4 RPCs. New tables/RPCs use `ob_claim_*` names.
2. New algorithm string `orthobullets-claims-prod.v1`: rejected by the v4
   commit RPC equality gate; invisible to the v4 route's cache filter.
3. v5 imports nothing from the v4 route; v4 references no v5 tables.
4. Shared tables (`educational_claims`, `question_claim_links`) only: v5 rows
   carry the prod algorithm + `needs_review` (never `auto_approved`);
   supersession touches same-algorithm rows only, sets flags, deletes nothing.
5. Predicate marker `v5_assertion` + object_text derived from normalized claim
   text (documented): enrolls v5 claims in existing exact-identity unique
   indexes without fabricating predicate/object semantics.
6. Runner statically asserts no imports of Anki linker / entity RPC modules.

## Open blockers (pre-existing)

- No isolated/staging postgres available locally (no docker/postgres binaries);
  pglite in /tmp planned for migration + RPC verification. Real canaries need
  staging + deployment authority.
- `supabase db lint` advisors need a linked project: BLOCKED until staging.
