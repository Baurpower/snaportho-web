-- ============================================================================
-- Paste-Ready Live KG Migrations
-- Target: Supabase SQL Editor
-- Purpose: Apply the two missing next-generation KG migrations live.
--
-- Live state observed before this script:
-- - public.canonical_entities exists
-- - public.curriculum_node_entities exists
-- - public.concept_canonical_entities missing
-- - public.kg_automation_proposals missing
--
-- Safe usage:
-- 1. Paste this entire file into the Supabase SQL Editor.
-- 2. Run it once.
-- 3. Then run the verification queries at the bottom.
-- ============================================================================

begin;

-- ============================================================================
-- Migration: 20260628_130000_concept_canonical_entity_bridge.sql
-- ============================================================================

create table if not exists public.concept_canonical_entities (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete restrict,
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  bridge_type text not null default 'equivalent_to',
  confidence numeric(4,3) not null default 1.000,
  review_status text not null default 'generated',
  provenance_status text not null default 'pending',
  created_by text null,
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint concept_canonical_entities_bridge_type_check
    check (
      bridge_type in (
        'equivalent_to',
        'narrower_than',
        'broader_than',
        'related_to',
        'replaced_by'
      )
    ),
  constraint concept_canonical_entities_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint concept_canonical_entities_review_status_check
    check (
      review_status in (
        'generated',
        'needs_review',
        'approved',
        'rejected',
        'superseded'
      )
    ),
  constraint concept_canonical_entities_provenance_status_check
    check (
      provenance_status in (
        'pending',
        'source_attached',
        'reviewed',
        'conflicted'
      )
    ),
  constraint concept_canonical_entities_reviewed_at_requires_reviewer_check
    check (
      reviewed_at is null
      or reviewed_by is not null
    )
);

comment on table public.concept_canonical_entities is
  'Reviewed bridge from the legacy concept layer into next-generation canonical entities. Keeps concept migration incremental and auditable.';
comment on column public.concept_canonical_entities.bridge_type is
  'Semantic relationship between the old concept row and the canonical entity. Equivalent links are the safest path for direct reuse.';
comment on column public.concept_canonical_entities.created_by is
  'Free-text creation channel for transition auditing, for example manual, import, ai_suggestion, or review.';

create unique index if not exists concept_canonical_entities_unique_active_idx
  on public.concept_canonical_entities (concept_id, canonical_entity_id, bridge_type)
  where is_active = true;

create index if not exists concept_canonical_entities_concept_idx
  on public.concept_canonical_entities (concept_id, review_status, bridge_type);

create index if not exists concept_canonical_entities_canonical_idx
  on public.concept_canonical_entities (canonical_entity_id, review_status, bridge_type);

create index if not exists concept_canonical_entities_review_idx
  on public.concept_canonical_entities (review_status, is_active, confidence desc);

drop trigger if exists set_concept_canonical_entities_updated_at on public.concept_canonical_entities;
create trigger set_concept_canonical_entities_updated_at
  before update on public.concept_canonical_entities
  for each row
  execute function public.tg_set_updated_at();

grant select, insert, update on table public.concept_canonical_entities to service_role;

-- ============================================================================
-- Migration: 20260628_140000_kg_automation_proposals.sql
-- ============================================================================

