create table if not exists public.student_workspace_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text null,
  med_school_year text null,
  target_specialty text null,
  fourth_year_start_date date null,
  fourth_year_end_date date null,
  onboarding_completed boolean not null default false,
  onboarding_step text null,
  last_opened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.student_workspace_profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_workspace_profiles_updated_at
  on public.student_workspace_profiles;
create trigger student_workspace_profiles_updated_at
  before update on public.student_workspace_profiles
  for each row
  execute function public.student_workspace_profiles_set_updated_at();

alter table public.student_workspace_profiles enable row level security;

drop policy if exists student_workspace_profiles_select_own
  on public.student_workspace_profiles;
create policy student_workspace_profiles_select_own
  on public.student_workspace_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_profiles_insert_own
  on public.student_workspace_profiles;
create policy student_workspace_profiles_insert_own
  on public.student_workspace_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_profiles_update_own
  on public.student_workspace_profiles;
create policy student_workspace_profiles_update_own
  on public.student_workspace_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
