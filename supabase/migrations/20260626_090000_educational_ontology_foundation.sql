-- ============================================================================
-- Educational ontology foundation
-- Canonical orthopaedic curriculum graph for SnapOrtho.
-- ============================================================================

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text null,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint specialties_slug_unique unique (slug),
  constraint specialties_name_unique unique (name)
);

comment on table public.specialties is
  'Top-level orthopaedic specialties owned by SnapOrtho.';
comment on column public.specialties.slug is
  'Stable canonical slug such as trauma or pediatrics.';
comment on column public.specialties.comments is
  'Editorial notes about why the specialty exists or how it should evolve.';

create index if not exists specialties_active_slug_idx
  on public.specialties (is_active, slug);

drop trigger if exists set_specialties_updated_at on public.specialties;
create trigger set_specialties_updated_at
  before update on public.specialties
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.curriculum_nodes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid null references public.curriculum_nodes(id) on delete restrict,
  specialty_id uuid null references public.specialties(id) on delete restrict,
  node_type text not null,
  slug text not null,
  title text not null,
  short_label text null,
  description text null,
  sort_order integer not null default 0,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_nodes_slug_unique unique (slug),
  constraint curriculum_nodes_parent_title_unique unique (parent_id, title),
  constraint curriculum_nodes_type_check
    check (
      node_type in (
        'specialty',
        'region',
        'topic',
        'subtopic',
        'module',
        'exam_domain',
        'pathway'
      )
    )
);

comment on table public.curriculum_nodes is
  'Canonical educational hierarchy beneath specialties. External systems never own this tree.';
comment on column public.curriculum_nodes.parent_id is
  'Self-reference that allows the hierarchy to grow without schema changes.';
comment on column public.curriculum_nodes.node_type is
  'Semantic level in the canonical tree, such as topic or subtopic.';
comment on column public.curriculum_nodes.comments is
  'Editorial notes about scope boundaries, planned splits, or future merges.';

create index if not exists curriculum_nodes_parent_sort_idx
  on public.curriculum_nodes (parent_id, sort_order, title);

create index if not exists curriculum_nodes_specialty_type_active_idx
  on public.curriculum_nodes (specialty_id, node_type, is_active);

drop trigger if exists set_curriculum_nodes_updated_at on public.curriculum_nodes;
create trigger set_curriculum_nodes_updated_at
  before update on public.curriculum_nodes
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.learning_objectives (
  id uuid primary key default gen_random_uuid(),
  curriculum_node_id uuid not null references public.curriculum_nodes(id) on delete cascade,
  slug text not null,
  objective_text text not null,
  objective_kind text null,
  sort_order integer not null default 0,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_objectives_slug_unique unique (slug),
  constraint learning_objectives_node_text_unique unique (curriculum_node_id, objective_text)
);

comment on table public.learning_objectives is
  'Broad learner-facing objectives that translate curriculum nodes into teachable outcomes.';
comment on column public.learning_objectives.objective_text is
  'Human-readable statement of what a learner should know or do.';
comment on column public.learning_objectives.comments is
  'Editorial notes about granularity, future refinement, or cross-node reuse.';

create index if not exists learning_objectives_node_active_sort_idx
  on public.learning_objectives (curriculum_node_id, is_active, sort_order);

drop trigger if exists set_learning_objectives_updated_at on public.learning_objectives;
create trigger set_learning_objectives_updated_at
  before update on public.learning_objectives
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  curriculum_node_id uuid not null references public.curriculum_nodes(id) on delete cascade,
  primary_learning_objective_id uuid null references public.learning_objectives(id) on delete set null,
  slug text not null,
  canonical_name text not null,
  concept_type text not null,
  description text null,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint concepts_slug_unique unique (slug),
  constraint concepts_type_check
    check (
      concept_type in (
        'fact',
        'classification',
        'diagnostic_rule',
        'imaging',
        'indication',
        'procedure',
        'complication',
        'outcome',
        'anatomy',
        'biomechanics',
        'pathophysiology',
        'terminology'
      )
    )
);

comment on table public.concepts is
  'Atomic teachable ideas. All external cards, questions, and resources eventually map here.';
comment on column public.concepts.primary_learning_objective_id is
  'Optional primary learning objective that this concept most directly supports.';
comment on column public.concepts.comments is
  'Editorial notes about concept boundaries, planned splits, or merge candidates.';

create unique index if not exists concepts_node_name_unique_idx
  on public.concepts (curriculum_node_id, lower(canonical_name));

create index if not exists concepts_node_type_active_idx
  on public.concepts (curriculum_node_id, concept_type, is_active);

drop trigger if exists set_concepts_updated_at on public.concepts;
create trigger set_concepts_updated_at
  before update on public.concepts
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.concept_aliases (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  alias_name text not null,
  alias_type text not null default 'synonym',
  is_preferred boolean not null default false,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint concept_aliases_type_check
    check (
      alias_type in (
        'synonym',
        'abbreviation',
        'legacy_name',
        'spelling_variant',
        'source_label'
      )
    )
);

