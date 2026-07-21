-- BroBot Anki operational schema: reproducible baseline + additive reconciliation.
--
-- This migration is safe for the current production shape:
--   * all six CREATE TABLE statements are IF NOT EXISTS;
--   * four study-session columns are additive;
--   * constraints and indexes are added only when absent;
--   * no rows are deleted or rewritten;
--   * direct anon/authenticated access is revoked in favor of server API routes.

begin;

create extension if not exists pgcrypto;

create table if not exists public.brobot_anki_device_links (
  id uuid primary key default gen_random_uuid(),
  link_code text not null,
  device_name text not null,
  user_id uuid null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  approved_at timestamptz null,
  exchanged_at timestamptz null,
  revoked_at timestamptz null,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint brobot_anki_device_links_link_code_key unique (link_code),
  constraint brobot_anki_device_links_status_check
    check (status in ('pending', 'approved', 'expired', 'revoked'))
);

create table if not exists public.brobot_anki_device_tokens (
  id uuid primary key default gen_random_uuid(),
  device_link_id uuid not null references public.brobot_anki_device_links(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  token_hash text not null,
  last_used_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint brobot_anki_device_tokens_device_link_id_key unique (device_link_id),
  constraint brobot_anki_device_tokens_token_hash_key unique (token_hash)
);

create table if not exists public.brobot_anki_addon_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text null,
  anki_profile_name text null,
  addon_version text null,
  last_seen_at timestamptz null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brobot_anki_prep_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  raw_case_input text not null,
  diagnosis text null,
  procedure text null,
  body_region text null,
  subspecialty text null,
  generated_summary text null,
  generated_keywords jsonb not null default '[]'::jsonb,
  generated_topics jsonb not null default '[]'::jsonb,
  suggested_tags jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  sent_to_anki_at timestamptz null default now(),
  pulled_by_addon_at timestamptz null,
  completed_at timestamptz null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brobot_anki_prep_requests_status_check
    check (status in ('pending', 'pulled_by_addon', 'deck_created', 'completed', 'failed', 'cancelled'))
);

create table if not exists public.brobot_anki_study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prep_request_id uuid not null references public.brobot_anki_prep_requests(id) on delete cascade,
  addon_device_id uuid null references public.brobot_anki_addon_devices(id) on delete set null,
  session_title text not null,
  applied_base_tag text not null default 'SnapOrtho::Tonight',
  applied_case_tag text null,
  applied_request_tag text null,
  matching_strategy text not null default 'local_keyword',
  total_cards_found integer not null default 0,
  total_cards_tagged integer not null default 0,
  max_cards integer null,
  min_match_score numeric null,
  include_cloze_siblings boolean not null default false,
  total_candidates_found integer not null default 0,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brobot_anki_study_sessions_matching_strategy_check
    check (matching_strategy in ('local_keyword', 'local_tag', 'local_hybrid')),
  constraint brobot_anki_study_sessions_status_check
    check (status in ('created', 'tagged', 'completed', 'failed')),
  constraint brobot_anki_study_sessions_counts_check
    check (
      total_cards_found >= 0 and total_cards_tagged >= 0
      and (max_cards is null or max_cards >= 0)
      and total_candidates_found >= 0
      and (min_match_score is null or min_match_score >= 0)
    )
);

create table if not exists public.brobot_anki_session_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.brobot_anki_study_sessions(id) on delete cascade,
  raw_anki_card_id bigint null,
  raw_anki_note_id bigint null,
  deck_name text null,
  card_preview text null,
  match_score numeric null,
  matched_keywords text[] not null default '{}'::text[],
  match_reason text null,
  included boolean not null default true,
  created_at timestamptz not null default now(),
  constraint brobot_anki_session_matches_score_check
    check (match_score is null or match_score >= 0)
);

-- Production predates the checked-in baseline. Add application-required fields
-- without rewriting the currently empty study-session table.
alter table public.brobot_anki_study_sessions
  add column if not exists max_cards integer null,
  add column if not exists min_match_score numeric null,
  add column if not exists include_cloze_siblings boolean not null default false,
  add column if not exists total_candidates_found integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.brobot_anki_study_sessions'::regclass
      and conname = 'brobot_anki_study_sessions_counts_check'
  ) then
    alter table public.brobot_anki_study_sessions
      add constraint brobot_anki_study_sessions_counts_check
      check (
        total_cards_found >= 0 and total_cards_tagged >= 0
        and (max_cards is null or max_cards >= 0)
        and total_candidates_found >= 0
        and (min_match_score is null or min_match_score >= 0)
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.brobot_anki_session_matches'::regclass
      and conname = 'brobot_anki_session_matches_score_check'
  ) then
    alter table public.brobot_anki_session_matches
      add constraint brobot_anki_session_matches_score_check
      check (match_score is null or match_score >= 0) not valid;
  end if;
end
$$;

create index if not exists brobot_anki_device_links_status_idx
  on public.brobot_anki_device_links (status);
create index if not exists brobot_anki_device_links_user_id_idx
  on public.brobot_anki_device_links (user_id);
create index if not exists brobot_anki_device_tokens_revoked_at_idx
  on public.brobot_anki_device_tokens (revoked_at);
create index if not exists brobot_anki_device_tokens_user_id_idx
  on public.brobot_anki_device_tokens (user_id);
create index if not exists brobot_anki_addon_devices_user_active_idx
  on public.brobot_anki_addon_devices (user_id, is_active, last_seen_at desc);
create index if not exists brobot_anki_prep_requests_user_status_idx
  on public.brobot_anki_prep_requests (user_id, status, created_at);
