-- ============================================================================
-- Anki import foundation
-- Read-only ingest of user-owned Anki decks into the SnapOrtho educational graph.
-- SnapOrtho owns canonical metadata and review state; Anki remains the scheduler.
-- ============================================================================

create table if not exists public.anki_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.external_sources(id) on delete restrict,
  file_name text not null,
  file_type text not null,
  file_sha256 text not null,
  importer_version text not null default 'v1',
  import_mode text not null default 'apply',
  status text not null default 'completed',
  warnings jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_import_batches_file_type_check
    check (file_type in ('apkg', 'tsv')),
  constraint anki_import_batches_import_mode_check
    check (import_mode in ('dry_run', 'apply')),
  constraint anki_import_batches_status_check
    check (status in ('pending', 'completed', 'failed'))
);

comment on table public.anki_import_batches is
  'Immutable audit log for each Anki import attempt.';

create index if not exists anki_import_batches_source_created_idx
  on public.anki_import_batches (source_id, created_at desc);

create index if not exists anki_import_batches_file_hash_idx
  on public.anki_import_batches (file_sha256);

drop trigger if exists set_anki_import_batches_updated_at on public.anki_import_batches;
create trigger set_anki_import_batches_updated_at
  before update on public.anki_import_batches
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.anki_decks (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid null references public.anki_import_batches(id) on delete set null,
  source_id uuid not null references public.external_sources(id) on delete restrict,
  anki_deck_id text not null,
  parent_deck_id uuid null references public.anki_decks(id) on delete set null,
  full_name text not null,
  deck_name text not null,
  deck_path text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_decks_source_deck_unique unique (source_id, anki_deck_id),
  constraint anki_decks_source_full_name_unique unique (source_id, full_name)
);

comment on table public.anki_decks is
  'Imported Anki deck hierarchy preserving source-native deck identity.';

create index if not exists anki_decks_parent_idx
  on public.anki_decks (parent_deck_id, deck_name);

create index if not exists anki_decks_source_name_idx
  on public.anki_decks (source_id, full_name);

drop trigger if exists set_anki_decks_updated_at on public.anki_decks;
create trigger set_anki_decks_updated_at
  before update on public.anki_decks
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.anki_note_models (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid null references public.anki_import_batches(id) on delete set null,
  source_id uuid not null references public.external_sources(id) on delete restrict,
  anki_model_id text not null,
  model_name text not null,
  field_names text[] not null default '{}'::text[],
  templates jsonb not null default '[]'::jsonb,
  css text null,
  latex_pre text null,
  latex_post text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_note_models_source_model_unique unique (source_id, anki_model_id)
);

comment on table public.anki_note_models is
  'Imported Anki note types and field definitions.';

create index if not exists anki_note_models_source_name_idx
  on public.anki_note_models (source_id, model_name);

drop trigger if exists set_anki_note_models_updated_at on public.anki_note_models;
create trigger set_anki_note_models_updated_at
  before update on public.anki_note_models
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.anki_notes (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid null references public.anki_import_batches(id) on delete set null,
  source_id uuid not null references public.external_sources(id) on delete restrict,
  note_model_id uuid null references public.anki_note_models(id) on delete set null,
  primary_deck_id uuid null references public.anki_decks(id) on delete set null,
  source_note_key text not null,
  anki_note_id text null,
  anki_note_guid text null,
  sort_field text null,
  tags_raw text null,
  field_values jsonb not null default '[]'::jsonb,
  field_name_map jsonb not null default '{}'::jsonb,
  raw_html jsonb not null default '{}'::jsonb,
  source_content_hash text not null,
  note_identity_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_notes_source_note_key_unique unique (source_id, source_note_key)
);

comment on table public.anki_notes is
  'Imported Anki notes with source fields preserved exactly as user-owned learning content.';
comment on column public.anki_notes.source_note_key is
  'Stable importer key. Native APKG imports use the real Anki note ID; TSV fallback uses a deterministic synthetic key.';

create index if not exists anki_notes_source_guid_idx
  on public.anki_notes (source_id, anki_note_guid);

create index if not exists anki_notes_model_idx
  on public.anki_notes (note_model_id, primary_deck_id);

