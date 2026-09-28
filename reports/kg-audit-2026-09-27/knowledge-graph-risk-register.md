# Knowledge Graph Risk Register — 2026-09-27

Ranked by impact. All severities assume the claim graph becomes the shared
semantic layer; risks to the current (smaller) deployment are noted.

## 1. Claim identity split-brain — SEVERITY: critical

- Evidence: v1 structural vs v3/v4 assertion fingerprints; migration header
  "does not backfill or rewrite fingerprint_hash on existing rows".
- Example: a card claim and an OB claim asserting the same fact get different
  fingerprints and never converge; conversely two v1 claims sharing a cloze
  answer can share an identity.
- Cause: identity function swapped per algorithm_version with no era rule.
- Mitigation: pick ONE canonical function (assertion-inclusive), then either
  backfill old rows with new claim versions or ship dual-read matching with
  the rule in code + contract tests.

## 2. v1 false-equivalence collisions — SEVERITY: critical

- Evidence: 23 structural dup groups; inspected groups clinically distinct
  (Lachman vs TKA sharing "3-5"); degenerate predicate (85% teaches_fact).
- Cause: object = raw cloze answer; entity often unresolved/nil.
- Mitigation: never auto-merge on v1 fingerprint; require assertion-text
  equality (v3 rule) for any merge; re-fingerprint corpus under unified rule.

## 3. Question drift invisible — SEVERITY: high

- Evidence: single nullable source_fingerprint_hash, overwritten per commit;
  zero question_version/history objects in 152 migrations.
- Cause: metadata-only registry without snapshot history.
- Mitigation: `question_source_snapshots` table; links pin snapshot ids.

## 4. Tests-vs-mentions conflation — SEVERITY: high

- Evidence: one claim per question labeled tests_primary; no mentions role,
  no citation table; fixed evidence_locator 'reviewed-question'.
- Cause: pipeline extracts "the" claim, not tested vs explanatory sets.
- Mitigation: explicit schema decision (add mentions + citations, or
  documented wont-fix with scoring caveats) before high-yield analytics.

## 5. Provisional entities inside canonical table — SEVERITY: high

- Evidence: v4 `resolve_or_create` inserts status=proposed rows into
  `canonical_entities`; separation is flag-only.
- Cause: expedient reuse of one table for two trust levels.
- Mitigation: consumer filter audit (`status` + `review_status` on every
  read path), provisional rate caps, review SLA, consider separate
  `proposed_entities` table if leakage recurs.

## 6. Single-entity claim slot — SEVERITY: high

- Evidence: `primary_entity_id NOT NULL`; no multi-entity edge table.
- Cause: pilot-era simplification.
- Mitigation: additive `claim_entities` (claim, entity, role, confidence);
  keep primary_entity_id as the ranked-first for back-compat.

## 7. No claim↔claim relations — SEVERITY: medium

- Evidence: no table; `canonical_relationships` lacks claim endpoints.
- Cause: not yet built.
- Mitigation: additive `claim_relationships` with controlled predicates and
  review states; record factory polarity clashes here instead of dropping.

## 8. Live parity unproven — SEVERITY: medium (blocks all metrics)

- Evidence: zero live row counts obtainable in this audit; report figures are
  2026-09-24/25 point-in-time; no apply-mode manifest found.
- Cause: hosted-only DB + sandbox without network.
- Mitigation: run the read-only parity script (Stage 0 of next-phase plan)
  from a networked environment; record project ref + counts.

## 9. Machine auto-validation without human sampling SLA — SEVERITY: medium

- Evidence: v4 commits claims as content_source=verified/review=approved via
  `machine_consensus`; card factory auto-approves 2,849/3,670 links.
- Cause: velocity over verification.
- Mitigation: sampled human audit per cohort (e.g. 5% dual review), publish
  precision numbers, gate scale-up on them.

## 10. Mutation surface adjacent to audit paths — SEVERITY: medium

- Evidence: 16 apply-* scripts via DATABASE_URL + live secrets in .env.local;
  dead RDS env still present.
- Cause: operational history.
- Mitigation: gate apply-* behind verification SQL in CI, remove dead
  POSTGRES_* vars, pin service_role to admin paths.

## 11. Card versions mutable — SEVERITY: low

- Evidence: `canonical_card_versions` has update trigger; "non-destructive"
  by convention + release pins, not by trigger immutability.
- Cause: editorial workflow needs.
- Mitigation: add immutability trigger with a privileged editorial bypass, or
  document the convention as load-bearing.

## 12. Q/A-shaped and compound claims pollute semantics — SEVERITY: low now,
rising with scale

- Evidence: sample findings (interrogative stems, image-dependent rows,
  multi-fact bundles); coarse claim typing.
- Cause: one-claim-per-card + cloze-fill generation.
- Mitigation: card→N-claims splitter for multi-fact cards; declarative
  normalization rules; type-check pass before commit.

Non-risks confirmed: extraction preserves claims on entity failure (Invariant
1 holds); deterministic reruns are idempotent (fingerprint-keyed dedup +
deterministic UUIDs); provenance hashes are recoverable; promotion boundary
is review-only with zero executions.
