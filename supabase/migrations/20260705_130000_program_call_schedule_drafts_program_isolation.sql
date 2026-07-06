-- Tighten tenant isolation for program_call_schedule_drafts.
-- Users may only access drafts for programs where they are active members.

drop policy if exists "Users can view their own call drafts"
  on public.program_call_schedule_drafts;

drop policy if exists "Users can insert their own call drafts"
  on public.program_call_schedule_drafts;

drop policy if exists "Users can update their own call drafts"
  on public.program_call_schedule_drafts;

drop policy if exists "Users can delete their own call drafts"
  on public.program_call_schedule_drafts;

create policy "Users can view their own program call drafts"
  on public.program_call_schedule_drafts
  for select
  using (
    auth.uid() = user_id
    and public.is_active_program_member_for_attendings(program_id)
  );

create policy "Users can insert their own program call drafts"
  on public.program_call_schedule_drafts
  for insert
  with check (
    auth.uid() = user_id
    and public.is_active_program_member_for_attendings(program_id)
  );

create policy "Users can update their own program call drafts"
  on public.program_call_schedule_drafts
  for update
  using (
    auth.uid() = user_id
    and public.is_active_program_member_for_attendings(program_id)
  )
  with check (
    auth.uid() = user_id
    and public.is_active_program_member_for_attendings(program_id)
  );

create policy "Users can delete their own program call drafts"
  on public.program_call_schedule_drafts
  for delete
  using (
    auth.uid() = user_id
    and public.is_active_program_member_for_attendings(program_id)
  );