alter table if exists public.brobot_reading_resources
  add column if not exists citation_count integer,
  add column if not exists citation_source text,
  add column if not exists citation_checked_at timestamptz;

create index if not exists brobot_reading_resources_citation_checked_at_idx
  on public.brobot_reading_resources (citation_checked_at);
