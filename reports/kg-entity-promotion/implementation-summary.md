# KG Entity Promotion — Implementation Summary (Phase 3)

Date: 2026-09-27/28. Status: review tooling + first slice COMPLETE, offline. No production writes.

## Objective

Convert the 1,924 proposed-entity layer from Phase 2 into a high-precision
canonical + alias system: clear canonical/proposed boundary, reliable aliases,
review-driven promotion, durable rejections, improved typing, full provenance,
zero silent canonical writes.

## Environment (Phase 0)

- Live DB unreachable (`ENOTFOUND aws-0-us-east-2.pooler.supabase.com`), same as Phase 2.
- Phase 1/2 migrations present but NOT applied; verification SQL unrunnable.
- All work ran offline against Phase 2 artifacts + the 197-entry partial
  canonical index (anatomy only; full DB holds ~1,084 entities).
- Consequence: every PROMOTE/MERGE recommendation carries
  `needs_full_db_recheck=true`; the applier re-checks against the full index
  at plan time and fails closed (see below).

## What was built

`src/lib/education/entity-promotion/` (8 modules, 100 tests, all green):

- `entity-review-dispositions.ts` — 8-disposition vocabulary, 15-value
  canonical type enum (verified against migrations incl. ankle-pilot
  extensions), alias types, criteria version.
- `entity-label-normalization.ts` — conservative normalization (case,
  whitespace, punctuation, unicode, safe regular plurals with -sis/-lis/Latin
  guards, 3 irregular plurals) + match keys, token/trigram similarity,
  acronym helpers.
- `entity-type-inference.ts` — explicit lexical rules over the existing enum
  (no new types) with a *reported* condition-prior fallback and claim-context
  disambiguation (innervation, origin/insertion, best-test).
- `canonical-candidate-matcher.ts` — multi-signal matching (exact, alias,
  token, trigram, type compatibility, acronym, elision, claim co-occurrence)
  with hard vetoes: antonym substitution, hyponym (longer-proposal),
  generic-vs-specifying, confident-pathology-to-structure penalty.
- `proposal-clustering.ts` — union-find duplicate clusters (51 clusters;
  2-letter-acronym initials excluded after a CT/cut-tubia false cluster).
- `review-packet.ts` — 8-rule disposition recommender, mixed-sense + joint
  divergence detection, impact ranking, CSV serialization.
- `promotion-applier.ts` + `promotion-apply-executor.ts` — decision-file
  validation, dry-run planning (default), fail-closed rules, idempotent
  execution via injectable DB client (live Supabase impl in CLI).
- `entity-resolver-v2.ts` — canonical → reviewed alias → durable negative →
  non-entity suppression → typed propose. Standalone; factory unwired (see
  rollout plan for integration points).

Plus: `scripts/kg-entity-promotion-apply.ts` (CLI, dry-run default, staging
gate for --apply), migration `20260927260000_phase3_entity_aliases_decisions`
(canonical_entity_aliases + entity_review_decisions, NOT applied),
verification `supabase/verification/phase3_entity_promotion.sql` (5 lifecycle,
4 alias, 4 claim, 5 integrity checks).

## Review corpus results (1,924 proposals)

| Disposition | Count | Share |
|---|---|---|
| DEFER_NEEDS_REVIEW | 1,040 | 54% |
| PROMOTE_CANONICAL | 657 | 34% |
| ALIAS_EXISTING | 21 | 1% |
| MERGE_PROPOSALS | 49 | 3% |
| REJECT_NON_ENTITY | 27 | 1% |
| REJECT_TOO_GENERIC | 12 | 1% |
| REJECT_CONTEXT_DEPENDENT | 118 | 6% |

Deferred bulk is honest: single-claim weak-signal labels unresolvable against
a 197-entity partial index. Most will exact/alias-match once the full
1,084-entity index is visible at apply time.

## First slice (~200)

- 200 rows ranked by impact: 99 promote, 8 alias, 25 reject, 1 merge, 67 defer.
- Affects 577 claims / 572 cards.
- Expected effect if approved as-is (Scenario A dry run): canonical edge
  share 30.5% → 35.5% (+316 edges), 393 claims touched, 77 edges retired.
- Full-corpus projection (upper bound): 30.5% → 45.5% (+939 edges), 1,142
  claims touched. Unresolved edges (2,014) unchanged by design — they carry
  no extractable phrase.

## Type quality (Step 4)

- Factory: 89% `condition` (1,711/1,924), silent default.
- Inferred: 68% `condition` (1,317), of which 1,212 are *explicitly flagged*
  prior-fallbacks; non-condition assignments grew 213 → 607 (anatomy 12→345).
- 530 confident type corrections exported (`type-correction-candidates.json`).
- Gaps with no valid enum home: medications (fluoroquinolones), organisms
  (P. acnes), symptoms-as-symptoms (hip pain). Deferred, not mistyped.

## Precision (hand-adjudicated, Step 18)

- 51-row stratified sample + exhaustive audit of all 21 final ALIAS
  decisions and all 22-alias interim set (which caught 8 false merges:
  antonym, hyponym, condition→anatomy, generic→specific classes — all fixed
  with vetoes + regression tests).
- Alias precision on final set: 21/21 correct in-context (one accepted
  tradeoff: single-claim MCL elbow→knee-ambiguous canonical; canonical
  joint-sense gap flagged).
- False canonical merge rate in recommendations: 0 observed after vetoes
  (was 8/33 pre-fix in the interim audit).
- Primary parity: 3,962/5,976 matched; the 2,014 gaps are exactly the
  unresolved-edge claims (production FK prevents proposal-valued primaries;
  backfill must null them).

## Consumer safety (Step 21)

- Trusted-definition split found: older reviewer/incorporation surfaces
  filter `status='canonical'` exactly, but the reviewed write path (existing
  apply script + this phase) writes `status='reviewed'`. Newer pipelines
  accept both. No leak of proposed entities found, but promoted entities
  would be invisible to older consumers until they adopt the
  `(reviewed,canonical)+approved` definition. BroBot KG lookup trusts
  write-time gating (`is_active` only on links) — conditional, no depth.
- Full matrix in `consumer-filter-audit.md`.

## Database

- Migrations created, none applied. Production mutations: NONE.
- Promotion remains review-driven; no confidence auto-promotion exists.

## Key risks / follow-ups

1. Partial-index blindness: ~1,040 defers + all promotes need full-DB
   recheck at apply time (built into the applier).
2. Canonical-canonical duplicates in the seed (~4 pairs: Deep Posterior
   Compartment ×2, Anterior/Lateral Compartment ×2, hub overlaps) need
   governance merges.
3. Joint-ambiguous ligament canonicals (MCL/LCL knee vs elbow).
4. Older consumers need the trusted-definition update (blocker before
   promotions are visible end-to-end).
5. Type-system gaps: medication, organism, symptom.
