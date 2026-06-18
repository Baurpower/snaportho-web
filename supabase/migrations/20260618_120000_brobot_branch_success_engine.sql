-- ============================================================================
-- BroBot Branch Success Engine hardening
-- Production-safe replacement: creates the base branch tables when the earlier
-- learning-branches migration has not run, then applies the success engine.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Base branch tables. These mirror 20260618_090000_brobot_learning_branches.sql
-- and are intentionally CREATE IF NOT EXISTS to preserve production data.
-- ---------------------------------------------------------------------------

create table if not exists public.branch_topics (
  topic_id uuid primary key default gen_random_uuid(),
  topic_name text not null,
  procedure text null,
  subspecialty text null,
  anatomy_region text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists branch_topics_topic_name_unique_idx
  on public.branch_topics (lower(topic_name));

create index if not exists branch_topics_lookup_idx
  on public.branch_topics (procedure, subspecialty, anatomy_region);

create table if not exists public.branch_questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.branch_topics(topic_id) on delete cascade,
  question_text text not null,
  category text not null,
  source text not null default 'llm',
  success_score numeric not null default 50,
  usage_count integer not null default 0,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_questions'::regclass
      and conname = 'branch_questions_source_check'
  ) then
    alter table public.branch_questions
      add constraint branch_questions_source_check
      check (source in ('seed', 'database', 'llm', 'admin', 'analytics'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_questions'::regclass
      and conname = 'branch_questions_success_score_check'
  ) then
    alter table public.branch_questions
      add constraint branch_questions_success_score_check
      check (success_score >= 0 and success_score <= 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_questions'::regclass
      and conname = 'branch_questions_usage_count_check'
  ) then
    alter table public.branch_questions
      add constraint branch_questions_usage_count_check
      check (usage_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_questions'::regclass
      and conname = 'branch_questions_click_count_check'
  ) then
    alter table public.branch_questions
      add constraint branch_questions_click_count_check
      check (click_count >= 0);
  end if;
end;
$$;

create unique index if not exists branch_questions_topic_question_unique_idx
  on public.branch_questions (topic_id, lower(question_text));

create index if not exists branch_questions_topic_rank_idx
  on public.branch_questions (topic_id, success_score desc, click_count desc, updated_at desc);

create table if not exists public.branch_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid null references public.branch_topics(topic_id) on delete set null,
  branch_question_id uuid null references public.branch_questions(id) on delete set null,
  clicked boolean not null default false,
  generated_followup boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists branch_events_user_created_at_idx
  on public.branch_events (user_id, created_at desc);

create index if not exists branch_events_question_created_at_idx
  on public.branch_events (branch_question_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Success Engine columns. branch_events exists before any ALTER/INDEX/POLICY.
-- ---------------------------------------------------------------------------

alter table public.branch_events
  add column if not exists event_type text not null default 'impression',
  add column if not exists rank_position integer null,
  add column if not exists mode text null,
  add column if not exists training_level text null,
  add column if not exists branch_label text null,
  add column if not exists source_message_id uuid null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.branch_events
set event_type = case when clicked then 'click' else coalesce(event_type, 'impression') end
where event_type is null
   or (clicked = true and event_type = 'impression');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.branch_events'::regclass
      and conname = 'branch_events_event_type_check'
  ) then
    alter table public.branch_events
      add constraint branch_events_event_type_check
      check (event_type in ('impression', 'click', 'outcome'));
  end if;
end;
$$;

create index if not exists branch_events_question_type_created_at_idx
  on public.branch_events (branch_question_id, event_type, created_at desc);

create index if not exists branch_events_mode_level_type_created_at_idx
  on public.branch_events (mode, training_level, event_type, created_at desc);

create index if not exists branch_events_conversation_source_idx
  on public.branch_events (conversation_id, source_message_id);

create index if not exists branch_events_topic_type_created_at_idx
  on public.branch_events (topic_id, event_type, created_at desc);

create unique index if not exists branch_events_impression_dedupe_idx
  on public.branch_events (
    conversation_id,
    source_message_id,
    branch_question_id,
    rank_position
  )
  where event_type = 'impression'
    and conversation_id is not null
    and source_message_id is not null
    and branch_question_id is not null
    and rank_position is not null;

create table if not exists public.branch_outcomes (
  id uuid primary key default gen_random_uuid(),
  branch_event_id uuid null references public.branch_events(id) on delete cascade,
  conversation_id uuid not null,
  user_id uuid null references auth.users(id) on delete cascade,
  branch_question_id uuid null references public.branch_questions(id) on delete set null,
  mode text null,
  training_level text null,
  continued_after_click boolean not null default false,
  followup_count integer not null default 0,
  conversation_depth_delta integer not null default 0,
  duration_seconds integer null,
  abandoned boolean not null default false,
  return_within_7d boolean null,
  educational_success_score numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.brobot_conversations') is not null
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.branch_events'::regclass
        and conname = 'branch_events_conversation_id_fkey'
    )
  then
    alter table public.branch_events
      add constraint branch_events_conversation_id_fkey
      foreign key (conversation_id)
      references public.brobot_conversations(id)
      on delete set null
      not valid;
  end if;

  if to_regclass('public.brobot_conversations') is not null
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.branch_outcomes'::regclass
        and conname = 'branch_outcomes_conversation_id_fkey'
    )
  then
    alter table public.branch_outcomes
      add constraint branch_outcomes_conversation_id_fkey
      foreign key (conversation_id)
      references public.brobot_conversations(id)
      on delete cascade
      not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_outcomes'::regclass
      and conname = 'branch_outcomes_followup_count_check'
  ) then
    alter table public.branch_outcomes
      add constraint branch_outcomes_followup_count_check
      check (followup_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_outcomes'::regclass
      and conname = 'branch_outcomes_depth_delta_check'
  ) then
    alter table public.branch_outcomes
      add constraint branch_outcomes_depth_delta_check
      check (conversation_depth_delta >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_outcomes'::regclass
      and conname = 'branch_outcomes_duration_seconds_check'
  ) then
    alter table public.branch_outcomes
      add constraint branch_outcomes_duration_seconds_check
      check (duration_seconds is null or duration_seconds >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.branch_outcomes'::regclass
      and conname = 'branch_outcomes_score_check'
  ) then
    alter table public.branch_outcomes
      add constraint branch_outcomes_score_check
      check (educational_success_score >= 0 and educational_success_score <= 100);
  end if;
