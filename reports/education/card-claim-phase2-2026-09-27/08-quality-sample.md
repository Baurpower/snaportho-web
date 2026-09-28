# Phase 2 — Quality sample

Stratified manual adjudication of machine output against card text.
Sample + per-item verdicts: `quality-sample.json`, `quality-verdicts.json`
(seed 20260928; rubrics below).

## Design

64 items: 15 auto-approved single-claim · 15 auto-approved multi-claim ·
12 multi_claim_review units · 12 missing_entity units · 10 zero_claims cards.
Each claim scored on: supported (assertion faithful to card) · atomic
(single proposition) · entity (links correct + evidenced; `unresolved`
correct when evidence is absent) · unsupported (asserts beyond the card) ·
queue_ok. Zero cards scored on suppression correctness.

## Metrics (54 claims + 10 zero cards)

- Claim precision (supported): **48/54 = 88.9%** (6 partial, 0 false after
  fixes — all partials are flagged forms or cosmetic issues).
- Atomicity precision: **50/54 = 92.6%** (1 partial relative clause;
  3 conjunctions, 2 of them flagged `non_atomic`/`list_like`).
- Entity precision: **53/54 = 98.1%** (1 partial overlapping mention,
  flagged `multi_entity_claim`).
- Queues correct: **54/54 = 100%**.
- Unsupported assertion rate: **1/54 = 1.9%** (found during review, fixed,
  verified — the answer-led split guard).
- Zero suppression correct: 7/10 at draw; all 3 false zeros fixed and the
  final 23 zero cards individually re-verified as true image-dependents.

## Failure patterns found and fixed (all with regression tests)

1. Silent cross-card merges (9.2% of claims): fingerprint-only dedup merged
   distinct assertions → assertion-aware identity + merge-key migration.
2. Multi-section header misattribution: false auto-approved claims →
   section-aware headers + pending-question reset.
3. Repeated-c1 answer collapse (all units testing the first answer) →
   unit-local answer resolution + sub-item refinement.
4. `Answer: description` item splits detaching descriptions → answer-led
   split guard.
5. Six rewrite defects (P1 complements, P6b passive `be`, P15 object reading,
   P2/P18 agreement, possessives, D1b hyphens) → template fixes.
6. Three false-zero classes (regex substrings, generic visibility,
   evidential `shown to`) → bounded terms + explicit-deixis gating.
7. Ordinal-series `and`-splits → comma-coordination guard + `list_like` flag.

## Residual patterns (open, all flagged or conservative)

- Inline `A and B` coordinations stay whole (recall gap, partially flagged).
- Multi-sentence blocks stay whole when no list markers exist.
- `interrogative_fallback` forms (3.7%, flagged) and leading-dash objects.
- Proposed-phrase entities (`car accidents`, measurements) await promotion
  review rejection; parenthetical answers blocked whole; EXT gene symbols hit
  the placeholder stem; tested answers never canonical-attempted under a
  primary (recall gap).
