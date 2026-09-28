# Phase 2 — Atomic multi-claim extraction contract

Every eligible versioned Anki card produces **zero or more** atomic educational
claims — one per extraction unit — instead of forcing one card → one claim.
Implementation: `card-claim-factory.v1`, factory build `2026-09-27.1-atomic`.

## Pipeline map

```
Anki card version (Text/Extra fields, tags, ordinal)
  → extractCardClaims (atomic-claim-extractor)
      → 0..N (unit, candidate) pairs, each with assertion + rewrite provenance
  → whole-card runSemanticCard (unchanged): concepts, resolutions, critics
  → assignUnitConcepts: concepts attach to EVERY unit containing their label
  → processUnit per pair (all Phase-1 gating preserved, scoped to the unit):
      qualifier check → negation check → primary pick → critic gate
      → ontology fill (canonical → proposed → short) → likeness gate
      → specificity gate → fingerprint + assertion-aware dedup
      → policy → link / gap / entity-links / quality-flags
  → card roll-up: unanimous unit queue, else multi_claim_review
```

## Unit → claim mapping

- One usable (unit, candidate) pair yields at most one claim. Empty assertions
  are dropped before processing; the card records `partial_unit_drop` when a
  sibling unit survives (0 cards in the full run) and `zero_claims` when none do.
- Tested answer resolution is unit-local (`unitTestedAnswer`): the sibling
  ordinal selects the cloze *number*, the unit's own block selects which
  same-numbered *answer*, and sub-unit items refine shared block answer lists.
  Field-first answer collapse (every unit testing the first c1) is a tested-off
  regression.
- Claim ceiling: >12 candidates → card `multi_claim_review` with reason
  `claim_ceiling_exceeded`, zero claims emitted (8 cards).

## Queues

Card-level queues: `auto_approved`, `missing_entity`, `multi_claim_review`,
`zero_claims`, `insufficient_content`, `negated_or_distractor`,
`qualifier_conflict`, `extraction_failed`, `inactive_or_stale`,
plus the pre-existing `non_atomic`, `competing_entities`,
`cross_card_contradiction`, `duplicate_sibling` (unit-level).
Unanimous unit outcomes set the card queue; any mix becomes
`multi_claim_review` with `partial_auto_approval` / `mixed_unit_outcomes`.

## Identity rule (assertion-aware dedup)

The coarse fingerprint (type, entity, predicate, object, qualifiers) is NOT a
merge key on its own: distinct assertions routinely share it. Run dedup keys
on `fingerprint|semanticHash`. The first assertion keeps the legacy
deterministic id; later distinct assertions get
`uuid(clinical-claim|<fp>|<sem>)`. Same assertion always reuses the same id,
so idempotency and old-run comparability hold (2,533/2,533 shared
fingerprints kept identical claimIds). Stored-claim reuse additionally
requires a semantic-hash match (legacy NULL rows match once). Never silently
merge: 490 fingerprints split into 1,378 claims in the full run.

## Non-goals (unchanged from Phase 1)

No Orthobullets ingestion, no high-yield scores, no BroBot retrieval changes,
no canonical-entity promotion, no automatic merges.
