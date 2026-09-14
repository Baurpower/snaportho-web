-- First-party SnapOrtho for Anki download and usage analytics.
-- Reuses public.product_events. Never store card text, review logs, or personal notes.

begin;

create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;
grant usage on schema analytics to service_role;

create unique index if not exists product_events_anki_first_download_user_uidx
  on public.product_events (user_id)
  where event_name = 'anki_addon_first_downloaded' and user_id is not null;

create unique index if not exists product_events_anki_opened_user_day_uidx
  on public.product_events (user_id, ((occurred_at at time zone 'utc')::date))
  where event_name = 'anki_addon_opened' and user_id is not null;

alter table public.brobot_anki_addon_devices
  add column if not exists device_token_id uuid null
    references public.brobot_anki_device_tokens(id) on delete set null;

create unique index if not exists brobot_anki_addon_devices_token_uidx
  on public.brobot_anki_addon_devices (device_token_id)
  where device_token_id is not null;

create or replace view analytics.anki_daily_funnel
with (security_invoker = true) as
select
  date_trunc('day', occurred_at) as day,
  count(*) filter (where event_name = 'anki_landing_viewed') as landing_views,
  count(*) filter (where event_name = 'anki_addon_downloaded') as downloads,
  count(*) filter (where event_name = 'anki_addon_first_downloaded') as first_downloads,
  count(*) filter (where event_name = 'anki_device_linked') as device_links,
  count(*) filter (where event_name = 'anki_deck_imported') as deck_imports,
  count(*) filter (where event_name = 'anki_addon_opened') as opens,
  count(*) filter (where event_name = 'anki_brobot_prompt_used') as brobot_prompts,
  count(*) filter (where event_name = 'anki_deck_update_applied') as deck_updates,
  count(*) filter (where event_name = 'anki_setup_failed') as setup_failures,
  count(distinct coalesce(user_id::text, anonymous_id)) as unique_people
from public.product_events
where product_area = 'anki'
group by 1;

create or replace view analytics.anki_daily_active
with (security_invoker = true) as
select
  date_trunc('day', occurred_at) as day,
  count(distinct user_id) filter (where event_name = 'anki_addon_opened') as opened_people,
  count(distinct user_id) filter (where event_name = 'anki_brobot_prompt_used') as brobot_people,
  count(distinct user_id) filter (where event_name = 'anki_deck_update_applied') as update_people
from public.product_events
where product_area = 'anki'
  and event_name in ('anki_addon_opened', 'anki_brobot_prompt_used', 'anki_deck_update_applied')
  and user_id is not null
group by 1;

create or replace view analytics.anki_linked_devices
with (security_invoker = true) as
select
  count(*) filter (where revoked_at is null) as linked_devices,
  count(distinct user_id) filter (where revoked_at is null) as linked_users,
  count(distinct user_id) filter (
    where revoked_at is null and last_used_at >= now() - interval '1 day'
  ) as active_users_1d,
  count(distinct user_id) filter (
    where revoked_at is null and last_used_at >= now() - interval '7 day'
  ) as active_users_7d,
  count(distinct user_id) filter (
    where revoked_at is null and last_used_at >= now() - interval '30 day'
  ) as active_users_30d
from public.brobot_anki_device_tokens;

create or replace view analytics.anki_activation
with (security_invoker = true) as
with first_downloads as (
  select user_id, min(occurred_at) as first_at
  from public.product_events
  where event_name = 'anki_addon_first_downloaded' and user_id is not null
  group by user_id
), links as (
  select user_id, min(occurred_at) as linked_at
  from public.product_events
  where event_name = 'anki_device_linked' and user_id is not null
  group by user_id
)
select
  (select count(*) from first_downloads) as unique_downloaders,
  (select count(*) from links) as unique_linked_users,
  count(*) filter (where l.linked_at is not null) as activated,
  count(*) filter (
    where l.linked_at is not null and l.linked_at <= d.first_at + interval '7 days'
  ) as activated_within_7d
from first_downloads d
left join links l on l.user_id = d.user_id;

create or replace view analytics.anki_retention_cohorts
with (security_invoker = true) as
with activity as (
  select distinct
    user_id::text as person_id,
    occurred_at::date as activity_date
  from public.product_events
  where product_area = 'anki'
    and event_name in ('anki_addon_opened', 'anki_brobot_prompt_used', 'anki_deck_update_applied')
    and user_id is not null
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

revoke all on analytics.anki_daily_funnel from public, anon, authenticated;
revoke all on analytics.anki_daily_active from public, anon, authenticated;
revoke all on analytics.anki_linked_devices from public, anon, authenticated;
revoke all on analytics.anki_activation from public, anon, authenticated;
revoke all on analytics.anki_retention_cohorts from public, anon, authenticated;
grant select on analytics.anki_daily_funnel to service_role;
grant select on analytics.anki_daily_active to service_role;
grant select on analytics.anki_linked_devices to service_role;
grant select on analytics.anki_activation to service_role;
grant select on analytics.anki_retention_cohorts to service_role;

comment on view analytics.anki_daily_funnel is
  'Daily SnapOrtho for Anki funnel from product_events. No card content.';
comment on view analytics.anki_daily_active is
  'Daily active Anki add-on users from heartbeats and feature events.';
comment on view analytics.anki_linked_devices is
  'Current linked Anki devices and last_used_at activity windows.';
comment on view analytics.anki_activation is
  'Download-to-link activation, including linked within 7 days of first download.';
comment on view analytics.anki_retention_cohorts is
  'D1/D7/D30 retention from first Anki add-on activity.';

commit;
