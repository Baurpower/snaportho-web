create or replace function public.approve_shift_trade_request(
  p_request_id uuid,
  p_requester_roster_id uuid,
  p_recipient_roster_id uuid,
  p_requester_program_membership_id uuid,
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
  v_requester_call public.call_assignments%rowtype;
  v_recipient_call public.call_assignments%rowtype;
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

  if v_request.request_type <> 'trade' then
    raise exception 'Trade approval only supports trade requests.';
  end if;

  if v_request.requester_call_id is null or v_request.recipient_call_id is null then
    raise exception 'Trade request is missing one of the selected call assignments.';
  end if;

  if v_request.requester_roster_id <> p_requester_roster_id then
    raise exception 'Requester roster mismatch.';
  end if;

  if v_request.recipient_roster_id <> p_recipient_roster_id then
    raise exception 'Recipient roster mismatch.';
  end if;

  if p_requester_roster_id = p_recipient_roster_id then
    raise exception 'Trade requests must involve two different residents.';
  end if;

  select *
  into v_requester_call
  from public.call_assignments
  where id = v_request.requester_call_id
  for update;

  if not found then
    raise exception 'Requester call assignment not found.';
  end if;

  select *
  into v_recipient_call
  from public.call_assignments
  where id = v_request.recipient_call_id
  for update;

  if not found then
    raise exception 'Recipient call assignment not found.';
  end if;

  if v_requester_call.program_id is distinct from v_request.program_id then
    raise exception 'Requester call no longer belongs to this program.';
  end if;

  if v_recipient_call.program_id is distinct from v_request.program_id then
    raise exception 'Recipient call no longer belongs to this program.';
  end if;

  if v_requester_call.roster_id is distinct from v_request.requester_roster_id then
    raise exception 'Requester no longer owns the selected call.';
  end if;

  if v_recipient_call.roster_id is distinct from v_request.recipient_roster_id then
    raise exception 'Recipient no longer owns the selected return shift.';
  end if;

  update public.call_assignments
  set
    roster_id = p_recipient_roster_id,
    program_membership_id = p_recipient_program_membership_id,
    updated_at = v_now,
    last_swap_request_id = v_request.id,
    last_modified_by_roster_id = p_actor_roster_id,
    last_modified_reason = 'trade_request_approved'
  where id = v_requester_call.id
    and roster_id = v_request.requester_roster_id;

  if not found then
    raise exception 'Requester call update affected zero rows.';
  end if;

  update public.call_assignments
  set
    roster_id = p_requester_roster_id,
    program_membership_id = p_requester_program_membership_id,
    updated_at = v_now,
    last_swap_request_id = v_request.id,
    last_modified_by_roster_id = p_actor_roster_id,
    last_modified_reason = 'trade_request_approved'
  where id = v_recipient_call.id
    and roster_id = v_request.recipient_roster_id;

  if not found then
    raise exception 'Recipient call update affected zero rows.';
  end if;

  update public.shift_swap_requests
  set
    status = 'approved',
    admin_note = coalesce(p_admin_note, admin_note),
    updated_at = v_now
  where id = v_request.id
    and status = 'accepted_pending_admin';

  if not found then
    raise exception 'Trade status update affected zero rows.';
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
      'scheduleMutation', 'trade',
      'actorUserId', p_actor_user_id,
      'requesterCallId', v_request.requester_call_id,
      'recipientCallId', v_request.recipient_call_id,
      'requesterRosterId', v_request.requester_roster_id,
      'recipientRosterId', v_request.recipient_roster_id,
      'requesterProgramMembershipId', p_requester_program_membership_id,
      'recipientProgramMembershipId', p_recipient_program_membership_id,
      'adminNote', coalesce(p_admin_note, v_request.admin_note)
    )
  );

  request_id := v_request.id;
  return next;
end;
$$;

grant execute on function public.approve_shift_trade_request(uuid, uuid, uuid, uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_shift_trade_request(uuid, uuid, uuid, uuid, uuid, uuid, uuid, text) to service_role;
