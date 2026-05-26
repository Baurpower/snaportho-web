create table if not exists public.workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  program_id uuid null references public.programs(id) on delete cascade,
  recipient_user_id uuid not null,
  recipient_roster_id uuid null references public.program_roster(id) on delete set null,
  actor_user_id uuid null,
  actor_roster_id uuid null references public.program_roster(id) on delete set null,
  type text not null,
  category text null,
  title text not null,
  message text not null,
  action_url text null,
  metadata jsonb null,
  read_at timestamptz null,
  emailed_at timestamptz null,
  email_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_notifications_recipient_user_id_idx
  on public.workspace_notifications (recipient_user_id);

create index if not exists workspace_notifications_recipient_roster_id_idx
  on public.workspace_notifications (recipient_roster_id);

create index if not exists workspace_notifications_program_id_idx
  on public.workspace_notifications (program_id);

create index if not exists workspace_notifications_read_at_idx
  on public.workspace_notifications (read_at);

create index if not exists workspace_notifications_created_at_idx
  on public.workspace_notifications (created_at desc);

create index if not exists workspace_notifications_type_idx
  on public.workspace_notifications (type);

create index if not exists workspace_notifications_category_idx
  on public.workspace_notifications (category);
