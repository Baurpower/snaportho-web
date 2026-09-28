-- ============================================================================
-- Anki 24-hour beta-feedback email: durable delivery tracking + atomic claim.
--
-- One row per user, enforced by UNIQUE(user_id). The Edge Function
-- `send-anki-feedback-emails` calls claim_anki_feedback_batch() every 15
-- minutes via Supabase Cron; the claim runs inside a single statement with
-- FOR UPDATE SKIP LOCKED so overlapping executions cannot double-send.
--
-- Source of truth for "first successful device link":
--   min(exchanged_at) over public.brobot_anki_device_links for the user,
--   where exchanged_at is set exactly when the Anki add-on exchanges an
--   approved link code for a device token (poll-link route).
--
-- All writers (this RPC + the Edge Function via the service role) set
-- updated_at explicitly, so no updated_at trigger is required.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.anki_feedback_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  device_linked_at timestamptz not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz null,
  resend_email_id text null,
  status text not null default 'pending'
    constraint anki_feedback_emails_status_check
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.anki_feedback_emails is
  'One-time 24h Anki beta-feedback email delivery log. UNIQUE(user_id) guarantees at most one send per user.';
comment on column public.anki_feedback_emails.device_linked_at is
  'Earliest exchanged_at across the user''s brobot_anki_device_links rows.';
comment on column public.anki_feedback_emails.scheduled_for is
  'device_linked_at + 24 hours; the row becomes eligible once this is past.';
comment on column public.anki_feedback_emails.resend_email_id is
  'Resend message id. When set on a processing row, the provider already accepted the send.';

create index if not exists anki_feedback_emails_claim_idx
  on public.anki_feedback_emails (scheduled_for asc, status)
  where status in ('pending', 'processing', 'failed');

alter table public.anki_feedback_emails enable row level security;

-- Backend-only table: no RLS policies, plus explicit revokes so only the
-- service role (which bypasses RLS) can read/write.
revoke all on table public.anki_feedback_emails from anon, authenticated;
grant select, insert, update, delete on table public.anki_feedback_emails to service_role;

-- ============================================================================
-- claim_anki_feedback_batch(batch_limit, dry_run, p_user_ids)
--
-- 1. Ensures one pending row per user with any exchanged device link
--    (device_linked_at = earliest exchanged_at; ON CONFLICT DO NOTHING
--    keeps this idempotent). The 24h gate is applied at claim time.
-- 2. Atomically claims up to batch_limit due rows (pending/failed, plus
--    processing rows whose 30-minute lease expired after a crash), marking
--    them processing with an incremented attempt_count.
-- 3. Returns claimed rows with the recipient address inputs (profile + auth
--    email, profile full name); the caller validates and sends.
--
-- p_user_ids scopes ensure+claim to specific users for safe manual testing.
-- NULL (the cron default) processes all due users.
--
-- With dry_run = true, tracking rows are still ensured (idempotent insert)
-- but nothing is claimed or updated; the function only reports the rows that
-- would be claimed. This keeps dry_run a faithful preview of the very first
-- live run.
-- ============================================================================

-- DROP + CREATE (not CREATE OR REPLACE): the signature gained p_user_ids.
drop function if exists public.claim_anki_feedback_batch(integer, boolean);
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
begin
  -- Always ensure tracking rows (idempotent); dry_run skips only the claim.
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
  'Ensure + atomically claim due Anki 24h feedback-email rows for the send-anki-feedback-emails Edge Function.';
