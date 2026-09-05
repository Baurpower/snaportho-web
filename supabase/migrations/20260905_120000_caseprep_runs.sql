-- Internal CasePrep quality corpus for packet-mode runs.
-- Stores the prompt and assembled packet the website actually received.
-- Service-role only: this is not user-facing history.

create table if not exists public.caseprep_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  guest_id text,
  client_platform text not null,
  client_surface text not null,
  caseprep_version text not null,
  packet_id text unique,
  prompt text not null,
  training_level text,
  outcome text not null,
  requested_case text,
  canonical_slug text,
  canonical_name text,
  coverage_status text,
  quality_gate text,
  grounded_percentage numeric(5,4),
  grounded_count integer not null default 0 check (grounded_count >= 0),
  generated_count integer not null default 0 check (generated_count >= 0),
  omitted_sections text[] not null default '{}',
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  request_id text,
  error_message text,
  packet jsonb,
  constraint caseprep_runs_subject_check check (
    (user_id is not null and guest_id is null)
    or (user_id is null and guest_id is not null)
  ),
  constraint caseprep_runs_platform_check check (
    client_platform in ('web', 'ios')
  ),
  constraint caseprep_runs_version_check check (
    caseprep_version in ('v1.1', 'v1.2', 'v1.3')
  ),
  constraint caseprep_runs_outcome_check check (
    outcome in ('complete', 'partial', 'clarification', 'error')
  ),
  constraint caseprep_runs_grounded_percentage_check check (
    grounded_percentage is null or grounded_percentage between 0 and 1
  ),
  constraint caseprep_runs_prompt_check check (length(btrim(prompt)) > 0)
);

create index if not exists caseprep_runs_created_at_idx
  on public.caseprep_runs (created_at desc);

create index if not exists caseprep_runs_platform_created_at_idx
  on public.caseprep_runs (client_platform, created_at desc);

create index if not exists caseprep_runs_slug_idx
  on public.caseprep_runs (canonical_slug, created_at desc)
  where canonical_slug is not null;

create index if not exists caseprep_runs_quality_idx
  on public.caseprep_runs (quality_gate, created_at desc)
  where quality_gate is not null;

create index if not exists caseprep_runs_outcome_idx
  on public.caseprep_runs (outcome, created_at desc);

alter table public.caseprep_runs enable row level security;
alter table public.caseprep_runs force row level security;
revoke all on public.caseprep_runs from anon, authenticated, service_role;
grant select, insert, update on public.caseprep_runs to service_role;

drop policy if exists caseprep_runs_service_role_all on public.caseprep_runs;
create policy caseprep_runs_service_role_all
  on public.caseprep_runs for all to service_role
  using (true) with check (true);

comment on table public.caseprep_runs is
  'Internal CasePrep packet corpus for quality improvement. Prompts and assembled packets are stored; not exposed to clients.';
