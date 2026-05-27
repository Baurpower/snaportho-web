-- ============================================================================
-- BroBot Phase 2: Fix duplicate usage row bug
--
-- Root cause: PostgreSQL treats NULL != NULL in standard UNIQUE constraints,
-- so the existing constraint  unique (user_id, guest_id, usage_date, feature)
-- does NOT prevent two rows for the same (user_id, usage_date, feature) when
-- guest_id IS NULL.  This lets concurrent upserts insert duplicate rows, and
-- any subsequent .update().single() throws PGRST116.
--
-- Fix applied in three steps:
--   1. Merge (dedup) any existing duplicate rows — sum counts, keep earliest.
--   2. Replace the broken composite constraint with two partial unique indexes
--      (one for user rows, one for guest rows).
--   3. Add an atomic increment_brobot_usage() RPC that uses ON CONFLICT
--      targeting the correct partial index — safe for concurrent callers.
-- ============================================================================

-- ── Step 1a: Merge duplicate user rows ──────────────────────────────────────
do $$
declare
  dup record;
  keep_id uuid;
  total_count integer;
begin
  for dup in
    select user_id, usage_date, feature
    from   public.user_daily_usage
    where  user_id is not null
    group  by user_id, usage_date, feature
    having count(*) > 1
  loop
    -- Earliest row becomes the canonical row
    select id, coalesce(sum(count), 0)
    into   keep_id, total_count
    from   public.user_daily_usage
    where  user_id    = dup.user_id
      and  usage_date = dup.usage_date
      and  feature    = dup.feature;

    -- keep_id is ambiguous here — re-select just the id
    select id into keep_id
    from   public.user_daily_usage
    where  user_id    = dup.user_id
      and  usage_date = dup.usage_date
      and  feature    = dup.feature
    order  by created_at asc
    limit  1;

    -- Sum counts from all duplicate rows
    select coalesce(sum(count), 0) into total_count
    from   public.user_daily_usage
    where  user_id    = dup.user_id
      and  usage_date = dup.usage_date
      and  feature    = dup.feature;

    -- Update the keeper
    update public.user_daily_usage
    set    count      = total_count,
           updated_at = now()
    where  id = keep_id;

    -- Delete the duplicates
    delete from public.user_daily_usage
    where  user_id    = dup.user_id
      and  usage_date = dup.usage_date
      and  feature    = dup.feature
      and  id        != keep_id;
  end loop;
end $$;

-- ── Step 1b: Merge duplicate guest rows ─────────────────────────────────────
do $$
declare
  dup record;
  keep_id uuid;
  total_count integer;
begin
  for dup in
    select guest_id, usage_date, feature
    from   public.user_daily_usage
    where  guest_id is not null
    group  by guest_id, usage_date, feature
    having count(*) > 1
  loop
    select id into keep_id
    from   public.user_daily_usage
    where  guest_id   = dup.guest_id
      and  usage_date = dup.usage_date
      and  feature    = dup.feature
    order  by created_at asc
    limit  1;

    select coalesce(sum(count), 0) into total_count
    from   public.user_daily_usage
    where  guest_id   = dup.guest_id
      and  usage_date = dup.usage_date
      and  feature    = dup.feature;

    update public.user_daily_usage
    set    count      = total_count,
           updated_at = now()
    where  id = keep_id;

    delete from public.user_daily_usage
    where  guest_id   = dup.guest_id
      and  usage_date = dup.usage_date
      and  feature    = dup.feature
      and  id        != keep_id;
  end loop;
end $$;

-- ── Step 2: Replace broken constraint with correct partial unique indexes ────

-- Drop the composite constraint that failed for NULL guest_id
alter table public.user_daily_usage
  drop constraint if exists user_daily_usage_unique_subject_date_feature;

-- Partial index for user rows: enforces one row per (user, date, feature)
-- NULL guest_id rows are excluded from this index entirely — no NULL ambiguity.
create unique index if not exists user_daily_usage_user_unique
  on public.user_daily_usage (user_id, usage_date, feature)
  where user_id is not null;

-- Partial index for guest rows: enforces one row per (guest, date, feature)
create unique index if not exists user_daily_usage_guest_unique
  on public.user_daily_usage (guest_id, usage_date, feature)
  where guest_id is not null;

-- ── Step 3: Atomic increment RPC ────────────────────────────────────────────
-- Replaces the broken two-step upsert+update in usage.ts.
-- ON CONFLICT targets the partial index, so NULL columns are never in the
-- conflict clause and PostgreSQL resolves conflicts correctly every time.
-- SECURITY DEFINER ensures it runs with the table-owner role regardless of
-- the PostgREST role that calls it.

create or replace function public.increment_brobot_usage(
  p_user_id  uuid,
  p_guest_id text,
  p_date     date,
  p_feature  text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_user_id is not null then
    -- User path: conflict on the user partial index
    insert into public.user_daily_usage
      (user_id, guest_id, usage_date, feature, count)
    values
      (p_user_id, null, p_date, p_feature, 1)
    on conflict (user_id, usage_date, feature)
      where user_id is not null
    do update
      set count      = public.user_daily_usage.count + 1,
          updated_at = now()
    returning count into v_count;
  else
    -- Guest path: conflict on the guest partial index
    insert into public.user_daily_usage
      (user_id, guest_id, usage_date, feature, count)
    values
      (null, p_guest_id, p_date, p_feature, 1)
    on conflict (guest_id, usage_date, feature)
      where guest_id is not null
    do update
      set count      = public.user_daily_usage.count + 1,
          updated_at = now()
    returning count into v_count;
  end if;

  return coalesce(v_count, 1);
end;
$$;

comment on function public.increment_brobot_usage(uuid, text, date, text) is
  'Atomically inserts or increments a BroBot daily usage counter. '
  'Uses ON CONFLICT targeting partial indexes so NULL subject columns never '
  'cause ambiguity. Safe for concurrent callers. Returns the new count.';