create index if not exists brobot_anki_study_sessions_user_created_idx
  on public.brobot_anki_study_sessions (user_id, created_at desc);
create index if not exists brobot_anki_study_sessions_prep_request_idx
  on public.brobot_anki_study_sessions (prep_request_id);
create index if not exists idx_brobot_anki_session_matches_session
  on public.brobot_anki_session_matches (session_id);
create index if not exists idx_brobot_anki_session_matches_user
  on public.brobot_anki_session_matches (user_id);

drop trigger if exists set_brobot_anki_device_links_updated_at on public.brobot_anki_device_links;
create trigger set_brobot_anki_device_links_updated_at
  before update on public.brobot_anki_device_links
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_brobot_anki_device_tokens_updated_at on public.brobot_anki_device_tokens;
create trigger set_brobot_anki_device_tokens_updated_at
  before update on public.brobot_anki_device_tokens
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_brobot_anki_addon_devices_updated_at on public.brobot_anki_addon_devices;
create trigger set_brobot_anki_addon_devices_updated_at
  before update on public.brobot_anki_addon_devices
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_brobot_anki_prep_requests_updated_at on public.brobot_anki_prep_requests;
create trigger set_brobot_anki_prep_requests_updated_at
  before update on public.brobot_anki_prep_requests
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_brobot_anki_study_sessions_updated_at on public.brobot_anki_study_sessions;
create trigger set_brobot_anki_study_sessions_updated_at
  before update on public.brobot_anki_study_sessions
  for each row execute function public.tg_set_updated_at();

alter table public.brobot_anki_device_links enable row level security;
alter table public.brobot_anki_device_links force row level security;
alter table public.brobot_anki_device_tokens enable row level security;
alter table public.brobot_anki_device_tokens force row level security;
alter table public.brobot_anki_addon_devices enable row level security;
alter table public.brobot_anki_addon_devices force row level security;
alter table public.brobot_anki_prep_requests enable row level security;
alter table public.brobot_anki_prep_requests force row level security;
alter table public.brobot_anki_study_sessions enable row level security;
alter table public.brobot_anki_study_sessions force row level security;
alter table public.brobot_anki_session_matches enable row level security;
alter table public.brobot_anki_session_matches force row level security;

revoke all on table public.brobot_anki_device_links from anon, authenticated;
revoke all on table public.brobot_anki_device_tokens from anon, authenticated;
revoke all on table public.brobot_anki_addon_devices from anon, authenticated;
revoke all on table public.brobot_anki_prep_requests from anon, authenticated;
revoke all on table public.brobot_anki_study_sessions from anon, authenticated;
revoke all on table public.brobot_anki_session_matches from anon, authenticated;

revoke all on table public.brobot_anki_device_links from service_role;
revoke all on table public.brobot_anki_device_tokens from service_role;
revoke all on table public.brobot_anki_addon_devices from service_role;
revoke all on table public.brobot_anki_prep_requests from service_role;
revoke all on table public.brobot_anki_study_sessions from service_role;
revoke all on table public.brobot_anki_session_matches from service_role;

grant select, insert, update, delete on table public.brobot_anki_device_links to service_role;
grant select, insert, update, delete on table public.brobot_anki_device_tokens to service_role;
grant select, insert, update, delete on table public.brobot_anki_addon_devices to service_role;
grant select, insert, update, delete on table public.brobot_anki_prep_requests to service_role;
grant select, insert, update, delete on table public.brobot_anki_study_sessions to service_role;
grant select, insert, update, delete on table public.brobot_anki_session_matches to service_role;

drop policy if exists brobot_anki_service_role_all on public.brobot_anki_device_links;
create policy brobot_anki_service_role_all on public.brobot_anki_device_links
  for all to service_role using (true) with check (true);
drop policy if exists brobot_anki_service_role_all on public.brobot_anki_device_tokens;
create policy brobot_anki_service_role_all on public.brobot_anki_device_tokens
  for all to service_role using (true) with check (true);
drop policy if exists brobot_anki_service_role_all on public.brobot_anki_addon_devices;
create policy brobot_anki_service_role_all on public.brobot_anki_addon_devices
  for all to service_role using (true) with check (true);
drop policy if exists brobot_anki_service_role_all on public.brobot_anki_prep_requests;
create policy brobot_anki_service_role_all on public.brobot_anki_prep_requests
  for all to service_role using (true) with check (true);
drop policy if exists brobot_anki_service_role_all on public.brobot_anki_study_sessions;
create policy brobot_anki_service_role_all on public.brobot_anki_study_sessions
  for all to service_role using (true) with check (true);
drop policy if exists brobot_anki_service_role_all on public.brobot_anki_session_matches;
create policy brobot_anki_service_role_all on public.brobot_anki_session_matches
  for all to service_role using (true) with check (true);

comment on table public.brobot_anki_device_links is
  'Short-lived pairing requests for BroBot clients. Service-route access only.';
comment on table public.brobot_anki_device_tokens is
  'Hashed linked-device credentials. Raw tokens are never persisted.';
comment on table public.brobot_anki_addon_devices is
  'Registered Anki add-on installations/profiles observed by the backend.';
comment on table public.brobot_anki_prep_requests is
  'User-owned case-prep requests polled by the Anki add-on.';
comment on table public.brobot_anki_study_sessions is
  'Local Anki matching/tagging session summaries reported by the add-on.';
comment on table public.brobot_anki_session_matches is
  'Per-session local card match metadata; not canonical educational mappings.';

commit;
