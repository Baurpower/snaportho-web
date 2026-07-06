-- ============================================================================
-- Ankle pilot KG vocabulary extension (DESIGN — apply to staging before pilot DB writes)
--
-- Purpose:
--   Enable ankle fracture neighborhood proposals without broad ontology expansion.
--
-- Rollback:
--   begin;
--   -- Drop new tables first (no prod data expected at pilot start)
--   drop table if exists public.decision_points;
--   drop table if exists public.educational_claims;
--   -- Restore prior CHECK constraints from 20260628_150000 migration
--   -- (re-run that migration's constraint blocks or keep backup DDL)
--   commit;
--
-- Impact on scripts:
--   - kg-relationship-registry.ts already defines new predicates (apply after migration)
--   - generate-ankle-pilot-proposals.ts validates against registry pre-apply
--   - apply-approved-kg-automation-proposals.ts will accept new predicates once DB aligned
--
-- Tests to run after apply:
--   node scripts/lib/education/kg-relationship-registry.test.ts
--   npm run typecheck
--   node --experimental-strip-types scripts/generate-ankle-pilot-proposals.ts
--   node --experimental-strip-types scripts/report-kg-neighborhood-quality.ts --pilot ankle
-- ============================================================================

begin;

-- 1. Entity types: classification_grade, fixation_method
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
      'classification_grade',
      'complication',
      'diagnostic_test',
      'imaging_finding',
      'implant',
      'fixation_method',
      'treatment_principle',
      'biomechanics_concept',
      'exam_maneuver',
      'surgical_approach',
      'surgical_positioning'
    )
  );

-- 2. Predicate vocabulary extension (ankle pilot)
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
      'injured_in',
      'at_risk_structure',
      'has_imaging_finding',
      'has_grade',
      'uses_fixation',
      'explains_instability',
      'part_of',
      'contains',
      'articulates_with',
      'inserts_on',
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

-- 3. kg_automation_proposals predicate + entity type alignment
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
      'classification_grade',
      'complication',
      'diagnostic_test',
      'imaging_finding',
      'implant',
      'fixation_method',
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
      'injured_in',
      'at_risk_structure',
      'has_imaging_finding',
      'has_grade',
      'uses_fixation',
      'explains_instability',
      'part_of',
      'contains',
      'articulates_with',
      'inserts_on',
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

-- 4. Draft assertion tables (proposals live here after review — not auto-verified)
create table if not exists public.educational_claims (
  id uuid primary key default gen_random_uuid(),
  primary_entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  claim_text text not null,
  claim_type text not null,
  importance_level text not null default 'L2',
  content_source text not null default 'generated_draft',
  review_status text not null default 'unreviewed',
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint educational_claims_importance_check
    check (importance_level in ('L1', 'L2', 'L3', 'L4')),
  constraint educational_claims_content_source_check
    check (content_source in ('verified', 'generated_draft', 'needs_review', 'deprecated')),
  constraint educational_claims_review_status_check
    check (review_status in ('unreviewed', 'in_review', 'approved', 'rejected', 'conflicted'))
);

create table if not exists public.decision_points (
  id uuid primary key default gen_random_uuid(),
  subject_entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  pattern_type text not null,
  trigger_text text not null,
  action_text text not null,
  urgency text not null default 'routine',
  safety_criticality text not null default 'none',
  content_source text not null default 'generated_draft',
  review_status text not null default 'unreviewed',
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decision_points_urgency_check
    check (urgency in ('routine', 'urgent', 'emergent')),
  constraint decision_points_safety_check
    check (safety_criticality in ('none', 'moderate', 'high', 'emergency')),
  constraint decision_points_content_source_check
    check (content_source in ('verified', 'generated_draft', 'needs_review', 'deprecated')),
  constraint decision_points_review_status_check
    check (review_status in ('unreviewed', 'in_review', 'approved', 'rejected', 'conflicted'))
);

comment on table public.educational_claims is
  'Atomic teaching assertions. Pilot rows must remain generated_draft until expert review.';
comment on table public.decision_points is
  'Management-changing if/then logic. Never auto-publish safety-critical rows.';

grant select, insert, update on table public.educational_claims to service_role;
grant select, insert, update on table public.decision_points to service_role;

-- 5. Factory proposal types for claims and decision points
alter table public.kg_automation_proposals
  drop constraint if exists kg_automation_proposals_type_check;
alter table public.kg_automation_proposals
  add constraint kg_automation_proposals_type_check
  check (
    proposal_type in (
      'create_canonical_entity',
      'link_curriculum_node_to_entity',
      'link_concept_to_entity',
      'add_entity_alias',
      'add_canonical_relationship',
      'add_provenance_record',
      'propose_educational_claim',
      'propose_decision_point',
      'flag_duplicate_entity',
      'flag_ambiguous_mapping',
      'flag_possible_split',
      'flag_possible_merge',
      'retarget_card_to_entity',
      'retarget_question_to_entity'
    )
  );

commit;