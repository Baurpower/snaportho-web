# CTS Source Mapping Reconciliation

Mode: repository-only read audit; no database reads/writes  
Input: `reports/kg-verticals/carpal-tunnel-syndrome/source-mapping-validation.md`

## Result

Record-level reconciliation is **blocked** with the currently available local artifacts.

The repository contains:

- Seed/current aggregate declarations: 4 Anki mappings and 44 Orthobullets mappings.
- Legacy ontology-builder candidate for `hand-carpal-tunnel-syndrome`: 0 legacy cards and 24 legacy questions.
- Six representative Orthobullets question-title signals in `reports/kg-ontology-builder-review.json`.
- No stable CTS Anki card IDs for the four claimed Anki mappings.
- No stable source question IDs for all 24 legacy or 44 current Orthobullets mappings.

Because exact source identifiers are not present locally, every claimed source identifier cannot be verified, and stale/duplicate/remapped records cannot be distinguished record-by-record.

## Canonical reconciliation table

| Source | Previous count | Current count | Added | Removed | Remapped | Final verified count |
|---|---:|---:|---:|---:|---:|---:|
| Anki | 0 legacy CTS cards | 4 declared by seed metadata | BLOCKED: no record IDs present | 0 proven | BLOCKED | 0 record-level verified |
| Orthobullets | 24 legacy CTS question mappings | 44 declared by seed metadata | BLOCKED: +20 not record-identifiable | 0 proven | BLOCKED | 6 representative title signals; 24 aggregate legacy; 44 unverified current |
| CasePrep | 1 reference link | 1 reference link | 0 | 0 | 0 | 1 aggregate reference verified |
| Curriculum | 1 identity bridge candidate | 1 identity bridge candidate | 0 | 0 | 0 | 1 aggregate bridge verified |

## Record-level evidence found

### Legacy CTS candidate

- `nodeId`: `2f479ee6-f509-4f79-a671-b77b99285b92`
- `slug`: `hand-carpal-tunnel-syndrome`
- `title`: `Carpal Tunnel Syndrome`
- `curriculumPath`: `Hand > Carpal Tunnel Syndrome`
- `legacyCardCount`: 0
- `legacyQuestionCount`: 24
- `representativeContent.questionTitles`: six instances of `Carpal Tunnel Syndrome`
- `externalSignals.orthobulletsPaths`: `Carpal Tunnel Syndrome`

### Missing record-level identifiers

The available reports do not expose:

- canonical card IDs for the four claimed CTS Anki mappings;
- Anki note GUIDs for those four claimed mappings;
- Orthobullets external question IDs for the 24 legacy CTS mappings;
- Orthobullets external question IDs for the 44 current declared mappings;
- mapping run ID or batch ID scoped to CTS for the current 4/44 declarations;
- duplicate/remap lineage explaining 24 to 44.

## Stale or invalid mapping assessment

No individual mapping can be marked stale or invalid because the current local artifacts expose aggregate counts, not the underlying source identifiers.

## Blocker

This workstream remains a concrete staging blocker. A read-only database-backed export or source-mapping artifact must be produced with:

| Required field | Purpose |
|---|---|
| source | Anki, Orthobullets, CasePrep, Curriculum |
| source_record_id | Stable source identifier |
| source_title_or_path | Human-readable source context |
| prior_mapping_state | Legacy mapping state |
| current_mapping_state | Current mapping state |
| canonical_entity_slug | Target canonical identity |
| mapper_method | deterministic, manual, seed declaration, etc. |
| mapping_run_id | Reconciliation provenance |
| review_state | approved, generated, stale, rejected |

Until that export exists, the source-count discrepancy cannot be honestly closed.