end;
$$;

create index if not exists branch_outcomes_question_score_idx
  on public.branch_outcomes (branch_question_id, educational_success_score desc);

create index if not exists branch_outcomes_mode_level_score_idx
  on public.branch_outcomes (mode, training_level, educational_success_score desc);

create index if not exists branch_outcomes_conversation_created_at_idx
  on public.branch_outcomes (conversation_id, created_at desc);

create index if not exists branch_outcomes_user_created_at_idx
  on public.branch_outcomes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Functions and triggers. DROP TRIGGER is safe because tables now exist.
-- ---------------------------------------------------------------------------

create or replace function public.set_branch_topics_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_branch_topics_updated_at on public.branch_topics;
create trigger set_branch_topics_updated_at
  before update on public.branch_topics
  for each row
  execute function public.set_branch_topics_updated_at();

create or replace function public.set_branch_questions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_branch_questions_updated_at on public.branch_questions;
create trigger set_branch_questions_updated_at
  before update on public.branch_questions
  for each row
  execute function public.set_branch_questions_updated_at();

create or replace function public.set_branch_outcomes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_branch_outcomes_updated_at on public.branch_outcomes;
create trigger set_branch_outcomes_updated_at
  before update on public.branch_outcomes
  for each row
  execute function public.set_branch_outcomes_updated_at();

create or replace function public.recompute_branch_question_metrics(p_branch_question_id uuid)
returns void
language plpgsql
as $$
declare
  impressions integer := 0;
  clicks integer := 0;
  outcomes integer := 0;
  continued integer := 0;
  abandoned_count integer := 0;
  avg_depth numeric := 0;
  avg_followups numeric := 0;
  normalized_ctr numeric := 0;
  continuation_rate numeric := 0;
  abandonment_rate numeric := 0;
  normalized_depth numeric := 0;
  normalized_followups numeric := 0;
  recency_boost numeric := 0;
  confidence_adjustment numeric := 0;
  latest_event_at timestamptz;
  age_days numeric := 365;
  score numeric := 50;
