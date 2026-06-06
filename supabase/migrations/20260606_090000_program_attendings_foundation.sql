create table if not exists public.program_attendings (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  full_name text not null,
  display_name text null,
  is_active boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_attendings_full_name_check
    check (length(btrim(full_name)) > 0)
);

create index if not exists program_attendings_program_active_name_idx
  on public.program_attendings (program_id, is_active, full_name);

create table if not exists public.program_call_attending_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  attending_id uuid not null references public.program_attendings(id) on delete restrict,
  coverage_date date not null,
  coverage_scope text not null default 'program_call',
  is_default boolean not null default true,
  is_active boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_call_attending_assignments_scope_check
    check (length(btrim(coverage_scope)) > 0)
);

create unique index if not exists program_call_attending_assignments_identity_key
  on public.program_call_attending_assignments (
    program_id,
    coverage_date,
    coverage_scope,
    attending_id,
    is_default
  );

create unique index if not exists program_call_attending_assignments_single_default_idx
  on public.program_call_attending_assignments (
    program_id,
    coverage_date,
    coverage_scope
  )
  where is_default = true and is_active = true;

create index if not exists program_call_attending_assignments_program_date_idx
  on public.program_call_attending_assignments (
    program_id,
    coverage_date,
    coverage_scope,
    is_active
  );

create index if not exists program_call_attending_assignments_attending_idx
  on public.program_call_attending_assignments (attending_id, coverage_date);

create or replace function public.is_active_program_member_for_attendings(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_memberships pm
    where pm.program_id = target_program_id
      and pm.user_id = auth.uid()
      and coalesce(pm.is_active, false) = true
      and (pm.start_date is null or pm.start_date <= current_date)
      and (pm.end_date is null or pm.end_date >= current_date)
  );
$$;

create or replace function public.can_manage_program_attendings(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_memberships pm
    left join public.program_roster pr
      on pr.program_id = pm.program_id
     and pr.program_membership_id = pm.id
     and pr.claimed_by_user_id = auth.uid()
    where pm.program_id = target_program_id
      and pm.user_id = auth.uid()
      and coalesce(pm.is_active, false) = true
      and (pm.start_date is null or pm.start_date <= current_date)
      and (pm.end_date is null or pm.end_date >= current_date)
      and (
        coalesce(pr."isAdmin", false) = true
        or lower(replace(replace(coalesce(pr.role, ''), '-', '_'), ' ', '_')) in (
          'admin',
          'program_admin',
          'coordinator',
          'chief',
          'chief_resident',
          'faculty',
          'faculty_lead'
        )
        or lower(replace(replace(coalesce(pm.role, ''), '-', '_'), ' ', '_')) in (
          'admin',
          'program_admin',
          'coordinator',
          'chief',
          'chief_resident',
          'faculty',
          'faculty_lead'
        )
      )
  );
$$;

alter table public.program_attendings enable row level security;
alter table public.program_call_attending_assignments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_attendings'
      and policyname = 'Program members can read attendings'
  ) then
    create policy "Program members can read attendings"
      on public.program_attendings
      for select
      using (public.is_active_program_member_for_attendings(program_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_attendings'
      and policyname = 'Program call editors can insert attendings'
  ) then
    create policy "Program call editors can insert attendings"
      on public.program_attendings
      for insert
      with check (public.can_manage_program_attendings(program_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_attendings'
      and policyname = 'Program call editors can update attendings'
  ) then
    create policy "Program call editors can update attendings"
      on public.program_attendings
      for update
      using (public.can_manage_program_attendings(program_id))
      with check (public.can_manage_program_attendings(program_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_call_attending_assignments'
      and policyname = 'Program members can read attending assignments'
  ) then
    create policy "Program members can read attending assignments"
      on public.program_call_attending_assignments
      for select
      using (public.is_active_program_member_for_attendings(program_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_call_attending_assignments'
      and policyname = 'Program call editors can insert attending assignments'
  ) then
    create policy "Program call editors can insert attending assignments"
      on public.program_call_attending_assignments
      for insert
      with check (public.can_manage_program_attendings(program_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_call_attending_assignments'
      and policyname = 'Program call editors can update attending assignments'
  ) then
    create policy "Program call editors can update attending assignments"
      on public.program_call_attending_assignments
      for update
      using (public.can_manage_program_attendings(program_id))
      with check (public.can_manage_program_attendings(program_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_call_attending_assignments'
      and policyname = 'Program call editors can delete attending assignments'
  ) then
    create policy "Program call editors can delete attending assignments"
      on public.program_call_attending_assignments
      for delete
      using (public.can_manage_program_attendings(program_id));
  end if;
end
$$;
