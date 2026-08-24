-- First-party BroBot acquisition, conversion, engagement, and CasePrep analytics.

alter table public.caseprep_packet_events
  drop constraint if exists caseprep_packet_event_version;
alter table public.caseprep_packet_events
  add constraint caseprep_packet_event_version
  check (caseprep_version in ('v1.2', 'v1.3'));

create table if not exists public.product_events (
  event_id uuid primary key,
  event_name text not null check (event_name ~ '^[a-z][a-z0-9_]{2,79}$'),
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  anonymous_id text null check (anonymous_id is null or length(anonymous_id) between 8 and 128),
  session_id text null check (session_id is null or length(session_id) between 8 and 128),
  request_id text null check (request_id is null or length(request_id) <= 128),
  surface text not null,
  product_area text not null default 'brobot',
  app_version text null,
  caseprep_version text null check (caseprep_version is null or caseprep_version in ('v1.1', 'v1.2', 'v1.3')),
  entitlement_tier text null check (entitlement_tier is null or entitlement_tier in ('guest', 'free', 'unlimited')),
  subscription_provider text null check (subscription_provider is null or subscription_provider in ('stripe', 'apple')),
  source text null,
  medium text null,
  campaign text null,
  branch_click_id text null,
  schema_version smallint not null default 1 check (schema_version > 0),
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  constraint product_events_identity_check check (user_id is not null or anonymous_id is not null)
);

create index if not exists product_events_occurred_at_idx
  on public.product_events (occurred_at desc);
create index if not exists product_events_name_time_idx
  on public.product_events (event_name, occurred_at desc);
create index if not exists product_events_user_time_idx
  on public.product_events (user_id, occurred_at desc) where user_id is not null;
create index if not exists product_events_anonymous_time_idx
  on public.product_events (anonymous_id, occurred_at desc) where anonymous_id is not null;
create index if not exists product_events_campaign_time_idx
  on public.product_events (source, medium, campaign, occurred_at desc)
  where source is not null or campaign is not null;
create unique index if not exists product_events_first_success_user_uidx
  on public.product_events (user_id) where event_name = 'brobot_first_success' and user_id is not null;
create unique index if not exists product_events_first_success_anonymous_uidx
  on public.product_events (anonymous_id) where event_name = 'brobot_first_success' and user_id is null;

alter table public.product_events enable row level security;
alter table public.product_events force row level security;
revoke all on public.product_events from public, anon, authenticated, service_role;
grant select, insert on public.product_events to service_role;

drop policy if exists product_events_service_role_all on public.product_events;
create policy product_events_service_role_all on public.product_events
  for all to service_role using (true) with check (true);

comment on table public.product_events is
  'Privacy-minimized, append-only BroBot product funnel. Never store prompts, clinical prose, email addresses, or PHI.';

create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;
grant usage on schema analytics to service_role;

create or replace view analytics.brobot_daily_traffic
with (security_invoker = true) as
select
  date_trunc('day', occurred_at) as day,
  count(*) filter (where event_name = 'brobot_landing_viewed') as landing_views,
  count(*) filter (where event_name = 'brobot_opened') as brobot_opens,
  count(*) filter (where event_name = 'brobot_pricing_viewed') as pricing_views,
  count(distinct coalesce(user_id::text, anonymous_id)) as unique_people
from public.product_events
group by 1;

create or replace view analytics.brobot_daily_funnel
with (security_invoker = true) as
select
  date_trunc('day', occurred_at) as day,
  source,
  medium,
  campaign,
  count(*) filter (where event_name = 'brobot_pricing_viewed') as pricing_views,
  count(*) filter (where event_name = 'brobot_checkout_started') as checkouts_started,
  count(*) filter (where event_name = 'brobot_trial_started') as trials_started,
  count(*) filter (where event_name = 'brobot_unlimited_activated') as unlimited_activations,
  count(*) filter (where event_name = 'brobot_first_success') as first_successes
from public.product_events
group by 1, 2, 3, 4;

create or replace view analytics.brobot_daily_usage
with (security_invoker = true) as
select
  date_trunc('day', occurred_at) as day,
  entitlement_tier,
  surface,
  count(*) filter (where event_name = 'brobot_request_completed') as successful_requests,
  count(*) filter (where event_name = 'brobot_limit_reached') as limits_reached,
  count(distinct coalesce(user_id::text, anonymous_id)) as active_people
from public.product_events
where event_name in ('brobot_request_completed', 'brobot_limit_reached')
group by 1, 2, 3;

create or replace view analytics.caseprep_v13_daily_quality
with (security_invoker = true) as
select
  date_trunc('day', occurred_at) as day,
  client_surface,
  count(*) as completions,
  percentile_cont(0.5) within group (order by latency_ms) as latency_p50_ms,
  percentile_cont(0.95) within group (order by latency_ms) as latency_p95_ms,
  avg(grounded_percentage) as avg_grounded_percentage,
  count(*) filter (where quality_gate = 'pass') as quality_gate_passes
from public.caseprep_packet_events
where caseprep_version = 'v1.3'
group by 1, 2;

create or replace view analytics.brobot_retention_cohorts
with (security_invoker = true) as
with activity as (
  select distinct
    coalesce(user_id::text, anonymous_id) as person_id,
    occurred_at::date as activity_date
  from public.product_events
  where event_name = 'brobot_request_completed'
), cohorts as (
  select person_id, min(activity_date) as cohort_date
  from activity
  group by person_id
)
select
  c.cohort_date,
  count(*) as cohort_size,
  count(*) filter (where d1.person_id is not null) as retained_d1,
  count(*) filter (where d7.person_id is not null) as retained_d7,
  count(*) filter (where d30.person_id is not null) as retained_d30
from cohorts c
left join activity d1 on d1.person_id = c.person_id and d1.activity_date = c.cohort_date + 1
left join activity d7 on d7.person_id = c.person_id and d7.activity_date = c.cohort_date + 7
left join activity d30 on d30.person_id = c.person_id and d30.activity_date = c.cohort_date + 30
group by c.cohort_date;

revoke all on all tables in schema analytics from public, anon, authenticated;
grant select on all tables in schema analytics to service_role;
