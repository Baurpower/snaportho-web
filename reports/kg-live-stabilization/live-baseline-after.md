# Live Baseline — After verification (Phase Q, read-only)

Captured 2026-09-28 via read-only Supabase REST (service key,
`Prefer: count=exact` + paginated fetches). No writes performed. All counts
verified stable across repeated passes (claims 3×, links 2×, entities 2×).

## Row counts

| Table | Count | vs before (Sep 27 21:41) |
|---|---|---|
| canonical_cards (total / active) | 5,095 / 3,670 | unchanged |
| canonical_card_versions | 5,095 | unchanged |
| educational_claims | 2,113 (2,109 unreviewed, 4 approved) | unchanged |
| educational_claim_versions | 2,113 | unchanged |
| card_claim_links | 19 | unchanged |
| card_canonical_entity_links | 8,800 → 617 distinct entities | previously uncounted (newest row Sep 25; pre-existing, not new) |
| canonical_entities | 1,295 (1,087 trusted) | unchanged, no writes since Sep 26 19:19 UTC |
| kg_automation_proposals | 7,421 | unchanged |
| external_questions | 7,618 | unchanged |
| source_aliases | 8,320 (0 canonical_entity) | unchanged |
| concept_aliases | 0 (exists, empty) | unchanged |
| claim_entities | DOES NOT EXIST | unchanged (Phase 2 unapplied) |
| canonical_entity_aliases | DOES NOT EXIST | unchanged (Phase 3 unapplied) |
| entity_review_decisions | DOES NOT EXIST | unchanged (Phase 3 unapplied) |
| semantic_fingerprint_hash column | absent | unchanged (Phase 1 unapplied) |
| curriculum_entity_links | DOES NOT EXIST | **DROPPED (was 67)** |

## Drift verdict

NO BLOCKING DRIFT for the Anki foundation. One real delta:
`curriculum_entity_links` (67 rows) was dropped since last night. That table
has no creator in any repo migration (ad-hoc, OrthoBullets-side only) and the
Phase H report already documents the curriculum signal as unavailable for
Anki ("no Anki card↔curriculum join"). Zero impact on claims, entities,
links, proposals, or any Phase 1–3 artifact. Flagged for awareness, not a
blocker. (Owner of that table should confirm the drop was intentional.)

Method note: one early recount pass this session returned counts
inconsistent with both the persisted Sep-27 baseline and every subsequent
stable recount; those single-pass values were discarded as unreliable and
are not reflected anywhere. Only multi-pass-stable values are reported.

## Claim stability (live, 2,113)

- 100% carry `primary_entity_id` → 443 distinct entities (no null primaries).
- versions 1:1 with claims (no live versioning activity — expected pre-Phase-1).
- `fingerprint_hash` (v2) present; semantic fingerprint absent (unapplied).

## Review backlog (live dispositions, 1,924 proposals)

- DEFER 1,041 (slices outstanding) · PROMOTE 611 (55 adjudicated: 43 approve
  incl. 1 merge, 7 revise, 2 defer, 3 reject) · ALIAS 72 (all adjudicated:
  71 approve + 1 retarget) · MERGE 43 · REJECT 157.
- Governance backlog: 19 merges + 1 joint-sense split + 1 type ruling.
- Type-gap ruling (symptom/medication/organism) + slice-4 tail sweep still owed.

## Database mutations this phase

NONE. Zero writes: no migrations applied, no promotions applied, no
backfills run. All Phase 3B work to date is read-only (counts, paged reads,
offline adjudication). The `curriculum_entity_links` drop was external, not
ours (first observed, not performed).

## Remaining blockers (real only)

1. Write authorization: Phase 1/2/3 migrations + promotion apply + governance
   merges all need explicit user approval (and staging-first per rollout plan).
2. Ontology rulings: joint-sense split (MCL/LCL), symptom-type home.
3. Slice-4 tail sweep (symptom/garbage-label promotes) before any batch promote.
4. Plural-folding dedup-key fix before batch promote (root cause of 15 dup pairs).
