-- ============================================================================
-- Educational ontology Phase 2
-- Orthobullets metadata import foundation and conservative curriculum mapping.
-- ============================================================================

create table if not exists public.external_questions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.external_sources(id) on delete cascade,
  external_question_id text not null,
  specialty_raw text null,
  specialty_normalized text null,
  topic_raw text null,
  topic_normalized text null,
  topic_slug text null,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_questions_source_question_unique
    unique (source_id, external_question_id)
);

comment on table public.external_questions is
  'Metadata-only external question registry. Never stores protected stems, choices, or explanations.';
comment on column public.external_questions.external_question_id is
  'Source-native external question identifier such as OBQ04-1.';
comment on column public.external_questions.metadata is
  'Sanitized import metadata and audit fields from the source CSV.';

create index if not exists external_questions_source_idx
  on public.external_questions (source_id, external_question_id);

create index if not exists external_questions_specialty_topic_idx
  on public.external_questions (specialty_normalized, topic_slug);

drop trigger if exists set_external_questions_updated_at on public.external_questions;
create trigger set_external_questions_updated_at
  before update on public.external_questions
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.external_question_curriculum_mappings (
  id uuid primary key default gen_random_uuid(),
  external_question_id uuid not null references public.external_questions(id) on delete cascade,
  specialty_id uuid null references public.specialties(id) on delete set null,
  curriculum_node_id uuid null references public.curriculum_nodes(id) on delete set null,
  learning_objective_id uuid null references public.learning_objectives(id) on delete set null,
  concept_id uuid null references public.concepts(id) on delete set null,
  mapping_confidence numeric(4,3) not null default 0.000,
  needs_review boolean not null default true,
  review_reason text null,
  suggested_action text null,
  mapping_method text not null default 'import_rule',
  is_primary boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_question_curriculum_mappings_confidence_check
    check (mapping_confidence >= 0 and mapping_confidence <= 1),
  constraint external_question_curriculum_mappings_method_check
    check (
      mapping_method in (
        'import_rule',
        'manual',
        'ai_suggestion',
        'reviewed'
      )
    )
);

comment on table public.external_question_curriculum_mappings is
  'Primary conservative mapping from an external question to the SnapOrtho curriculum graph.';
comment on column public.external_question_curriculum_mappings.review_reason is
  'Why the mapping is low confidence or needs manual review.';
comment on column public.external_question_curriculum_mappings.suggested_action is
  'Human next step for ontology review or concept enrichment.';

create unique index if not exists external_question_curriculum_primary_unique_idx
  on public.external_question_curriculum_mappings (external_question_id)
  where is_primary = true;

create index if not exists external_question_curriculum_topic_idx
  on public.external_question_curriculum_mappings (curriculum_node_id, needs_review, mapping_confidence desc);

drop trigger if exists set_external_question_curriculum_mappings_updated_at
  on public.external_question_curriculum_mappings;
create trigger set_external_question_curriculum_mappings_updated_at
  before update on public.external_question_curriculum_mappings
  for each row
  execute function public.tg_set_updated_at();

alter table public.source_aliases
  drop constraint if exists source_aliases_entity_type_check;

alter table public.source_aliases
  drop constraint if exists source_aliases_alias_kind_check;

alter table public.source_aliases
  add constraint source_aliases_entity_type_check
    check (
      entity_type in (
        'specialty',
        'curriculum_node',
        'learning_objective',
        'concept',
        'tag',
        'external_question'
      )
    );

alter table public.source_aliases
  add constraint source_aliases_alias_kind_check
    check (
      alias_kind in (
        'source_slug',
        'source_label',
        'source_topic_id',
        'source_topic_label',
        'source_specialty_label',
        'source_question_group',
        'source_question_id',
        'source_chapter',
        'source_section',
        'external_id',
        'other'
      )
    );

alter table public.tag_assignments
  drop constraint if exists tag_assignments_entity_type_check;

alter table public.tag_assignments
  add constraint tag_assignments_entity_type_check
    check (
      entity_type in (
        'specialty',
        'curriculum_node',
        'learning_objective',
        'concept',
        'external_source',
        'external_question'
      )
    );
