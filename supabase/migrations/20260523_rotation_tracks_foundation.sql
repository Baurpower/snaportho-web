create table if not exists public.rotation_tracks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  academic_year_start integer not null,
  name text not null,
  description text null,
  target_pgy_year integer null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  copied_from_track_id uuid null references public.rotation_tracks(id) on delete set null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rotation_tracks_target_pgy_year_check
    check (target_pgy_year is null or target_pgy_year between 1 and 5),
  constraint rotation_tracks_program_year_name_key
    unique (program_id, academic_year_start, name)
);

create index if not exists rotation_tracks_program_year_active_sort_idx
  on public.rotation_tracks (program_id, academic_year_start, is_active, sort_order);

create table if not exists public.rotation_track_blocks (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.rotation_tracks(id) on delete cascade,
  rotation_id uuid not null references public.rotations(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  site_label text null,
  team_label text null,
  notes text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rotation_track_blocks_date_range_check
    check (start_date <= end_date)
);

create index if not exists rotation_track_blocks_track_dates_sort_idx
  on public.rotation_track_blocks (track_id, start_date, end_date, sort_order);

create table if not exists public.rotation_track_memberships (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.rotation_tracks(id) on delete cascade,
  roster_id uuid not null references public.program_roster(id) on delete cascade,
  program_membership_id uuid null references public.program_memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rotation_track_memberships_track_roster_key
    unique (track_id, roster_id)
);

create index if not exists rotation_track_memberships_roster_idx
  on public.rotation_track_memberships (roster_id);

create index if not exists rotation_track_memberships_program_membership_idx
  on public.rotation_track_memberships (program_membership_id);

alter table public.rotation_assignments
  add column if not exists track_id uuid null references public.rotation_tracks(id) on delete set null,
  add column if not exists track_block_id uuid null references public.rotation_track_blocks(id) on delete set null,
  add column if not exists source_kind text null,
  add column if not exists source_batch_id uuid null,
  add column if not exists updated_by uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rotation_assignments_source_kind_check'
  ) then
    alter table public.rotation_assignments
      add constraint rotation_assignments_source_kind_check
      check (
        source_kind is null
        or source_kind in ('generated_from_track', 'manual', 'copied')
      );
  end if;
end
$$;

create index if not exists rotation_assignments_track_id_idx
  on public.rotation_assignments (track_id);

create index if not exists rotation_assignments_track_block_id_idx
  on public.rotation_assignments (track_block_id);

create index if not exists rotation_assignments_source_batch_id_idx
  on public.rotation_assignments (source_batch_id);
