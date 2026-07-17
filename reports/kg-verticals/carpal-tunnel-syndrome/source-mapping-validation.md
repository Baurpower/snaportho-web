# CTS Source Mapping Validation

Prepared: 2026-07-09
Mode: repository/source-record inspection only; no database writes

## Result

| Source | Seed declaration | Source-level record found | Validation disposition |
|---|---:|---:|---|
| Anki | 4 | 0 in legacy CTS ontology packet; generated collector reports 4 only from seed metadata | **Not source-record validated** |
| Orthobullets | 44 | 24 legacy questions in `kg-ontology-builder-review.json`; generated collector reports 44 only from seed metadata | **24 source-record signals validated; remaining 20 unresolved** |
| CasePrep | 1 | 1 mapping: topic `carpal-tunnel-syndrome` → `carpal-tunnel-release` | Validated as reference link |
| Curriculum | 1 | `hand-carpal-tunnel-syndrome` and Prepare topic `carpal-tunnel-syndrome` | Validated as identity bridge candidate |

## Evidence

- Current declarations:
  `scripts/lib/education/kg-hand-wrist-cluster-definitions.ts` records 4 Anki
  and 44 Orthobullets mappings.
- Generated metadata:
  `ev-anki-card-8adcc30d` and `ev-orthobullets-question-32ec81a1` repeat those
  counts. The collectors do not enumerate source record IDs, so these are not
  independent validation.
- Legacy source packet:
  `reports/kg-ontology-builder-review.json`, node
  `2f479ee6-f509-4f79-a671-b77b99285b92`, records `legacyCardCount: 0`,
  `legacyQuestionCount: 24`, six representative question-title signals, and
  Orthobullets path `Carpal Tunnel Syndrome`.
- Legacy retargeting:
  `reports/legacy-retargeting-completion-report.md` reports 0 cards and 24
  questions and states retargeting was blocked by the absence of an approved
  canonical primary-coverage bridge.
- Current repository mapping reports provide aggregate Anki run statistics but
  no CTS card IDs. No copyright-restricted content was opened or copied.

## Required closeout

Before manufacture, run a read-only database-backed export filtered to
`hand-carpal-tunnel-syndrome` and record:

- canonical card IDs, mapping status, mapper method, confidence, batch/run ID,
  and review state for all claimed four Anki mappings;
- external question IDs, source topic/path, mapping status, and review state
  for all claimed 44 Orthobullets mappings;
- a reconciliation explaining the 0→4 card and 24→44 question changes.

Until then, manufacturing may consume the 24 known Orthobullets signals as
metadata only. It must not claim that four Anki or all 44 Orthobullets mappings
were validated.