begin
  if p_branch_question_id is null then
    return;
  end if;

  select
    count(*) filter (where event_type = 'impression')::integer,
    count(*) filter (where event_type = 'click')::integer,
    max(created_at)
  into impressions, clicks, latest_event_at
  from public.branch_events
  where branch_question_id = p_branch_question_id;

  select
    count(*)::integer,
    count(*) filter (where continued_after_click)::integer,
    count(*) filter (where abandoned)::integer,
    coalesce(avg(conversation_depth_delta), 0),
    coalesce(avg(followup_count), 0),
    greatest(coalesce(max(created_at), latest_event_at), latest_event_at)
  into outcomes, continued, abandoned_count, avg_depth, avg_followups, latest_event_at
  from public.branch_outcomes
  where branch_question_id = p_branch_question_id;

  if impressions < 5 and outcomes = 0 then
    score := 50;
  else
    normalized_ctr := (clicks + 2)::numeric / greatest(impressions + 10, 1);
    continuation_rate := (continued + 2)::numeric / greatest(outcomes + 4, 1);
    abandonment_rate := (abandoned_count + 1)::numeric / greatest(outcomes + 4, 1);
    normalized_depth := least(1, avg_depth / 6);
    normalized_followups := least(1, avg_followups / 4);

    if latest_event_at is not null then
      age_days := greatest(0, extract(epoch from (now() - latest_event_at)) / 86400);
    end if;
    recency_boost := greatest(0, 1 - age_days / 90);
    confidence_adjustment := least(8, ln(1 + impressions + outcomes) * 1.8);

    score :=
      30 * normalized_ctr
      + 25 * continuation_rate
      + 20 * normalized_depth
      + 15 * normalized_followups
      - 20 * abandonment_rate
      + 10 * recency_boost
      + confidence_adjustment;
  end if;

  update public.branch_questions
  set
    usage_count = greatest(impressions, 0),
    click_count = greatest(clicks, 0),
    success_score = least(100, greatest(0, round(score, 2))),
    updated_at = now()
  where id = p_branch_question_id;
end;
$$;

create or replace function public.update_branch_question_metrics()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_branch_question_metrics(new.branch_question_id);
  return new;
end;
$$;

drop trigger if exists update_branch_question_metrics on public.branch_events;
create trigger update_branch_question_metrics
  after insert or update on public.branch_events
  for each row
  execute function public.update_branch_question_metrics();

create or replace function public.update_branch_question_metrics_from_outcome()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_branch_question_metrics(new.branch_question_id);
  return new;
end;
$$;

drop trigger if exists update_branch_question_metrics_from_outcome on public.branch_outcomes;
create trigger update_branch_question_metrics_from_outcome
  after insert or update on public.branch_outcomes
  for each row
  execute function public.update_branch_question_metrics_from_outcome();

-- ---------------------------------------------------------------------------
-- RLS and policies. Guarded DO blocks avoid duplicate-policy errors.
-- ---------------------------------------------------------------------------

alter table public.branch_topics enable row level security;
alter table public.branch_questions enable row level security;
alter table public.branch_events enable row level security;
alter table public.branch_outcomes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'branch_topics'
      and policyname = 'Authenticated users can read branch topics'
  ) then
    create policy "Authenticated users can read branch topics"
      on public.branch_topics
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'branch_questions'
      and policyname = 'Authenticated users can read branch questions'
  ) then
    create policy "Authenticated users can read branch questions"
      on public.branch_questions
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'branch_events'
      and policyname = 'Users can insert their own branch events'
  ) then
    create policy "Users can insert their own branch events"
      on public.branch_events
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'branch_events'
      and policyname = 'Users can view their own branch events'
  ) then
    create policy "Users can view their own branch events"
      on public.branch_events
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'branch_outcomes'
      and policyname = 'Users can view their own branch outcomes'
  ) then
    create policy "Users can view their own branch outcomes"
      on public.branch_outcomes
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'branch_outcomes'
      and policyname = 'Users can insert their own branch outcomes'
  ) then
    create policy "Users can insert their own branch outcomes"
      on public.branch_outcomes
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'branch_outcomes'
      and policyname = 'Users can update their own branch outcomes'
  ) then
    create policy "Users can update their own branch outcomes"
      on public.branch_outcomes
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;

comment on table public.branch_topics is
  'BroBot branch topic registry used to group persistent follow-up questions.';
comment on table public.branch_questions is
  'Persistent BroBot follow-up branch candidates with aggregate ranking metrics.';
comment on table public.branch_events is
  'Rendered impressions and clicks for BroBot branch recommendations.';
comment on table public.branch_outcomes is
  'Post-click BroBot branch engagement outcomes used to make branch ranking educationally self-improving.';

notify pgrst, 'reload schema';