create index if not exists anki_notes_content_hash_idx
  on public.anki_notes (source_content_hash);

drop trigger if exists set_anki_notes_updated_at on public.anki_notes;
create trigger set_anki_notes_updated_at
  before update on public.anki_notes
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.anki_cards (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid null references public.anki_import_batches(id) on delete set null,
  source_id uuid not null references public.external_sources(id) on delete restrict,
  note_id uuid not null references public.anki_notes(id) on delete cascade,
  deck_id uuid null references public.anki_decks(id) on delete set null,
  source_card_key text not null,
  anki_card_id text null,
  card_ord integer not null default 0,
  card_type integer null,
  queue integer null,
  due integer null,
  interval integer null,
  ease_factor integer null,
  reps integer null,
  lapses integer null,
  left_count integer null,
  original_due integer null,
  original_deck_id text null,
  flags integer null,
  scheduling_data text null,
  source_content_hash text not null,
  scheduling_hash text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_cards_source_card_key_unique unique (source_id, source_card_key)
);

comment on table public.anki_cards is
  'Imported Anki cards. Scheduling columns are copied read-only so SnapOrtho can inspect but not own review state.';
comment on column public.anki_cards.source_card_key is
  'Stable importer key. Native APKG imports use the real Anki card ID; TSV fallback uses a deterministic synthetic key.';

create index if not exists anki_cards_note_idx
  on public.anki_cards (note_id, card_ord);

create index if not exists anki_cards_deck_idx
  on public.anki_cards (deck_id, queue, due);

create index if not exists anki_cards_content_hash_idx
  on public.anki_cards (source_content_hash);

drop trigger if exists set_anki_cards_updated_at on public.anki_cards;
create trigger set_anki_cards_updated_at
  before update on public.anki_cards
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.anki_tags (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid null references public.anki_import_batches(id) on delete set null,
  source_id uuid not null references public.external_sources(id) on delete restrict,
  raw_name text not null,
  slug text not null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_tags_source_raw_name_unique unique (source_id, raw_name),
  constraint anki_tags_source_slug_unique unique (source_id, slug)
);

comment on table public.anki_tags is
  'Source-native Anki tags preserved separately from canonical SnapOrtho tags.';

create index if not exists anki_tags_source_slug_idx
  on public.anki_tags (source_id, slug);

