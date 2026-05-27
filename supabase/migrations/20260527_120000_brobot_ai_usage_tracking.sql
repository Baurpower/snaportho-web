-- ============================================================================
-- BroBot AI Usage Tracking (Phase 1)
-- Global daily caps for all BroBot AI surfaces (main case-prep + future tools)
-- Supports both authenticated users and signed guest sessions.
-- ============================================================================

-- Main daily rollup table (one row per subject + date + feature)
create table if not exists public.user_daily_usage (
  id uuid primary key default gen_random_uuid(),

  -- Exactly one of these two must be non-null (enforced by check)
  user_id   uuid null references auth.users(id) on delete cascade,
  guest_id  text null,                    -- stable id from signed __brobot_guest cookie

  usage_date date not null,
  feature    text not null default 'brobot',

  count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Business rules
  constraint user_daily_usage_subject_check check (
    (user_id is not null and guest_id is null) or
    (user_id is null and guest_id is not null)
  ),

  -- One row per (subject, date, feature)
  constraint user_daily_usage_unique_subject_date_feature
    unique (user_id, guest_id, usage_date, feature)
);

-- Fast lookups for "how many has this user/guest used today?"
create index if not exists user_daily_usage_user_date_idx
  on public.user_daily_usage (user_id, usage_date)
  where user_id is not null;

create index if not exists user_daily_usage_guest_date_idx
  on public.user_daily_usage (guest_id, usage_date)
  where guest_id is not null;

create index if not exists user_daily_usage_date_feature_idx
  on public.user_daily_usage (usage_date, feature);

-- Lightweight append-only event log for metrics, abuse detection, and debugging.
-- Not used for quota enforcement (the rollup table is the source of truth).
create table if not exists public.brobot_usage_events (
  id bigserial primary key,

  user_id   uuid null references auth.users(id) on delete set null,
  guest_id  text null,

  feature   text not null default 'brobot',
  outcome   text not null,               -- 'success' | 'failure' | 'limit_hit' | 'cached'
  latency_ms integer,

  ip_hash   text,                        -- optional: sha256 of IP for abuse patterns (never store raw IP)
  user_agent_hash text,

  occurred_at timestamptz not null default now()
);

create index if not exists brobot_usage_events_user_time_idx
  on public.brobot_usage_events (user_id, occurred_at desc)
  where user_id is not null;

create index if not exists brobot_usage_events_guest_time_idx
  on public.brobot_usage_events (guest_id, occurred_at desc)
  where guest_id is not null;

create index if not exists brobot_usage_events_time_idx
  on public.brobot_usage_events (occurred_at desc);

-- RLS: We intentionally do NOT enable RLS on these tables in Phase 1.
-- All reads/writes for quota enforcement happen via the server using the service role key
-- (see lib/supabase/admin.ts + the new /api/brobot/ask route).
--
-- If you later want user-visible "how many uses left" queries from the browser,
-- you will need to add RLS policies that allow users to SELECT their own rows
-- (and possibly a SECURITY DEFINER function for guests).
--
-- For now: service role only. This is the safest starting point.

comment on table public.user_daily_usage is
  'Global daily AI usage counters for BroBot (and future AI tools). One row per (user or guest) per day per feature.';

comment on table public.brobot_usage_events is
  'Append-only audit / metrics log. Used for dashboards, abuse detection, and cost attribution. Not for quota enforcement.';
