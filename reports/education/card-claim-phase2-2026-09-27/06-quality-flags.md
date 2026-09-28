# Phase 2 — Quality flags

Claim-level flags on **every** claim, including auto-approved ones. Flags are
advisory review records persisted to `claim_quality_flags`, except
`block_auto_approve`, which additionally withholds the teaches link before
anything is written.

## Catalog (full-run counts, 6,806 flags on 5,976 claims)

Entity evidence: `unresolved_entity` 1,987 · `entity_likeness_blocked` 930 ·
`context_insufficient_for_specific_entity` 755 ·
`short_label_insufficient_context` 302 · `competing_entities_present` 251 ·
`multi_entity_claim` 251 · `entity_evidence_outside_units` 185 ·
`alias_ambiguity` (rare) · `low_confidence_proposed_entity`
(block severity, 0 firings).

Extractor doubt (prefixed `extractor_`, from the candidate's own flags):
`non_atomic` 537 · `list_like` 465 · `context_prefixed` 334 ·
`question_shaped` 317 · `context_dependent` 207 · `short_answer_only` 95 ·
`compound_conjunction` 82 · `image_deictic` / `explicit_deictic` ·
`multi_threshold` · `vignette_context` · `low_confidence_rewrite`
(confidence < 0.5).

Structural: `non_cloze_unit` (object derived from unit text) ·
`multi_cloze_unit`.

## Severities

- `review` (6,806): surface in review tooling; the claim and link stand.
- `block_auto_approve` (0): the unit is forced to `missing_entity`; the claim
  persists unlinked with the flag attached. The verification SQL asserts no
  blocked claim backs an auto-approved teaches link.

## Dedupe

`(claim_id, code)` unique per claim across units; entity links additionally
dedupe on `(claim_id, kind, entity_id, role)` keeping max confidence. Shared
claims (same assertion, several units) carry one flag set.
