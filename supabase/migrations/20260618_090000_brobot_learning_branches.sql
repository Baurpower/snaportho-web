-- ============================================================================
-- BroBot learning branches
-- Persistent resident-style follow-up questions with usage analytics.
-- ============================================================================

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
  updated_at timestamptz not null default now(),
  constraint branch_questions_source_check
    check (source in ('seed', 'database', 'llm', 'admin', 'analytics')),
  constraint branch_questions_success_score_check
    check (success_score >= 0 and success_score <= 100),
  constraint branch_questions_usage_count_check
    check (usage_count >= 0),
  constraint branch_questions_click_count_check
    check (click_count >= 0)
);

create unique index if not exists branch_questions_topic_question_unique_idx
  on public.branch_questions (topic_id, lower(question_text));

create index if not exists branch_questions_topic_rank_idx
  on public.branch_questions (topic_id, success_score desc, click_count desc, updated_at desc);

create table if not exists public.branch_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid null references public.brobot_conversations(id) on delete set null,
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

create or replace function public.update_branch_question_metrics()
returns trigger
language plpgsql
as $$
declare
  impressions integer;
  clicks integer;
  ctr numeric;
begin
  if new.branch_question_id is null then
    return new;
  end if;

  select
    count(*)::integer,
    count(*) filter (where clicked)::integer
  into impressions, clicks
  from public.branch_events
  where branch_question_id = new.branch_question_id;

  ctr := case when impressions > 0 then clicks::numeric / impressions::numeric else 0 end;

  update public.branch_questions
  set
    usage_count = impressions,
    click_count = clicks,
    success_score = least(
      100,
      greatest(
        0,
        round((50 + (ctr * 100) + least(clicks, 50)) / 2, 2)
      )
    ),
    updated_at = now()
  where id = new.branch_question_id;

  return new;
end;
$$;

drop trigger if exists update_branch_question_metrics on public.branch_events;
create trigger update_branch_question_metrics
  after insert on public.branch_events
  for each row
  execute function public.update_branch_question_metrics();

alter table public.branch_topics enable row level security;
alter table public.branch_questions enable row level security;
alter table public.branch_events enable row level security;

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
end
$$;
