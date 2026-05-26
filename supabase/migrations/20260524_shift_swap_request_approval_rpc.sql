create or replace function public.approve_shift_swap_request(
  p_request_id uuid,
  p_recipient_roster_id uuid,
  p_recipient_program_membership_id uuid,
  p_actor_roster_id uuid,
  p_actor_user_id uuid,
  p_admin_note text default null
)
returns table (request_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.shift_swap_requests%rowtype;
  v_call public.call_assignments%rowtype;
  v_now timestamptz := now();
begin
  select *
  into v_request
  from public.shift_swap_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Swap request not found.';
  end if;

  if v_request.status <> 'accepted_pending_admin' then
    raise exception 'Swap request is no longer awaiting admin approval.';
  end if;

  if v_request.request_type <> 'coverage_only' then
    raise exception 'Coverage approval only supports coverage_only requests.';
  end if;

  if v_request.recipient_roster_id <> p_recipient_roster_id then
    raise exception 'Recipient roster mismatch.';
  end if;

  select *
  into v_call
  from public.call_assignments
  where id = v_request.requester_call_id
  for update;

  if not found then
    raise exception 'Call assignment not found.';
  end if;

  if v_call.program_id is distinct from v_request.program_id then
    raise exception 'Call assignment no longer belongs to this program.';
  end if;

  if v_call.roster_id is distinct from v_request.requester_roster_id then
    raise exception 'Call assignment is no longer assigned to the requester.';
  end if;

  update public.call_assignments
  set
    roster_id = p_recipient_roster_id,
    program_membership_id = p_recipient_program_membership_id,
    updated_at = v_now,
    last_swap_request_id = v_request.id,
    last_modified_by_roster_id = p_actor_roster_id,
    last_modified_reason = 'coverage_request_approved'
  where id = v_call.id
    and roster_id = v_request.requester_roster_id;

  if not found then
    raise exception 'Assignment update affected zero rows.';
  end if;

  update public.shift_swap_requests
  set
    status = 'approved',
    admin_note = coalesce(p_admin_note, admin_note),
    updated_at = v_now
  where id = v_request.id
    and status = 'accepted_pending_admin';

  if not found then
    raise exception 'Swap status update affected zero rows.';
  end if;

  insert into public.shift_swap_audit_log (
    request_id,
    program_id,
    actor_roster_id,
    action,
    previous_status,
    new_status,
    metadata
  )
  values (
    v_request.id,
    v_request.program_id,
    p_actor_roster_id,
    'approved',
    'accepted_pending_admin',
    'approved',
    jsonb_build_object(
      'scheduleMutation', 'coverage_only',
      'actorUserId', p_actor_user_id,
      'requesterCallId', v_request.requester_call_id,
      'requesterRosterId', v_request.requester_roster_id,
      'recipientRosterId', v_request.recipient_roster_id,
      'recipientProgramMembershipId', p_recipient_program_membership_id,
      'adminNote', coalesce(p_admin_note, v_request.admin_note)
    )
  );

  request_id := v_request.id;
  return next;
end;
$$;

grant execute on function public.approve_shift_swap_request(uuid, uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_shift_swap_request(uuid, uuid, uuid, uuid, uuid, text) to service_role;
