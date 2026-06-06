create table if not exists public.program_call_schedule_drafts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  draft_payload jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  published_schedule_updated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, user_id, month_start)
);

create index if not exists idx_program_call_schedule_drafts_lookup
  on public.program_call_schedule_drafts (program_id, user_id, month_start);

alter table public.program_call_schedule_drafts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_call_schedule_drafts'
      and policyname = 'Users can view their own call drafts'
  ) then
    create policy "Users can view their own call drafts"
      on public.program_call_schedule_drafts
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_call_schedule_drafts'
      and policyname = 'Users can insert their own call drafts'
  ) then
    create policy "Users can insert their own call drafts"
      on public.program_call_schedule_drafts
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_call_schedule_drafts'
      and policyname = 'Users can update their own call drafts'
  ) then
    create policy "Users can update their own call drafts"
      on public.program_call_schedule_drafts
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_call_schedule_drafts'
      and policyname = 'Users can delete their own call drafts'
  ) then
    create policy "Users can delete their own call drafts"
      on public.program_call_schedule_drafts
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;
