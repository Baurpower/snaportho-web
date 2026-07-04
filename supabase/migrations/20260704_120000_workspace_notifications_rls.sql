alter table public.workspace_notifications enable row level security;

revoke all on public.workspace_notifications from anon;
revoke all on public.workspace_notifications from authenticated;

grant select on public.workspace_notifications to authenticated;
grant update (read_at, updated_at) on public.workspace_notifications to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_notifications'
      and policyname = 'workspace_notifications_select_own'
  ) then
    create policy workspace_notifications_select_own
      on public.workspace_notifications
      for select
      to authenticated
      using (recipient_user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_notifications'
      and policyname = 'workspace_notifications_update_own_read_state'
  ) then
    create policy workspace_notifications_update_own_read_state
      on public.workspace_notifications
      for update
      to authenticated
      using (recipient_user_id = auth.uid())
      with check (recipient_user_id = auth.uid());
  end if;
end $$;
