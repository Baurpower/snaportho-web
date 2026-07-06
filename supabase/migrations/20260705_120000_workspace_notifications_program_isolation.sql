-- Enforce tenant isolation for workspace_notifications.
-- Backfill missing program_id values, archive orphans, tighten RLS.

create table if not exists public.workspace_notifications_orphan_archive (
  like public.workspace_notifications including all
);

update public.workspace_notifications wn
set program_id = pr.program_id,
    updated_at = now()
from public.program_roster pr
where wn.program_id is null
  and wn.recipient_roster_id = pr.id
  and pr.program_id is not null;

update public.workspace_notifications wn
set program_id = pr.program_id,
    updated_at = now()
from public.program_roster pr
where wn.program_id is null
  and wn.actor_roster_id = pr.id
  and pr.program_id is not null;

insert into public.workspace_notifications_orphan_archive
select wn.*
from public.workspace_notifications wn
where wn.program_id is null
  and not exists (
    select 1
    from public.workspace_notifications_orphan_archive archived
    where archived.id = wn.id
  );

delete from public.workspace_notifications
where program_id is null;

alter table public.workspace_notifications
  alter column program_id set not null;

create index if not exists workspace_notifications_recipient_program_created_at_idx
  on public.workspace_notifications (recipient_user_id, program_id, created_at desc);

create index if not exists workspace_notifications_recipient_program_unread_idx
  on public.workspace_notifications (recipient_user_id, program_id)
  where read_at is null;

drop policy if exists workspace_notifications_select_own
  on public.workspace_notifications;

drop policy if exists workspace_notifications_update_own_read_state
  on public.workspace_notifications;

create policy workspace_notifications_select_own
  on public.workspace_notifications
  for select
  to authenticated
  using (
    recipient_user_id = auth.uid()
    and public.is_active_program_member_for_attendings(program_id)
  );

create policy workspace_notifications_update_own_read_state
  on public.workspace_notifications
  for update
  to authenticated
  using (
    recipient_user_id = auth.uid()
    and public.is_active_program_member_for_attendings(program_id)
  )
  with check (
    recipient_user_id = auth.uid()
    and public.is_active_program_member_for_attendings(program_id)
  );