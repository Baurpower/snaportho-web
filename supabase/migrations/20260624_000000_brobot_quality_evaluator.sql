-- ============================================================================
-- BroBot Quality Evaluator (V1)
-- Queue table for async post-response evaluation jobs, plus the persisted
-- evaluation results used to drive the internal admin quality dashboard.
-- This is an internal/admin-only dataset: no end-user RLS policies are
-- granted, the cron worker and admin API routes use the service-role client.
-- ============================================================================

create table if not exists public.brobot_evaluation_jobs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.brobot_conversations(id) on delete cascade,
  message_id uuid not null references public.brobot_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text null,
  procedure text null,
  model text not null,
  training_level text null,
  response_depth text null,
  intent_snapshot jsonb null,
  context_snapshot jsonb null,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  constraint brobot_evaluation_jobs_status_check
    check (status in ('pending', 'processing', 'completed', 'failed'))
);

create index if not exists brobot_evaluation_jobs_status_created_at_idx
  on public.brobot_evaluation_jobs (status, created_at);

-- Unique (not just indexed) so a duplicate enqueue call for the same assistant
-- message can never create a second job; insert conflicts are ignored.
create unique index if not exists brobot_evaluation_jobs_message_id_unique_idx
  on public.brobot_evaluation_jobs (message_id);

create table if not exists public.brobot_response_evaluations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid null references public.brobot_evaluation_jobs(id) on delete set null,
  conversation_id uuid null,
  message_id uuid null,
  user_id uuid null,
  model text null,
  eval_model text null,
  mode text null,
  procedure text null,
  response_depth text null,
  training_level text null,
  overall_score int not null,
  severity text not null,
  requires_admin_review boolean not null default false,
  subscores jsonb not null,
  strengths jsonb null,
  weaknesses jsonb null,
  failure_labels text[] null,
  missing_topics jsonb null,
  summary text null,
  engineering_recommendation text null,
  confidence numeric null,
  admin_status text not null default 'unresolved',
  admin_notes text null,
  created_at timestamptz not null default now(),
  constraint brobot_response_evaluations_severity_check
    check (severity in ('none', 'minor', 'moderate', 'critical', 'pipeline_error')),
  constraint brobot_response_evaluations_admin_status_check
    check (admin_status in ('unresolved', 'resolved')),
  constraint brobot_response_evaluations_overall_score_check
    check (overall_score >= 0 and overall_score <= 100)
);

create index if not exists brobot_response_evaluations_overall_score_idx
  on public.brobot_response_evaluations (overall_score);

create index if not exists brobot_response_evaluations_severity_idx
  on public.brobot_response_evaluations (severity);

create index if not exists brobot_response_evaluations_review_status_idx
  on public.brobot_response_evaluations (requires_admin_review, admin_status);

create index if not exists brobot_response_evaluations_mode_idx
  on public.brobot_response_evaluations (mode);

create index if not exists brobot_response_evaluations_model_idx
  on public.brobot_response_evaluations (model);

create index if not exists brobot_response_evaluations_created_at_idx
  on public.brobot_response_evaluations (created_at desc);

create index if not exists brobot_response_evaluations_failure_labels_idx
  on public.brobot_response_evaluations using gin (failure_labels);

alter table public.brobot_evaluation_jobs enable row level security;
alter table public.brobot_response_evaluations enable row level security;

comment on table public.brobot_evaluation_jobs is
  'Queue of pending BroBot response evaluations, processed by the /api/cron/brobot-evaluate worker. Service-role only.';
comment on table public.brobot_response_evaluations is
  'Persisted LLM-judged quality evaluations of every BroBot assistant response, reviewed via the internal admin quality dashboard. Service-role only.';

notify pgrst, 'reload schema';
