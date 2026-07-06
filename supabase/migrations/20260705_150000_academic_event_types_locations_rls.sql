-- ============================================================
-- Academic event types and locations — RLS policy fix
-- ============================================================
-- Problem: RLS is enabled on academic_event_types and academic_locations
-- but no policies exist, so authenticated user-session reads return empty
-- rows and inserts fail with SQLSTATE 42501.
--
-- Fix: mirror the academic_events access model.
-- ============================================================

alter table public.academic_event_types enable row level security;
alter table public.academic_locations enable row level security;

drop policy if exists "program roster can access academic event types"
  on public.academic_event_types;

create policy "program roster can access academic event types"
  on public.academic_event_types
  for all
  using (public.is_user_in_program_roster(program_id))
  with check (public.is_user_in_program_roster(program_id));

drop policy if exists "program roster can access academic locations"
  on public.academic_locations;

create policy "program roster can access academic locations"
  on public.academic_locations
  for all
  using (public.is_user_in_program_roster(program_id))
  with check (public.is_user_in_program_roster(program_id));