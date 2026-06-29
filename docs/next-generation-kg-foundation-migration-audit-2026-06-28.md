# Next-Generation KG Foundation Migration Audit

Date: 2026-06-28

## Scope

This audit reviews the additive next-generation foundation migration in:

- [supabase/migrations/20260628_120000_next_generation_kg_foundation.sql](/Volumes/PS3000/snaportho_dev/snaportho-web/supabase/migrations/20260628_120000_next_generation_kg_foundation.sql:1)

Focus areas:

- polymorphic references
- constraints
- indexes
- RLS consistency
- enum/check-constraint safety
- lineage behavior for merge, split, deprecate, replace, and restore

## Summary

The migration is directionally correct and safe to layer onto the current system because it is:

- additive
- forward-only
- non-destructive
- compatible with the current Anki and Orthobullets pipelines

I made four material corrections during this audit:

1. Added `implant` to `canonical_entities.entity_type`.
2. Added `treated_by` to `canonical_relationships.predicate`.
3. Added a governance target-shape constraint so lineage actions are structurally valid.
4. Changed `curriculum_node_entities` target references from `on delete cascade` to `on delete restrict` so linked canonical entities cannot be silently removed through bridge cleanup.

## Polymorphic Reference Audit

### `canonical_relationships`

Current design:

- `subject_entity_type` + `subject_entity_id`
- `object_entity_type` + `object_entity_id`

Assessment:

- Correct for a multi-entity graph foundation.
- It intentionally avoids hard foreign keys because the graph must connect multiple current and future tables.

Tradeoff:

- Database-level referential integrity is not fully enforceable for polymorphic endpoints.
- Validation must remain partly application-level or via future trigger-based enforcement.

Recommendation:

- Accept this for foundation phase.
- Add validation helpers and eventually integrity checks or background audits.

### `ontology_provenance_records`

Current design:

- polymorphic `subject_entity_type` + `subject_entity_id`
- polymorphic source artifact identifiers

Assessment:

- Correct for provenance across entities, aliases, relationships, mappings, and governance actions.
- Same tradeoff as above: flexible but not fully FK-enforced.

Recommendation:

- Accept for now.
- Add reporting or integrity audits later to catch stale references.

## Constraint Audit

### Strong points

- entity type constraints are explicit
- relationship predicate constraints are explicit
- lifecycle and review statuses are constrained
- `canonical_entities.replacement_entity_id <> id` is good
- `curriculum_node_entities` enforces exactly one target
- governance actions now enforce action-specific target cardinality

### Corrected issues

#### Missing `implant` entity type

Problem:

- proof-set and roadmap requirements include implants, but the original entity-type check did not allow them

Fix:

- added `implant`

#### Missing `treated_by` predicate

Problem:

- requested proof relationship was condition `treated_by` implant, but the original predicate set only had `treats`

Fix:

- added `treated_by`

#### Governance target-shape ambiguity

Problem:

- original lineage table allowed any action type with any target shape

Fix:

- `split` now requires at least two targets
- `merge` and `replace` require at least one target
- `rename`, `deprecate`, and `restore` require no targets

This makes lineage much safer and clearer.

### Remaining acceptable limitations

- `canonical_entities` does not yet require `replacement_entity_id` when status is `replaced`
- `deprecated_at` is not yet required for retired statuses

These are acceptable in the foundation phase but are good follow-up hardening tasks.

## Index Audit

### Good additions

- lookup indexes on canonical entity type and normalized label
- source-concept bridge index
- governance source/action indexes
- GIN index on governance target id arrays
- subject/object indexes on canonical relationships
- review/provenance indexes on provenance records
- bridge indexes for curriculum-node-to-entity traversal

Assessment:

- good enough for seed-scale and early production usage
- should support current proof work and future incremental reads

### One caution

The graph is still relying on polymorphic ids rather than FK joins for some major traversals. Indexes help, but query discipline will matter as the graph grows.

## RLS Consistency Audit

Current ontology and mapping tables are primarily service-role-managed and do not currently use per-user RLS in the same way that user-owned product tables do.

Assessment:

- The new migration matches that existing pattern.
- This is consistent with current ontology-table governance.

Recommendation:

- Keep this consistency for now.
- Revisit once there is a broader ontology editing surface beyond service-role/admin workflows.

## Check-Constraint Safety

The migration uses `check` constraints rather than PostgreSQL enums, matching the current project style.

Assessment:

- This is safer for iterative migrations in the current repo because extending allowed values is straightforward.
- It avoids enum-alter friction while the taxonomy is still evolving.

Recommendation:

- Keep using `check` constraints at this stage.
- Consider true enums only if the taxonomy stabilizes enough to justify it.

## Lineage Audit

### Merge

Supported:

- yes
- modeled as one source entity with one or more target ids, though operationally the intended pattern is one source -> one target per row for clarity

### Split

Supported:

- yes
- explicitly enabled through `target_entity_ids uuid[]`
- now constrained to require at least two targets

### Deprecate

Supported:

- yes
- modeled as action without targets

### Replace

Supported:

- yes
- modeled as one source with one or more targets

### Restore

Supported:

- yes
- modeled as action without targets

### Rename

Supported:

- yes
- modeled as action without replacement targets

### Assessment

The lineage model is adequate for the foundation phase and intentionally decoupled from any single entity table.

The main remaining limitation is that the migration does not yet automatically mutate downstream rows when a governance action is marked `applied`. That is appropriate for now because automated remapping was explicitly out of scope.

## Overall Call

The migration is schema-correct for the foundation phase after the fixes above.

It is not yet the final ontology-governance system, but it is a durable and safe base for:

- typed canonical proof entities
- typed semantic relationships
- curriculum overlay bridging
- non-destructive lineage
- granular provenance growth

## Follow-Up Hardening

1. Add optional integrity audit scripts for polymorphic rows.
2. Consider status-specific constraints for `replacement_entity_id` and `deprecated_at`.
3. Add canonical-entity alias infrastructure if canonical naming starts to expand quickly.
4. Add canonical question-item support before reworking question mappings.
