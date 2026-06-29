-- KG relationship vocabulary hardening (architecture audit pass 1).
--
-- Goals (metadata/constraint changes only — no content rows are inserted or
-- mutated by this migration):
--   1. Add `surgical_approach` and `surgical_positioning` as valid
--      canonical_entities.entity_type values. The `uses_approach` predicate
--      already existed in the relationship vocabulary with no backing entity
--      type to point at; this closes that gap and adds an OR-positioning type.
--   2. Defer three forward-declared, table-less relationship endpoint types
--      (`canonical_question_item`, `article`, `case_module`). No table backs
--      them today, so an edge could previously claim to reference a row that
--      can never exist. They are removed from the endpoint CHECK constraints
--      so the database itself refuses such edges. Re-add them in a future
--      migration at the same time their backing tables are created.
--   3. Add the two highest-value missing predicates from the audit:
--      `indicates_treatment` (classification/condition -> treatment principle)
--      and `uses_positioning` (procedure -> surgical positioning).
--
-- Safety: canonical_relationships has zero rows today, so dropping the three
-- deferred endpoint types cannot orphan or reject any existing edge. The
-- enum widenings are purely additive.

begin;

-- 1. Entity-type vocabulary: add surgical_approach + surgical_positioning.
alter table public.canonical_entities
  drop constraint if exists canonical_entities_type_check;
alter table public.canonical_entities
  add constraint canonical_entities_type_check
  check (
    entity_type in (
      'condition',
      'procedure',
      'anatomy_structure',
      'classification_system',
      'complication',
      'diagnostic_test',
      'imaging_finding',
      'implant',
      'treatment_principle',
      'biomechanics_concept',
      'exam_maneuver',
      'surgical_approach',
      'surgical_positioning'
    )
  );

-- 2a. Relationship subject endpoint types: drop the three deferred table-less
--     types. Remaining types all have backing tables (canonical_entity,
--     concept, canonical_card, curriculum_node, learning_objective) or are an
--     intentional pseudo-type (training_level).
alter table public.canonical_relationships
  drop constraint if exists canonical_relationships_subject_type_check;
alter table public.canonical_relationships
  add constraint canonical_relationships_subject_type_check
  check (
    subject_entity_type in (
      'canonical_entity',
      'concept',
      'canonical_card',
      'curriculum_node',
      'learning_objective',
      'training_level'
    )
  );

-- 2b. Relationship object endpoint types: same deferral.
alter table public.canonical_relationships
  drop constraint if exists canonical_relationships_object_type_check;
alter table public.canonical_relationships
  add constraint canonical_relationships_object_type_check
  check (
    object_entity_type in (
      'canonical_entity',
      'concept',
      'canonical_card',
      'curriculum_node',
      'learning_objective',
      'training_level'
    )
  );

-- 3. Predicate vocabulary: add the two new high-value predicates. Existing
--    predicates are preserved. Note: predicates whose only sensible endpoint
--    was a now-deferred type (supported_by_question, supported_by_article,
--    exemplified_by_case, covered_by_module) remain in the vocabulary but are
--    no longer satisfiable, because their endpoint type is gone. They are
--    marked `deferred` in the shared relationship registry so neither
--    generation nor apply will emit them until backing tables exist.
alter table public.canonical_relationships
  drop constraint if exists canonical_relationships_predicate_check;
alter table public.canonical_relationships
  add constraint canonical_relationships_predicate_check
  check (
    predicate in (
      'treats',
      'treated_by',
      'indicated_for',
      'contraindicated_for',
      'involves_anatomy',
      'uses_implant',
      'uses_approach',
      'uses_positioning',
      'has_classification',
      'indicates_treatment',
      'has_complication',
      'requires_imaging',
      'tested_by',
      'examines',
      'prerequisite_for',
      'commonly_confused_with',
      'differential_for',
      'supported_by_card',
      'supported_by_question',
      'supported_by_article',
      'exemplified_by_case',
      'covered_by_module',
      'covered_by_curriculum_node',
      'taught_by_learning_objective',
      'expected_at_training_level'
    )
  );

-- 4. Keep kg_automation_proposals in lockstep so proposals can express the new
--    entity types and predicates.
alter table public.kg_automation_proposals
  drop constraint if exists kg_automation_proposals_entity_type_check;
alter table public.kg_automation_proposals
  add constraint kg_automation_proposals_entity_type_check
  check (
    proposed_entity_type is null
    or proposed_entity_type in (
      'condition',
      'procedure',
      'anatomy_structure',
      'classification_system',
      'complication',
      'diagnostic_test',
      'imaging_finding',
      'implant',
      'treatment_principle',
      'biomechanics_concept',
      'exam_maneuver',
      'surgical_approach',
      'surgical_positioning'
    )
  );

alter table public.kg_automation_proposals
  drop constraint if exists kg_automation_proposals_predicate_check;
alter table public.kg_automation_proposals
  add constraint kg_automation_proposals_predicate_check
  check (
    proposed_predicate is null
    or proposed_predicate in (
      'treats',
      'treated_by',
      'indicated_for',
      'contraindicated_for',
      'involves_anatomy',
      'uses_implant',
      'uses_approach',
      'uses_positioning',
      'has_classification',
      'indicates_treatment',
      'has_complication',
      'requires_imaging',
      'tested_by',
      'examines',
      'prerequisite_for',
      'commonly_confused_with',
      'differential_for',
      'supported_by_card',
      'supported_by_question',
      'supported_by_article',
      'exemplified_by_case',
      'covered_by_module',
      'covered_by_curriculum_node',
      'taught_by_learning_objective',
      'expected_at_training_level'
    )
  );

comment on constraint canonical_relationships_subject_type_check
  on public.canonical_relationships is
  'Deferred table-less endpoint types (canonical_question_item, article, case_module) removed in 20260628_150000; re-add alongside their backing tables.';

commit;
