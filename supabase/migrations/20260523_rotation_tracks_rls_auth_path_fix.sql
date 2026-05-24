create or replace function public.is_program_member(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_roster pr
    where pr.program_id = target_program_id
      and pr.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_program_rotations(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_roster pr
    where pr.program_id = target_program_id
      and pr.user_id = auth.uid()
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
      )
  );
$$;
