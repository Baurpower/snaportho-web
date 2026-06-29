alter table public.student_workspace_schedule_entries
  add column if not exists today_focus text null,
  add column if not exists cases_to_review text null,
  add column if not exists preparation_workflow text null,
  add column if not exists resources text null,
  add column if not exists tomorrow_prep text null,
  add column if not exists brobot_action text null;

alter table public.student_workspace_schedule_entries
  drop constraint if exists student_workspace_schedule_entries_type_check;

alter table public.student_workspace_schedule_entries
  add constraint student_workspace_schedule_entries_type_check
    check (
      entry_type in (
        'rotation',
        'clinic',
        'or',
        'call',
        'conference',
        'study',
        'research',
        'personal',
        'off',
        'other',
        'interview',
        'away_rotation'
      )
    );
