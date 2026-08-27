-- ============================================================================
-- Lifecycle email log + suppression
--
-- Supports transactional/lifecycle sends (e.g. win-back for lapsed
-- subscribers). Two tables:
--   - lifecycle_emails      : immutable send log, drives idempotency
--   - lifecycle_email_optouts: per-user, per-kind suppression (unsubscribe)
--
-- Notes:
--   - service-role writes only; RLS denies anon/authenticated by default
--   - "kind" namespaces campaigns so a user can lapse again later and be
--     re-emailed without touching an unrelated kind
-- ============================================================================

create table if not exists public.lifecycle_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  kind text not null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text,
  status_at_send text,
  -- the current_period_end of the lapse this send is about; lets us decide
  -- "already emailed about THIS lapse" vs. a later, distinct lapse.
  period_end_at_send timestamptz,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now()
);

create index if not exists lifecycle_emails_user_kind_idx
  on public.lifecycle_emails (user_id, kind, sent_at desc);
create index if not exists lifecycle_emails_kind_sent_idx
  on public.lifecycle_emails (kind, sent_at desc);

create table if not exists public.lifecycle_email_optouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  -- null kind = suppress ALL lifecycle emails for this user
  kind text,
  reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists lifecycle_email_optouts_user_kind_uidx
  on public.lifecycle_email_optouts (user_id, coalesce(kind, '*'));
create index if not exists lifecycle_email_optouts_email_idx
  on public.lifecycle_email_optouts (lower(email));

alter table public.lifecycle_emails enable row level security;
alter table public.lifecycle_email_optouts enable row level security;

-- No policies => only the service role (which bypasses RLS) can read/write.
