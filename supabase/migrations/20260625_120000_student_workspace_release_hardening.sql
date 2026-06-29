alter table public.student_workspace_profiles
  add column if not exists timezone text null;

update public.student_workspace_schedule_entries schedule_entries
set rotation_id = null
where rotation_id is not null
  and not exists (
    select 1
    from public.student_workspace_rotations rotations
    where rotations.id = schedule_entries.rotation_id
      and rotations.user_id = schedule_entries.user_id
  );

update public.student_workspace_checklist_templates checklist_templates
set rotation_id = null
where rotation_id is not null
  and not exists (
    select 1
    from public.student_workspace_rotations rotations
    where rotations.id = checklist_templates.rotation_id
      and rotations.user_id = checklist_templates.user_id
  );

update public.student_workspace_tasks tasks
set rotation_id = null
where rotation_id is not null
  and not exists (
    select 1
    from public.student_workspace_rotations rotations
    where rotations.id = tasks.rotation_id
      and rotations.user_id = tasks.user_id
  );

delete from public.student_workspace_checklist_state checklist_state
where not exists (
  select 1
  from public.student_workspace_checklist_items checklist_items
  where checklist_items.id = checklist_state.checklist_item_id
    and checklist_items.user_id = checklist_state.user_id
);

delete from public.student_workspace_checklist_items checklist_items
where not exists (
  select 1
  from public.student_workspace_checklist_templates checklist_templates
  where checklist_templates.id = checklist_items.template_id
    and checklist_templates.user_id = checklist_items.user_id
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_workspace_rotations_id_user_id_key'
  ) then
    alter table public.student_workspace_rotations
      add constraint student_workspace_rotations_id_user_id_key
      unique (id, user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_workspace_checklist_templates_id_user_id_key'
  ) then
    alter table public.student_workspace_checklist_templates
      add constraint student_workspace_checklist_templates_id_user_id_key
      unique (id, user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_workspace_checklist_items_id_user_id_key'
  ) then
    alter table public.student_workspace_checklist_items
      add constraint student_workspace_checklist_items_id_user_id_key
      unique (id, user_id);
  end if;
end
$$;

alter table public.student_workspace_schedule_entries
  drop constraint if exists student_workspace_schedule_entries_rotation_user_fk;
alter table public.student_workspace_schedule_entries
  add constraint student_workspace_schedule_entries_rotation_user_fk
  foreign key (rotation_id, user_id)
  references public.student_workspace_rotations (id, user_id)
  on delete set null (rotation_id);

alter table public.student_workspace_checklist_templates
  drop constraint if exists student_workspace_checklist_templates_rotation_user_fk;
alter table public.student_workspace_checklist_templates
  add constraint student_workspace_checklist_templates_rotation_user_fk
  foreign key (rotation_id, user_id)
  references public.student_workspace_rotations (id, user_id)
  on delete set null (rotation_id);

alter table public.student_workspace_checklist_items
  drop constraint if exists student_workspace_checklist_items_template_user_fk;
alter table public.student_workspace_checklist_items
  add constraint student_workspace_checklist_items_template_user_fk
  foreign key (template_id, user_id)
  references public.student_workspace_checklist_templates (id, user_id)
  on delete cascade;

alter table public.student_workspace_checklist_state
  drop constraint if exists student_workspace_checklist_state_item_user_fk;
alter table public.student_workspace_checklist_state
  add constraint student_workspace_checklist_state_item_user_fk
  foreign key (checklist_item_id, user_id)
  references public.student_workspace_checklist_items (id, user_id)
  on delete cascade;

alter table public.student_workspace_tasks
  drop constraint if exists student_workspace_tasks_rotation_user_fk;
alter table public.student_workspace_tasks
  add constraint student_workspace_tasks_rotation_user_fk
  foreign key (rotation_id, user_id)
  references public.student_workspace_rotations (id, user_id)
  on delete set null (rotation_id);
