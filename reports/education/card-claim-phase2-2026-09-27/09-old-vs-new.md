# Phase 2 — Old vs new

Same 3,670 carved cards + same 197-entity index through the HEAD factory
(single-claim, with a `/tmp`-only 500-char safety-cap patch on 6 claims) and
the Phase-2 factory. The delta isolates factory behavior; absolute
canonical rates are partial-index lower bounds for both.

## Headline delta

| | Old (1-claim/card) | New (0..N) |
|---|---|---|
| Claims | 3,350 | 5,976 (+78%) |
| Auto-approved teaches links | 2,476 | 3,984 (+61%) |
| Auto-approved cards | 2,476 | 2,286 |
| Cards needing review (non-auto) | 1,194 | 1,384 (+335 mixed `multi_claim_review`) |
| Links sharing a claim (merge indicator) | 169 | 3 (true same-assertion only) |
| ClaimId stability | — | 2,533/2,533 shared fingerprints identical, 0 changed |

Card transitions: 2,226 stable-approved · 946 stable-missing ·
334 → `multi_claim_review` (mixed) · 65 approved→missing (corrections, below)
· 59 missing→auto (rescues, below) · 20 →`zero_claims` (image-deictic
corrections) · 3 extraction_failed→zero (proper terminal).

## What materially improved

1. **Coverage**: 2,626 more claims (+78%), split completeness 100% of cloze
   numbers; the old factory never attempted c2+ answers (all cards are
   ordinal 0, so old cards tested c1 only).
2. **Entity precision**: old card-scope linking attached Extra-field and
   incidental entities — 10.2% of old approved canonical links lack
   claim-level label evidence. 62 of the 65 approved→missing transitions are
   such corrections (verified label-absent); 3 are conservative withholds
   (partial-index/short-label artifacts).
3. **Unsupported assertions removed**: 20 image-deictic cards the old factory
   approved ("…on the radiograph below is X") now correctly yield zero
   claims; 463 previously merged distinct assertions now stand alone.
4. **Rescues**: 59 missing→auto, mostly multi-answer cards the old factory
   rejected whole (`clause_like_answer`) that now split into clean claims
   (e.g. "Production of free radicals" + "Direct genetic damage").
5. **Provenance**: every claim now carries unit, index, rewrite method, and
   per-claim entity links + flags; old claims had card-level attribution only.

## Database changes

Created, NOT applied (live DB unreachable; review-only phase):
`20260927240000_phase2_atomic_claim_entities.sql` (`claim_entities`,
`claim_quality_flags`, `card_claim_backfill_claims`),
`20260927250000_phase2_assertion_merge_key.sql` (assertion-aware merge key).
Verification: `supabase/verification/phase2_atomic_claims.sql`.
Mutations: NONE — zero production writes; all artifacts are local files.

## Blockers before apply

1. Live DB reachability + full 1,084-entity index (canonical rates are a
   lower bound until rerun with the real index).
2. Apply both migrations in a networked environment, then run
   `phase2_atomic_claims.sql` (expects zero breaches).
3. Rerun the sanctioned dry-run script (`scripts/run-card-claim-factory.ts`)
   against the published deck and confirm distribution parity with this
   report's shapes (claims/card histogram, zero set, flag mix).
4. Review-queue tooling must consume `multi_claim_review`,
   `card_claim_backfill_claims`, `claim_entities`, and `claim_quality_flags`
   before the backfill writer is enabled (it is implemented but the workflow
   stays review-only: `--apply` throws).
5. Re-audit the 3 conservative withholds + parenthetical-answer rule with the
   full index (likely resolves 2 of 3).

## Next recommended phase (not started)

Smallest valuable step: **promotion-review slice** — build the reviewer queue
over the 1,924 proposed entities + 335 `multi_claim_review` cards with
per-claim flags, and decide the first ~200 entities (promote / alias / reject
with reasons). That unblocks measured entity-precision gains and feeds the
alias table the factory needs for the tested-answer recall gap. Do not begin
Orthobullets ingestion or BroBot retrieval changes until the Anki claim base
is promotion-stable.
