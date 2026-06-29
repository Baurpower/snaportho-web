-- ============================================================================
-- Deterministic Anki to knowledge-graph mapping support
-- Safe metadata-only support tables for mapping runs, candidates, and aliases.
-- ============================================================================

create table if not exists public.curriculum_node_aliases (
  id uuid primary key default gen_random_uuid(),
  curriculum_node_id uuid not null references public.curriculum_nodes(id) on delete cascade,
  alias_name text not null,
  normalized_alias text not null,
  alias_type text not null default 'synonym',
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_node_aliases_type_check
    check (
      alias_type in (
        'synonym',
        'abbreviation',
        'legacy_name',
        'spelling_variant',
        'source_label',
        'deck_label',
        'tag_label'
      )
    )
);

comment on table public.curriculum_node_aliases is
  'Normalized aliases for canonical curriculum nodes. Supports deterministic matching from Anki, qbanks, and future imports.';

create unique index if not exists curriculum_node_aliases_node_alias_unique_idx
  on public.curriculum_node_aliases (curriculum_node_id, normalized_alias);

create index if not exists curriculum_node_aliases_lookup_idx
  on public.curriculum_node_aliases (normalized_alias, is_active);

drop trigger if exists set_curriculum_node_aliases_updated_at on public.curriculum_node_aliases;
create trigger set_curriculum_node_aliases_updated_at
  before update on public.curriculum_node_aliases
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.anki_kg_mapping_runs (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.anki_import_batches(id) on delete cascade,
  mapper_version text not null,
  run_mode text not null default 'dry_run',
  status text not null default 'pending',
  min_confidence numeric(4,3) not null default 0.900
    check (min_confidence >= 0 and min_confidence <= 1),
  deck_prefix text null,
  limit_count integer null,
  total_cards_considered integer not null default 0,
  high_confidence_count integer not null default 0,
  medium_confidence_count integer not null default 0,
  no_mapping_count integer not null default 0,
  applied_mapping_count integer not null default 0,
  candidate_mapping_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_kg_mapping_runs_mode_check
    check (run_mode in ('dry_run', 'apply')),
  constraint anki_kg_mapping_runs_status_check
    check (status in ('pending', 'completed', 'failed'))
);

comment on table public.anki_kg_mapping_runs is
  'Ledger of deterministic Anki-to-KG mapping executions, with summary counts for dry-run and apply modes.';

create index if not exists anki_kg_mapping_runs_batch_created_idx
  on public.anki_kg_mapping_runs (import_batch_id, created_at desc);

drop trigger if exists set_anki_kg_mapping_runs_updated_at on public.anki_kg_mapping_runs;
create trigger set_anki_kg_mapping_runs_updated_at
  before update on public.anki_kg_mapping_runs
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.anki_kg_mapping_candidates (
  id uuid primary key default gen_random_uuid(),
  mapping_run_id uuid not null references public.anki_kg_mapping_runs(id) on delete cascade,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete cascade,
  specialty_id uuid null references public.specialties(id) on delete set null,
  curriculum_node_id uuid null references public.curriculum_nodes(id) on delete set null,
  concept_id uuid null references public.concepts(id) on delete set null,
  candidate_rank integer not null default 1,
  mapping_confidence numeric(4,3) not null default 0.000
    check (mapping_confidence >= 0 and mapping_confidence <= 1),
  review_status text not null default 'needs_review',
  mapper_type text not null default 'deterministic',
  is_selected boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_kg_mapping_candidates_status_check
    check (review_status in ('auto_mapped', 'needs_review', 'approved', 'rejected')),
  constraint anki_kg_mapping_candidates_mapper_check
    check (mapper_type in ('deterministic', 'manual', 'ai_suggestion'))
);

comment on table public.anki_kg_mapping_candidates is
  'Deterministic or reviewed card-to-node mapping candidates retained for later bulk review and audit.';

create index if not exists anki_kg_mapping_candidates_run_card_idx
  on public.anki_kg_mapping_candidates (mapping_run_id, canonical_card_id, candidate_rank);

create index if not exists anki_kg_mapping_candidates_node_review_idx
  on public.anki_kg_mapping_candidates (curriculum_node_id, review_status, mapping_confidence desc);

create unique index if not exists anki_kg_mapping_candidates_run_card_node_idx
  on public.anki_kg_mapping_candidates (
    mapping_run_id,
    canonical_card_id,
    coalesce(curriculum_node_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(concept_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

drop trigger if exists set_anki_kg_mapping_candidates_updated_at on public.anki_kg_mapping_candidates;
create trigger set_anki_kg_mapping_candidates_updated_at
  before update on public.anki_kg_mapping_candidates
  for each row
  execute function public.tg_set_updated_at();

alter table public.card_knowledge_links
  drop constraint if exists card_knowledge_links_status_check;

alter table public.card_knowledge_links
  add constraint card_knowledge_links_status_check
    check (review_status in ('unreviewed', 'needs_review', 'auto_mapped', 'in_review', 'approved', 'rejected'));

create unique index if not exists card_knowledge_links_card_node_unique_idx
  on public.card_knowledge_links (
    canonical_card_id,
    coalesce(curriculum_node_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(learning_objective_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(concept_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where is_active = true;

grant select, insert, update, delete on table public.curriculum_node_aliases to service_role;
grant select, insert, update, delete on table public.anki_kg_mapping_runs to service_role;
grant select, insert, update, delete on table public.anki_kg_mapping_candidates to service_role;
