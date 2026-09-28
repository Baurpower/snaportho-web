# Phase 2 — Entity link policy (`claim_entities`)

One claim links 0..N entities with explicit roles. The single-primary-entity
model is replaced, not extended: `primary_entity_id` stays for compatibility,
but all retrieval semantics should move to `claim_entities`.

## Roles

| Role | Meaning |
|---|---|
| `teaches_about` | the claim's primary subject (or the unresolved fallback) |
| `tested_answer` | entity named by the tested cloze answer |
| `context` | supporting entity evidenced in the unit |
| `comparison` | differential/comparison concept |
| `contraindication` | negated entity of a contraindication claim |

Corpus mix: teaches_about 3,495 · tested_answer 2,481 · context 294 ·
comparison/contraindication 0 (no qualifying units in this corpus).

## Evidence rule

A canonical concept links from a claim only if its normalized label is
token-contained in that claim's unit text (contiguous tokens; short labels
cannot substring-match). Evidence is non-exclusive: a concept attaches to
every matching unit, so repeated blocks each resolve. Concepts matching no
unit are reported (`entity_evidence_outside_units` flag on the first claim,
185 cards) — entity evidence is never silently dropped.

Entity kinds: `canonical` (1,911 links) · `proposed` (2,345, always via a
quarantined `kg_automation_proposals` row) · `unresolved` (2,014 fallback rows
recording missing evidence, exactly one per entity-less claim).

## Gating (unchanged Phase-1 policy, unit scope)

Canonical first (primary concept → cloze-answer match → short-answer match),
then proposed generation (minimum length 4), then the entity-likeness gate
(930 blocks: `clause_like_answer`, `list_fragment`, `malformed_label`, …),
then the contextual-specificity gate (755 blocks). Low-confidence proposed
entities (`< 0.6`) raise `block_auto_approve` and force `missing_entity`
(0 firings in this corpus — all fills met the bar).

## Precision findings

- Old card-scope linking attached Extra-field/incidental entities to claims:
  10.2% of old approved canonical links lack claim-level label evidence.
  Phase 2 withholds all 62 such cases found in the transition audit (plus 3
  conservative withholds under the partial index).
- Measured link precision on the quality sample: 53/54 claims correct
  (98.1%); the one partial (overlapping `Radius`/`Distal Radius` mention)
  was flagged `multi_entity_claim`.
- Known gaps: tested answers are never canonical-attempted when a primary
  exists (recall gap); parenthetical answers (`X (Y)`) are likeness-blocked
  whole instead of head-resolved (follow-up, not this phase).