drop trigger if exists set_anki_tags_updated_at on public.anki_tags;
create trigger set_anki_tags_updated_at
  before update on public.anki_tags
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.anki_note_tags (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.anki_notes(id) on delete cascade,
  tag_id uuid not null references public.anki_tags(id) on delete cascade,
  import_batch_id uuid null references public.anki_import_batches(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_note_tags_note_tag_unique unique (note_id, tag_id)
);

comment on table public.anki_note_tags is
  'Join table preserving source-native Anki tags on imported notes.';

create index if not exists anki_note_tags_tag_idx
  on public.anki_note_tags (tag_id, note_id);

drop trigger if exists set_anki_note_tags_updated_at on public.anki_note_tags;
create trigger set_anki_note_tags_updated_at
  before update on public.anki_note_tags
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.anki_media_refs (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid null references public.anki_import_batches(id) on delete set null,
  note_id uuid not null references public.anki_notes(id) on delete cascade,
  card_id uuid null references public.anki_cards(id) on delete cascade,
  field_name text not null,
  media_kind text not null,
  media_src text not null,
  package_entry_name text null,
  media_sha256 text null,
  exists_in_package boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_media_refs_kind_check
    check (media_kind in ('image', 'audio', 'other')),
  constraint anki_media_refs_note_field_src_unique
    unique (note_id, field_name, media_src)
);

comment on table public.anki_media_refs is
  'Resolved media references extracted from imported Anki HTML fields.';

create index if not exists anki_media_refs_note_idx
  on public.anki_media_refs (note_id, media_kind);

drop trigger if exists set_anki_media_refs_updated_at on public.anki_media_refs;
create trigger set_anki_media_refs_updated_at
  before update on public.anki_media_refs
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.canonical_cards (
  id uuid primary key default gen_random_uuid(),
  anki_note_id uuid not null references public.anki_notes(id) on delete restrict,
  anki_card_id uuid not null references public.anki_cards(id) on delete restrict,
  current_version_id uuid null,
  current_version_number integer not null default 1,
  canonical_status text not null default 'imported',
  title text null,
  source_content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_cards_anki_card_unique unique (anki_card_id),
  constraint canonical_cards_status_check
    check (
      canonical_status in (
        'imported',
        'draft',
        'reviewed',
        'approved',
        'archived'
      )
    )
);

comment on table public.canonical_cards is
  'SnapOrtho-owned canonical card registry anchored to imported Anki cards.';

create index if not exists canonical_cards_note_idx
  on public.canonical_cards (anki_note_id);

create index if not exists canonical_cards_status_idx
  on public.canonical_cards (canonical_status, current_version_number);

drop trigger if exists set_canonical_cards_updated_at on public.canonical_cards;
create trigger set_canonical_cards_updated_at
  before update on public.canonical_cards
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.canonical_card_versions (
  id uuid primary key default gen_random_uuid(),
  canonical_card_id uuid not null references public.canonical_cards(id) on delete cascade,
  version_number integer not null,
  source_note_id uuid null references public.anki_notes(id) on delete set null,
  source_card_id uuid null references public.anki_cards(id) on delete set null,
  content_hash text not null,
  field_snapshot jsonb not null default '[]'::jsonb,
  raw_html_snapshot jsonb not null default '{}'::jsonb,
  tag_snapshot text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_card_versions_number_unique unique (canonical_card_id, version_number),
  constraint canonical_card_versions_hash_unique unique (canonical_card_id, content_hash)
);

comment on table public.canonical_card_versions is
  'Non-destructive version log for canonical card content imported from Anki or later editorial review.';

create index if not exists canonical_card_versions_hash_idx
  on public.canonical_card_versions (content_hash);

drop trigger if exists set_canonical_card_versions_updated_at on public.canonical_card_versions;
create trigger set_canonical_card_versions_updated_at
  before update on public.canonical_card_versions
  for each row
  execute function public.tg_set_updated_at();

alter table public.canonical_cards
  drop constraint if exists canonical_cards_current_version_fk;

alter table public.canonical_cards
  add constraint canonical_cards_current_version_fk
    foreign key (current_version_id)
    references public.canonical_card_versions(id)
    on delete set null;

create table if not exists public.card_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  canonical_card_id uuid not null references public.canonical_cards(id) on delete cascade,
  import_batch_id uuid null references public.anki_import_batches(id) on delete set null,
  review_status text not null default 'unreviewed',
  is_current boolean not null default true,
  clarity smallint null check (clarity between 1 and 5),
  atomicity smallint null check (atomicity between 1 and 5),
  cloze_quality smallint null check (cloze_quality between 1 and 5),
  factual_accuracy smallint null check (factual_accuracy between 1 and 5),
  source_support smallint null check (source_support between 1 and 5),
  high_yield_value smallint null check (high_yield_value between 1 and 5),
  exam_relevance smallint null check (exam_relevance between 1 and 5),
  clinical_relevance smallint null check (clinical_relevance between 1 and 5),
  suggested_training_level text null,
  min_training_level text null,
  max_training_level text null,
  level_confidence numeric(4,3) null check (level_confidence >= 0 and level_confidence <= 1),
  level_rationale text null,
  is_core_knowledge boolean null,
  is_rotation_level boolean null,
  is_oite_level boolean null,
  is_boards_level boolean null,
  is_attending_nuance boolean null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_quality_reviews_status_check
    check (
      review_status in (
        'unreviewed',
        'in_review',
        'reviewed',
        'approved',
        'rejected'
      )
    ),
  constraint card_quality_reviews_training_level_check
    check (
      suggested_training_level is null
      or suggested_training_level in ('M3', 'M4', 'PGY1', 'PGY2', 'PGY3', 'PGY4', 'PGY5', 'Fellow', 'Attending')
    ),
  constraint card_quality_reviews_min_training_level_check
    check (
      min_training_level is null
      or min_training_level in ('M3', 'M4', 'PGY1', 'PGY2', 'PGY3', 'PGY4', 'PGY5', 'Fellow', 'Attending')
    ),
  constraint card_quality_reviews_max_training_level_check
    check (
      max_training_level is null
      or max_training_level in ('M3', 'M4', 'PGY1', 'PGY2', 'PGY3', 'PGY4', 'PGY5', 'Fellow', 'Attending')
    )
);

