# Offline vs Live Entity Decisions (Phase H)

Recomputed all 1,924 proposals against the FULL live index (1,295 rows:
1,087 trusted match targets + 208 unreviewed blockers). Alias targets are
trusted-only; exact matches against unreviewed rows override to
DEFER/`matches_unreviewed_entity`. All Phase 3 vetoes retained, none relaxed;
live review added 9 rules (bidirectional pathology penalty, device-technique
penalty, at-risk veto, single-token elision, sarcoma/head lexicon,
generic-elision gate, acronym preference, tie-defer, partitive bonus), each
with regression tests.

## Distribution

| Disposition | Offline (197 idx) | Live (1,295 idx) | Δ |
|---|---|---|---|
| DEFER_NEEDS_REVIEW | 1,040 | 1,041 | +1 |
| ALIAS_EXISTING | 21 | 72 | +51 |
| PROMOTE_CANONICAL | 657 | 611 | −46 |
| MERGE_PROPOSALS | 49 | 43 | −6 |
| REJECT (all) | 157 | 157 | 0 |
| **Changed** | — | **77 (4.0%)** | — |

## Transitions (77)

- PROMOTE → ALIAS (34): 27 exact normalized matches (Radial Head Fractures,
  Post-traumatic Arthritis, Total Hip Arthroplasty, …) + 7 verified moderates.
- DEFER → ALIAS (11): 10 exact (ORIF, TUBS, Rheumatoid Arthritis, Trigger
  Finger, …) + Modified Stoppa approach.
- MERGE → ALIAS (6): cluster members hitting live canonicals directly.
- PROMOTE → DEFER (19): 10 unreviewed-entity blocks (Scoliosis, Bankart
  Lesion, FAI, Ganglion Cyst, … — would-be duplicates) + 9 elision defers.
- DEFER → PROMOTE (7): sarcoma lexicon additions, all verified real entities.
- All 157 rejects and 43 remaining merges unchanged.

## Particular attention: prior 1,040 deferred

- 1,022 remain deferred (genuinely need expertise or fuller context).
- 11 resolve to aliases, 7 to promotes. The feared mass-deferral was NOT an
  artifact of the partial index: the Anki answer distribution genuinely
  differs from the OrthoBullets/pilot-built live ontology, and the veto
  layer correctly refuses to force matches.

## Full-index value

- 51 net-new aliases (70 total, 70/70 hand-verified, 0 false merges).
- 10 duplicate-promotes prevented via unreviewed blocks.
- Every live PROMOTE is now full-index-verified (`needsFullDbRecheck=false`).

## Signal limitations (documented)

- Claim-cooccurrence signal: offline edge set only (live `claim_entities`
  does not exist yet); claim TEXT context used for all proposals.
- Curriculum signal: unavailable (no Anki card↔curriculum join; 67 live
  curriculum links are OrthoBullets-side only, used as entity context).
- Alias signal: starts empty (0 live `canonical_entity` source aliases).
