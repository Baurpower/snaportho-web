# Final Production Baseline (Phase 3C release, 2026-09-28)

Project `geznczcokbgybsseipjg`, deck release `7764b632-…` (0.3.1-cloze-media).
Captured read-only after run `30774655-…` completed (3,670/3,670, 0 failed)
and the idempotency re-run returned `already_completed` with zero drift.

## Counts (before → after)

| Table | Pre-apply | Post-release |
|---|---|---|
| educational_claims | 2,113 | 6,368 (+4,255) |
| educational_claim_versions | 2,113 | 6,368 (+4,255, 1:1 with claims) |
| card_claim_links | 19 | 3,309 (+3,290 teaches) |
| claim_entities (active) | 0 (table new) | 5,635 (2,980 canonical / 1,299 proposed / 1,356 unresolved) |
| canonical_entities | 1,295 | 1,401 (+106) |
| trusted entities | 1,087 | 1,193 (+106) |
| entity_review_decisions applied | 0 | 354 (68 alias / 179 reject / 107 promote) |

## Verification results

- `claim_semantic_identity.sql`: ALL GREEN — 6,368/6,368 semantic v1,
  parity breaches 0, legacy hashes intact, orphans 0, broken pointers 0,
  behavior pins pass. 223 duplicate-semantic groups are review candidates
  (never auto-merged), as designed.
- `phase2_atomic_claims.sql`: GREEN — null-semantic 0, split fingerprints
  94 (expected > 0), edge/flag orphans 0, target discipline 0, dup edges 0,
  blocked-but-linked 0, index contiguity clean. The 61 same-(fingerprint,
  semantic) groups are pre-existing degenerate rows (empty predicate/object,
  July) outside the merge-key uidx predicate — not violations.
- `educational_claim_fingerprint.sql`: one STALE assertion (requires the
  pre-Phase-2 fingerprint uidx, dropped by design in Phase 2b). All other
  assertions re-verified green: RLS posture, both Phase-2 uidxes, link
  uidxes, all 3 triggers (immutability trigger ENABLED), validator pins.
- `phase3_entity_promotion.sql`: P1 1,046 pre-existing OB-machine rows
  (predicted), L4 ORIF×2 pre-existing (carried to governance), C2 1,720
  pre-existing legacy + 20 new (canonical primary with only an unresolved
  edge; all 20 primaries trusted — factory gap, follow-up item). A2/A3/A4,
  C3, P2/P3/P4, P5 all zero.
- Conflicts: 1,324 rows, ALL same-id/different-surface (745 legacy-id +
  579 intra-run), ZERO parity-path rows. Legacy rows untouched (393
  reused-by-reference, 745 conflict-kept, 975 unreproduced).

## Deferred governance (do not auto-apply)

- `needs_rereview`: ORIF, Acetabular (folded-twin / joint-ambiguous guards).
- 2 proposal merges + 19 canonical-governance merge evidence pairs.
- 1,324-claim conflict review queue + 20 C2 edges → conflict re-resolution
  follow-up (recommended next phase after claim-equivalence pilot scoping).

## Local gates

claim-schema ✓ · 6 card-factory suites ✓ · 6 entity-promotion suites ✓ ·
OB v5 ✓ · OB regression ✓ · 5 OB pipeline suites ✓ · lint ✓ · typecheck ✓ ·
build ✓ (postbuild verify passed). Production smoke 8/8.