create table if not exists public.kg_automation_proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_fingerprint text not null,
  proposal_type text not null,
  source_signal_type text not null,
  source_signal_ids text[] not null default '{}'::text[],
  specialty_id uuid null references public.specialties(id) on delete set null,
  proposed_entity_type text null,
  proposed_entity_label text null,
  proposed_existing_entity_id uuid null references public.canonical_entities(id) on delete set null,
  proposed_subject_entity_id uuid null references public.canonical_entities(id) on delete set null,
  proposed_predicate text null,
  proposed_object_entity_id uuid null references public.canonical_entities(id) on delete set null,
  proposed_alias text null,
  proposed_bridge_type text null,
  confidence numeric(4,3) not null default 0.000,
  confidence_tier text not null default 'low',
  confidence_reason text null,
  evidence_summary text null,
  supporting_card_count integer not null default 0,
  supporting_question_count integer not null default 0,
  supporting_curriculum_node_count integer not null default 0,
  supporting_source_count integer not null default 0,
  conflict_count integer not null default 0,
  review_status text not null default 'generated',
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  reviewer_notes text null,
  applied_at timestamptz null,
  superseded_by uuid null references public.kg_automation_proposals(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kg_automation_proposals_fingerprint_not_blank_check
    check (length(btrim(proposal_fingerprint)) > 0),
  constraint kg_automation_proposals_type_check
    check (
      proposal_type in (
        'create_canonical_entity',
        'link_curriculum_node_to_entity',
        'link_concept_to_entity',
        'add_entity_alias',
        'add_canonical_relationship',
        'add_provenance_record',
        'flag_duplicate_entity',
        'flag_ambiguous_mapping',
        'flag_possible_split',
        'flag_possible_merge'
      )
    ),
  constraint kg_automation_proposals_signal_type_check
    check (
      source_signal_type in (
        'curriculum_node',
        'learning_objective',
        'concept',
        'concept_alias',
        'curriculum_node_alias',
        'source_alias',
        'canonical_card',
        'card_knowledge_link',
        'external_question',
        'external_question_curriculum_mapping',
        'anki_tag',
        'anki_deck_path',
        'curriculum_cluster',
        'reference_import',
        'canonical_entity'
      )
    ),
  constraint kg_automation_proposals_entity_type_check
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
        'exam_maneuver'
      )
    ),
  constraint kg_automation_proposals_predicate_check
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
        'has_classification',
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
    ),
  constraint kg_automation_proposals_bridge_type_check
    check (
      proposed_bridge_type is null
      or proposed_bridge_type in (
        'primary_coverage',
        'secondary_coverage',
        'objective_anchor',
        'board_relevance',
        'rotation_relevance',
        'reference_only',
        'equivalent_to',
        'narrower_than',
        'broader_than',
        'related_to',
        'replaced_by'
      )
    ),
  constraint kg_automation_proposals_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint kg_automation_proposals_confidence_tier_check
    check (confidence_tier in ('high', 'medium', 'low')),
  constraint kg_automation_proposals_review_status_check
    check (
      review_status in (
        'generated',
        'needs_review',
        'approved',
        'rejected',
        'applied',
        'superseded'
      )
    ),
  constraint kg_automation_proposals_reviewed_at_requires_reviewer_check
    check (reviewed_at is null or reviewed_by is not null)
);

comment on table public.kg_automation_proposals is
  'Deterministic or future-assisted KG expansion proposals. Automation may generate rows here, but reviewed canonical truth changes only through explicit application.';
comment on column public.kg_automation_proposals.proposal_fingerprint is
  'Stable dedupe key for idempotent proposal regeneration.';
comment on column public.kg_automation_proposals.metadata is
  'Structured evidence packet, source labels, editorial queue hints, and future LLM-compatible context.';

create unique index if not exists kg_automation_proposals_fingerprint_active_idx
  on public.kg_automation_proposals (proposal_fingerprint)
  where is_active = true;

create index if not exists kg_automation_proposals_type_review_idx
  on public.kg_automation_proposals (proposal_type, review_status, confidence desc);

create index if not exists kg_automation_proposals_specialty_idx
  on public.kg_automation_proposals (specialty_id, confidence_tier, review_status);

create index if not exists kg_automation_proposals_existing_entity_idx
  on public.kg_automation_proposals (proposed_existing_entity_id, proposal_type, review_status);

create index if not exists kg_automation_proposals_subject_object_idx
  on public.kg_automation_proposals (proposed_subject_entity_id, proposed_object_entity_id, proposal_type);

drop trigger if exists set_kg_automation_proposals_updated_at on public.kg_automation_proposals;
create trigger set_kg_automation_proposals_updated_at
  before update on public.kg_automation_proposals
  for each row
  execute function public.tg_set_updated_at();

grant select, insert, update on table public.kg_automation_proposals to service_role;

commit;

-- ============================================================================
-- Verification Queries
-- Run these after the transaction succeeds.
-- ============================================================================

select
  to_regclass('public.canonical_entities') as canonical_entities,
  to_regclass('public.curriculum_node_entities') as curriculum_node_entities,
  to_regclass('public.concept_canonical_entities') as concept_canonical_entities,
  to_regclass('public.kg_automation_proposals') as kg_automation_proposals;

select
  count(*) as concept_canonical_entities_count
from public.concept_canonical_entities;

select
  count(*) as kg_automation_proposals_count
from public.kg_automation_proposals;
