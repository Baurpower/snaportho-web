-- ============================================================================
-- Anki feedback email: activation cutoff (backlog exclusion).
--
-- ACTIVATION CUTOFF (UTC): 2026-09-27T22:55:00+00
--   Captured from production now() at activation time.
--
-- Rule: only users whose FIRST successful device link
-- (min brobot_anki_device_links.exchanged_at) is ON OR AFTER the cutoff can
-- ever become eligible. Users who linked before activation are permanently
-- outside the eligibility window; no fake sent-records are created for them.
--
-- The cutoff lives in public.anki_feedback_email_config so it is
-- database-controlled, survives deploys, and never moves. The claim RPC
-- enforces it in BOTH the ensure step (no new rows for old users) and the
-- claim step (pre-existing pending rows for old users are never claimed).
-- If the config row is ever missing, the gate fails closed (NULL comparison
-- matches nothing).
-- ============================================================================

create table if not exists public.anki_feedback_email_config (
  key text primary key,
  value timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.anki_feedback_email_config is
  'Backend-only config for the 24h Anki feedback email. activation_cutoff is immutable history: first links before it never qualify.';

alter table public.anki_feedback_email_config enable row level security;

revoke all on table public.anki_feedback_email_config from anon, authenticated;
-- Supabase default privileges grant service_role more than needed on new
-- tables; the cutoff is read-only for every runtime consumer (the claim RPC
-- runs as definer and bypasses grants entirely).
revoke all on table public.anki_feedback_email_config from service_role;
grant select on table public.anki_feedback_email_config to service_role;

-- Immutable one-time fact: do not change. ON CONFLICT DO NOTHING keeps
-- re-runs from moving the cutoff.
insert into public.anki_feedback_email_config as c (key, value)
values ('activation_cutoff', '2026-09-27T22:55:00+00'::timestamptz)
on conflict (key) do nothing;

-- ============================================================================
-- claim_anki_feedback_batch: same signature, plus the activation-cutoff gate.
-- ============================================================================

drop function if exists public.claim_anki_feedback_batch(integer, boolean, uuid[]);

create function public.claim_anki_feedback_batch(
  batch_limit integer default 25,
  dry_run boolean default false,
  p_user_ids uuid[] default null
)
returns table (
  id uuid,
  user_id uuid,
  device_linked_at timestamptz,
  scheduled_for timestamptz,
  sent_at timestamptz,
  resend_email_id text,
  status text,
  attempt_count integer,
  profile_email text,
  auth_email text,
  full_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_limit integer := greatest(1, least(coalesce(batch_limit, 25), 100));
  cutoff timestamptz;
begin
  -- NULL cutoff fails closed: no user qualifies.
  select c.value into cutoff
  from public.anki_feedback_email_config as c
  where c.key = 'activation_cutoff';

  -- Always ensure tracking rows (idempotent); dry_run skips only the claim.
  -- Only first links on/after the cutoff enter the pipeline.
  insert into public.anki_feedback_emails as f
    (user_id, device_linked_at, scheduled_for, status)
  select
    l.user_id,
    min(l.exchanged_at),
    min(l.exchanged_at) + interval '24 hours',
    'pending'
  from public.brobot_anki_device_links as l
  where l.exchanged_at is not null
    and (p_user_ids is null or l.user_id = any(p_user_ids))
  group by l.user_id
  having min(l.exchanged_at) >= cutoff
  -- NOTE: ON CONSTRAINT (not ON CONFLICT (user_id)) because user_id is also
  -- an OUT parameter name; the bare column form is ambiguous in PL/pgSQL.
  on conflict on constraint anki_feedback_emails_user_id_key do nothing;

  if coalesce(dry_run, false) then
    return query
    select
      f.id,
      f.user_id,
      f.device_linked_at,
      f.scheduled_for,
      f.sent_at,
      f.resend_email_id,
      f.status,
      f.attempt_count,
      p.email::text,
      u.email::text,
      p.full_name::text
    from public.anki_feedback_emails as f
    left join public.user_profiles as p on p.user_id = f.user_id
    left join auth.users as u on u.id = f.user_id
    where f.scheduled_for <= now()
      and f.device_linked_at >= cutoff
      and (p_user_ids is null or f.user_id = any(p_user_ids))
      and (
        f.status in ('pending', 'failed')
        or (f.status = 'processing' and f.updated_at < now() - interval '30 minutes')
      )
    order by f.scheduled_for asc
    limit safe_limit;
    return;
  end if;

  return query
  with claimed as (
    update public.anki_feedback_emails as f
    set status = 'processing',
        attempt_count = f.attempt_count + 1,
        updated_at = now()
    where f.id in (
      select inner_f.id
      from public.anki_feedback_emails as inner_f
      where inner_f.scheduled_for <= now()
        and inner_f.device_linked_at >= cutoff
        and (p_user_ids is null or inner_f.user_id = any(p_user_ids))
        and (
          inner_f.status in ('pending', 'failed')
          or (inner_f.status = 'processing' and inner_f.updated_at < now() - interval '30 minutes')
        )
      order by inner_f.scheduled_for asc
      limit safe_limit
      for update skip locked
    )
    returning f.id
  )
  select
    f.id,
    f.user_id,
    f.device_linked_at,
    f.scheduled_for,
    f.sent_at,
    f.resend_email_id,
    f.status,
    f.attempt_count,
    p.email::text,
    u.email::text,
    p.full_name::text
  from claimed as c
  join public.anki_feedback_emails as f on f.id = c.id
  left join public.user_profiles as p on p.user_id = f.user_id
  left join auth.users as u on u.id = f.user_id;
end
$$;

revoke all on function public.claim_anki_feedback_batch(integer, boolean, uuid[]) from public;
revoke all on function public.claim_anki_feedback_batch(integer, boolean, uuid[]) from anon, authenticated;
grant execute on function public.claim_anki_feedback_batch(integer, boolean, uuid[]) to service_role;

comment on function public.claim_anki_feedback_batch(integer, boolean, uuid[]) is
  'Ensure + atomically claim due Anki 24h feedback-email rows. Only first links on/after activation_cutoff qualify; p_user_ids scopes manual runs.';
