-- Google Ads Customer Match audience exports for SnapOrtho.
-- Run only from Supabase SQL editor or another trusted admin/service-role context.
-- These queries intentionally export only identity/contact fields:
-- email, optional first_name, optional last_name, optional country, optional zip.
-- Do not add passwords, auth tokens, clinical/medical data, PHI, or Stripe IDs.

-- Audience 1: All Registered Users
select distinct on (lower(trim(u.email)))
  lower(trim(u.email)) as email,
  nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), '') as first_name,
  nullif(regexp_replace(trim(coalesce(p.full_name, '')), '^\S+\s*', ''), '') as last_name,
  nullif(trim(p.country), '') as country,
  null::text as zip
from auth.users u
left join public.user_profiles p on p.user_id = u.id
where u.email is not null
  and trim(u.email) <> ''
order by lower(trim(u.email)), u.created_at desc;

-- Audience 2: Active Subscribers
with active_subscribers as (
  select distinct s.user_id
  from public.subscriptions s
  where s.status in ('active', 'trialing', 'past_due')
    and (s.current_period_end is null or s.current_period_end >= now())
)
select distinct on (lower(trim(u.email)))
  lower(trim(u.email)) as email,
  nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), '') as first_name,
  nullif(regexp_replace(trim(coalesce(p.full_name, '')), '^\S+\s*', ''), '') as last_name,
  nullif(trim(p.country), '') as country,
  null::text as zip
from active_subscribers a
join auth.users u on u.id = a.user_id
left join public.user_profiles p on p.user_id = u.id
where u.email is not null
  and trim(u.email) <> ''
order by lower(trim(u.email)), u.created_at desc;

-- Audience 3: Free Users / Non-subscribers
with active_subscribers as (
  select distinct s.user_id
  from public.subscriptions s
  where s.status in ('active', 'trialing', 'past_due')
    and (s.current_period_end is null or s.current_period_end >= now())
)
select distinct on (lower(trim(u.email)))
  lower(trim(u.email)) as email,
  nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), '') as first_name,
  nullif(regexp_replace(trim(coalesce(p.full_name, '')), '^\S+\s*', ''), '') as last_name,
  nullif(trim(p.country), '') as country,
  null::text as zip
from auth.users u
left join active_subscribers a on a.user_id = u.id
left join public.user_profiles p on p.user_id = u.id
where a.user_id is null
  and u.email is not null
  and trim(u.email) <> ''
order by lower(trim(u.email)), u.created_at desc;
