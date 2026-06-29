create table if not exists public.student_workspace_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  entry_type text not null,
  location text null,
  notes text null,
  weekday smallint null,
  specific_date date null,
  start_time time not null,
  end_time time not null,
  rotation_id uuid null references public.student_workspace_rotations(id) on delete set null,
  is_all_day boolean not null default false,
  color_token text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_workspace_schedule_entries_title_not_blank
    check (char_length(btrim(title)) > 0),
  constraint student_workspace_schedule_entries_type_check
    check (entry_type in ('rotation','clinic','or','call','conference','study','research','personal','off','other')),
  constraint student_workspace_schedule_entries_weekday_or_date_check
    check (
      (weekday is not null and specific_date is null)
      or (weekday is null and specific_date is not null)
    ),
  constraint student_workspace_schedule_entries_weekday_range_check
    check (weekday is null or weekday between 0 and 6),
  constraint student_workspace_schedule_entries_time_range_check
    check (is_all_day or end_time > start_time)
);

create index if not exists student_workspace_schedule_entries_user_specific_date_idx
  on public.student_workspace_schedule_entries (user_id, specific_date, start_time, sort_order);

create index if not exists student_workspace_schedule_entries_user_weekday_idx
  on public.student_workspace_schedule_entries (user_id, weekday, start_time, sort_order);

create index if not exists student_workspace_schedule_entries_user_rotation_idx
  on public.student_workspace_schedule_entries (user_id, rotation_id);

create or replace function public.student_workspace_schedule_entries_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_workspace_schedule_entries_updated_at
  on public.student_workspace_schedule_entries;
create trigger student_workspace_schedule_entries_updated_at
  before update on public.student_workspace_schedule_entries
  for each row
  execute function public.student_workspace_schedule_entries_set_updated_at();

alter table public.student_workspace_schedule_entries enable row level security;

drop policy if exists student_workspace_schedule_entries_select_own
  on public.student_workspace_schedule_entries;
create policy student_workspace_schedule_entries_select_own
  on public.student_workspace_schedule_entries
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_schedule_entries_insert_own
  on public.student_workspace_schedule_entries;
create policy student_workspace_schedule_entries_insert_own
  on public.student_workspace_schedule_entries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_schedule_entries_update_own
  on public.student_workspace_schedule_entries;
create policy student_workspace_schedule_entries_update_own
  on public.student_workspace_schedule_entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_schedule_entries_delete_own
  on public.student_workspace_schedule_entries;
create policy student_workspace_schedule_entries_delete_own
  on public.student_workspace_schedule_entries
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.student_workspace_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text null,
  template_scope text not null,
  rotation_id uuid null references public.student_workspace_rotations(id) on delete set null,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_workspace_checklist_templates_title_not_blank
    check (char_length(btrim(title)) > 0),
  constraint student_workspace_checklist_templates_scope_check
    check (template_scope in ('daily','rotation','away_rotation'))
);

create index if not exists student_workspace_checklist_templates_user_scope_idx
  on public.student_workspace_checklist_templates (user_id, template_scope, archived_at, sort_order);

create index if not exists student_workspace_checklist_templates_user_rotation_idx
  on public.student_workspace_checklist_templates (user_id, rotation_id, archived_at);

create or replace function public.student_workspace_checklist_templates_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_workspace_checklist_templates_updated_at
  on public.student_workspace_checklist_templates;
create trigger student_workspace_checklist_templates_updated_at
  before update on public.student_workspace_checklist_templates
  for each row
  execute function public.student_workspace_checklist_templates_set_updated_at();

alter table public.student_workspace_checklist_templates enable row level security;

drop policy if exists student_workspace_checklist_templates_select_own
  on public.student_workspace_checklist_templates;
create policy student_workspace_checklist_templates_select_own
  on public.student_workspace_checklist_templates
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_checklist_templates_insert_own
  on public.student_workspace_checklist_templates;
create policy student_workspace_checklist_templates_insert_own
  on public.student_workspace_checklist_templates
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_checklist_templates_update_own
  on public.student_workspace_checklist_templates;
create policy student_workspace_checklist_templates_update_own
  on public.student_workspace_checklist_templates
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_checklist_templates_delete_own
  on public.student_workspace_checklist_templates;
create policy student_workspace_checklist_templates_delete_own
  on public.student_workspace_checklist_templates
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.student_workspace_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.student_workspace_checklist_templates(id) on delete cascade,
  label text not null,
  details text null,
  sort_order integer not null default 0,
  is_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_workspace_checklist_items_label_not_blank
    check (char_length(btrim(label)) > 0)
);

