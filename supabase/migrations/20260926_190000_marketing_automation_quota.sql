-- Shared atomic quota for marketing campaigns only. Transactional lifecycle
-- messages have campaign_key = NULL and are intentionally outside this cap.

create table if not exists public.marketing_email_batches (
  id uuid primary key,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed'))
);

alter table public.lifecycle_emails
  add column if not exists automation_batch_id uuid
    references public.marketing_email_batches(id) on delete set null;

alter table public.marketing_email_batches enable row level security;
revoke all on table public.marketing_email_batches from public, anon, authenticated, service_role;

create or replace function public.reserve_marketing_email_delivery(
  p_user_id uuid,
  p_email text,
  p_campaign_key text,
  p_campaign_step text,
  p_topic text,
  p_template_version text,
  p_metadata jsonb,
  p_batch_id uuid
)
returns table(reservation_status text, delivery_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_day_start timestamptz;
  daily_count integer;
  same_day_count integer;
  reserved_id uuid;
begin
  if p_user_id is null or p_email is null or p_campaign_key is null
     or p_campaign_step is null or p_topic is null or p_template_version is null then
    raise exception 'Required marketing reservation fields are missing';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('snaportho-marketing-daily-cap'));
  if p_batch_id is null or not exists (
    select 1 from public.marketing_email_batches where id = p_batch_id and status = 'running'
  ) then
    raise exception 'Marketing delivery requires an active batch reservation';
  end if;
  local_day_start := ((now() at time zone 'America/Los_Angeles')::date::timestamp
    at time zone 'America/Los_Angeles');

  select count(*) into daily_count
  from public.lifecycle_emails
  where campaign_key is not null and sent_at >= local_day_start;

  if daily_count >= 50 then
    return query select 'daily_cap'::text, null::uuid;
    return;
  end if;

  select count(*) into same_day_count
  from public.lifecycle_emails
  where user_id = p_user_id and campaign_key is not null and sent_at >= local_day_start;

  if same_day_count > 0 then
    return query select 'already_sent_today'::text, null::uuid;
    return;
  end if;

  begin
    insert into public.lifecycle_emails (
      user_id, email, kind, campaign_key, campaign_step, topic, template_version,
      send_status, metadata, automation_batch_id
    ) values (
      p_user_id, p_email, p_campaign_key, p_campaign_step, p_topic, p_template_version,
      'sending', coalesce(p_metadata, '{}'::jsonb), p_batch_id
    )
    returning id into reserved_id;
  exception when unique_violation then
    return query select 'duplicate'::text, null::uuid;
    return;
  end;

  return query select 'reserved'::text, reserved_id;
end
$$;

revoke all on function public.reserve_marketing_email_delivery(uuid, text, text, text, text, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_marketing_email_delivery(uuid, text, text, text, text, text, jsonb, uuid)
  to service_role;

comment on function public.reserve_marketing_email_delivery(uuid, text, text, text, text, text, jsonb, uuid) is
  'Atomically reserves one marketing delivery under a shared 50/day America/Los_Angeles cap and one recipient/day limit.';

create or replace function public.claim_marketing_email_batch(p_batch_id uuid)
returns table(batch_status text, last_sent_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_sent_at timestamptz;
begin
  if p_batch_id is null then
    raise exception 'Batch id is required';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('snaportho-marketing-daily-cap'));
  if exists (select 1 from public.marketing_email_batches where status = 'running') then
    return query select 'batch_in_progress'::text, null::timestamptz;
    return;
  end if;
  select max(sent_at) into latest_sent_at
  from public.lifecycle_emails
  where campaign_key is not null;
  if latest_sent_at is not null and latest_sent_at > now() - interval '24 hours' then
    return query select 'minimum_interval'::text, latest_sent_at;
    return;
  end if;
  insert into public.marketing_email_batches (id) values (p_batch_id);
  return query select 'started'::text, latest_sent_at;
end
$$;

create or replace function public.complete_marketing_email_batch(p_batch_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('completed', 'failed') then
    raise exception 'Invalid marketing batch status';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('snaportho-marketing-daily-cap'));
  update public.marketing_email_batches
  set status = p_status, completed_at = now()
  where id = p_batch_id and status = 'running';
  if not found then
    raise exception 'Active marketing batch not found';
  end if;
end
$$;

revoke all on function public.claim_marketing_email_batch(uuid) from public, anon, authenticated;
revoke all on function public.complete_marketing_email_batch(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_marketing_email_batch(uuid) to service_role;
grant execute on function public.complete_marketing_email_batch(uuid, text) to service_role;

comment on function public.claim_marketing_email_batch(uuid) is
  'Claims one exclusive marketing batch, requiring at least 24 hours since the last reserved marketing sent_at.';
