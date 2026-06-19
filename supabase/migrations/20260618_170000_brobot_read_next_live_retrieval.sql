-- ============================================================================
-- BroBot Read Next live retrieval support
-- Adds cache/origin metadata for verified PubMed and trusted-web retrieval.
-- ============================================================================

alter table public.brobot_reading_resources
  add column if not exists source_origin text not null default 'curated',
  add column if not exists verified_at timestamptz null,
  add column if not exists verification_status text not null default 'verified',
  add column if not exists citation_metadata jsonb not null default '{}'::jsonb,
  add column if not exists retrieval_query text null,
  add column if not exists topic_key text null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.brobot_reading_resources'::regclass
      and conname = 'brobot_reading_resources_type_check'
  ) then
    alter table public.brobot_reading_resources
      drop constraint brobot_reading_resources_type_check;
  end if;

  alter table public.brobot_reading_resources
    add constraint brobot_reading_resources_type_check
    check (resource_type in (
      'pubmed_article',
      'landmark_paper',
      'review_article',
      'guideline',
      'society_resource',
      'technique_article',
      'visual_resource',
      'textbook_reference',
      'systematic_review',
      'trial',
      'educational_website'
    ));

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.brobot_reading_resources'::regclass
      and conname = 'brobot_reading_resources_source_origin_check'
  ) then
    alter table public.brobot_reading_resources
      add constraint brobot_reading_resources_source_origin_check
      check (source_origin in ('curated', 'pubmed_live', 'trusted_web_live', 'cached_live'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.brobot_reading_resources'::regclass
      and conname = 'brobot_reading_resources_verification_status_check'
  ) then
    alter table public.brobot_reading_resources
      add constraint brobot_reading_resources_verification_status_check
      check (verification_status in ('verified', 'failed', 'stale'));
  end if;
end;
$$;

create index if not exists brobot_reading_resources_topic_origin_idx
  on public.brobot_reading_resources (topic_key, source_origin, verified_at desc);

create table if not exists public.brobot_reading_recommendation_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  topic_key text not null,
  display_topic text not null,
  mode text not null,
  training_level text not null,
  source_origin text not null,
  generated_from text not null,
  retrieval_query text null,
  resources jsonb not null default '[]'::jsonb,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brobot_reading_cache_generated_from_check
    check (generated_from in ('curated', 'live', 'hybrid', 'cached')),
  constraint brobot_reading_cache_source_origin_check
    check (source_origin in ('curated', 'pubmed_live', 'trusted_web_live', 'cached_live', 'hybrid'))
);

create index if not exists brobot_reading_cache_lookup_idx
  on public.brobot_reading_recommendation_cache (cache_key, verified_at desc);

create index if not exists brobot_reading_cache_topic_mode_idx
  on public.brobot_reading_recommendation_cache (topic_key, mode, training_level, verified_at desc);

create or replace function public.set_brobot_reading_recommendation_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_brobot_reading_recommendation_cache_updated_at
  on public.brobot_reading_recommendation_cache;

create trigger set_brobot_reading_recommendation_cache_updated_at
  before update on public.brobot_reading_recommendation_cache
  for each row
  execute function public.set_brobot_reading_recommendation_cache_updated_at();

alter table public.brobot_reading_recommendation_cache enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_reading_recommendation_cache'
      and policyname = 'Authenticated users can read reading recommendation cache'
  ) then
    create policy "Authenticated users can read reading recommendation cache"
      on public.brobot_reading_recommendation_cache
      for select
      using (auth.role() = 'authenticated');
  end if;
end;
$$;

notify pgrst, 'reload schema';