comment on table public.concept_aliases is
  'Alternate names for canonical concepts to prevent duplicates and improve matching.';
comment on column public.concept_aliases.alias_name is
  'Alias label such as SCFE or Slipped Upper Femoral Epiphysis.';
comment on column public.concept_aliases.comments is
  'Editorial notes about alias provenance or ambiguity.';

create unique index if not exists concept_aliases_concept_alias_unique_idx
  on public.concept_aliases (concept_id, lower(alias_name));

create index if not exists concept_aliases_alias_lookup_idx
  on public.concept_aliases (lower(alias_name), is_active);

drop trigger if exists set_concept_aliases_updated_at on public.concept_aliases;
create trigger set_concept_aliases_updated_at
  before update on public.concept_aliases
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.external_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  source_type text not null,
  homepage_url text null,
  description text null,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_sources_slug_unique unique (slug),
  constraint external_sources_name_unique unique (name),
  constraint external_sources_type_check
    check (
      source_type in (
        'qbank',
        'flashcard_deck',
        'chatbot',
        'module',
        'textbook',
        'guideline',
        'journal',
        'reference'
      )
    )
);

comment on table public.external_sources is
  'Source systems that feed metadata into the SnapOrtho ontology.';
comment on column public.external_sources.comments is
  'Notes about import scope, legal constraints, or source-specific quirks.';

create index if not exists external_sources_active_type_idx
  on public.external_sources (is_active, source_type, slug);

drop trigger if exists set_external_sources_updated_at on public.external_sources;
create trigger set_external_sources_updated_at
  before update on public.external_sources
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.source_aliases (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.external_sources(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  alias_kind text not null,
  alias_value text not null,
  external_id text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_aliases_entity_type_check
    check (
      entity_type in (
        'specialty',
        'curriculum_node',
        'learning_objective',
        'concept',
        'tag'
      )
    ),
  constraint source_aliases_alias_kind_check
    check (
      alias_kind in (
        'source_slug',
        'source_label',
        'source_topic_id',
        'source_question_group',
        'source_chapter',
        'source_section',
        'external_id',
        'other'
      )
    )
);

comment on table public.source_aliases is
  'Source-specific names and identifiers attached to canonical SnapOrtho entities.';
comment on column public.source_aliases.entity_id is
  'UUID of the canonical entity in SnapOrtho. Entity type indicates which table owns it.';
comment on column public.source_aliases.comments is
  'Notes about provenance, confidence, or temporary mapping assumptions.';

create unique index if not exists source_aliases_unique_value_idx
  on public.source_aliases (source_id, entity_type, entity_id, alias_kind, alias_value);

create unique index if not exists source_aliases_unique_external_id_idx
  on public.source_aliases (source_id, entity_type, alias_kind, external_id)
  where external_id is not null;

create index if not exists source_aliases_lookup_idx
  on public.source_aliases (entity_type, entity_id, is_active);

drop trigger if exists set_source_aliases_updated_at on public.source_aliases;
create trigger set_source_aliases_updated_at
  before update on public.source_aliases
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  parent_tag_id uuid null references public.tags(id) on delete restrict,
  namespace text not null,
  slug text not null,
  label text not null,
  description text null,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_namespace_slug_unique unique (namespace, slug)
);

comment on table public.tags is
  'Orthogonal labels for filtering and workflow that do not replace the canonical hierarchy.';
comment on column public.tags.namespace is
  'Tag domain such as Specialty, Exam, ContentType, or Status.';
comment on column public.tags.comments is
  'Editorial notes about tag usage rules and namespace governance.';

create index if not exists tags_parent_idx
  on public.tags (parent_tag_id, is_active);

create index if not exists tags_namespace_label_idx
  on public.tags (namespace, label);

drop trigger if exists set_tags_updated_at on public.tags;
create trigger set_tags_updated_at
  before update on public.tags
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.tag_assignments (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  assigned_by_source text not null default 'system',
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tag_assignments_entity_type_check
    check (
      entity_type in (
        'specialty',
        'curriculum_node',
        'learning_objective',
        'concept',
        'external_source'
      )
    ),
  constraint tag_assignments_source_check
    check (
      assigned_by_source in (
        'system',
        'seed',
        'manual',
        'import',
        'ai_suggestion'
      )
    )
);

comment on table public.tag_assignments is
  'Polymorphic tag links for canonical entities and supporting metadata.';
comment on column public.tag_assignments.comments is
  'Notes about why the tag was assigned or whether it needs later review.';

create unique index if not exists tag_assignments_unique_idx
  on public.tag_assignments (tag_id, entity_type, entity_id);

create index if not exists tag_assignments_entity_idx
  on public.tag_assignments (entity_type, entity_id, is_active);

drop trigger if exists set_tag_assignments_updated_at on public.tag_assignments;
create trigger set_tag_assignments_updated_at
  before update on public.tag_assignments
  for each row
  execute function public.tg_set_updated_at();