create index if not exists student_workspace_checklist_items_user_template_idx
  on public.student_workspace_checklist_items (user_id, template_id, sort_order);

create or replace function public.student_workspace_checklist_items_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_workspace_checklist_items_updated_at
  on public.student_workspace_checklist_items;
create trigger student_workspace_checklist_items_updated_at
  before update on public.student_workspace_checklist_items
  for each row
  execute function public.student_workspace_checklist_items_set_updated_at();

alter table public.student_workspace_checklist_items enable row level security;

drop policy if exists student_workspace_checklist_items_select_own
  on public.student_workspace_checklist_items;
create policy student_workspace_checklist_items_select_own
  on public.student_workspace_checklist_items
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_checklist_items_insert_own
  on public.student_workspace_checklist_items;
create policy student_workspace_checklist_items_insert_own
  on public.student_workspace_checklist_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_checklist_items_update_own
  on public.student_workspace_checklist_items;
create policy student_workspace_checklist_items_update_own
  on public.student_workspace_checklist_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_checklist_items_delete_own
  on public.student_workspace_checklist_items;
create policy student_workspace_checklist_items_delete_own
  on public.student_workspace_checklist_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.student_workspace_checklist_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_item_id uuid not null references public.student_workspace_checklist_items(id) on delete cascade,
  state_date date not null,
  is_completed boolean not null default false,
  completed_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_workspace_checklist_state_unique
    unique (user_id, checklist_item_id, state_date)
);

create index if not exists student_workspace_checklist_state_user_date_idx
  on public.student_workspace_checklist_state (user_id, state_date, is_completed);

create or replace function public.student_workspace_checklist_state_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_workspace_checklist_state_updated_at
  on public.student_workspace_checklist_state;
create trigger student_workspace_checklist_state_updated_at
  before update on public.student_workspace_checklist_state
  for each row
  execute function public.student_workspace_checklist_state_set_updated_at();

alter table public.student_workspace_checklist_state enable row level security;

drop policy if exists student_workspace_checklist_state_select_own
  on public.student_workspace_checklist_state;
create policy student_workspace_checklist_state_select_own
  on public.student_workspace_checklist_state
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_checklist_state_insert_own
  on public.student_workspace_checklist_state;
create policy student_workspace_checklist_state_insert_own
  on public.student_workspace_checklist_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_checklist_state_update_own
  on public.student_workspace_checklist_state;
create policy student_workspace_checklist_state_update_own
  on public.student_workspace_checklist_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_checklist_state_delete_own
  on public.student_workspace_checklist_state;
create policy student_workspace_checklist_state_delete_own
  on public.student_workspace_checklist_state
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.student_workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text null,
  status text not null default 'open',
  priority text not null default 'normal',
  due_date date null,
  rotation_id uuid null references public.student_workspace_rotations(id) on delete set null,
  completed_at timestamptz null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_workspace_tasks_title_not_blank
    check (char_length(btrim(title)) > 0),
  constraint student_workspace_tasks_status_check
    check (status in ('open','done','archived')),
  constraint student_workspace_tasks_priority_check
    check (priority in ('low','normal','high'))
);

create index if not exists student_workspace_tasks_user_status_idx
  on public.student_workspace_tasks (user_id, status, due_date, sort_order, created_at);

create index if not exists student_workspace_tasks_user_rotation_idx
  on public.student_workspace_tasks (user_id, rotation_id, status);

create or replace function public.student_workspace_tasks_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_workspace_tasks_updated_at
  on public.student_workspace_tasks;
create trigger student_workspace_tasks_updated_at
  before update on public.student_workspace_tasks
  for each row
  execute function public.student_workspace_tasks_set_updated_at();

alter table public.student_workspace_tasks enable row level security;

drop policy if exists student_workspace_tasks_select_own
  on public.student_workspace_tasks;
create policy student_workspace_tasks_select_own
  on public.student_workspace_tasks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists student_workspace_tasks_insert_own
  on public.student_workspace_tasks;
create policy student_workspace_tasks_insert_own
  on public.student_workspace_tasks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_tasks_update_own
  on public.student_workspace_tasks;
create policy student_workspace_tasks_update_own
  on public.student_workspace_tasks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists student_workspace_tasks_delete_own
  on public.student_workspace_tasks;
create policy student_workspace_tasks_delete_own
  on public.student_workspace_tasks
  for delete
  to authenticated
  using (auth.uid() = user_id);