comment on table public.card_quality_reviews is
  'Structured review queue for card quality, educational value, and training-level appropriateness.';

create unique index if not exists card_quality_reviews_current_unique_idx
  on public.card_quality_reviews (canonical_card_id)
  where is_current = true;

create index if not exists card_quality_reviews_status_idx
  on public.card_quality_reviews (review_status, is_current, created_at desc);

drop trigger if exists set_card_quality_reviews_updated_at on public.card_quality_reviews;
create trigger set_card_quality_reviews_updated_at
  before update on public.card_quality_reviews
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.card_training_level_links (
  id uuid primary key default gen_random_uuid(),
  canonical_card_id uuid not null references public.canonical_cards(id) on delete cascade,
  training_level text not null,
  relevance_score numeric(4,3) not null default 0.000
    check (relevance_score >= 0 and relevance_score <= 1),
  level_role text not null default 'secondary',
  reviewer_status text not null default 'unreviewed',
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_training_level_links_training_level_check
    check (
      training_level in ('M3', 'M4', 'PGY1', 'PGY2', 'PGY3', 'PGY4', 'PGY5', 'Fellow', 'Attending')
    ),
  constraint card_training_level_links_role_check
    check (level_role in ('primary', 'secondary', 'stretch')),
  constraint card_training_level_links_status_check
    check (reviewer_status in ('unreviewed', 'in_review', 'approved', 'rejected')),
  constraint card_training_level_links_card_level_unique
    unique (canonical_card_id, training_level)
);

comment on table public.card_training_level_links is
  'Reviewed or proposed training-level relevance links for canonical cards.';

create index if not exists card_training_level_links_level_idx
  on public.card_training_level_links (training_level, reviewer_status, relevance_score desc);

drop trigger if exists set_card_training_level_links_updated_at on public.card_training_level_links;
create trigger set_card_training_level_links_updated_at
  before update on public.card_training_level_links
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.card_knowledge_links (
  id uuid primary key default gen_random_uuid(),
  canonical_card_id uuid not null references public.canonical_cards(id) on delete cascade,
  specialty_id uuid null references public.specialties(id) on delete set null,
  curriculum_node_id uuid null references public.curriculum_nodes(id) on delete set null,
  learning_objective_id uuid null references public.learning_objectives(id) on delete set null,
  concept_id uuid null references public.concepts(id) on delete set null,
  mapping_confidence numeric(4,3) not null default 0.000
    check (mapping_confidence >= 0 and mapping_confidence <= 1),
  review_status text not null default 'unreviewed',
  link_method text not null default 'import_seed',
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_knowledge_links_status_check
    check (review_status in ('unreviewed', 'in_review', 'approved', 'rejected')),
  constraint card_knowledge_links_method_check
    check (link_method in ('import_seed', 'deterministic', 'manual', 'ai_suggestion'))
);

comment on table public.card_knowledge_links is
  'Future mapping layer from canonical cards into the SnapOrtho knowledge graph.';

create index if not exists card_knowledge_links_card_idx
  on public.card_knowledge_links (canonical_card_id, is_primary, mapping_confidence desc);

create index if not exists card_knowledge_links_curriculum_idx
  on public.card_knowledge_links (curriculum_node_id, review_status, mapping_confidence desc);

drop trigger if exists set_card_knowledge_links_updated_at on public.card_knowledge_links;
create trigger set_card_knowledge_links_updated_at
  before update on public.card_knowledge_links
  for each row
  execute function public.tg_set_updated_at();

insert into public.external_sources (
  slug,
  name,
  source_type,
  description,
  comments,
  is_active
)
values (
  'anki',
  'Anki',
  'flashcard_deck',
  'User-owned spaced-repetition deck imported into SnapOrtho as a read-only source.',
  'SnapOrtho may map and review imported card metadata, but does not own Anki scheduling state.',
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  source_type = excluded.source_type,
  description = excluded.description,
  comments = excluded.comments,
  is_active = excluded.is_active,
  updated_at = now();
