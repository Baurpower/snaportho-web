create table if not exists public.brobot_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.brobot_conversations(id) on delete cascade,
  message_id uuid not null references public.brobot_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  constraint brobot_enrichment_jobs_status_check
    check (status in ('pending', 'processing', 'completed', 'failed'))
);

create unique index if not exists brobot_enrichment_jobs_message_id_unique_idx
  on public.brobot_enrichment_jobs (message_id);
create index if not exists brobot_enrichment_jobs_status_created_at_idx
  on public.brobot_enrichment_jobs (status, created_at);

alter table public.brobot_enrichment_jobs enable row level security;

comment on table public.brobot_enrichment_jobs is
  'Durable retryable jobs for non-blocking BroBot metadata, KG telemetry, personalization, and analytics enrichment.';
