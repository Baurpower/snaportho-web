# Phase 2 — Full-corpus dry-run distribution

Read-only dry run over the complete versioned Anki corpus. No database writes.

## Corpus and method

- Source: SnapOrtho Master apkg (`source.apkg`, bootstrap layout) — the
  archive's central directory is truncated, so `collection.anki2` (first
  entry, stored uncompressed, intact) was carved by local-header parsing.
- 3,670 notes / 3,670 cards (all ordinal 0, all cloze-bearing, 231 with
  images), Text + Extra fields, tags preserved. Card count matches the
  2026-09-25 live baseline exactly.
- Entity index: 197 real canonical anatomy entities (ids + preferred labels
  from `anatomy-structures.json`); conditions/procedures/drugs are absent
  because the live DB is unreachable (ENOTFOUND). Canonical-match rates are
  therefore a lower bound; the old-vs-new DELTA (same inputs, both factories)
  is unaffected.
- Runner: `runCardClaimFactory` with fixed clock, offline harness in `/tmp`
  (the sanctioned `scripts/run-card-claim-factory.ts` was extended with the
  new artifacts for networked reruns).

## Volume

3,670 cards → 5,988 extraction units → **5,976 claims** (mean 1.63, median 1,
p95 4, max 11). Multi-claim cards: 1,065 (29.0%). Zero-claim cards: 31 (0.8%;
23 `zero_claims` + 8 ceiling reviews). Auto-approved teaches links: 3,984.
Entity links: 6,270. Quality flags: 6,806. Proposed entities: 1,924 created,
424 reuses. Wall time ~28 s.

Claims/card histogram: 0→31 · 1→2,574 · 2→431 · 3→255 · 4→235 · 5→74 ·
6→41 · 7→18 · 8→4 · 9→4 · 10→2 · 11→1.

## Queues

Card level: auto_approved 2,286 (62.3%) · missing_entity 1,014 ·
multi_claim_review 335 · zero_claims 23 · insufficient_content 6 ·
negated_or_distractor 4 · qualifier_conflict 2.

Unit level: auto_approved 3,984 (66.5%) · missing_entity 1,990 ·
insufficient_content 8 · negated_or_distractor 4 · qualifier_conflict 2 ·
duplicate_sibling 0 · non_atomic 0 · competing_entities 0.

Claim targets: proposed 2,345 · unresolved 1,987 · canonical 1,644.
Top unit reasons: machine_consensus 3,984 · ontology_gap_filled 2,348 ·
specificity/context blocks 756 · clause_like_answer 432 ·
short_label_insufficient_context 302 · likeness blocks (malformed/list/
directional/measurement/response/numeric) ≈ 600.

## Rewrite methods (top)

qa_inversion_be 2,090 · declarative_passthrough 1,547 ·
qa_mid_substitution 302 · anatomy_neutral 264 · qa_inversion_modal 254 ·
interrogative_fallback 219 (3.7%, all flagged) · anatomy_verb 201 ·
classification_stage 158 · anatomy_scoped 113 · qa_answer_subject 104 ·
qa_fragment 91 · numbered_item_list 70 · qa_member_of 67.

## Split completeness

Every cloze number in every card is covered by ≥1 unit (4,084/4,084, 100%).
Cards fully covered: 3,670; partial: 0; zero: 0. `partial_unit_drop`: 0.
