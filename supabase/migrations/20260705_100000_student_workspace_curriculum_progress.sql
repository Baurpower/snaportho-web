-- Persistent curriculum and preparation progress for student workspace.

create table if not exists public.student_workspace_curriculum_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null,
  track_id text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  study_mode text null check (study_mode in ('fast', 'deep')),
  selected_minutes integer null check (selected_minutes is null or selected_minutes > 0),
  completed_objective_ids jsonb not null default '[]'::jsonb,
  brobot_sessions_count integer not null default 0 check (brobot_sessions_count >= 0),
  caseprep_sessions_count integer not null default 0 check (caseprep_sessions_count >= 0),
  last_session_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, topic_id)
);

create table if not exists public.student_workspace_learning_path_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  current_topic_id text null,
  current_week integer not null default 1 check (current_week > 0),
  completed_topic_ids jsonb not null default '[]'::jsonb,
  weekly_goal_topic_ids jsonb not null default '[]'::jsonb,
  last_studied_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, track_id)
);

create index if not exists student_workspace_curriculum_progress_user_track_idx
  on public.student_workspace_curriculum_progress (user_id, track_id);

create index if not exists student_workspace_curriculum_progress_user_status_idx
  on public.student_workspace_curriculum_progress (user_id, status);

create index if not exists student_workspace_learning_path_state_user_idx
  on public.student_workspace_learning_path_state (user_id);

create or replace function public.student_workspace_curriculum_progress_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_workspace_curriculum_progress_updated_at
  on public.student_workspace_curriculum_progress;
create trigger student_workspace_curriculum_progress_updated_at
  before update on public.student_workspace_curriculum_progress
  for each row
  execute function public.student_workspace_curriculum_progress_set_updated_at();

create or replace function public.student_workspace_learning_path_state_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_workspace_learning_path_state_updated_at
  on public.student_workspace_learning_path_state;
create trigger student_workspace_learning_path_state_updated_at
  before update on public.student_workspace_learning_path_state
  for each row
  execute function public.student_workspace_learning_path_state_set_updated_at();

alter table public.student_workspace_curriculum_progress enable row level security;
alter table public.student_workspace_learning_path_state enable row level security;

drop policy if exists student_workspace_curriculum_progress_select_own
  on public.student_workspace_curriculum_progress;
create policy student_workspace_curriculum_progress_select_own
  on public.student_workspace_curriculum_progress
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_curriculum_progress_insert_own
  on public.student_workspace_curriculum_progress;
create policy student_workspace_curriculum_progress_insert_own
  on public.student_workspace_curriculum_progress
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_curriculum_progress_update_own
  on public.student_workspace_curriculum_progress;
create policy student_workspace_curriculum_progress_update_own
  on public.student_workspace_curriculum_progress
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_curriculum_progress_delete_own
  on public.student_workspace_curriculum_progress;
create policy student_workspace_curriculum_progress_delete_own
  on public.student_workspace_curriculum_progress
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_learning_path_state_select_own
  on public.student_workspace_learning_path_state;
create policy student_workspace_learning_path_state_select_own
  on public.student_workspace_learning_path_state
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_learning_path_state_insert_own
  on public.student_workspace_learning_path_state;
create policy student_workspace_learning_path_state_insert_own
  on public.student_workspace_learning_path_state
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_learning_path_state_update_own
  on public.student_workspace_learning_path_state;
create policy student_workspace_learning_path_state_update_own
  on public.student_workspace_learning_path_state
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_learning_path_state_delete_own
  on public.student_workspace_learning_path_state;
create policy student_workspace_learning_path_state_delete_own
  on public.student_workspace_learning_path_state
  for delete to authenticated
  using (auth.uid() = user_id);