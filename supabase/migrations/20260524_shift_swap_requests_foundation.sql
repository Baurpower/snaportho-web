create table if not exists public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null
    constraint shift_swap_requests_program_id_fkey
    references public.programs(id)
    on delete cascade,
  requester_roster_id uuid not null
    constraint shift_swap_requests_requester_roster_id_fkey
    references public.program_roster(id)
    on delete restrict,
  recipient_roster_id uuid not null
    constraint shift_swap_requests_recipient_roster_id_fkey
    references public.program_roster(id)
    on delete restrict,
  requester_call_id uuid not null
    constraint shift_swap_requests_requester_call_id_fkey
    references public.call_assignments(id)
    on delete restrict,
  recipient_call_id uuid null
    constraint shift_swap_requests_recipient_call_id_fkey
    references public.call_assignments(id)
    on delete restrict,
  request_type text not null default 'coverage_only',
  status text not null default 'pending_recipient',
  requester_note text null,
  recipient_note text null,
  admin_note text null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_swap_requests_requester_not_recipient_check
    check (requester_roster_id <> recipient_roster_id),
  constraint shift_swap_requests_request_type_check
    check (request_type in ('coverage_only', 'trade')),
  constraint shift_swap_requests_status_check
    check (
      status in (
        'pending_recipient',
        'declined',
        'accepted_pending_admin',
        'approved',
        'rejected',
        'cancelled',
        'expired'
      )
    )
);

create index if not exists shift_swap_requests_program_id_idx
  on public.shift_swap_requests (program_id);

create index if not exists shift_swap_requests_requester_roster_id_idx
  on public.shift_swap_requests (requester_roster_id);

create index if not exists shift_swap_requests_recipient_roster_id_idx
  on public.shift_swap_requests (recipient_roster_id);

create index if not exists shift_swap_requests_requester_call_id_idx
  on public.shift_swap_requests (requester_call_id);

create index if not exists shift_swap_requests_status_idx
  on public.shift_swap_requests (status);

create index if not exists shift_swap_requests_created_at_idx
  on public.shift_swap_requests (created_at desc);

create index if not exists shift_swap_requests_active_duplicate_lookup_idx
  on public.shift_swap_requests (requester_call_id, recipient_roster_id, status);

create table if not exists public.shift_swap_audit_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    constraint shift_swap_audit_log_request_id_fkey
    references public.shift_swap_requests(id)
    on delete cascade,
  program_id uuid not null
    constraint shift_swap_audit_log_program_id_fkey
    references public.programs(id)
    on delete cascade,
  actor_roster_id uuid null
    constraint shift_swap_audit_log_actor_roster_id_fkey
    references public.program_roster(id)
    on delete set null,
  action text not null,
  previous_status text null,
  new_status text null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists shift_swap_audit_log_request_id_idx
  on public.shift_swap_audit_log (request_id);

create index if not exists shift_swap_audit_log_program_id_idx
  on public.shift_swap_audit_log (program_id);

create index if not exists shift_swap_audit_log_created_at_idx
  on public.shift_swap_audit_log (created_at desc);

alter table public.call_assignments
  add column if not exists last_swap_request_id uuid null
    references public.shift_swap_requests(id)
    on delete set null,
  add column if not exists last_modified_by_roster_id uuid null
    references public.program_roster(id)
    on delete set null,
  add column if not exists last_modified_reason text null;

create index if not exists call_assignments_last_swap_request_id_idx
  on public.call_assignments (last_swap_request_id);

create index if not exists call_assignments_last_modified_by_roster_id_idx
  on public.call_assignments (last_modified_by_roster_id);
