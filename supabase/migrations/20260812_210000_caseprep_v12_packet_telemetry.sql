create table if not exists public.caseprep_packet_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  guest_id uuid,
  packet_id text,
  caseprep_version text not null,
  canonical_slug text,
  client_surface text not null,
  coverage_status text,
  quality_gate text,
  grounded_percentage numeric(5,4),
  grounded_count integer not null default 0 check (grounded_count >= 0),
  generated_count integer not null default 0 check (generated_count >= 0),
  omitted_sections text[] not null default '{}',
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  constraint caseprep_packet_event_subject check (
    (user_id is not null and guest_id is null) or
    (user_id is null and guest_id is not null)
  ),
  constraint caseprep_packet_event_version check (caseprep_version in ('v1.2')),
  constraint caseprep_packet_event_grounded_percentage check (
    grounded_percentage is null or grounded_percentage between 0 and 1
  )
);

create index if not exists caseprep_packet_events_time_idx
  on public.caseprep_packet_events (occurred_at desc);
create index if not exists caseprep_packet_events_quality_idx
  on public.caseprep_packet_events (caseprep_version, coverage_status, quality_gate, occurred_at desc);
create index if not exists caseprep_packet_events_case_idx
  on public.caseprep_packet_events (canonical_slug, occurred_at desc)
  where canonical_slug is not null;

alter table public.caseprep_packet_events enable row level security;
alter table public.caseprep_packet_events force row level security;
revoke all on public.caseprep_packet_events from anon, authenticated, service_role;
grant select, insert on public.caseprep_packet_events to service_role;

drop policy if exists caseprep_packet_events_service_role_all on public.caseprep_packet_events;
create policy caseprep_packet_events_service_role_all
  on public.caseprep_packet_events for all to service_role
  using (true) with check (true);

comment on table public.caseprep_packet_events is
  'Privacy-minimized CasePrep packet quality telemetry. Prompts and generated clinical prose are intentionally excluded.';
