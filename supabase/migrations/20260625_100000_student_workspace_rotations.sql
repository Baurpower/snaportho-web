create table if not exists public.student_workspace_rotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  institution text null,
  service text null,
  location text null,
  start_date date not null,
  end_date date not null,
  sort_order integer not null default 0,
  notes text null,
  is_away_rotation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_workspace_rotations_title_not_blank
    check (char_length(btrim(title)) > 0),
  constraint student_workspace_rotations_date_range_check
    check (end_date >= start_date)
);

create index if not exists student_workspace_rotations_user_sort_idx
  on public.student_workspace_rotations (user_id, sort_order, start_date, created_at);

create index if not exists student_workspace_rotations_user_dates_idx
  on public.student_workspace_rotations (user_id, start_date, end_date);

create or replace function public.student_workspace_rotations_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_workspace_rotations_updated_at
  on public.student_workspace_rotations;
create trigger student_workspace_rotations_updated_at
  before update on public.student_workspace_rotations
  for each row
  execute function public.student_workspace_rotations_set_updated_at();

alter table public.student_workspace_rotations enable row level security;

drop policy if exists student_workspace_rotations_select_own
  on public.student_workspace_rotations;
create policy student_workspace_rotations_select_own
  on public.student_workspace_rotations
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_rotations_insert_own
  on public.student_workspace_rotations;
create policy student_workspace_rotations_insert_own
  on public.student_workspace_rotations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_rotations_update_own
  on public.student_workspace_rotations;
create policy student_workspace_rotations_update_own
  on public.student_workspace_rotations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_rotations_delete_own
  on public.student_workspace_rotations;
create policy student_workspace_rotations_delete_own
  on public.student_workspace_rotations
  for delete
  to authenticated
  using (auth.uid() = user_id);
