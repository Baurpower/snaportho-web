# Consumer Filter Audit — Canonical vs Proposed Visibility (Step 21)

## Trusted definition (Phase 3 standard)

`is_active AND review_status='approved' AND status IN ('reviewed','canonical')`

Rationale: the reviewed write path (existing `apply-approved-*` script and the
Phase 3 applier) creates entities as `status='reviewed'`; the OrthoBullets
v4 pipelines and resolver accept `('reviewed','canonical')`.

## Matrix

| Consumer | File | Sees canonical | Sees proposed | Filter | Safe? |
|---|---|---|---|---|---|
| Reviewer entities | `src/app/api/anki/reviewer/kg/entities/route.ts` | YES ('canonical' only) | NO | `is_active + status='canonical'` | UNDER-INCLUDES 'reviewed' |
| Reviewer KG draft | `src/app/api/anki/reviewer/kg/draft/route.ts` | YES ('canonical' only) | NO | `is_active + status='canonical'` | UNDER-INCLUDES 'reviewed' |
| Reviewer resource search | `src/app/api/anki/reviewer/resource-search/route.ts` | YES (mixed) | NO | `is_active` + (`status='canonical'` or `review_status='approved'`) | INCONSISTENT |
| Reviewer improvements | `src/app/api/anki/reviewer/kg/improvements/_lib.ts` | YES ('canonical' only) | NO | `is_active + status='canonical'` | UNDER-INCLUDES 'reviewed' |
| Reviewer workspace proposals | `src/app/api/anki/reviewer/workspace/proposals/route.ts` | YES ('canonical' only) | YES (own proposal rows, by design) | `is_active + status='canonical'` for entities | SAFE (proposals are the worklist) |
| Incorporation lib | `src/app/api/anki/incorporation/_lib.ts` | YES ('canonical' only) | NO | `is_active + status='canonical'` | UNDER-INCLUDES 'reviewed' |
| BroBot KG lookup | `src/lib/brobot/orthobullets/kg-lookup.ts` | YES (via links) | POSSIBLE if a link points at one | `is_active` on `question_canonical_entity_links` only; trust comes from write-time gating (resolver only links approved entities) | CONDITIONAL — no defense in depth |
| BroBot question-claims | `src/app/api/brobot/extension/question-claims/route.ts` | indirect (claims) | NO | claim pipeline filters | SAFE |
| Overlap matcher | `src/lib/education/claim-overlap-matcher.ts` | depends on inventory builder | depends on inventory builder | pure function; rejects `rejected/superseded/needs_review` link statuses | CONDITIONAL on inventory |
| Deck loader (index build) | `src/lib/education/card-claim-deck-loader.ts` | YES | lifecycleStatus passed through; factory filters retired (`deprecated/replaced/merged/split`) but NOT `proposed` | row-level; consumer-side | NEEDS `proposed` exclusion for trusted reads |
| Deck publication readiness | `src/lib/education/deck-publication-readiness.ts` | via manifest entity ids | NO | manifest validation | SAFE |
| OrthoBullets v4 pipelines | `20260926220000`, `20260927160050`, `20260926203601` | YES | NO | `review_status='approved' AND status IN ('reviewed','canonical')` | SAFE (reference definition) |
| Streamlined incorporation (SQL) | `20260726_200000` | YES ('canonical' only) | NO | `status='canonical'` | UNDER-INCLUDES 'reviewed' |
| Claim assertion identity (SQL) | `20260926194551` | YES ('canonical' only) | NO | `status='canonical'` | UNDER-INCLUDES 'reviewed' |

## Findings

1. **No proposed-entity leak found** in any production read path audited.
2. **Under-inclusion (integration gap, HIGH)**: six consumers require
   `status='canonical'` exactly, but the reviewed write path produces
   `status='reviewed'`. Promoted entities would be invisible to the reviewer
   entities route, KG draft, improvements, incorporation, and two SQL
   functions until they adopt the `(reviewed,canonical)+approved` definition.
   Recommended fix: update those filters (small, mechanical, testable) before
   the first promotion apply — see rollout plan.
3. **BroBot trusts write-time gating.** Safe today (all link writers gate on
   approved entities), but a single join to `canonical_entities` trust state
   would add defense in depth. Recommended, not blocking.
4. **Factory index builder passes `proposed` rows through.** The factory
   filters retired lifecycles but not `proposed`; trusted factory reads must
   exclude `proposed` explicitly once proposals live in the table at scale.
5. Search/Learn/KG-API/question-routes surfaces: no direct
   `canonical_entities` reads found outside the above (concept-layer reads
   only) — no action.
