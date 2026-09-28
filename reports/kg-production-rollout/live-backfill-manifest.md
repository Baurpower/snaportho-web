# Live Backfill Manifest (Phase 3C Step 18)

Source: Step 17 final factory run (fixed factory: null primaries, negative
wiring), 3,670 live active cards, post-apply index (1,295 live + 107 pending
promotes + 70 approved aliases + 179 negatives), fixed clock
2026-09-28T00:00:00Z. Full payload: `/tmp/factory-in/step17-final.json`
(regenerable via `/tmp/build-step17.cjs` + factory run).

## Counts

- CLAIMS TO INSERT: 4,530 (new deterministic ids)
- CLAIMS TO REUSE: 1,438 (legacy-fingerprint match; rows untouched)
- CLAIM VERSIONS: 4,530 new v1 rows (reuse creates no versions)
- LINKS TO INSERT: ≤4,598 teaches links (auto-approved claims only;
  idempotent on (card, claim); existing 19 links untouched or reused)
- ENTITY EDGES: 7,594 = 4,976 canonical + 1,258 proposed + 1,360 unresolved
- PRIMARIES: 3,377 set (2,833 live + 544 via E2 id-map) + 2,591 null
- ZERO-CLAIM OUTCOMES: 23 zero_claims (+10 negated, +2 qualifier-conflict,
  +2 empty multi-review = 37 cards with no claims; all durable via items)
- REVIEW-ONLY: 636 missing_entity + 284 multi_claim_review +
  29 insufficient_content (claims persist; links attach on review approval)
- CONFLICTS EXPECTED: 0 (parity by construction; verified post-E1)
- UNRESOLVED PAYLOADS: 1,360 edges + 1,333 null-primary claims (durable,
  reported, never invented)

## Distribution (brief reference in parens)

3,670 cards (3,670 ✓) · 5,968 claims (~5,976, −0.13%) · mean 1.63 (1.63 ✓) ·
median 1 (1 ✓) · p95 4 (4 ✓) · max 11 (11 ✓) · multi 1,063–1,065 (≈1,065 ✓) ·
units 5,988 (identical) · semantic groups 2 (2 ✓).

Claim-count deltas fully explained: ref→live-index −5, →post-apply-index
−3, all via queue routing (negated 4→10 suppresses emission; extraction
units byte-identical). No explosion. Semantic identity unchanged by
resolution improvements (units + semantic groups identical).

## Hard gates before E3

1. E1 applied INCLUDING 282000 (nullable primaries) — without it, 2,591
   inserts violate NOT NULL.
2. E2 promotions applied (107) AND `--entity-id-map` built from the
   promotion report (544 primaries + 819 canonical edges carry placeholders).
3. Runner interlock lifted ONLY by explicit user authorization (E3 unlock).
4. Post-E1 trigger parity proven (TS/SQL fingerprint agreement on live rows).
5. 44 proposed-edges-to-promoted-labels land as proposed (deterministic
   uuid match); Step 23 re-resolution upgrades them via the E2 map.
6. 675 legacy claims not reproduced by the factory persist untouched
   (provenance; reported as unlinked legacy rows in Step 21, not deleted).
   The 4 approved curated claims are card-independent and unaffected.

## Actual outcome (run 30774655, completed 2026-09-28T18:23Z)

Command: `run-card-claim-backfill.ts --from-db --mode=live --apply
--target=production --confirm-project-ref=geznczcokbgybsseipjg
--batch-size=100` (no `--reprocess`, no `--entity-id-map`: the runner
resolves E2 decisions live from `entity_review_decisions`). Three
invocations (prior session stopped cleanly at 300; this session stopped
at 800 on unexpected conflicts per the release stop rule, then resumed
to completion after user decision; one transient mid-batch connection
drop at 1400 retried cleanly). All 3,670 items terminal, 0 failed:

- ITEMS: 2,330 processed + 1,340 needs_review (1,136 conflict-bearing +
  204 queue-based) + 0 failed
- CLAIM ROWS: 5,988 = 4,255 inserts + 393 legacy reuses + 2 intra-run
  reuses + 1,324 conflicts + 14 claimless early-exit rows. Claim-bearing
  rows (5,974) match the live dry-run exactly.
- CONFLICTS (all same-id/different-surface, recorded for review, 0
  parity breaches): 745 vs legacy ids (atomic text rewrite, structured
  triple identical) + 579 intra-run (same normalized assertion emitted
  by two cards with different surface text). ClaimIds derive from the
  content fingerprint, which excludes surface text — hence collisions
  are text-only divergences, never silent merges.
- LINKS: card_claim_links 19 → 3,309 (+3,290 teaches links).
- EDGES: claim_entities 0 → 5,635 active (2,980 canonical + 1,299
  proposed + 1,356 unresolved).
- C2 LEGACY: all 2,113 legacy rows untouched (393 reused-by-reference,
  745 conflict-kept, 975 unreproduced). Nothing deleted or repointed.
- IDEMPOTENCY: re-run without `--reprocess` returns `already_completed`,
  exit 0; headline recount identical (zero drift).

Release-note bugs found post-completion (data correct in all cases):

- Runner manifest counters for card-claim links read 0/0: the
  `upsertCardClaimLink` call passed one arg too many (ignored extra
  `reasonCodes`), so increments landed on the wrong object. DB rows are
  correct (+3,290). Fixed (1 line) post-run; `scripts/` is excluded from
  `tsc --noEmit`, which is how it slipped — follow-up should typecheck
  scripts or move the runner under coverage.
- 20/4,255 new claims carry a canonical primary with only an
  `unresolved` edge (factory primary/edge divergence; all 20 primaries
  trusted). Carried to the conflict re-resolution follow-up.
- `educational_claim_fingerprint.sql` asserts the pre-Phase-2
  fingerprint uidx (dropped by design in Phase 2b); every other
  assertion in that file re-verified green. The file needs modernizing.
