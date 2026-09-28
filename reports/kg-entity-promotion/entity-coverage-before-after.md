# Entity Coverage Before / After (Steps 17 + 27)

Denominator: 6,270 claim-entity edges over 5,976 claims (31.4% canonical,
37.4% proposed, 32.1% unresolved at baseline). Claims are NOT regenerated;
only entity mappings are re-evaluated.

## Scenario A — first-200 slice approved as recommended

Slice: 8 alias, 99 promote, 25 reject, 1 merge, 67 defer (577 claims / 572 cards).

| Edges | Before | After | Δ |
|---|---|---|---|
| canonical | 1,911 (30.5%) | 2,227 (35.5%) | +316 |
| proposed (pending) | 2,345 | 1,952 | −393 |
| retired (rejected) | 0 | 77 | +77 |
| unresolved | 2,014 | 2,014 | 0 (by design) |

- Claims touched: 393 (6.6% of corpus).
- Re-resolution actions over all 1,924 proposal labels with slice decisions
  as durable data: 107 link_canonical (98 exact, 9 reviewed-alias),
  82 suppress (55 non-entity shape, 27 rejected-label), 1,735 re-propose.

## Scenario B — full-corpus projection (upper bound)

All 1,924 recommendations approved as-is. Unrealistic as a plan (deferred
items need expertise) but bounds the upside.

| Edges | Before | After | Δ |
|---|---|---|---|
| canonical | 1,911 (30.5%) | 2,850 (45.5%) | +939 |
| proposed (pending) | 2,345 | 1,203 | −1,142 |
| retired (rejected) | 0 | 203 | +203 |
| unresolved | 2,014 | 2,014 | 0 (by design) |

- Claims touched: 1,142 (19.1% of corpus).
- Re-resolution: 695 link_canonical (673 exact incl. 667 promoted, 22 alias),
  148 suppress, 1,081 re-propose (mostly deferred tail).

## What moves the needle next

1. Full-DB recheck at apply time will convert many of the 1,040 defers to
   exact/alias hits (the offline index covers only 197/1,084 entities).
2. The 2,014 unresolved edges need extraction-side work (no phrase to
   resolve), not promotion work.
3. Canonical-canonical merges (~4 pairs) would consolidate split links.
